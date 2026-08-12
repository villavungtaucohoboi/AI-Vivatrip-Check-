import type {
  DatePricingContext,
  DiscountType,
  Holiday,
  PriceTier,
  Product,
  SearchFilters,
} from "./types";

export const TIER_LABEL: Record<PriceTier, string> = {
  weekday: "Thứ 2 - Thứ 5",
  friday_sunday: "Thứ 6 & Chủ nhật",
  saturday_holiday: "Thứ 7 & Ngày lễ",
};

export const TIER_LABEL_SHORT: Record<PriceTier, string> = {
  weekday: "T2-T5",
  friday_sunday: "T6 & CN",
  saturday_holiday: "T7 & lễ",
};

/**
 * Xác định thứ + có phải ngày lễ hay không, trả về khung giá áp dụng
 * (weekday / friday_sunday / saturday_holiday) cho MỘT ngày cụ thể.
 * Ngày lễ (có trong bảng holidays) luôn override về saturday_holiday,
 * kể cả khi rơi vào Thứ 2 - Thứ 6.
 */
export function getPriceTier(date: Date, holidays: Holiday[]): PriceTier {
  const iso = toISODate(date);
  const isHoliday = holidays.some((h) => h.holiday_date === iso);
  if (isHoliday) return "saturday_holiday";

  const day = date.getDay(); // 0 = Chủ nhật, 6 = Thứ 7
  if (day === 6) return "saturday_holiday";
  if (day === 5 || day === 0) return "friday_sunday";
  return "weekday"; // Thứ 2 - Thứ 5
}

/**
 * Lấy giá gốc (chưa chiết khấu) của sản phẩm áp dụng cho một ngày cụ thể.
 * CHỈ áp dụng cho villa/resort — hotel dùng hotel_rates, không đi qua hàm này.
 */
export function getApplicablePrice(
  product: Pick<Product, "price_weekday" | "price_friday_sunday" | "price_saturday_holiday">,
  date: Date,
  holidays: Holiday[]
): { tier: PriceTier; price: number | null } {
  const tier = getPriceTier(date, holidays);
  const price =
    tier === "weekday"
      ? product.price_weekday
      : tier === "friday_sunday"
      ? product.price_friday_sunday
      : product.price_saturday_holiday;
  return { tier, price: price ?? null };
}

/** Tính chiết khấu (theo % hoặc số tiền cố định) — không ghi đè giá gốc. */
export function calculateDiscount(
  price: number,
  type: DiscountType,
  value: number
): { discountAmount: number; finalPrice: number } {
  const v = value || 0;
  const discountAmount =
    type === "amount" ? Math.min(Math.max(v, 0), price) : Math.round((price * v) / 100);
  return { discountAmount, finalPrice: Math.max(0, price - discountAmount) };
}

/**
 * Lấy đúng cấu hình chiết khấu (loại + giá trị) áp dụng cho 1 khung giá,
 * tuỳ theo chế độ sản phẩm đang chọn:
 * - "uniform": 1 mức chiết khấu chung cho cả 3 khung (Mục 1)
 * - "by_day_type": ngày thường (weekday) dùng 1 mức riêng, "cuối tuần"
 *   (Thứ 6, Thứ 7, Chủ nhật, Ngày lễ — tức 2 khung friday_sunday +
 *   saturday_holiday) dùng chung 1 mức khác (Mục 2)
 */
export function getDiscountForTier(
  product: Pick<
    Product,
    | "discount_scheme"
    | "discount_type"
    | "discount_value"
    | "discount_weekday_type"
    | "discount_weekday_value"
    | "discount_weekend_type"
    | "discount_weekend_value"
  >,
  tier: PriceTier
): { type: DiscountType; value: number } {
  if (product.discount_scheme === "by_day_type") {
    return tier === "weekday"
      ? { type: product.discount_weekday_type, value: product.discount_weekday_value }
      : { type: product.discount_weekend_type, value: product.discount_weekend_value };
  }
  return { type: product.discount_type, value: product.discount_value };
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDateVN(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Hiển thị mức chiết khấu dạng chữ: "10%" hoặc "200.000đ" */
export function formatDiscount(type: DiscountType, value: number): string {
  if (type === "amount") {
    return new Intl.NumberFormat("vi-VN").format(value) + "đ";
  }
  return `${value}%`;
}

function parseISODateLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

type PricingProduct = Pick<
  Product,
  | "type"
  | "price"
  | "price_weekday"
  | "price_friday_sunday"
  | "price_saturday_holiday"
  | "discount_scheme"
  | "discount_type"
  | "discount_value"
  | "discount_weekday_type"
  | "discount_weekday_value"
  | "discount_weekend_type"
  | "discount_weekend_value"
>;

/**
 * Điểm vào DUY NHẤT cho toàn app khi cần biết "sản phẩm này giá bao nhiêu".
 * - Hotel: luôn dùng product.price (giá phòng thấp nhất, không phụ thuộc ngày) —
 *   nằm ngoài phạm vi bảng giá theo thứ/ngày lễ.
 * - Villa/resort + có ngày cụ thể: xác định khung giá đúng ngày đó, áp đúng
 *   mức chiết khấu tương ứng (theo chế độ uniform hoặc by_day_type).
 * - Villa/resort + KHÔNG có ngày: không suy đoán — trả về rankingPrice = null,
 *   để ranking không giả định khách đi weekday, và UI phải hiện đủ 3 khung giá.
 */
export function resolveProductPricing(
  product: PricingProduct,
  filters: Pick<SearchFilters, "date">,
  holidays: Holiday[]
): { rankingPrice: number | null; context?: DatePricingContext } {
  if (product.type === "hotel") {
    return { rankingPrice: product.price ?? null };
  }

  if (!filters.date) {
    return { rankingPrice: null };
  }

  const { tier, price: basePrice } = getApplicablePrice(product, parseISODateLocal(filters.date), holidays);
  const discount = getDiscountForTier(product, tier);

  if (basePrice == null) {
    return {
      rankingPrice: null,
      context: {
        date: filters.date,
        tier,
        basePrice: null,
        discountType: discount.type,
        discountValue: discount.value,
        discountAmount: 0,
        finalPrice: null,
      },
    };
  }

  const { discountAmount, finalPrice } = calculateDiscount(basePrice, discount.type, discount.value);

  return {
    rankingPrice: finalPrice,
    context: {
      date: filters.date,
      tier,
      basePrice,
      discountType: discount.type,
      discountValue: discount.value,
      discountAmount,
      finalPrice,
    },
  };
}
