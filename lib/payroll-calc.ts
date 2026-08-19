// Hàm tính THUẦN TOÁN HỌC, không đụng gì tới database/secret — an toàn dùng
// cả ở client (Salary Editor xem trước khi gõ) lẫn server (route lưu thật
// sự dùng lại đúng hàm này, không tin số client tính gửi lên).

export interface Tier {
  min: number;
  max: number | null;
  rate: number;
}

export interface TierBreakdownItem {
  range: string;
  rate: string;
  base: number;
  result: number;
}

export interface TierCalcResult {
  amount: number;
  breakdown: TierBreakdownItem[];
}

/**
 * Tính hoa hồng THEO BẬC (kiểu bậc thuế) — mỗi phần doanh số nằm trong 1 bậc
 * chỉ chịu đúng % của bậc đó, KHÔNG áp 1 mức % cho toàn bộ doanh số.
 *
 * Ví dụ: 0–50tr:7%, 50–80tr:10%, doanh số 75tr
 * -> 50tr×7% + 25tr×10% = 3.500.000 + 2.500.000 = 6.000.000đ
 */
export function calcTieredCommission(revenue: number, tiers: Tier[]): TierCalcResult {
  let total = 0;
  const breakdown: TierBreakdownItem[] = [];

  for (const tier of tiers) {
    const min = tier.min;
    const max = tier.max ?? Infinity;
    if (revenue <= min) continue;
    const base = Math.min(revenue, max) - min;
    if (base <= 0) continue;
    const result = Math.round(base * (tier.rate / 100));
    total += result;
    breakdown.push({
      range: `${formatTierBound(min)} – ${tier.max == null ? "trở lên" : formatTierBound(tier.max)}`,
      rate: `${tier.rate}%`,
      base,
      result,
    });
  }

  return { amount: Math.round(total), breakdown };
}

function formatTierBound(n: number): string {
  if (n >= 1_000_000 && n % 1_000_000 === 0) return `${n / 1_000_000}tr`;
  return n.toLocaleString("vi-VN");
}

export function calcQuantityRate(quantity: number, rate: number): number {
  return Math.round(quantity * rate);
}
