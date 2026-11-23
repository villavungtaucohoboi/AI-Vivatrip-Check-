// Kiểm tra & chuẩn hoá dữ liệu báo giá gửi lên API — không tin dữ liệu từ trình duyệt.
import { QUOTE_GROUPS, newId, type QuoteGroup, type QuoteInput, type QuoteItem, type QuoteOption } from "@/lib/quote-types";

const MAX_OPTIONS = 20;
const MAX_ITEMS = 100;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : typeof v === "number" ? String(v).slice(0, max) : "");
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "number" && !/\d/.test(String(v))) return null;
  // "7.000.000" / "7,000,000" → 7000000
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const date = (v: unknown): string | null => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null);
const strList = (v: unknown, maxItems: number, maxLen: number) =>
  (Array.isArray(v) ? v : []).map((x) => str(x, maxLen)).filter(Boolean).slice(0, maxItems);
const id = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 64) : newId());

function item(raw: unknown): QuoteItem {
  const o = isObj(raw) ? raw : {};
  const group = (QUOTE_GROUPS as string[]).includes(o.group as string) ? (o.group as QuoteGroup) : "Khác";
  return {
    id: id(o.id),
    group,
    name: str(o.name, 200),
    note: str(o.note, 1000),
    qty: num(o.qty),
    qty_unit: str(o.qty_unit, 30),
    times: num(o.times),
    times_unit: str(o.times_unit, 30),
    unit_price: num(o.unit_price),
    vat: o.vat === true,
  };
}

function option(raw: unknown): QuoteOption | string {
  const o = isObj(raw) ? raw : {};
  const items = Array.isArray(o.items) ? o.items : [];
  if (items.length > MAX_ITEMS) return `Mỗi phương án tối đa ${MAX_ITEMS} dòng dịch vụ.`;
  return {
    id: id(o.id),
    name: str(o.name, 200),
    place: str(o.place, 200),
    image_url: /^https?:\/\//i.test(str(o.image_url, 1000)) ? str(o.image_url, 1000) : "",
    highlights: strList(o.highlights, 3, 200),
    product_id: typeof o.product_id === "string" && o.product_id ? o.product_id.slice(0, 64) : null,
    items: items.map(item),
  };
}

export function sanitizeQuoteInput(raw: unknown): { ok: true; value: QuoteInput } | { ok: false; error: string } {
  if (!isObj(raw)) return { ok: false, error: "Dữ liệu báo giá không hợp lệ." };
  const rawOptions = Array.isArray(raw.options) ? raw.options : [];
  if (rawOptions.length > MAX_OPTIONS) return { ok: false, error: `Tối đa ${MAX_OPTIONS} phương án.` };
  const options: QuoteOption[] = [];
  for (const r of rawOptions) {
    const o = option(r);
    if (typeof o === "string") return { ok: false, error: o };
    options.push(o);
  }
  const c = isObj(raw.customer) ? raw.customer : {};
  const p = isObj(raw.program) ? raw.program : {};
  const vr = num(raw.vat_rate);
  const pax = num(p.pax_count);
  return {
    ok: true,
    value: {
      status: raw.status === "sent" ? "sent" : "draft",
      customer: { name: str(c.name, 200), company: str(c.company, 200), phone: str(c.phone, 30), email: str(c.email, 200) },
      program: {
        title: str(p.title, 200),
        date_from: date(p.date_from),
        date_to: date(p.date_to),
        pax_text: str(p.pax_text, 100),
        pax_count: pax != null ? Math.round(pax) : null,
        itinerary_note: str(p.itinerary_note, 2000),
      },
      options,
      notes: strList(raw.notes, 20, 500),
      vat_rate: vr != null && vr <= 100 ? vr : 8,
      valid_until: date(raw.valid_until),
      sale_name: str(raw.sale_name, 100),
      sale_phone: str(raw.sale_phone, 30),
    },
  };
}
