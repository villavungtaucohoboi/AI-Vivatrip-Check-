"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ImagePlus, Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { BulkSaveBar, NumCell, useUnsavedGuard } from "@/components/admin/bulk/bulk-ui";
import { compressImage } from "@/lib/compress-image";
import { parseSeasons, seasonsToText } from "@/lib/resort-pricing";
import { cn } from "@/lib/utils";
import { PRODUCT_TYPE_LABEL, type HotelRate, type Product } from "@/lib/types";

export type ResortRow = Pick<
  Product,
  "id" | "product_code" | "product_name" | "area" | "type" | "high_seasons" | "weekend_nights" | "surcharge_note" | "contract_summary"
>;

interface Room {
  key: string;
  id?: string;
  room_type: string;
  area_m2: number | null;
  bed: string;
  capacity: number | null;
  breakfast: boolean;
  discount_percent: number | null;
  price_low_weekday: number | null;
  price_low_weekend: number | null;
  price_high_weekday: number | null;
  price_high_weekend: number | null;
  price_holiday: number | null;
}
interface State {
  seasons: string;
  weekend: number[];
  surcharge: string;
  contract: string;
  rooms: Room[];
  deleted: string[];
}

const PRICE_COLS: { k: keyof Room; label: string; sub: string }[] = [
  { k: "price_low_weekday", label: "Thấp điểm", sub: "T2–T5" },
  { k: "price_low_weekend", label: "Thấp điểm", sub: "Cuối tuần" },
  { k: "price_high_weekday", label: "Cao điểm", sub: "T2–T5" },
  { k: "price_high_weekend", label: "Cao điểm", sub: "Cuối tuần" },
  { k: "price_holiday", label: "Lễ / Tết", sub: "" },
];
const DAYS = [
  { d: 1, l: "T2" },
  { d: 2, l: "T3" },
  { d: 3, l: "T4" },
  { d: 4, l: "T5" },
  { d: 5, l: "T6" },
  { d: 6, l: "T7" },
  { d: 0, l: "CN" },
];

let keySeq = 0;
const newKey = () => `k${++keySeq}`;
/** Gõ "1650" → hiểu là 1.650.000 (giá phòng hiếm khi dưới 100k). */
const money = (v: number | null) => (v != null && v > 0 && v < 100000 ? v * 1000 : v);

function toRoom(r: HotelRate): Room {
  return {
    key: newKey(),
    id: r.id,
    room_type: r.room_type,
    area_m2: r.area_m2 ?? null,
    bed: r.bed ?? "",
    capacity: r.capacity,
    breakfast: r.breakfast,
    discount_percent: r.discount_percent ? Number(r.discount_percent) : null,
    price_low_weekday: r.price_low_weekday != null ? Number(r.price_low_weekday) : Number(r.price) || null,
    price_low_weekend: r.price_low_weekend != null ? Number(r.price_low_weekend) : null,
    price_high_weekday: r.price_high_weekday != null ? Number(r.price_high_weekday) : null,
    price_high_weekend: r.price_high_weekend != null ? Number(r.price_high_weekend) : null,
    price_holiday: r.price_holiday != null ? Number(r.price_holiday) : null,
  };
}
function initState(p: ResortRow, rates: HotelRate[]): State {
  return {
    seasons: seasonsToText(p.high_seasons),
    weekend: p.weekend_nights?.length ? p.weekend_nights : [5, 6],
    surcharge: p.surcharge_note ?? "",
    contract: p.contract_summary ?? "",
    rooms: rates
      .filter((r) => r.product_id === p.id)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.price - b.price)
      .map(toRoom),
    deleted: [],
  };
}
const snapshot = (s: State) =>
  JSON.stringify({ ...s, rooms: s.rooms.map(({ key: _k, ...r }) => r) });
const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().trim();

export function ResortPricingSheet({ resorts, rates }: { resorts: ResortRow[]; rates: HotelRate[] }) {
  const router = useRouter();
  const [state, setState] = useState<Record<string, State>>(() => Object.fromEntries(resorts.map((p) => [p.id, initState(p, rates)])));
  const [origin, setOrigin] = useState<Record<string, string>>(() =>
    Object.fromEntries(resorts.map((p) => [p.id, snapshot(initState(p, rates))]))
  );
  const [q, setQ] = useState("");
  const [type, setType] = useState<"" | "resort" | "hotel">("");
  const [openSettings, setOpenSettings] = useState<Set<string>>(new Set());
  const [aiFor, setAiFor] = useState<ResortRow | null>(null);
  const [saving, setSaving] = useState(false);

  const dirtyIds = useMemo(() => resorts.filter((p) => snapshot(state[p.id]) !== origin[p.id]).map((p) => p.id), [resorts, state, origin]);
  useUnsavedGuard(dirtyIds.length > 0);

  const visible = resorts.filter(
    (p) => (!type || p.type === type) && (!q.trim() || plain(`${p.product_name} ${p.product_code} ${p.area}`).includes(plain(q)))
  );

  const upd = (id: string, fn: (s: State) => State) => setState((prev) => ({ ...prev, [id]: fn(prev[id]) }));
  const updRoom = (id: string, key: string, p: Partial<Room>) =>
    upd(id, (s) => ({ ...s, rooms: s.rooms.map((r) => (r.key === key ? { ...r, ...p } : r)) }));

  async function saveAll() {
    if (!dirtyIds.length) return;
    setSaving(true);
    try {
      const payload = dirtyIds.map((id) => {
        const s = state[id];
        return {
          id,
          settings: {
            high_seasons: parseSeasons(s.seasons),
            weekend_nights: s.weekend,
            surcharge_note: s.surcharge,
            contract_summary: s.contract,
          },
          rooms: s.rooms.map(({ key: _k, bed, ...r }, i) => ({ ...r, bed, sort_order: i })),
          deleted: s.deleted,
        };
      });
      const res = await fetch("/api/admin/bulk/resort-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resorts: payload }),
      });
      const data = (await res.json()) as { saved?: number; failed?: { id: string; error: string }[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Lưu thất bại");
      const failed = new Map((data.failed ?? []).map((f) => [f.id, f.error]));
      if (failed.size) {
        const first = [...failed.entries()][0];
        toast.error(`${resorts.find((p) => p.id === first[0])?.product_name}: ${first[1]}`);
      }
      toast.success(`Đã lưu ${data.saved ?? 0} resort.`);
      // Có hạng phòng mới → tải lại trang để nhận id (tránh lưu trùng lần sau)
      if (!failed.size && payload.some((x) => x.rooms.some((r) => !r.id) || x.deleted.length)) {
        setOrigin(Object.fromEntries(resorts.map((p) => [p.id, snapshot(state[p.id])])));
        setTimeout(() => window.location.reload(), 600);
        return;
      }
      router.refresh();
      setOrigin((prev) => {
        const next = { ...prev };
        dirtyIds.filter((id) => !failed.has(id)).forEach((id) => (next[id] = snapshot(state[id])));
        return next;
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-28">
      <div className="sticky top-16 z-20 -mx-4 flex flex-wrap items-center gap-2 border-b border-border bg-paper/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm tên / mã / khu vực…"
          className="h-10 min-w-[200px] flex-1 rounded-xl border border-border bg-white px-3 text-[13.5px] outline-none focus:border-teal"
        />
        {(["", "resort", "hotel"] as const).map((t) => (
          <button
            key={t || "all"}
            onClick={() => setType(t)}
            className={cn("h-10 rounded-xl px-3 text-[12.5px] font-bold", type === t ? "bg-teal text-white" : "border border-border bg-white text-ink-muted")}
          >
            {t === "" ? "Tất cả" : t === "resort" ? "Resort" : "Khách sạn"}
          </button>
        ))}
        <span className="text-[12px] text-ink-muted">Gõ giá kiểu “1650” = 1.650.000đ · Enter để xuống dòng</span>
      </div>

      <div className="mt-3 space-y-4">
        {visible.map((p) => {
          const s = state[p.id];
          const dirty = dirtyIds.includes(p.id);
          const settingsOpen = openSettings.has(p.id);
          return (
            <div key={p.id} className={cn("overflow-hidden rounded-2xl border bg-white", dirty ? "border-sand ring-1 ring-sand/50" : "border-border")}>
              <div className="flex flex-wrap items-center gap-2 bg-teal-light/60 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-bold text-ink">{p.product_name}</p>
                  <p className="text-[11.5px] text-ink-muted">
                    {PRODUCT_TYPE_LABEL[p.type]} · {p.area} · {s.rooms.length} hạng phòng
                    {dirty && <span className="ml-1.5 rounded bg-sand-light px-1.5 font-semibold text-sand-dark">chưa lưu</span>}
                  </p>
                </div>
                <button
                  onClick={() => setAiFor(p)}
                  className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-teal to-sand px-3 py-1.5 text-[12px] font-bold text-white"
                >
                  <Sparkles className="h-3.5 w-3.5" /> AI điền từ hợp đồng / ảnh
                </button>
                <button
                  onClick={() =>
                    setOpenSettings((prev) => {
                      const n = new Set(prev);
                      if (n.has(p.id)) n.delete(p.id);
                      else n.add(p.id);
                      return n;
                    })
                  }
                  className="flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-1.5 text-[12px] font-bold text-ink"
                >
                  Mùa, phụ thu, hợp đồng <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", settingsOpen && "rotate-180")} />
                </button>
              </div>

              {settingsOpen && (
                <div className="grid gap-3 border-b border-border bg-paper/60 p-3 lg:grid-cols-2">
                  <div className="space-y-3">
                    <label className="block text-[12px] font-bold text-ink-muted">
                      Mùa cao điểm (nhiều khoảng cách nhau dấu ;)
                      <input
                        value={s.seasons}
                        onChange={(e) => upd(p.id, (x) => ({ ...x, seasons: e.target.value }))}
                        placeholder="01/06-31/08; 20/12-05/01"
                        className="mt-1 h-9 w-full rounded-lg border border-border bg-white px-2.5 text-[13px] font-medium text-ink"
                      />
                    </label>
                    <div>
                      <p className="text-[12px] font-bold text-ink-muted">Đêm tính giá cuối tuần</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {DAYS.map(({ d, l }) => {
                          const on = s.weekend.includes(d);
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => upd(p.id, (x) => ({ ...x, weekend: on ? x.weekend.filter((y) => y !== d) : [...x.weekend, d] }))}
                              className={cn("h-8 w-10 rounded-lg text-[12px] font-bold", on ? "bg-teal text-white" : "border border-border bg-white text-ink-muted")}
                            >
                              {l}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-1 text-[11px] text-ink-muted">Ngày lễ/Tết lấy theo lịch ngày lễ chung của app.</p>
                    </div>
                    <label className="block text-[12px] font-bold text-ink-muted">
                      Phụ thu (Sale xem)
                      <textarea
                        value={s.surcharge}
                        onChange={(e) => upd(p.id, (x) => ({ ...x, surcharge: e.target.value }))}
                        rows={4}
                        placeholder={"👤 Người lớn thêm 650k/đêm (gồm ăn sáng)\n🧒 Trẻ 6–11t 350k\n👶 Dưới 6t miễn phí"}
                        className="mt-1 w-full rounded-lg border border-border bg-white p-2.5 text-[13px] font-medium text-ink"
                      />
                    </label>
                  </div>
                  <label className="block text-[12px] font-bold text-ink-muted">
                    Tóm tắt hợp đồng (CHỈ Sale xem)
                    <textarea
                      value={s.contract}
                      onChange={(e) => upd(p.id, (x) => ({ ...x, contract: e.target.value }))}
                      rows={10}
                      placeholder={"🕑 Nhận 14h · Trả 12h\n🧾 Cọc 50%\n↩️ Huỷ trước 7 ngày hoàn 100%"}
                      className="mt-1 w-full rounded-lg border border-dashed border-amber-300 bg-amber-50/60 p-2.5 text-[13px] font-medium text-ink"
                    />
                  </label>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] border-collapse text-[12.5px]">
                  <thead>
                    <tr className="bg-paper-dim/70 text-[10.5px] font-bold uppercase text-ink-muted">
                      <th className="px-2 py-1.5 text-left">Hạng phòng</th>
                      <th className="w-14 px-1 text-right">m²</th>
                      <th className="w-32 px-1 text-left">Giường</th>
                      <th className="w-14 px-1 text-right">Khách</th>
                      <th className="w-14 px-1 text-center">Ăn sáng</th>
                      {PRICE_COLS.map((c) => (
                        <th key={c.k} className="w-[104px] px-1 text-right leading-tight">
                          {c.label}
                          {c.sub && (
                            <>
                              <br />
                              {c.sub}
                            </>
                          )}
                        </th>
                      ))}
                      <th className="w-14 px-1 text-right">CK %</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {s.rooms.map((r) => (
                      <tr key={r.key} className="border-t border-border">
                        <td className="px-1">
                          <input
                            value={r.room_type}
                            onChange={(e) => updRoom(p.id, r.key, { room_type: e.target.value })}
                            placeholder="Tên hạng phòng"
                            className="h-9 w-full bg-transparent px-1.5 font-semibold outline-none focus:bg-teal-light"
                          />
                        </td>
                        <td>
                          <NumCell value={r.area_m2} col={`${p.id}-m2`} onChange={(v) => updRoom(p.id, r.key, { area_m2: v })} />
                        </td>
                        <td>
                          <input
                            value={r.bed}
                            onChange={(e) => updRoom(p.id, r.key, { bed: e.target.value })}
                            placeholder="1 đôi / 2 đơn"
                            className="h-9 w-full bg-transparent px-1.5 outline-none focus:bg-teal-light"
                          />
                        </td>
                        <td>
                          <NumCell value={r.capacity} col={`${p.id}-cap`} onChange={(v) => updRoom(p.id, r.key, { capacity: v })} />
                        </td>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            checked={r.breakfast}
                            onChange={(e) => updRoom(p.id, r.key, { breakfast: e.target.checked })}
                            className="h-4 w-4 accent-[#EF4F58]"
                          />
                        </td>
                        {PRICE_COLS.map((c) => (
                          <td key={c.k}>
                            <NumCell
                              value={r[c.k] as number | null}
                              col={`${p.id}-${c.k}`}
                              placeholder="—"
                              onChange={(v) => updRoom(p.id, r.key, { [c.k]: money(v) } as Partial<Room>)}
                            />
                          </td>
                        ))}
                        <td>
                          <NumCell value={r.discount_percent} col={`${p.id}-ck`} suffix="%" onChange={(v) => updRoom(p.id, r.key, { discount_percent: v })} />
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            onClick={() =>
                              upd(p.id, (x) => ({
                                ...x,
                                rooms: x.rooms.filter((y) => y.key !== r.key),
                                deleted: r.id ? [...x.deleted, r.id] : x.deleted,
                              }))
                            }
                            className="rounded p-1 text-ink-muted hover:bg-hot-light hover:text-hot"
                            aria-label="Xoá hạng phòng"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={() =>
                  upd(p.id, (x) => ({
                    ...x,
                    rooms: [
                      ...x.rooms,
                      {
                        key: newKey(),
                        room_type: "",
                        area_m2: null,
                        bed: "",
                        capacity: 2,
                        breakfast: true,
                        discount_percent: null,
                        price_low_weekday: null,
                        price_low_weekend: null,
                        price_high_weekday: null,
                        price_high_weekend: null,
                        price_holiday: null,
                      },
                    ],
                  }))
                }
                className="m-2 flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5 text-[12px] font-bold text-ink-muted hover:bg-paper-dim"
              >
                <Plus className="h-3.5 w-3.5" /> Thêm hạng phòng
              </button>
            </div>
          );
        })}
        {!visible.length && <p className="py-10 text-center text-sm text-ink-muted">Không có resort / khách sạn nào khớp.</p>}
      </div>

      {aiFor && (
        <AIImportDialog
          resort={aiFor}
          onClose={() => setAiFor(null)}
          onResult={(res) => {
            upd(aiFor.id, (x) => {
              const byName = new Map(x.rooms.map((r) => [plain(r.room_type), r]));
              const rooms: Room[] = res.rooms.map((ai) => {
                const old = byName.get(plain(ai.room_type));
                if (old) byName.delete(plain(ai.room_type));
                return {
                  key: old?.key ?? newKey(),
                  id: old?.id,
                  room_type: ai.room_type,
                  area_m2: ai.area_m2 ?? old?.area_m2 ?? null,
                  bed: ai.bed ?? old?.bed ?? "",
                  capacity: ai.capacity ?? old?.capacity ?? null,
                  breakfast: ai.breakfast,
                  discount_percent: old?.discount_percent ?? null,
                  price_low_weekday: ai.price_low_weekday,
                  price_low_weekend: ai.price_low_weekend,
                  price_high_weekday: ai.price_high_weekday,
                  price_high_weekend: ai.price_high_weekend,
                  price_holiday: ai.price_holiday,
                };
              });
              // Hạng phòng cũ không có trong tài liệu: giữ lại ở cuối để Admin tự quyết
              return {
                ...x,
                rooms: [...rooms, ...byName.values()],
                seasons: res.high_seasons || x.seasons,
                weekend: res.weekend_nights?.length ? res.weekend_nights : x.weekend,
                surcharge: res.surcharge_note || x.surcharge,
                contract: res.contract_summary || x.contract,
              };
            });
            setOpenSettings((prev) => new Set(prev).add(aiFor.id));
            toast.success(`AI đã điền ${res.rooms.length} hạng phòng — kiểm tra lại các ô rồi bấm Lưu.`);
            setAiFor(null);
          }}
        />
      )}

      <BulkSaveBar
        show={dirtyIds.length > 0}
        message={
          <>
            Đã sửa <b className="text-sand-dark">{dirtyIds.length} resort</b> — chưa lưu
          </>
        }
        onSave={saveAll}
        onUndo={() => {
          setState(Object.fromEntries(resorts.map((p) => [p.id, initState(p, rates)])));
          toast.success("Đã hoàn tác mọi thay đổi chưa lưu.");
        }}
        saving={saving}
      />
    </div>
  );
}

interface AIRoom {
  room_type: string;
  area_m2: number | null;
  bed: string | null;
  capacity: number | null;
  breakfast: boolean;
  price_low_weekday: number | null;
  price_low_weekend: number | null;
  price_high_weekday: number | null;
  price_high_weekend: number | null;
  price_holiday: number | null;
}
interface AIRes {
  rooms: AIRoom[];
  high_seasons: string;
  weekend_nights: number[];
  surcharge_note: string;
  contract_summary: string;
}

function AIImportDialog({ resort, onClose, onResult }: { resort: ResortRow; onClose: () => void; onResult: (r: AIRes) => void }) {
  const [text, setText] = useState("");
  const [img, setImg] = useState<{ url: string; mime: string; data: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function pickImage(file: File | undefined) {
    if (!file) return;
    const small = await compressImage(file);
    const buf = await small.arrayBuffer();
    let bin = "";
    new Uint8Array(buf).forEach((b) => (bin += String.fromCharCode(b)));
    setImg({ url: URL.createObjectURL(small), mime: small.type || "image/jpeg", data: btoa(bin) });
  }

  async function run() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/resort-ai-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, image: img ? { mime: img.mime, data: img.data } : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI chưa đọc được");
      if (!data.rooms?.length) throw new Error("AI không tìm thấy hạng phòng nào trong tài liệu.");
      onResult(data as AIRes);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI chưa đọc được");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-4 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between">
          <p className="font-display text-[17px] font-bold text-ink">AI điền bảng giá · {resort.product_name}</p>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-paper-dim" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-3 text-[12.5px] text-ink-muted">
          Dán chữ hợp đồng / bảng giá <b>hoặc</b> chọn ảnh chụp màn hình. AI tự điền hạng phòng, 5 mức giá, mùa cao điểm, phụ thu và tóm tắt hợp đồng. Bạn xem lại rồi mới Lưu.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="Dán nội dung hợp đồng / bảng giá vào đây…"
          className="w-full rounded-xl border border-border p-3 text-[13px] outline-none focus:border-teal"
        />
        <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-3 text-[13px] font-semibold text-ink-muted hover:bg-paper-dim">
          <ImagePlus className="h-4 w-4" />
          {img ? "Đổi ảnh khác" : "Chọn ảnh chụp bảng giá / hợp đồng"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => pickImage(e.target.files?.[0])} />
        </label>
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img.url} alt="" className="mt-2 max-h-56 w-full rounded-xl object-contain" />
        )}
        <button
          onClick={run}
          disabled={busy || (!text.trim() && !img)}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal to-sand text-[14px] font-bold text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? "AI đang đọc… (10–30 giây)" : "Đọc và điền bảng giá"}
        </button>
      </div>
    </div>
  );
}
