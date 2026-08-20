import type { Product } from "./types";

/**
 * Ngưỡng SỨC CHỨA DÙNG ĐỂ TÌM KIẾM — không phải "sức chứa tối đa" hiển thị
 * cho khách. Ưu tiên max_guests thực tế nếu Admin đã nhập; nếu chưa có thì
 * tự suy ra = standard_guests + 80%, làm tròn về bội số 5 gần nhất.
 *
 * VD: 15 khách tiêu chuẩn -> search được tới ~25 khách (không hiển thị số
 * này ra ngoài, chỉ dùng để không loại nhầm villa khỏi kết quả tìm kiếm).
 */
export function getSearchCapacity(product: Pick<Product, "standard_guests" | "max_guests">): number | null {
  if (product.max_guests != null) return product.max_guests;
  if (product.standard_guests != null) {
    const extended = product.standard_guests * 1.8;
    return Math.round(extended / 5) * 5;
  }
  return null;
}

/** Số khách vượt quá mức tiêu chuẩn (0 nếu không vượt hoặc chưa rõ tiêu chuẩn). */
export function getExtraGuestCount(product: Pick<Product, "standard_guests">, requestedGuests: number): number {
  if (product.standard_guests == null) return 0;
  return Math.max(0, requestedGuests - product.standard_guests);
}

export interface GuestPricingResult {
  extraGuests: number;
  isOverStandard: boolean;
  totalPrice: number | null;
  extraFeePerGuest: number | null;
}

/**
 * Tính giá cho số khách yêu cầu, dựa trên giá cơ bản (đã theo đúng ngày/loại
 * ngày sẵn có) + phụ thu/người (nếu Admin đã khai báo). Nếu chưa có phụ thu,
 * KHÔNG tự đoán — trả về totalPrice = null để UI hiện "cần xác nhận".
 */
export function calcGuestPricing(
  product: Pick<Product, "standard_guests" | "extra_guest_fee">,
  requestedGuests: number,
  basePrice: number | null
): GuestPricingResult {
  const extraGuests = getExtraGuestCount(product, requestedGuests);
  const isOverStandard = extraGuests > 0;

  if (!isOverStandard || basePrice == null) {
    return { extraGuests, isOverStandard, totalPrice: basePrice, extraFeePerGuest: product.extra_guest_fee ?? null };
  }

  if (product.extra_guest_fee != null) {
    return {
      extraGuests,
      isOverStandard,
      totalPrice: basePrice + extraGuests * product.extra_guest_fee,
      extraFeePerGuest: product.extra_guest_fee,
    };
  }

  return { extraGuests, isOverStandard, totalPrice: null, extraFeePerGuest: null };
}
