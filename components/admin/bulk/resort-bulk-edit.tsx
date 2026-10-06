"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BulkSaveBar,
  CheckCell,
  NumCell,
  Td,
  Th,
  fmtNum,
  roundK,
  useUnsavedGuard,
} from "@/components/admin/bulk/bulk-ui";
import { PRODUCT_TYPE_LABEL, type ProductType } from "@/lib/types";

export interface ResortSource {
  id: string;
  product_code: string;
  product_name: string;
  area: string;
  type: ProductType;
}
export interface RateSource {
  id: string;
  product_id: string;
  room_type: string;
  price: number;
  capacity: number | null;
  extra_bed_price: number | null;
  breakfast: boolean;
}

interface Room {
  id: string;
  productId: string;
  roomType: string;
  price: number | null;
  capacity: number | null;
  extra: number | null;
  breakfast: boolean;
}

const toRoom = (r: RateSource): Room => ({
  id: r.id,
  productId: r.product_id,
  roomType: r.room_type,
  price: r.price,
  capacity: r.capacity,
  extra: r.extra_bed_price,
  breakfast: r.breakfast,
});

function dirtyKeys(r: Room, o: Room | undefined): ("price" | "capacity" | "extra" | "breakfast")[] {
  if (!o) return [];
  const out: ("price" | "capacity" | "extra" | "breakfast")[] = [];
  if (r.price !== o.price) out.push("price");
  if (r.capacity !== o.capacity) out.push("capacity");
  if (r.extra !== o.extra) out.push("extra");
  if (r.breakfast !== o.breakfast) out.push("breakfast");
  return out;
}

export function ResortBulkEdit({ resorts, rates }: { resorts: ResortSource[]; rates: RateSource[] }) {
  const [rooms, setRooms] = useState<Room[]>(() => rates.map(toRoom));
  const [origin, setOrigin] = useState<Room[]>(() => rates.map(toRoom));
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("");
  const [type, setType] = useState<"" | ProductType>("");
  const [pct, setPct] = useState("");
  const [saving, setSaving] = useState(false);
  const [errIds, setErrIds] = useState<Set<string>>(new Set());

  const originMap = useMemo(() => new Map(origin.map((o) => [o.id, o])), [origin]);
  const areas = useMemo(() => Array.from(new Set(resorts.map((r) => r.area))).sort((a, b) => a.localeCompare(b, "vi")), [resorts]);

  const visibleResorts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return resorts.filter(
      (r) => (!area || r.area === area) && (!type || r.type === type) && (!q || `${r.product_name} ${r.product_code}`.toLowerCase().includes(q))
    );
  }, [resorts, search, area, type]);

  const visibleRoomIds = useMemo(() => {
    const ids = new Set(visibleResorts.map((r) => r.id));
    return new Set(rooms.filter((m) => ids.has(m.productId)).map((m) => m.id));
  }, [visibleResorts, rooms]);

  const stats = useMemo(() => {
    let cells = 0;
    let rowCount = 0;
    rooms.forEach((m) => {
      const n = dirtyKeys(m, originMap.get(m.id)).length;
      cells += n;
      if (n) rowCount++;
    });
    return { cells, rowCount };
  }, [rooms, originMap]);

  useUnsavedGuard(stats.cells > 0);

  function patch(id: string, p: Partial<Room>) {
    setRooms((prev) => prev.map((m) => (m.id === id ? { ...m, ...p } : m)));
    setErrIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function applyPercent() {
    const v = Number(pct);
    if (!v) {
      toast.error("Nhập % cần tăng/giảm trước (VD 10 hoặc -5).");
      return;
    }
    const mul = 1 + v / 100;
    setRooms((prev) => prev.map((m) => (visibleRoomIds.has(m.id) && m.price != null ? { ...m, price: roundK(m.price * mul) } : m)));
    toast.success(`Đã ${v > 0 ? "tăng" : "giảm"} ${Math.abs(v)}% giá của ${visibleRoomIds.size} hạng phòng — chưa lưu, soát lại rồi bấm "Lưu tất cả".`);
  }

  function undoAll() {
    setRooms(origin.map((o) => ({ ...o })));
    setErrIds(new Set());
    toast("Đã hoàn tác, giá trở về như cũ.");
  }

  async function saveAll() {
    const dirty = rooms.filter((m) => dirtyKeys(m, originMap.get(m.id)).length > 0);
    const bad = dirty.filter((m) => m.price == null || m.price <= 0);
    if (bad.length) {
      setErrIds(new Set(bad.map((m) => m.id)));
      toast.error(`${bad.length} hạng phòng đang để trống/0 giá (tô đỏ) — nhập giá rồi lưu lại.`);
      return;
    }
    const updates = dirty.map((m) => {
      const keys = dirtyKeys(m, originMap.get(m.id));
      const u: Record<string, unknown> = { id: m.id };
      if (keys.includes("price")) u.price = m.price;
      if (keys.includes("capacity")) u.capacity = m.capacity;
      if (keys.includes("extra")) u.extra_bed_price = m.extra;
      if (keys.includes("breakfast")) u.breakfast = m.breakfast;
      return u;
    });

    setSaving(true);
    try {
      const res = await fetch("/api/admin/bulk/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const data: { saved?: number; failed?: { id: string; error: string }[]; error?: string } = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Không lưu được, thử lại nhé.");
        return;
      }
      const failedIds = new Set((data.failed ?? []).map((f) => f.id));
      const okRooms = dirty.filter((m) => !failedIds.has(m.id));
      const okMap = new Map(okRooms.map((m) => [m.id, m]));
      setOrigin((prev) => prev.map((o) => (okMap.has(o.id) ? { ...okMap.get(o.id)! } : o)));
      setErrIds(failedIds);
      if (failedIds.size) toast.error(`Đã lưu ${okRooms.length} hạng phòng, ${failedIds.size} lỗi (tô đỏ): ${data.failed?.[0]?.error ?? ""}`);
      else toast.success(`Đã lưu ${okRooms.length} hạng phòng chỉ với 1 lần bấm — giá thấp nhất của resort tự cập nhật.`);
    } catch {
      toast.error("Mất kết nối, thử lại nhé.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-20">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên hoặc mã..." className="h-10 w-52 rounded-xl border border-border bg-white px-3 text-[13px]" />
        <select value={area} onChange={(e) => setArea(e.target.value)} className="h-10 rounded-xl border border-border bg-white px-3 text-[13px]">
          <option value="">Tất cả khu vực</option>
          {areas.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value as "" | ProductType)} className="h-10 rounded-xl border border-border bg-white px-3 text-[13px]">
          <option value="">Resort + Khách sạn</option>
          <option value="resort">Resort</option>
          <option value="hotel">Khách sạn</option>
        </select>
        <span className="ml-2 text-[12px] text-ink-muted">Tăng/giảm giá phòng</span>
        <input value={pct} onChange={(e) => setPct(e.target.value.replace(/[^\d.-]/g, ""))} placeholder="% (VD 10, -5)" className="h-10 w-32 rounded-xl border border-border bg-white px-3 text-[13px]" />
        <button type="button" onClick={applyPercent} className="h-10 rounded-xl border border-border bg-white px-4 text-[12.5px] font-bold hover:bg-paper-dim">
          Áp dụng cho {visibleRoomIds.size} hạng phòng đang hiện
        </button>
      </div>

      <div className="max-h-[68vh] overflow-auto rounded-2xl border border-border bg-white">
        <table className="w-full border-separate border-spacing-0 text-[12.5px]">
          <thead>
            <tr>
              <Th w={300} sticky={0}>Resort / Hotel · Hạng phòng</Th>
              <Th w={140} right>Giá / đêm</Th>
              <Th w={95} right>Sức chứa</Th>
              <Th w={120} right>Extra bed</Th>
              <Th w={90} className="text-center">Gồm ăn sáng</Th>
            </tr>
          </thead>
          <tbody>
            {visibleResorts.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-sm text-ink-muted">Không có resort/khách sạn phù hợp.</td>
              </tr>
            )}
            {visibleResorts.map((r) => {
              const list = rooms.filter((m) => m.productId === r.id);
              const prices = list.map((m) => m.price).filter((p): p is number => p != null && p > 0);
              return (
                <ResortGroup key={r.id}>
                  <tr>
                    <td colSpan={5} className="bg-teal-light px-3 py-1.5 text-[12px] text-teal-dark">
                      <b>{r.product_name}</b>{" "}
                      <span className="ml-1 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold">{PRODUCT_TYPE_LABEL[r.type]}</span>{" "}
                      <span className="ml-1 text-[11px]">{r.product_code} · {r.area}</span>{" "}
                      <span className="ml-2 text-[11px] font-semibold">
                        {list.length ? `${list.length} hạng phòng · từ ${fmtNum(Math.min(...prices))}` : "Chưa có hạng phòng — thêm ở form Sửa sản phẩm"}
                      </span>
                    </td>
                  </tr>
                  {list.map((m) => {
                    const o = originMap.get(m.id);
                    const keys = dirtyKeys(m, o);
                    const delta = o && m.price != null && o.price != null ? m.price - o.price : 0;
                    return (
                      <tr key={m.id}>
                        <Td sticky={0} className="px-2 py-2 pl-6 text-[12px]" style={{ width: 300, minWidth: 300 }}>↳ {m.roomType}</Td>
                        <Td dirty={keys.includes("price")} err={errIds.has(m.id)}>
                          <NumCell value={m.price} col="price" onChange={(v) => patch(m.id, { price: v })} />
                          {delta !== 0 && (
                            <span className="block px-2 pb-1 text-right text-[10px] font-bold text-sand-dark">
                              {delta > 0 ? "+" : ""}{fmtNum(delta)}
                            </span>
                          )}
                        </Td>
                        <Td dirty={keys.includes("capacity")}>
                          <NumCell value={m.capacity} col="capacity" placeholder="—" onChange={(v) => patch(m.id, { capacity: v })} />
                        </Td>
                        <Td dirty={keys.includes("extra")}>
                          <NumCell value={m.extra} col="extra" placeholder="—" onChange={(v) => patch(m.id, { extra: v })} />
                        </Td>
                        <Td dirty={keys.includes("breakfast")}>
                          <CheckCell checked={m.breakfast} onChange={(v) => patch(m.id, { breakfast: v })} />
                        </Td>
                      </tr>
                    );
                  })}
                </ResortGroup>
              );
            })}
          </tbody>
        </table>
      </div>

      <BulkSaveBar
        show={stats.cells > 0}
        message={
          <>
            Đã sửa <b className="text-sand-dark">{stats.cells} ô</b> của <b className="text-sand-dark">{stats.rowCount} hạng phòng</b> — chưa lưu
          </>
        }
        onSave={saveAll}
        onUndo={undoAll}
        saving={saving}
      />
    </div>
  );
}

function ResortGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
