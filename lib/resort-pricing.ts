import type { Holiday, HotelRate, Product } from "@/lib/types";

/**
 * GIÁ RESORT / KHÁCH SẠN THEO MÙA
 * Mỗi hạng phòng có 5 mức: thấp điểm (ngày thường / cuối tuần), cao điểm
 * (ngày thường / cuối tuần), lễ Tết. Mỗi ĐÊM được xếp vào đúng 1 mức:
 *  - ngày lễ (bảng holidays chung của app) → lễ Tết
 *  - nằm trong mùa cao điểm của resort → cao điểm, ngược lại thấp điểm
 *  - đêm thuộc "cuối tuần" của resort (mặc định T6, T7) → cuối tuần
 */

export type RateTier = "low_wd" | "low_we" | "high_wd" | "high_we" | "holiday";

export const RATE_TIERS: { key: RateTier; label: string; short: string; group: string; sub: string }[] = [
  { key: "low_wd", label: "Thấp điểm · T2–T5", short: "Thấp · thường", group: "Thấp điểm", sub: "Ngày thường" },
  { key: "low_we", label: "Thấp điểm · Cuối tuần", short: "Thấp · cuối tuần", group: "Thấp điểm", sub: "Cuối tuần" },
  { key: "high_wd", label: "Cao điểm · T2–T5", short: "Cao · thường", group: "Cao điểm", sub: "Ngày thường" },
  { key: "high_we", label: "Cao điểm · Cuối tuần", short: "Cao · cuối tuần", group: "Cao điểm", sub: "Cuối tuần" },
  { key: "holiday", label: "Lễ / Tết", short: "Lễ / Tết", group: "Lễ / Tết", sub: "" },
];

const FIELD: Record<RateTier, keyof HotelRate> = {
  low_wd: "price_low_weekday",
  low_we: "price_low_weekend",
  high_wd: "price_high_weekday",
  high_we: "price_high_weekend",
  holiday: "price_holiday",
};

type SeasonProduct = Pick<Product, "high_seasons" | "weekend_nights">;

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "06-01" ≤ md ≤ "08-31"; hỗ trợ khoảng vắt qua năm mới ("12-20" → "01-05"). */
function inSeason(md: string, from: string, to: string): boolean {
  return from <= to ? md >= from && md <= to : md >= from || md <= to;
}

export function isHighSeason(date: Date, product: SeasonProduct): boolean {
  const md = iso(date).slice(5);
  return (product.high_seasons ?? []).some((s) => s?.from && s?.to && inSeason(md, s.from, s.to));
}

export function nightTier(date: Date, product: SeasonProduct, holidays: Holiday[]): RateTier {
  if (holidays.some((h) => h.holiday_date === iso(date))) return "holiday";
  const weekend = (product.weekend_nights?.length ? product.weekend_nights : [5, 6]).includes(date.getDay());
  const high = isHighSeason(date, product);
  return high ? (weekend ? "high_we" : "high_wd") : weekend ? "low_we" : "low_wd";
}

/** Giá gốc của 1 mức; thiếu thì lấy mức gần nhất hợp lý (để không ra "Liên hệ" oan). */
export function tierBase(rate: HotelRate, tier: RateTier): number | null {
  const get = (t: RateTier) => {
    const v = rate[FIELD[t]] as number | null | undefined;
    return v != null && Number(v) > 0 ? Number(v) : null;
  };
  const fallback: Record<RateTier, RateTier[]> = {
    low_wd: ["low_wd"],
    low_we: ["low_we", "low_wd"],
    high_wd: ["high_wd", "low_wd"],
    high_we: ["high_we", "high_wd", "low_we", "low_wd"],
    holiday: ["holiday", "high_we", "low_we", "low_wd"],
  };
  for (const t of fallback[tier]) {
    const v = get(t);
    if (v != null) return v;
  }
  return rate.price > 0 ? Number(rate.price) : null;
}

export function applyDiscount(price: number | null, pct: number | null | undefined): number | null {
  if (price == null) return null;
  const p = Number(pct) || 0;
  return p > 0 ? Math.round((price * (100 - p)) / 100 / 1000) * 1000 : price;
}

export function tierPrice(rate: HotelRate, tier: RateTier): { base: number | null; final: number | null } {
  const base = tierBase(rate, tier);
  return { base, final: applyDiscount(base, rate.discount_percent) };
}

export interface StayQuote {
  nights: { date: string; tier: RateTier; price: number | null }[];
  total: number | null;
  avg: number | null;
  /** Mức áp dụng nếu mọi đêm cùng 1 mức; null nếu lẫn nhiều mức */
  tier: RateTier | null;
}

/** Báo giá 1 hạng phòng cho cả kỳ ở (checkin → checkout, mặc định 1 đêm). */
export function quoteStay(
  rate: HotelRate,
  product: SeasonProduct,
  holidays: Holiday[],
  checkin: string,
  checkout?: string
): StayQuote {
  const start = parseISO(checkin);
  let n = 1;
  if (checkout) {
    const diff = Math.round((parseISO(checkout).getTime() - start.getTime()) / 86400000);
    if (diff >= 1 && diff <= 30) n = diff;
  }
  const nights: StayQuote["nights"] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const tier = nightTier(d, product, holidays);
    nights.push({ date: iso(d), tier, price: tierPrice(rate, tier).final });
  }
  const ok = nights.every((x) => x.price != null);
  const total = ok ? nights.reduce((a, x) => a + (x.price as number), 0) : null;
  const tiers = new Set(nights.map((x) => x.tier));
  return { nights, total, avg: total != null ? Math.round(total / n) : null, tier: tiers.size === 1 ? nights[0].tier : null };
}

/** Giá thấp nhất của hạng phòng (để sắp xếp / hiện "từ ..."). */
export function minRatePrice(rate: HotelRate): number | null {
  const all = RATE_TIERS.map((t) => tierPrice(rate, t.key).final).filter((x): x is number => x != null);
  return all.length ? Math.min(...all) : null;
}

/** "06-01" → "01/06" */
export function fmtMD(md: string): string {
  const [m, d] = md.split("-");
  return `${d}/${m}`;
}

/** Chuỗi admin nhập "01/06-31/08; 20/12-05/01" ↔ mảng mùa cao điểm. */
export function parseSeasons(text: string): { from: string; to: string }[] {
  const out: { from: string; to: string }[] = [];
  for (const part of text.split(/[;\n,]+/)) {
    const m = part.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*(?:-|–|—|đến|to)\s*(\d{1,2})\s*\/\s*(\d{1,2})/i);
    if (!m) continue;
    const p2 = (x: string) => x.padStart(2, "0");
    out.push({ from: `${p2(m[2])}-${p2(m[1])}`, to: `${p2(m[4])}-${p2(m[3])}` });
  }
  return out;
}
export function seasonsToText(s: { from: string; to: string }[] | null | undefined): string {
  return (s ?? []).map((x) => `${fmtMD(x.from)}-${fmtMD(x.to)}`).join("; ");
}
