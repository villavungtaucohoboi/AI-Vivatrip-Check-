"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ClipboardPaste, ImagePlus, Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { BulkSaveBar, NumCell, useUnsavedGuard } from "@/components/admin/bulk/bulk-ui";
import { ResortImagesManager } from "@/components/admin/bulk/resort-images-manager";
import { compressImage } from "@/lib/compress-image";
import { getPeriods, getRoomPrices, parseRanges, rangesToText } from "@/lib/resort-pricing";
import { cn } from "@/lib/utils";
import { PRODUCT_TYPE_LABEL, type HotelRate, type Product } from "@/lib/types";

export type ResortRow = Product;

const AMENITIES = [
  { k: "pool", l: "Hồ bơi" },
  { k: "near_beach", l: "Sát biển" },
  { k: "sea_view", l: "View biển" },
  { k: "near_lake", l: "View hồ" },
  { k: "karaoke", l: "Karaoke" },
  { k: "bbq", l: "BBQ" },
  { k: "pickleball", l: "Pickleball" },
] as const;
const DAYS = [
  { d: 1, l: "T2" },
  { d: 2, l: "T3" },
  { d: 3, l: "T4" },
  { d: 4, l: "T5" },
  { d: 5, l: "T6" },
  { d: 6, l: "T7" },
  { d: 0, l: "CN" },
];
type ResortType = "resort" | "hotel" | "homestay";

interface Period {
  key: string;
  name: string;
  rangesText: string;
  weekendSplit: boolean;
  holiday: boolean;
}
interface Room {
  key: string;
  id?: string;
  room_type: string;
  /** Gói giá: Ăn sáng / 2 bữa (HB) / All Inclusive / Commit… (trống = giá phòng chung) */
  rate_plan: string;
  area_m2: number | null;
  bed: string;
  capacity: number | null;
  max_children: number | null;
  breakfast: boolean;
  extra_bed_price: number | null;
  discount_percent: number | null;
  prices: Record<string, { wd: number | null; we: number | null }>;
}
interface Block {
  key: string;
  id?: string;
  info: {
    product_code: string;
    product_name: string;
    type: ResortType;
    area: string;
    address: string;
    star: number | null;
    image_link: string;
    price_source: string;
    group_key: string;
    perks: string;
    amenities: Record<string, boolean>;
  };
  periods: Period[];
  weekend: number[];
  surcharge: string;
  contract: string;
  rooms: Room[];
  deleted: string[];
}

let seq = 0;
const nk = (p = "k") => `${p}${Date.now().toString(36)}${++seq}`;
/** Gõ "1650" → hiểu 1.650.000 */
const money = (v: number | null) => (v != null && v > 0 && v < 100000 ? v * 1000 : v);
const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().trim();

function fromProduct(p: Product, rates: HotelRate[]): Block {
  const periods = getPeriods(p);
  const own = rates.filter((r) => r.product_id === p.id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.price - b.price);
  const usedKeys = new Set<string>();
  const anyWe = new Set<string>();
  own.forEach((r) =>
    Object.entries(getRoomPrices(r, p)).forEach(([k, v]) => {
      if (v?.wd != null || v?.we != null) usedKeys.add(k);
      if (v?.we != null) anyWe.add(k);
    })
  );
  // Dữ liệu cũ: chỉ giữ các giai đoạn đang có giá
  const keep = p.rate_periods?.length ? periods : periods.filter((x) => usedKeys.has(x.key) || x.key === "low");
  return {
    key: p.id,
    id: p.id,
    info: {
      product_code: p.product_code ?? "",
      product_name: p.product_name,
      type: (p.type as ResortType) ?? "resort",
      area: p.area ?? "",
      address: p.address ?? "",
      star: p.star ?? null,
      image_link: p.image_link ?? "",
      price_source: p.price_source ?? "",
      group_key: p.group_key ?? "",
      perks: p.perks ?? "",
      amenities: Object.fromEntries(AMENITIES.map((a) => [a.k, !!p[a.k]])),
    },
    periods: keep.map((x) => ({ key: x.key, name: x.name, rangesText: rangesToText(x.ranges), weekendSplit: anyWe.has(x.key), holiday: !!x.holiday })),
    weekend: p.weekend_nights?.length ? p.weekend_nights : [5, 6],
    surcharge: p.surcharge_note ?? "",
    contract: p.contract_summary ?? "",
    rooms: own.map((r) => ({
      key: nk(),
      id: r.id,
      room_type: r.room_type,
      rate_plan: r.rate_plan ?? "",
      area_m2: r.area_m2 ?? null,
      bed: r.bed ?? "",
      capacity: r.capacity,
      max_children: r.max_children ?? null,
      breakfast: r.breakfast,
      extra_bed_price: r.extra_bed_price != null ? Number(r.extra_bed_price) : null,
      discount_percent: r.discount_percent ? Number(r.discount_percent) : null,
      prices: Object.fromEntries(Object.entries(getRoomPrices(r, p)).map(([k, v]) => [k, { wd: v?.wd ?? null, we: v?.we ?? null }])),
    })),
    deleted: [],
  };
}
function emptyBlock(type: ResortType = "resort"): Block {
  return {
    key: nk("new"),
    info: { product_code: "", product_name: "", type, area: "", address: "", star: null, image_link: "", price_source: "", group_key: "", perks: "", amenities: {} },
    periods: [{ key: "p1", name: "Giá chung", rangesText: "", weekendSplit: false, holiday: false }],
    weekend: [5, 6],
    surcharge: "",
    contract: "",
    rooms: [],
    deleted: [],
  };
}
const emptyRoom = (): Room => ({
  key: nk(),
  room_type: "",
  rate_plan: "",
  area_m2: null,
  bed: "",
  capacity: 2,
  max_children: null,
  breakfast: true,
  extra_bed_price: null,
  discount_percent: null,
  prices: {},
});
const snap = (b: Block) => JSON.stringify({ ...b, key: undefined, rooms: b.rooms.map(({ key: _k, ...r }) => r) });

/** Kết quả AI → khối resort (giữ id hạng phòng cũ trùng tên). */
function applyAI(b: Block, ai: AIRes): Block {
  const byName = new Map(b.rooms.map((r) => [plain(`${r.room_type}|${r.rate_plan}`), r]));
  const rooms: Room[] = ai.rooms.map((r) => {
    const nameKey = plain(`${r.room_type}|${r.rate_plan ?? ""}`);
    const old = byName.get(nameKey);
    if (old) byName.delete(nameKey);
    return {
      key: old?.key ?? nk(),
      id: old?.id,
      room_type: r.room_type,
      rate_plan: r.rate_plan ?? old?.rate_plan ?? "",
      area_m2: r.area_m2 ?? old?.area_m2 ?? null,
      bed: r.bed ?? old?.bed ?? "",
      capacity: r.capacity ?? old?.capacity ?? null,
      max_children: r.max_children ?? old?.max_children ?? null,
      breakfast: r.breakfast,
      extra_bed_price: r.extra_bed_price ?? old?.extra_bed_price ?? null,
      discount_percent: old?.discount_percent ?? null,
      prices: r.prices,
    };
  });
  const res = ai.resort;
  return {
    ...b,
    info: {
      ...b.info,
      product_name: b.info.product_name || res.name,
      type: b.id ? b.info.type : (res.type as ResortType),
      area: b.info.area || res.area,
      address: b.info.address || res.address,
      star: res.star ?? b.info.star,
      image_link: res.image_link || b.info.image_link,
      perks: res.perks || b.info.perks,
      amenities: { ...b.info.amenities, ...Object.fromEntries(Object.entries(res.amenities).filter(([, v]) => v)) },
    },
    periods: ai.periods.map((p) => ({
      key: p.key,
      name: p.name,
      rangesText: rangesToText(p.ranges),
      weekendSplit: p.weekend_split || rooms.some((r) => r.prices[p.key]?.we != null),
      holiday: p.holiday,
    })),
    weekend: ai.weekend_nights?.length ? ai.weekend_nights : b.weekend,
    surcharge: ai.surcharge_note || b.surcharge,
    contract: ai.contract_summary || b.contract,
    // hạng phòng cũ không có trong tài liệu → xoá (Admin bấm Hoàn tác nếu không muốn)
    rooms,
    deleted: [...b.deleted, ...[...byName.values()].map((r) => r.id).filter((x): x is string => !!x)],
  };
}

export function ResortPricingSheet({
  resorts,
  rates,
  images = {},
  openNew = false,
}: {
  resorts: ResortRow[];
  rates: HotelRate[];
  images?: Record<string, string[]>;
  openNew?: boolean;
}) {
  const [blocks, setBlocks] = useState<Block[]>(() => resorts.map((p) => fromProduct(p, rates)));
  const [origin, setOrigin] = useState<Record<string, string>>(() =>
    Object.fromEntries(resorts.map((p) => [p.id, snap(fromProduct(p, rates))]))
  );
  const [q, setQ] = useState("");
  const [type, setType] = useState<"" | ResortType>("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  // Khối đang MỞ RỘNG (xem bảng phòng). Mặc định thu gọn → danh sách gọn, bấm vào mới sửa.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [area, setArea] = useState("");
  const [source, setSource] = useState("");
  const [aiFor, setAiFor] = useState<string | "new" | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (openNew) setAiFor("new");
  }, [openNew]);

  const dirty = useMemo(() => blocks.filter((b) => !b.id || snap(b) !== origin[b.key]), [blocks, origin]);
  useUnsavedGuard(dirty.length > 0);

  const areas = useMemo(() => [...new Set(blocks.map((b) => b.info.area.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi")), [blocks]);
  const sources = useMemo(() => [...new Set(blocks.map((b) => b.info.price_source.trim()).filter(Boolean))].sort(), [blocks]);
  const visible = blocks.filter(
    (b) =>
      !b.id ||
      ((!type || b.info.type === type) &&
        (!area || b.info.area.trim() === area) &&
        (!source || (source === "-" ? !b.info.price_source.trim() : b.info.price_source.trim() === source)) &&
        (!q.trim() || plain(`${b.info.product_name} ${b.info.product_code} ${b.info.area} ${b.info.price_source}`).includes(plain(q))))
  );
  const toggleExpand = (k: string) =>
    setExpanded((prev) => {
      const s = new Set(prev);
      if (s.has(k)) s.delete(k);
      else s.add(k);
      return s;
    });

  const upd = (key: string, fn: (b: Block) => Block) => setBlocks((prev) => prev.map((b) => (b.key === key ? fn(b) : b)));
  const updRoom = (bk: string, rk: string, p: Partial<Room>) => upd(bk, (b) => ({ ...b, rooms: b.rooms.map((r) => (r.key === rk ? { ...r, ...p } : r)) }));
  const toggleOpen = (k: string) =>
    setOpen((prev) => {
      const s = new Set(prev);
      if (s.has(k)) s.delete(k);
      else s.add(k);
      return s;
    });

  async function saveAll() {
    if (!dirty.length) return;
    const bad = dirty.find((b) => !b.info.product_name.trim() || !b.info.area.trim());
    if (bad) return void toast.error("Resort mới cần có Tên và Khu vực.");
    setSaving(true);
    try {
      const payload = dirty.map((b) => ({
        id: b.id,
        clientKey: b.key,
        info: b.info,
        periods: b.periods.map((p) => ({ key: p.key, name: p.name, ranges: parseRanges(p.rangesText), holiday: p.holiday })),
        weekend_nights: b.weekend,
        surcharge_note: b.surcharge,
        contract_summary: b.contract,
        rooms: b.rooms.map(({ key: _k, prices, ...r }) => ({
          ...r,
          // chỉ gửi giá của các giai đoạn còn tồn tại; giai đoạn không tách cuối tuần → bỏ giá cuối tuần
          period_prices: Object.fromEntries(
            b.periods.map((p) => [p.key, { wd: prices[p.key]?.wd ?? null, we: p.weekendSplit ? prices[p.key]?.we ?? null : null }])
          ),
        })),
        deleted: b.deleted,
      }));
      const res = await fetch("/api/admin/bulk/resort-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resorts: payload }),
      });
      const data = (await res.json()) as { saved?: number; failed?: { key: string; error: string }[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Lưu thất bại");
      if (data.failed?.length) {
        const f = data.failed[0];
        const name = blocks.find((b) => b.key === f.key)?.info.product_name || "Resort mới";
        toast.error(`${name}: ${f.error}`);
      }
      if (data.saved) {
        toast.success(`Đã lưu ${data.saved} nơi — đang tải lại…`);
        setOrigin(Object.fromEntries(blocks.map((b) => [b.key, snap(b)])));
        setTimeout(() => window.location.reload(), 700);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-28">
      <div className="sticky top-16 z-20 -mx-4 flex flex-wrap items-center gap-2 border-b border-border bg-paper/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <button
          onClick={() => setAiFor("new")}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal to-sand px-4 text-[13px] font-bold text-white shadow-sm"
        >
          <Sparkles className="h-4 w-4" /> Thêm mới bằng AI (dán hợp đồng / ảnh)
        </button>
        <button
          onClick={() => {
            const b = emptyBlock();
            setBlocks((prev) => [b, ...prev]);
            setOpen((prev) => new Set(prev).add(b.key));
          }}
          className="flex h-10 items-center gap-1 rounded-xl border border-border bg-white px-3 text-[12.5px] font-bold text-ink"
        >
          <Plus className="h-4 w-4" /> Thêm tay
        </button>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm tên / mã / khu vực…"
          className="h-10 min-w-[180px] flex-1 rounded-xl border border-border bg-white px-3 text-[13.5px] outline-none focus:border-teal"
        />
        {(["", "resort", "hotel", "homestay"] as const).map((t) => (
          <button
            key={t || "all"}
            onClick={() => setType(t)}
            className={cn("h-10 rounded-xl px-3 text-[12.5px] font-bold", type === t ? "bg-teal text-white" : "border border-border bg-white text-ink-muted")}
          >
            {t === "" ? "Tất cả" : PRODUCT_TYPE_LABEL[t]}
          </button>
        ))}
        <select value={area} onChange={(e) => setArea(e.target.value)} className="h-10 rounded-xl border border-border bg-white px-2 text-[12.5px] font-bold text-ink">
          <option value="">📍 Mọi khu vực</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a} ({blocks.filter((b) => b.info.area.trim() === a).length})
            </option>
          ))}
        </select>
        {sources.length > 0 && (
          <select value={source} onChange={(e) => setSource(e.target.value)} className="h-10 rounded-xl border border-border bg-white px-2 text-[12.5px] font-bold text-ink">
            <option value="">🤝 Mọi đối tác</option>
            {sources.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
            <option value="-">Chưa ghi đối tác</option>
          </select>
        )}
        <button
          onClick={() => setExpanded((prev) => (prev.size ? new Set() : new Set(visible.map((b) => b.key))))}
          className="h-10 rounded-xl border border-border bg-white px-3 text-[12.5px] font-bold text-ink-muted"
        >
          {expanded.size ? "Thu gọn tất cả" : "Mở tất cả"}
        </button>
        <span className="text-[12px] font-semibold text-ink-muted">{visible.length} nơi</span>
      </div>

      <div className="mt-3 space-y-2">
        {visible.map((b) => {
          const isDirty = dirty.some((d) => d.key === b.key);
          const isExpanded = expanded.has(b.key) || !b.id;
          const isOpen = isExpanded && (open.has(b.key) || !b.id);
          const allPrices = b.rooms.flatMap((r) => Object.values(r.prices).flatMap((v) => [v?.wd, v?.we])).filter((x): x is number => typeof x === "number" && x > 0);
          const minP = allPrices.length ? Math.min(...allPrices) : null;
          const cols = b.periods.flatMap((p) =>
            p.weekendSplit
              ? [
                  { p, we: false, label: p.name, sub: "Ngày thường" },
                  { p, we: true, label: p.name, sub: "Cuối tuần" },
                ]
              : [{ p, we: false, label: p.name, sub: p.holiday ? "Ngày lễ" : "" }]
          );
          return (
            <div key={b.key} className={cn("overflow-hidden rounded-2xl border bg-white", isDirty ? "border-sand ring-1 ring-sand/50" : "border-border")}>
              {/* Tiêu đề */}
              <div className={cn("flex flex-wrap items-center gap-2 px-3 py-2.5", isExpanded ? "bg-teal-light/60" : "bg-white hover:bg-paper/70")}>
                <button type="button" onClick={() => toggleExpand(b.key)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-muted transition-transform", !isExpanded && "-rotate-90")} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-bold text-ink">
                    {b.info.product_name || <span className="text-ink-muted">Resort / khách sạn mới</span>}
                    {b.info.star ? <span className="ml-1 text-amber-500">{"★".repeat(b.info.star)}</span> : null}
                  </p>
                  <p className="text-[11.5px] text-ink-muted">
                    {PRODUCT_TYPE_LABEL[b.info.type]} · {b.info.area || "chưa có khu vực"} · {b.periods.length} giai đoạn · {b.rooms.length} hạng phòng
                    {!b.id && <span className="ml-1.5 rounded bg-teal px-1.5 font-semibold text-white">MỚI</span>}
                    {b.id && isDirty && <span className="ml-1.5 rounded bg-sand-light px-1.5 font-semibold text-sand-dark">chưa lưu</span>}
                    {b.info.price_source && <span className="ml-1.5 font-semibold text-amber-700">· 🤝 {b.info.price_source}</span>}
                  </p>
                </div>
                {!isExpanded && minP != null && (
                  <span className="shrink-0 text-right text-[12px] text-ink-muted">
                    từ <b className="text-[14px] text-ink">{new Intl.NumberFormat("vi-VN").format(Math.round(minP / 1000))}k</b>
                  </span>
                )}
                </button>
                <button
                  onClick={() => {
                    setExpanded((prev) => new Set(prev).add(b.key));
                    setAiFor(b.key);
                  }}
                  className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-teal to-sand px-3 py-1.5 text-[12px] font-bold text-white"
                >
                  <Sparkles className="h-3.5 w-3.5" /> AI điền
                </button>
                <button
                  onClick={() => {
                    if (!isExpanded) {
                      setExpanded((prev) => new Set(prev).add(b.key));
                      setOpen((prev) => new Set(prev).add(b.key));
                    } else toggleOpen(b.key);
                  }}
                  className="flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-1.5 text-[12px] font-bold text-ink"
                >
                  Thông tin · giai đoạn · phụ thu <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
                </button>
                {!b.id && (
                  <button
                    onClick={() => setBlocks((prev) => prev.filter((x) => x.key !== b.key))}
                    className="rounded-lg p-1.5 text-ink-muted hover:bg-hot-light hover:text-hot"
                    aria-label="Bỏ resort mới"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {isOpen && (
                <div className="grid gap-4 border-b border-border bg-paper/60 p-3 lg:grid-cols-2">
                  {/* Cột trái: thông tin + tiện ích */}
                  <div className="space-y-2.5">
                    <p className="text-[12px] font-extrabold uppercase tracking-wide text-teal-dark">Thông tin & tiện ích</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Tên *" span>
                        <input value={b.info.product_name} onChange={(e) => upd(b.key, (x) => ({ ...x, info: { ...x.info, product_name: e.target.value } }))} className={inp} />
                      </Field>
                      <Field label="Loại">
                        <select value={b.info.type} onChange={(e) => upd(b.key, (x) => ({ ...x, info: { ...x.info, type: e.target.value as ResortType } }))} className={inp}>
                          <option value="resort">Resort</option>
                          <option value="hotel">Khách sạn</option>
                          <option value="homestay">Homestay</option>
                        </select>
                      </Field>
                      <Field label="Hạng sao">
                        <select
                          value={b.info.star ?? ""}
                          onChange={(e) => upd(b.key, (x) => ({ ...x, info: { ...x.info, star: e.target.value ? Number(e.target.value) : null } }))}
                          className={inp}
                        >
                          <option value="">—</option>
                          {[2, 3, 4, 5].map((s) => (
                            <option key={s} value={s}>
                              {s} sao
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Khu vực * (VD Hội An)">
                        <input value={b.info.area} onChange={(e) => upd(b.key, (x) => ({ ...x, info: { ...x.info, area: e.target.value } }))} className={inp} />
                      </Field>
                      <Field label="Mã (để trống = tự tạo)">
                        <input value={b.info.product_code} onChange={(e) => upd(b.key, (x) => ({ ...x, info: { ...x.info, product_code: e.target.value } }))} className={inp} />
                      </Field>
                      <Field label="Địa chỉ" span>
                        <input value={b.info.address} onChange={(e) => upd(b.key, (x) => ({ ...x, info: { ...x.info, address: e.target.value } }))} className={inp} />
                      </Field>
                      <Field label="Giá mua của (nguồn / NCC — chỉ Sale xem)" span>
                        <input value={b.info.price_source} placeholder="VD: Mustgo · 092 5959 777" onChange={(e) => upd(b.key, (x) => ({ ...x, info: { ...x.info, price_source: e.target.value } }))} className={inp} />
                      </Field>
                      <Field label="Gộp đối tác — tên chung của khách sạn (trống = tự gộp theo tên)" span>
                        <input value={b.info.group_key} placeholder="Chỉ điền khi 2 đối tác ghi tên khác nhau, VD: Melia Ba Vi" onChange={(e) => upd(b.key, (x) => ({ ...x, info: { ...x.info, group_key: e.target.value } }))} className={inp} />
                      </Field>
                      <Field label="Link album ảnh gốc (Sale xem)" span>
                        <input value={b.info.image_link} onChange={(e) => upd(b.key, (x) => ({ ...x, info: { ...x.info, image_link: e.target.value } }))} className={inp} />
                      </Field>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {AMENITIES.map((a) => {
                        const on = !!b.info.amenities[a.k];
                        return (
                          <button
                            key={a.k}
                            type="button"
                            onClick={() => upd(b.key, (x) => ({ ...x, info: { ...x.info, amenities: { ...x.info.amenities, [a.k]: !on } } }))}
                            className={cn("rounded-full px-3 py-1 text-[12px] font-semibold", on ? "bg-teal text-white" : "border border-border bg-white text-ink-muted")}
                          >
                            {on ? "✓ " : ""}
                            {a.l}
                          </button>
                        );
                      })}
                    </div>
                    <Field label="Quyền lợi / tiện ích bao gồm (gửi khách được)">
                      <textarea
                        value={b.info.perks}
                        onChange={(e) => upd(b.key, (x) => ({ ...x, info: { ...x.info, perks: e.target.value } }))}
                        rows={4}
                        placeholder={"✅ Ăn sáng buffet\n✅ Xe đưa đón phố cổ\n✅ Wifi, gym, hồ bơi vô cực"}
                        className={cn(inp, "h-auto py-2")}
                      />
                    </Field>
                  </div>

                  {/* Cột phải: giai đoạn + phụ thu + hợp đồng */}
                  <div className="space-y-2.5">
                    <p className="text-[12px] font-extrabold uppercase tracking-wide text-teal-dark">Giai đoạn giá</p>
                    <div className="space-y-1.5">
                      {b.periods.map((p, pi) => (
                        <div key={p.key} className="rounded-xl border border-border bg-white p-2">
                          <div className="flex items-center gap-1.5">
                            <input
                              value={p.name}
                              onChange={(e) => upd(b.key, (x) => ({ ...x, periods: x.periods.map((y) => (y.key === p.key ? { ...y, name: e.target.value } : y)) }))}
                              className={cn(inp, "h-8 w-36 font-bold")}
                            />
                            <input
                              value={p.rangesText}
                              disabled={p.holiday}
                              onChange={(e) => upd(b.key, (x) => ({ ...x, periods: x.periods.map((y) => (y.key === p.key ? { ...y, rangesText: e.target.value } : y)) }))}
                              placeholder={pi === 0 ? "Để trống = mọi ngày còn lại" : "02/01/2026-31/05/2026; 03/09/2026-23/12/2026"}
                              className={cn(inp, "h-8 flex-1 disabled:bg-paper-dim")}
                            />
                            <button
                              type="button"
                              onClick={() => upd(b.key, (x) => ({ ...x, periods: x.periods.filter((y) => y.key !== p.key) }))}
                              disabled={b.periods.length <= 1}
                              className="rounded p-1 text-ink-muted hover:text-hot disabled:opacity-30"
                              aria-label="Xoá giai đoạn"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="mt-1 flex gap-3 text-[11.5px] text-ink-muted">
                            <label className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={p.weekendSplit}
                                onChange={(e) =>
                                  upd(b.key, (x) => ({ ...x, periods: x.periods.map((y) => (y.key === p.key ? { ...y, weekendSplit: e.target.checked } : y)) }))
                                }
                                className="accent-[#EF4F58]"
                              />
                              Có giá cuối tuần riêng
                            </label>
                            <label className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={p.holiday}
                                onChange={(e) =>
                                  upd(b.key, (x) => ({ ...x, periods: x.periods.map((y) => (y.key === p.key ? { ...y, holiday: e.target.checked } : y)) }))
                                }
                                className="accent-[#EF4F58]"
                              />
                              Áp cho ngày lễ (lịch chung)
                            </label>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          upd(b.key, (x) => ({
                            ...x,
                            periods: [...x.periods, { key: nk("p"), name: `Giai đoạn ${x.periods.length + 1}`, rangesText: "", weekendSplit: false, holiday: false }],
                          }))
                        }
                        className="flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5 text-[12px] font-bold text-ink-muted hover:bg-paper-dim"
                      >
                        <Plus className="h-3.5 w-3.5" /> Thêm giai đoạn (cao điểm, đỉnh điểm, lễ Tết…)
                      </button>
                      <p className="text-[11px] text-ink-muted">
                        Ngày trùng nhiều giai đoạn → lấy giai đoạn ở DƯỚI. Ngày không thuộc giai đoạn nào → dùng giai đoạn đầu tiên.
                      </p>
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-ink-muted">Đêm tính giá cuối tuần</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {DAYS.map(({ d, l }) => {
                          const on = b.weekend.includes(d);
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => upd(b.key, (x) => ({ ...x, weekend: on ? x.weekend.filter((y) => y !== d) : [...x.weekend, d] }))}
                              className={cn("h-7 w-9 rounded-lg text-[11.5px] font-bold", on ? "bg-teal text-white" : "border border-border bg-white text-ink-muted")}
                            >
                              {l}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <Field label="Phụ thu (Sale xem)">
                      <textarea value={b.surcharge} onChange={(e) => upd(b.key, (x) => ({ ...x, surcharge: e.target.value }))} rows={3} className={cn(inp, "h-auto py-2")} />
                    </Field>
                    <Field label="Tóm tắt hợp đồng (CHỈ Sale xem)">
                      <textarea
                        value={b.contract}
                        onChange={(e) => upd(b.key, (x) => ({ ...x, contract: e.target.value }))}
                        rows={5}
                        className={cn(inp, "h-auto border-dashed border-amber-300 bg-amber-50/60 py-2")}
                      />
                    </Field>
                  </div>
                  <div className="border-t border-border pt-3 lg:col-span-2">
                    {b.id ? (
                      <ResortImagesManager productId={b.id} initial={images[b.id] ?? []} />
                    ) : (
                      <p className="text-[12px] text-ink-muted">📷 Bấm <b>Lưu tất cả</b> trước, sau đó mở lại khung này để tải ảnh lên.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Bảng hạng phòng × giai đoạn */}
              {isExpanded && (<>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[12.5px]" style={{ minWidth: 640 + cols.length * 110 }}>
                  <thead>
                    <tr className="bg-paper-dim/70 text-[10.5px] font-bold uppercase text-ink-muted">
                      <th className="px-2 py-1.5 text-left">Hạng phòng</th>
                      <th className="w-12 px-1 text-right">m²</th>
                      <th className="w-28 px-1 text-left">Giường</th>
                      <th className="w-12 px-1 text-right">NL</th>
                      <th className="w-12 px-1 text-right">TE</th>
                      <th className="w-12 px-1 text-center">Ăn sáng</th>
                      {cols.map((c) => (
                        <th key={`${c.p.key}-${c.we}`} className="w-[110px] px-1 text-right leading-tight">
                          {c.label}
                          {c.sub && <span className="block font-medium normal-case">{c.sub}</span>}
                        </th>
                      ))}
                      <th className="w-24 px-1 text-right">Giường phụ</th>
                      <th className="w-12 px-1 text-right">CK %</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {b.rooms.map((r) => (
                      <tr key={r.key} className="border-t border-border">
                        <td className="px-1">
                          <input
                            value={r.room_type}
                            onChange={(e) => updRoom(b.key, r.key, { room_type: e.target.value })}
                            placeholder="Tên hạng phòng"
                            className="h-8 w-full bg-transparent px-1.5 font-semibold outline-none focus:bg-teal-light"
                          />
                          <input
                            value={r.rate_plan}
                            onChange={(e) => updRoom(b.key, r.key, { rate_plan: e.target.value })}
                            placeholder="Gói: Ăn sáng / 2 bữa…"
                            className="h-6 w-full bg-transparent px-1.5 text-[11px] text-amber-800 outline-none placeholder:text-ink-muted/50 focus:bg-amber-50"
                          />
                        </td>
                        <td>
                          <NumCell value={r.area_m2} col={`${b.key}-m2`} onChange={(v) => updRoom(b.key, r.key, { area_m2: v })} />
                        </td>
                        <td>
                          <input
                            value={r.bed}
                            onChange={(e) => updRoom(b.key, r.key, { bed: e.target.value })}
                            placeholder="1 đôi / 2 đơn"
                            className="h-9 w-full bg-transparent px-1.5 outline-none focus:bg-teal-light"
                          />
                        </td>
                        <td>
                          <NumCell value={r.capacity} col={`${b.key}-nl`} onChange={(v) => updRoom(b.key, r.key, { capacity: v })} />
                        </td>
                        <td>
                          <NumCell value={r.max_children} col={`${b.key}-te`} onChange={(v) => updRoom(b.key, r.key, { max_children: v })} />
                        </td>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            checked={r.breakfast}
                            onChange={(e) => updRoom(b.key, r.key, { breakfast: e.target.checked })}
                            className="h-4 w-4 accent-[#EF4F58]"
                          />
                        </td>
                        {cols.map((c) => (
                          <td key={`${c.p.key}-${c.we}`}>
                            <NumCell
                              value={(c.we ? r.prices[c.p.key]?.we : r.prices[c.p.key]?.wd) ?? null}
                              col={`${b.key}-${c.p.key}-${c.we}`}
                              placeholder="—"
                              onChange={(v) =>
                                updRoom(b.key, r.key, {
                                  prices: {
                                    ...r.prices,
                                    [c.p.key]: { wd: r.prices[c.p.key]?.wd ?? null, we: r.prices[c.p.key]?.we ?? null, [c.we ? "we" : "wd"]: money(v) },
                                  },
                                })
                              }
                            />
                          </td>
                        ))}
                        <td>
                          <NumCell value={r.extra_bed_price} col={`${b.key}-eb`} placeholder="—" onChange={(v) => updRoom(b.key, r.key, { extra_bed_price: money(v) })} />
                        </td>
                        <td>
                          <NumCell value={r.discount_percent} col={`${b.key}-ck`} suffix="%" onChange={(v) => updRoom(b.key, r.key, { discount_percent: v })} />
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            onClick={() =>
                              upd(b.key, (x) => ({ ...x, rooms: x.rooms.filter((y) => y.key !== r.key), deleted: r.id ? [...x.deleted, r.id] : x.deleted }))
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
              <div className="flex items-center gap-3 p-2">
                <button
                  type="button"
                  onClick={() => upd(b.key, (x) => ({ ...x, rooms: [...x.rooms, emptyRoom()] }))}
                  className="flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5 text-[12px] font-bold text-ink-muted hover:bg-paper-dim"
                >
                  <Plus className="h-3.5 w-3.5" /> Thêm hạng phòng
                </button>
                <span className="text-[11px] text-ink-muted">Gõ “1700” = 1.700.000đ · NL = người lớn, TE = trẻ em tối đa/phòng</span>
              </div>
              </>)}
            </div>
          );
        })}
        {!visible.length && <p className="py-10 text-center text-sm text-ink-muted">Chưa có resort / khách sạn nào khớp.</p>}
      </div>

      {aiFor && (
        <AIImportDialog
          title={aiFor === "new" ? "Thêm resort / khách sạn / homestay mới bằng AI" : `AI điền · ${blocks.find((b) => b.key === aiFor)?.info.product_name}`}
          onClose={() => setAiFor(null)}
          onResult={(res) => {
            if (aiFor === "new") {
              const b = applyAI(emptyBlock(), res);
              setBlocks((prev) => [b, ...prev]);
              setOpen((prev) => new Set(prev).add(b.key));
              window.scrollTo({ top: 0, behavior: "smooth" });
            } else {
              upd(aiFor, (b) => applyAI(b, res));
              setOpen((prev) => new Set(prev).add(aiFor));
            }
            toast.success(`AI đã điền ${res.periods.length} giai đoạn, ${res.rooms.length} hạng phòng — kiểm tra lại rồi bấm Lưu.`);
            setAiFor(null);
          }}
        />
      )}

      <BulkSaveBar
        show={dirty.length > 0}
        message={
          <>
            Có <b className="text-sand-dark">{dirty.length} nơi</b> thay đổi — chưa lưu
          </>
        }
        onSave={saveAll}
        onUndo={() => {
          setBlocks(resorts.map((p) => fromProduct(p, rates)));
          toast.success("Đã hoàn tác mọi thay đổi chưa lưu.");
        }}
        saving={saving}
      />
    </div>
  );
}

const inp = "h-9 w-full rounded-lg border border-border bg-white px-2.5 text-[13px] font-medium text-ink outline-none focus:border-teal";
function Field({ label, span, children }: { label: string; span?: boolean; children: React.ReactNode }) {
  return (
    <label className={cn("block text-[11.5px] font-bold text-ink-muted", span && "col-span-2")}>
      {label}
      <div className="mt-0.5">{children}</div>
    </label>
  );
}

interface AIRes {
  resort: {
    name: string;
    type: string;
    star: number | null;
    area: string;
    address: string;
    image_link: string;
    perks: string;
    amenities: Record<string, boolean>;
  };
  periods: { key: string; name: string; ranges: { from: string; to: string }[]; weekend_split: boolean; holiday: boolean }[];
  weekend_nights: number[];
  rooms: {
    room_type: string;
    rate_plan?: string;
    area_m2: number | null;
    bed: string | null;
    capacity: number | null;
    max_children: number | null;
    breakfast: boolean;
    extra_bed_price: number | null;
    prices: Record<string, { wd: number | null; we: number | null }>;
  }[];
  surcharge_note: string;
  contract_summary: string;
}

async function toB64(file: File): Promise<{ url: string; mime: string; data: string }> {
  const small = await compressImage(file);
  const buf = new Uint8Array(await small.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { url: URL.createObjectURL(small), mime: small.type || "image/jpeg", data: btoa(bin) };
}

function AIImportDialog({ title, onClose, onResult }: { title: string; onClose: () => void; onResult: (r: AIRes) => void }) {
  const [text, setText] = useState("");
  const [imgs, setImgs] = useState<{ url: string; mime: string; data: string }[]>([]);
  const [busy, setBusy] = useState(false);

  async function addFiles(files: File[]) {
    const list = files.filter((f) => f.type.startsWith("image/")).slice(0, 6 - imgs.length);
    if (!list.length) return;
    const out = await Promise.all(list.map(toB64));
    setImgs((prev) => [...prev, ...out].slice(0, 6));
  }

  // Ctrl+V ảnh chụp màn hình thẳng vào hộp thoại
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.some((f) => f.type.startsWith("image/"))) {
        e.preventDefault();
        addFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgs.length]);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/resort-ai-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, images: imgs.map(({ mime, data }) => ({ mime, data })) }),
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
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="font-display text-[17px] font-bold text-ink">{title}</p>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-paper-dim" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-3 text-[12.5px] leading-relaxed text-ink-muted">
          Dán <b>chữ</b> hợp đồng / bảng giá, hoặc <b>Ctrl+V ảnh chụp màn hình</b> (tối đa 6 ảnh), hoặc chọn ảnh. AI tự điền: tên, hạng sao, khu vực, tiện ích,
          <b> các giai đoạn & khoảng ngày</b>, hạng phòng + giá từng giai đoạn, giường phụ, phụ thu, tóm tắt hợp đồng. Bạn xem lại rồi mới Lưu.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          placeholder="Dán nội dung hợp đồng / bảng giá vào đây (copy từ Excel, Word, Zalo đều được)…"
          className="w-full rounded-xl border border-border p-3 text-[13px] outline-none focus:border-teal"
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-3 text-[12.5px] font-semibold text-ink-muted hover:bg-paper-dim">
            <ImagePlus className="h-4 w-4" /> Chọn ảnh
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(Array.from(e.target.files ?? []))} />
          </label>
          <div className="flex items-center justify-center gap-2 rounded-xl bg-paper-dim p-3 text-[12px] font-semibold text-ink-muted">
            <ClipboardPaste className="h-4 w-4" /> Hoặc Ctrl+V ảnh
          </div>
        </div>
        {imgs.length > 0 && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {imgs.map((im, i) => (
              <div key={im.url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.url} alt="" className="h-24 w-full rounded-lg border border-border object-cover" />
                <button
                  onClick={() => setImgs((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                  aria-label="Bỏ ảnh"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={run}
          disabled={busy || (!text.trim() && !imgs.length)}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal to-sand text-[14px] font-bold text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? "AI đang đọc… (15–40 giây)" : "Đọc và điền"}
        </button>
        <p className="mt-2 text-center text-[11px] text-ink-muted">Cần cài GEMINI_API_KEY trên Vercel.</p>
      </div>
    </div>
  );
}
