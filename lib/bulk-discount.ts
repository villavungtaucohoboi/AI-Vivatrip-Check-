import { calculateDiscount } from "@/lib/pricing";
import type { DiscountScheme, DiscountType, Product } from "@/lib/types";

/**
 * Chiết khấu trong bảng hàng loạt — gói gọn mô hình thật của hệ thống:
 *  - "Chung": 1 mức cho cả 3 khung giá (discount_scheme = uniform)
 *  - "Theo loại ngày": mức riêng cho T2-T5 / T6 & CN / T7 & Lễ (by_day_type)
 * Kiểu giảm: % (percent) hoặc số tiền cố định (amount).
 */
export type DiscountMode = "none" | "all_percent" | "all_amount" | "day_percent" | "day_amount";

export const DISCOUNT_MODE_OPTIONS: { value: DiscountMode; label: string }[] = [
  { value: "none", label: "Không CK" },
  { value: "all_percent", label: "Chung · %" },
  { value: "all_amount", label: "Chung · đ" },
  { value: "day_percent", label: "Theo ngày · %" },
  { value: "day_amount", label: "Theo ngày · đ" },
];

export interface DiscountState {
  mode: DiscountMode;
  /** Chung: mức chung. Theo ngày: T2-T5 */
  d1: number | null;
  /** Theo ngày: T6 & CN */
  d2: number | null;
  /** Theo ngày: T7 & Lễ */
  d3: number | null;
}

type DiscountSource = Pick<
  Product,
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

export function isDayMode(mode: DiscountMode): boolean {
  return mode === "day_percent" || mode === "day_amount";
}

export function modeType(mode: DiscountMode): DiscountType {
  return mode === "all_amount" || mode === "day_amount" ? "amount" : "percent";
}

export function modeUnit(mode: DiscountMode): string {
  if (mode === "none") return "";
  return modeType(mode) === "amount" ? "đ" : "%";
}

export function deriveDiscount(p: DiscountSource): DiscountState {
  if (p.discount_scheme === "by_day_type") {
    const vals = [
      p.discount_weekday_value,
      p.discount_friday_sunday_value,
      p.discount_saturday_holiday_value,
    ];
    if (vals.every((v) => !v)) return { mode: "none", d1: null, d2: null, d3: null };
    return {
      mode: p.discount_weekday_type === "amount" ? "day_amount" : "day_percent",
      d1: p.discount_weekday_value || null,
      d2: p.discount_friday_sunday_value || null,
      d3: p.discount_saturday_holiday_value || null,
    };
  }
  if (!p.discount_value) return { mode: "none", d1: null, d2: null, d3: null };
  return {
    mode: p.discount_type === "amount" ? "all_amount" : "all_percent",
    d1: p.discount_value,
    d2: null,
    d3: null,
  };
}

export function sameDiscount(a: DiscountState, b: DiscountState): boolean {
  if (a.mode !== b.mode) return false;
  if (a.mode === "none") return true;
  if (isDayMode(a.mode)) return a.d1 === b.d1 && a.d2 === b.d2 && a.d3 === b.d3;
  return a.d1 === b.d1;
}

export interface DiscountFields {
  discount_scheme: DiscountScheme;
  discount_type?: DiscountType;
  discount_value?: number;
  discount_weekday_type?: DiscountType;
  discount_weekday_value?: number;
  discount_friday_sunday_type?: DiscountType;
  discount_friday_sunday_value?: number;
  discount_saturday_holiday_type?: DiscountType;
  discount_saturday_holiday_value?: number;
}

/** Các cột DB cần ghi để lưu đúng trạng thái chiết khấu này. */
export function discountToFields(s: DiscountState): DiscountFields {
  if (s.mode === "none") {
    return {
      discount_scheme: "uniform",
      discount_value: 0,
      discount_weekday_value: 0,
      discount_friday_sunday_value: 0,
      discount_saturday_holiday_value: 0,
    };
  }
  const type = modeType(s.mode);
  if (isDayMode(s.mode)) {
    return {
      discount_scheme: "by_day_type",
      discount_weekday_type: type,
      discount_weekday_value: s.d1 ?? 0,
      discount_friday_sunday_type: type,
      discount_friday_sunday_value: s.d2 ?? 0,
      discount_saturday_holiday_type: type,
      discount_saturday_holiday_value: s.d3 ?? 0,
    };
  }
  return { discount_scheme: "uniform", discount_type: type, discount_value: s.d1 ?? 0 };
}

/** Mức giảm áp cho khung giá (0 = T2-T5, 1 = T6 & CN, 2 = T7 & Lễ). */
export function tierDiscountValue(s: DiscountState, tier: 0 | 1 | 2): number {
  if (s.mode === "none") return 0;
  if (!isDayMode(s.mode)) return s.d1 ?? 0;
  return (tier === 0 ? s.d1 : tier === 1 ? s.d2 : s.d3) ?? 0;
}

/** Giá sau chiết khấu để xem trước ngay trong bảng. null nếu chưa có giá. */
export function priceAfterDiscount(price: number | null, s: DiscountState, tier: 0 | 1 | 2): number | null {
  if (price == null) return null;
  const v = tierDiscountValue(s, tier);
  if (!v) return price;
  return calculateDiscount(price, modeType(s.mode), v).finalPrice;
}

export function blankDiscount(): DiscountState {
  return { mode: "none", d1: null, d2: null, d3: null };
}
