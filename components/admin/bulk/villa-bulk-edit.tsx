"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BulkSaveBar,
  NumCell,
  SelectCell,
  Td,
  Th,
  fmtNum,
  roundK,
  useUnsavedGuard,
} from "@/components/admin/bulk/bulk-ui";
import {
  DISCOUNT_MODE_OPTIONS,
  deriveDiscount,
  discountToFields,
  isDayMode,
  modeUnit,
  priceAfterDiscount,
  sameDiscount,
  type DiscountMode,
  type DiscountState,
} from "@/lib/bulk-discount";
import type { Product } from "@/lib/types";

export type VillaEditSource = Pick<
  Product,
  | "id"
  | "product_code"
  | "product_name"
  | "area"
  | "extra_guest_fee"
  | "price_weekday"
  | "price_friday_sunday"
  | "price_saturday_holiday"
  | "discount_scheme"
  | "discount_type"
  | "discount_value"
  | "discount_weekday_type"
  | "discount_weekday_value"
  | "discount_friday_sunday_type"
  | "discount_friday_sunday_value"
  | "discount_saturday_holiday_type"
  | "discount_saturday_holiday_value"
>;

interface Row {
  id: string;
  code: string;
  name: string;
  area: string;
  p1: number | null;
  p2: number | null;
  p3: number | null;
  extra: number | null;
  disc: DiscountState;
}

function fromSource(p: VillaEditSource): Row {
  return {
    id: p.id,
    code: p.product_code,
    name: p.product_name,
    area: p.area,
    p1: p.price_weekday,
    p2: p.price_friday_sunday,
    p3: p.price_saturday_holiday,
    extra: p.extra_guest_fee,
    disc: deriveDiscount(p),
  };
}

function priceDirty(r: Row, o: Row | undefined, k: "p1" | "p2" | "p3" | "extra") {
  return !!o && r[k] !== o[k];
}
function discDirty(r: Row, o: Row | undefined) {
  return !!o && !sameDiscount(r.disc, o.disc);
}
function rowDirtyCells(r: Row, o: Row | undefined): number {
  if (!o) return 0;
  let n = 0;
  (["p1", "p2", "p3", "extra"] as const).forEach((k) => {
    if (priceDirty(r, o, k)) n++;
  });
  if (discDirty(r, o)) n++;
  return n;
}

function PriceSub({ after, delta, hasDiscount }: { after: number | null; delta: number; hasDiscount: boolean }) {
  if (!hasDiscount && !delta) return null;
  return (
    <span className="block px-2 pb-1 text-right text-[10px] font-bold leading-tight">
      {hasDiscount && after != null && <span className="text-teal-dark">sau CK: {fmtNum(after)} </span>}
      {delta !== 0 && (
        <span className="text-sand-dark">
          {delta > 0 ? "+" : ""}
          {fmtNum(delta)}
        </span>
      )}
    </span>
  );
}

export function VillaBulkEdit({ initial }: { initial: VillaEditSource[] }) {
  const [rows, setRows] = useState<Row[]>(() => initial.map(fromSource));
  const [origin, setOrigin] = useState<Row[]>(() => initial.map(fromSource));
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("");
  const [pct, setPct] = useState("");
  const [saving, setSaving] = useState(false);
  const [errIds, setErrIds] = useState<Set<string>>(new Set());

  const originMap = useMemo(() => new Map(origin.map((o) => [o.id, o])), [origin]);
  const areas = useMemo(() => Array.from(new Set(rows.map((r) => r.area))).sort((a, b) => a.localeCompare(b, "vi")), [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => (!area || r.area === area) && (!q || `${r.name} ${r.code}`.toLowerCase().includes(q)));
  }, [rows, search, area]);

  const dirtyStats = useMemo(() => {
    let cells = 0;
    let rowCount = 0;
    rows.forEach((r) => {
      const n = rowDirtyCells(r, originMap.get(r.id));
      cells += n;
      if (n) rowCount++;
    });
    return { cells, rowCount };
  }, [rows, originMap]);

  useUnsavedGuard(dirtyStats.cells > 0);

  function patch(id: string, p: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...p } : r)));
    setErrIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function patchDisc(id: string, p: Partial<DiscountState>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, disc: { ...r.disc, ...p } } : r)));
  }

  function changeMode(r: Row, mode: DiscountMode) {
    // Đổi kiểu: giữ lại các giá trị đã nhập nếu còn dùng được.
    const next: DiscountState = { mode, d1: r.disc.d1, d2: isDayMode(mode) ? r.disc.d2 : null, d3: isDayMode(mode) ? r.disc.d3 : null };
    if (mode === "none") {
      next.d1 = null;
      next.d2 = null;
      next.d3 = null;
    }
    patch(r.id, { disc: next });
  }

  function applyPercent() {
    const v = Number(pct);
    if (!v) {
      toast.error("Nhập % cần tăng/giảm trước (VD 10 hoặc -5).");
      return;
    }
    const ids = new Set(visible.map((r) => r.id));
    const mul = 1 + v / 100;
    setRows((prev) =>
      prev.map((r) =>
        ids.has(r.id)
          ? {
              ...r,
              p1: r.p1 == null ? null : roundK(r.p1 * mul),
              p2: r.p2 == null ? null : roundK(r.p2 * mul),
              p3: r.p3 == null ? null : roundK(r.p3 * mul),
            }
          : r
      )
    );
    toast.success(`Đã ${v > 0 ? "tăng" : "giảm"} ${Math.abs(v)}% giá của ${ids.size} villa — chưa lưu, soát lại rồi bấm "Lưu tất cả".`);
  }

  function undoAll() {
    setRows(origin.map((o) => ({ ...o, disc: { ...o.disc } })));
    setErrIds(new Set());
    toast("Đã hoàn tác, giá trở về như cũ.");
  }

  async function saveAll() {
    const dirty = rows.filter((r) => rowDirtyCells(r, originMap.get(r.id)) > 0);
    const bad = dirty.filter((r) => r.p1 == null || r.p2 == null || r.p3 == null);
    if (bad.length) {
      setErrIds(new Set(bad.map((r) => r.id)));
      toast.error(`${bad.length} villa đang để trống giá — nhập đủ 3 mức giá (tô đỏ) rồi lưu lại.`);
      return;
    }

    const updates = dirty.map((r) => {
      const o = originMap.get(r.id)!;
      const fields: Record<string, unknown> = {};
      if (r.p1 !== o.p1) fields.price_weekday = r.p1;
      if (r.p2 !== o.p2) fields.price_friday_sunday = r.p2;
      if (r.p3 !== o.p3) fields.price_saturday_holiday = r.p3;
      if (r.extra !== o.extra) fields.extra_guest_fee = r.extra;
      if (discDirty(r, o)) Object.assign(fields, discountToFields(r.disc));
      return { id: r.id, fields };
    });

    setSaving(true);
    try {
      const res = await fetch("/api/admin/bulk/product-prices", {
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
      const savedRows = dirty.filter((r) => !failedIds.has(r.id));
      const savedIds = new Set(savedRows.map((r) => r.id));
      setOrigin((prev) => prev.map((o) => (savedIds.has(o.id) ? { ...rows.find((r) => r.id === o.id)!, disc: { ...rows.find((r) => r.id === o.id)!.disc } } : o)));
      setErrIds(failedIds);
      if (failedIds.size) {
        toast.error(`Đã lưu ${savedRows.length} villa, ${failedIds.size} villa lỗi (tô đỏ): ${data.failed?.[0]?.error ?? ""}`);
      } else {
        toast.success(`Đã lưu ${savedRows.length} villa chỉ với 1 lần bấm.`);
      }
    } catch {
      toast.error("Mất kết nối, thử lại nhé.");
    } finally {
      setSaving(false);
    }
  }

  let lastArea = "";

  return (
    <div className="pb-20">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm tên hoặc mã villa..."
          className="h-10 w-52 rounded-xl border border-border bg-white px-3 text-[13px]"
        />
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="h-10 rounded-xl border border-border bg-white px-3 text-[13px]"
        >
          <option value="">Tất cả khu vực</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <span className="ml-2 text-[12px] text-ink-muted">Tăng/giảm giá</span>
        <input
          value={pct}
          onChange={(e) => setPct(e.target.value.replace(/[^\d.-]/g, ""))}
          placeholder="% (VD 10, -5)"
          className="h-10 w-32 rounded-xl border border-border bg-white px-3 text-[13px]"
        />
        <button
          type="button"
          onClick={applyPercent}
          className="h-10 rounded-xl border border-border bg-white px-4 text-[12.5px] font-bold hover:bg-paper-dim"
        >
          Áp dụng cho {visible.length} dòng đang hiện
        </button>
      </div>

      <div className="max-h-[68vh] overflow-auto rounded-2xl border border-border bg-white">
        <table className="w-full border-separate border-spacing-0 text-[12.5px]">
          <thead>
            <tr>
              <Th w={90} sticky={0}>Mã</Th>
              <Th w={210} sticky={90}>Tên villa</Th>
              <Th w={130} right>Giá T2 - T5</Th>
              <Th w={130} right>Giá T6 &amp; CN</Th>
              <Th w={130} right>Giá T7 &amp; Lễ</Th>
              <Th w={120}>Kiểu chiết khấu</Th>
              <Th w={110} right>CK (chung / T2-T5)</Th>
              <Th w={105} right>CK T6 &amp; CN</Th>
              <Th w={105} right>CK T7 &amp; Lễ</Th>
              <Th w={125} right>Phụ thu / khách vượt chuẩn</Th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={10} className="p-8 text-center text-sm text-ink-muted">
                  Không có villa phù hợp.
                </td>
              </tr>
            )}
            {visible.map((r) => {
              const o = originMap.get(r.id);
              const showArea = r.area !== lastArea;
              lastArea = r.area;
              const err = errIds.has(r.id);
              const unit = modeUnit(r.disc.mode);
              const day = isDayMode(r.disc.mode);
              const none = r.disc.mode === "none";
              const tiers: { k: "p1" | "p2" | "p3"; tier: 0 | 1 | 2 }[] = [
                { k: "p1", tier: 0 },
                { k: "p2", tier: 1 },
                { k: "p3", tier: 2 },
              ];
              return (
                <FragmentRow key={r.id} showArea={showArea} area={r.area}>
                  <Td sticky={0} className="px-2 py-2 text-[12px] font-semibold" style={{ width: 90, minWidth: 90 }}>
                    {r.code}
                  </Td>
                  <Td sticky={90} className="px-2 py-2 text-[12px]" style={{ width: 210, minWidth: 210 }}>
                    {r.name}
                  </Td>
                  {tiers.map(({ k, tier }) => {
                    const delta = o && r[k] != null && o[k] != null ? (r[k] as number) - (o[k] as number) : 0;
                    return (
                      <Td key={k} dirty={priceDirty(r, o, k)} err={err && r[k] == null}>
                        <NumCell value={r[k]} col={k} onChange={(v) => patch(r.id, { [k]: v } as Partial<Row>)} />
                        <PriceSub after={priceAfterDiscount(r[k], r.disc, tier)} delta={delta} hasDiscount={!none && !!(r[k] != null) && priceAfterDiscount(r[k], r.disc, tier) !== r[k]} />
                      </Td>
                    );
                  })}
                  <Td dirty={discDirty(r, o)}>
                    <SelectCell value={r.disc.mode} options={DISCOUNT_MODE_OPTIONS} onChange={(m) => changeMode(r, m)} />
                  </Td>
                  <Td dirty={discDirty(r, o)} className={none ? "!bg-paper-dim/60" : ""}>
                    {!none && <NumCell value={r.disc.d1} col="d1" suffix={unit} onChange={(v) => patchDisc(r.id, { d1: v })} />}
                  </Td>
                  <Td dirty={discDirty(r, o)} className={!day ? "!bg-paper-dim/60" : ""}>
                    {day && <NumCell value={r.disc.d2} col="d2" suffix={unit} onChange={(v) => patchDisc(r.id, { d2: v })} />}
                  </Td>
                  <Td dirty={discDirty(r, o)} className={!day ? "!bg-paper-dim/60" : ""}>
                    {day && <NumCell value={r.disc.d3} col="d3" suffix={unit} onChange={(v) => patchDisc(r.id, { d3: v })} />}
                  </Td>
                  <Td dirty={priceDirty(r, o, "extra")}>
                    <NumCell value={r.extra} col="extra" placeholder="—" onChange={(v) => patch(r.id, { extra: v })} />
                  </Td>
                </FragmentRow>
              );
            })}
          </tbody>
        </table>
      </div>

      <BulkSaveBar
        show={dirtyStats.cells > 0}
        message={
          <>
            Đã sửa <b className="text-sand-dark">{dirtyStats.cells} ô</b> của <b className="text-sand-dark">{dirtyStats.rowCount} villa</b> — chưa lưu
          </>
        }
        onSave={saveAll}
        onUndo={undoAll}
        saving={saving}
      />
    </div>
  );
}

/** 1 dòng villa, có thể kèm 1 dòng tiêu đề khu vực phía trên. */
function FragmentRow({
  showArea,
  area,
  children,
}: {
  showArea: boolean;
  area: string;
  children: React.ReactNode;
}) {
  return (
    <>
      {showArea && (
        <tr>
          <td colSpan={10} className="bg-teal-light px-3 py-1.5 text-[12px] font-bold text-teal-dark">
            {area}
          </td>
        </tr>
      )}
      <tr>{children}</tr>
    </>
  );
}
