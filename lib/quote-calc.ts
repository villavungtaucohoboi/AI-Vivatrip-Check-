// Tính tiền báo giá — hàm thuần, dùng chung cho xem trước, trang khách, danh sách và API.
import { QUOTE_GROUPS, type QuoteGroup, type QuoteItem, type QuoteOption } from "@/lib/quote-types";

/** Thành tiền 1 dòng. Ô trống tính là 1; đơn giá trống → null ("Theo thực tế"). */
export function lineAmount(it: QuoteItem): number | null {
  if (it.unit_price == null) return null;
  return Math.round((it.qty ?? 1) * (it.times ?? 1) * it.unit_price);
}

/** "20 khách × 2 bữa", "4 villa × 1 đêm", "1 xe" */
export function qtyLabel(it: QuoteItem): string {
  const q = `${it.qty ?? 1}${it.qty_unit ? ` ${it.qty_unit}` : ""}`;
  const t = it.times ?? 1;
  if (it.times_unit || t > 1) return `${q} × ${t}${it.times_unit ? ` ${it.times_unit}` : ""}`;
  return q;
}

export interface OptionTotals {
  byGroup: Record<QuoteGroup, number>;
  subtotal: number;
  vatBase: number;
  vat: number;
  total: number;
  /** Có dòng "Theo thực tế" (không cộng tổng) */
  hasTbd: boolean;
}

export function optionTotals(o: QuoteOption, vatRate: number): OptionTotals {
  const byGroup = Object.fromEntries(QUOTE_GROUPS.map((g) => [g, 0])) as Record<QuoteGroup, number>;
  let subtotal = 0;
  let vatBase = 0;
  let hasTbd = false;
  for (const it of o.items) {
    const a = lineAmount(it);
    if (a == null) {
      hasTbd = true;
      continue;
    }
    byGroup[it.group] = (byGroup[it.group] ?? 0) + a;
    subtotal += a;
    if (it.vat) vatBase += a;
  }
  const vat = Math.round((vatBase * vatRate) / 100);
  return { byGroup, subtotal, vatBase, vat, total: subtotal + vat, hasTbd };
}

/** Giá trung bình / khách, làm tròn nghìn */
export function perPax(total: number, paxCount: number | null): number | null {
  if (!paxCount || paxCount <= 0) return null;
  return Math.round(total / paxCount / 1000) * 1000;
}

/** Phương án tổng thấp nhất — chỉ khi có từ 2 phương án */
export function cheapestOptionId(options: QuoteOption[], vatRate: number): string | null {
  if (options.length < 2) return null;
  // Phương án còn mục "Theo thực tế" chưa đủ tổng → không so "rẻ nhất"
  const totals = options
    .map((o) => ({ id: o.id, t: optionTotals(o, vatRate) }))
    .filter((x) => x.t.total > 0 && !x.t.hasTbd)
    .map((x) => ({ id: x.id, total: x.t.total }));
  if (!totals.length) return null;
  const min = Math.min(...totals.map((x) => x.total));
  const cheapest = totals.filter((x) => x.total === min);
  // Bằng tiền nhau thì không có phương án nào "tiết kiệm nhất"
  return cheapest.length === 1 ? cheapest[0].id : null;
}

/** Số đêm giữa 2 ngày YYYY-MM-DD; null nếu thiếu hoặc ngày về không sau ngày đi */
export function nightsBetween(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const a = Date.parse(from + "T00:00:00Z");
  const b = Date.parse(to + "T00:00:00Z");
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  const n = Math.round((b - a) / 86_400_000);
  return n >= 1 ? n : null;
}
