import type { DatePricingContext, Holiday, PriceTier, Product, SearchFilters } from "./types";

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

/** Tính chiết khấu — không ghi đè giá gốc, chỉ trả về số tiền tính toán. */
export function calculateDiscountedPrice(
  price: number,
  discountPercent: number
): { discountAmount: number; finalPrice: number } {
  const discountAmount = Math.round((price * (discountPercent || 0)) / 100);
  return { discountAmount, finalPrice: price - discountAmount };
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

function parseISODateLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Điểm vào DUY NHẤT cho toàn app khi cần biết "sản phẩm này giá bao nhiêu".
 * - Hotel: luôn dùng product.price (giá phòng thấp nhất, không phụ thuộc ngày) —
 *   nằm ngoài phạm vi bảng giá theo thứ/ngày lễ.
 * - Villa/resort + có ngày cụ thể: xác định khung giá đúng ngày đó, áp chiết khấu.
 * - Villa/resort + KHÔNG có ngày: không suy đoán — trả về rankingPrice = null,
 *   để ranking không giả định khách đi weekday, và UI phải hiện đủ 3 khung giá.
 */
export function resolveProductPricing(
  product: Pick<
    Product,
    "type" | "price" | "price_weekday" | "price_friday_sunday" | "price_saturday_holiday" | "discount_percent"
  >,
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

  if (basePrice == null) {
    return {
      rankingPrice: null,
      context: {
        date: filters.date,
        tier,
        basePrice: null,
        discountPercent: product.discount_percent,
        discountAmount: 0,
        finalPrice: null,
      },
    };
  }

  const { discountAmount, finalPrice } = calculateDiscountedPrice(basePrice, product.discount_percent);

  return {
    rankingPrice: finalPrice,
    context: {
      date: filters.date,
      tier,
      basePrice,
      discountPercent: product.discount_percent,
      discountAmount,
      finalPrice,
    },
  };
}
