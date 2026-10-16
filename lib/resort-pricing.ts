import type { Holiday, HotelRate, PeriodPrice, Product, RatePeriod } from "@/lib/types";

/**
 * GIÁ RESORT / KHÁCH SẠN / HOMESTAY THEO GIAI ĐOẠN
 * Mỗi resort tự khai các GIAI ĐOẠN (VD: Thường · Cao điểm · Đỉnh điểm · Lễ Tết),
 * mỗi giai đoạn gồm 1 hay nhiều khoảng ngày. Mỗi hạng phòng có giá cho từng
 * giai đoạn, tuỳ chọn tách riêng giá CUỐI TUẦN.
 * Mỗi ĐÊM được xếp vào 1 "ô giá" = giai đoạn + (ngày thường | cuối tuần):
 *  - ngày lễ (lịch chung của app) → giai đoạn có đánh dấu "Lễ" (nếu có)
 *  - nằm trong khoảng ngày của giai đoạn nào → giai đoạn đó
 *    (trùng nhiều giai đoạn → lấy giai đoạn khai SAU, VD Đỉnh điểm đè Cao điểm)
 *  - không khớp khoảng nào → giai đoạn ĐẦU TIÊN (thường là giá thường)
 *  - đêm thuộc "cuối tuần" của resort (mặc định T6, T7) + có giá cuối tuần → giá cuối tuần
 *
 * Dữ liệu cũ (5 cột giá thấp/cao điểm) vẫn đọc được: tự quy đổi thành 3 giai đoạn.
 */

type PricingProduct = Pick<Product, "high_seasons" | "weekend_nights" | "rate_periods">;

/** Ô giá: "<periodKey>|wd" hoặc "<periodKey>|we" */
export type SlotKey = string;

const LEGACY_PERIODS = (p: PricingProduct): RatePeriod[] => [
  { key: "low", name: "Thấp điểm", ranges: [] },
  { key: "high", name: "Cao điểm", ranges: p.high_seasons ?? [] },
  { key: "holiday", name: "Lễ / Tết", ranges: [], holiday: true },
];

export function getPeriods(p: PricingProduct): RatePeriod[] {
  return p.rate_periods?.length ? p.rate_periods : LEGACY_PERIODS(p);
}

const num = (v: unknown): number | null => (v != null && Number(v) > 0 ? Number(v) : null);

export function getRoomPrices(rate: HotelRate, p: PricingProduct): Record<string, PeriodPrice> {
  if (p.rate_periods?.length) return rate.period_prices ?? {};
  return {
    low: { wd: num(rate.price_low_weekday) ?? num(rate.price), we: num(rate.price_low_weekend) },
    high: { wd: num(rate.price_high_weekday), we: num(rate.price_high_weekend) },
    holiday: { wd: num(rate.price_holiday), we: null },
  };
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Khoảng "YYYY-MM-DD" so theo ngày đầy đủ; khoảng "MM-DD" lặp mỗi năm (hỗ trợ vắt qua năm mới). */
function inRange(dateIso: string, r: { from: string; to: string }): boolean {
  if (r.from.length === 10 && r.to.length === 10) return dateIso >= r.from && dateIso <= r.to;
  const md = dateIso.slice(5);
  const f = r.from.slice(-5);
  const t = r.to.slice(-5);
  return f <= t ? md >= f && md <= t : md >= f || md <= t;
}

export interface NightSlot {
  date: string;
  period: RatePeriod;
  weekend: boolean;
  /** false = ngày nằm ngoài mọi khoảng ngày trong hợp đồng (đang tạm dùng giai đoạn đầu) */
  inContract: boolean;
}

export function nightSlot(date: Date, p: PricingProduct, holidays: Holiday[]): NightSlot {
  const periods = getPeriods(p);
  const d = iso(date);
  const weekend = (p.weekend_nights?.length ? p.weekend_nights : [5, 6]).includes(date.getDay());
  const holidayPeriod = periods.find((x) => x.holiday);
  if (holidayPeriod && holidays.some((h) => h.holiday_date === d)) return { date: d, period: holidayPeriod, weekend, inContract: true };
  let match: RatePeriod | null = null;
  for (const per of periods) if (!per.holiday && per.ranges.some((r) => inRange(d, r))) match = per;
  const hasFullDates = periods.some((x) => x.ranges.some((r) => r.from.length === 10));
  const first = periods.find((x) => !x.holiday) ?? periods[0];
  return {
    date: d,
    period: match ?? first,
    weekend,
    // Hợp đồng ghi ngày cụ thể mà ngày khách đi không thuộc khoảng nào → cảnh báo
    inContract: !!match || !hasFullDates || periods[0].ranges.length === 0,
  };
}

/** Giá gốc 1 đêm theo ô giá; thiếu giá cuối tuần → dùng giá ngày thường; thiếu cả → giai đoạn đầu. */
export function slotBase(rate: HotelRate, p: PricingProduct, periodKey: string, weekend: boolean): number | null {
  const prices = getRoomPrices(rate, p);
  const pp = prices[periodKey];
  const v = pp ? (weekend ? pp.we ?? pp.wd : pp.wd ?? pp.we) : null;
  if (v != null) return Number(v);
  const first = getPeriods(p).find((x) => !x.holiday);
  const fp = first ? prices[first.key] : undefined;
  const f = fp ? (weekend ? fp.we ?? fp.wd : fp.wd ?? fp.we) : null;
  return f != null ? Number(f) : num(rate.price);
}

export function applyDiscount(price: number | null, pct: number | null | undefined): number | null {
  if (price == null) return null;
  const v = Number(pct) || 0;
  return v > 0 ? Math.round((price * (100 - v)) / 100 / 1000) * 1000 : price;
}

export function slotPrice(rate: HotelRate, p: PricingProduct, periodKey: string, weekend: boolean) {
  const base = slotBase(rate, p, periodKey, weekend);
  return { base, final: applyDiscount(base, rate.discount_percent) };
}

/** Các CỘT giá để hiển thị: mỗi giai đoạn 1 cột, giai đoạn nào có giá cuối tuần riêng thì tách 2 cột. */
export interface PriceColumn {
  key: SlotKey;
  periodKey: string;
  weekend: boolean;
  title: string;
  sub: string;
  ranges: string;
}
export function priceColumns(p: PricingProduct, rates: HotelRate[]): PriceColumn[] {
  const cols: PriceColumn[] = [];
  for (const per of getPeriods(p)) {
    const anyWd = rates.some((r) => getRoomPrices(r, p)[per.key]?.wd != null);
    const anyWe = rates.some((r) => getRoomPrices(r, p)[per.key]?.we != null);
    if (!anyWd && !anyWe) continue;
    const ranges = per.holiday ? "Theo lịch ngày lễ" : per.ranges.map(fmtRange).join(" · ");
    if (anyWe) {
      cols.push({ key: `${per.key}|wd`, periodKey: per.key, weekend: false, title: per.name, sub: "Ngày thường", ranges });
      cols.push({ key: `${per.key}|we`, periodKey: per.key, weekend: true, title: per.name, sub: "Cuối tuần", ranges });
    } else {
      cols.push({ key: `${per.key}|wd`, periodKey: per.key, weekend: false, title: per.name, sub: "", ranges });
    }
  }
  return cols;
}

/** Ô giá (cột) mà 1 đêm rơi vào. */
export function slotKeyOf(n: NightSlot, p: PricingProduct, rates: HotelRate[]): SlotKey {
  const hasWe = rates.some((r) => getRoomPrices(r, p)[n.period.key]?.we != null);
  return `${n.period.key}|${n.weekend && hasWe ? "we" : "wd"}`;
}

export interface StayQuote {
  nights: { date: string; periodKey: string; periodName: string; weekend: boolean; price: number | null; base: number | null; inContract: boolean }[];
  total: number | null;
  avg: number | null;
  avgBase: number | null;
  /** Nhãn mức giá nếu mọi đêm cùng 1 mức, null nếu lẫn nhiều mức */
  label: string | null;
  outOfContract: boolean;
}

export function quoteStay(rate: HotelRate, p: PricingProduct, holidays: Holiday[], checkin: string, checkout?: string): StayQuote {
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
    const s = nightSlot(d, p, holidays);
    const hasWe = getRoomPrices(rate, p)[s.period.key]?.we != null;
    const we = s.weekend && hasWe;
    const { base, final } = slotPrice(rate, p, s.period.key, we);
    nights.push({ date: s.date, periodKey: s.period.key, periodName: s.period.name, weekend: we, price: final, base, inContract: s.inContract });
  }
  const ok = nights.every((x) => x.price != null);
  const total = ok ? nights.reduce((a, x) => a + (x.price as number), 0) : null;
  const okB = nights.every((x) => x.base != null);
  const totalB = okB ? nights.reduce((a, x) => a + (x.base as number), 0) : null;
  const labels = new Set(nights.map((x) => `${x.periodName}${x.weekend ? " · cuối tuần" : ""}`));
  return {
    nights,
    total,
    avg: total != null ? Math.round(total / n) : null,
    avgBase: totalB != null ? Math.round(totalB / n) : null,
    label: labels.size === 1 ? [...labels][0] : null,
    outOfContract: nights.some((x) => !x.inContract),
  };
}

/** Giá thấp nhất của hạng phòng (sau ưu đãi). */
export function minRatePrice(rate: HotelRate, p: PricingProduct): number | null {
  const all: number[] = [];
  for (const pp of Object.values(getRoomPrices(rate, p))) {
    for (const v of [pp?.wd, pp?.we]) if (v != null && Number(v) > 0) all.push(Number(v));
  }
  if (!all.length && num(rate.price)) all.push(Number(rate.price));
  return all.length ? applyDiscount(Math.min(...all), rate.discount_percent) : null;
}

/** "2026-06-01" → "01/06/26"; "06-01" → "01/06" */
export function fmtDay(s: string): string {
  if (s.length === 10) {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y.slice(2)}`;
  }
  const [m, d] = s.split("-");
  return `${d}/${m}`;
}
export function fmtRange(r: { from: string; to: string }): string {
  return `${fmtDay(r.from)}–${fmtDay(r.to)}`;
}

/**
 * Chuỗi Admin gõ ↔ khoảng ngày. Nhận: "02/01-31/05; 03/09-23/12" (lặp mỗi năm)
 * hoặc "02/01/2026-31/05/2026" (đúng năm hợp đồng).
 */
export function parseRanges(text: string): { from: string; to: string }[] {
  const out: { from: string; to: string }[] = [];
  const p2 = (x: string) => x.padStart(2, "0");
  const yr = (y?: string) => (y ? (y.length === 2 ? `20${y}` : y) : "");
  const re = /(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?\s*(?:-|–|—|đến|to)\s*(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?/gi;
  for (const m of text.matchAll(re)) {
    const y1 = yr(m[3]);
    const y2 = yr(m[6]) || y1;
    const from = y1 ? `${y1}-${p2(m[2])}-${p2(m[1])}` : `${p2(m[2])}-${p2(m[1])}`;
    const to = y2 ? `${y2}-${p2(m[5])}-${p2(m[4])}` : `${p2(m[5])}-${p2(m[4])}`;
    out.push({ from: from.length === 5 && to.length === 10 ? `${to.slice(0, 4)}-${from}` : from, to });
  }
  return out;
}
export function rangesToText(r: { from: string; to: string }[] | null | undefined): string {
  return (r ?? [])
    .map((x) => {
      const f = x.from.length === 10 ? `${x.from.slice(8)}/${x.from.slice(5, 7)}/${x.from.slice(0, 4)}` : `${x.from.slice(3)}/${x.from.slice(0, 2)}`;
      const t = x.to.length === 10 ? `${x.to.slice(8)}/${x.to.slice(5, 7)}/${x.to.slice(0, 4)}` : `${x.to.slice(3)}/${x.to.slice(0, 2)}`;
      return `${f}-${t}`;
    })
    .join("; ");
}
