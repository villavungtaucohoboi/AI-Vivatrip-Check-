import { Holiday, Product, RankedProduct, SearchFilters } from "./types";
import { resolveProductPricing } from "./pricing";

// Trọng số giảm dần theo bậc ưu tiên (mỗi bậc luôn "nặng" hơn tổng tất cả
// các bậc thấp hơn cộng lại), để đảm bảo đúng thứ tự ưu tiên đề bài yêu cầu:
// 1. Khu vực > 2. Loại sản phẩm > 3. Sức chứa > 4. Giá gần ngân sách
// > 5. Số phòng ngủ > 6. Tiện ích
const W_AREA = 100_000;
const W_TYPE = 10_000;
const W_CAPACITY = 1_000;
const W_PRICE = 900;
const W_BEDROOMS = 90;
const W_AMENITY_EACH = 2.25; // tối đa 6 tiện ích -> tối đa 13.5 điểm (vẫn nhỏ hơn nhiều so với W_BEDROOMS)

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

/**
 * `rankingPrice`: giá đã được lib/pricing.ts resolve sẵn (hotel: giá phòng
 * thấp nhất; villa/resort có ngày: giá đúng khung ngày sau chiết khấu;
 * villa/resort KHÔNG ngày: null — không giả định khách đi weekday).
 */
export function scoreProduct(
  product: Product,
  filters: SearchFilters,
  rankingPrice: number | null
): number {
  let score = 0;

  // 1. Khu vực
  if (filters.area) {
    const a = normalize(product.area);
    const b = normalize(filters.area);
    if (a === b) score += W_AREA;
    else if (a.includes(b) || b.includes(a)) score += W_AREA * 0.7;
  }

  // 2. Loại sản phẩm
  if (filters.type && product.type === filters.type) {
    score += W_TYPE;
  }

  // 3. Sức chứa
  if (filters.guests && product.max_guests != null) {
    if (product.max_guests >= filters.guests) {
      score += W_CAPACITY;
    } else {
      const ratio = Math.max(0, product.max_guests / filters.guests);
      score += W_CAPACITY * 0.5 * ratio;
    }
  }

  // 4. Giá gần ngân sách nhất (hoặc trong khoảng giá yêu cầu) — dùng
  // rankingPrice đã resolve theo đúng ngày, KHÔNG dùng product.price thẳng.
  if (rankingPrice != null) {
    if (filters.budget) {
      const relDiff = Math.abs(rankingPrice - filters.budget) / filters.budget;
      score += Math.max(0, W_PRICE * (1 - relDiff));
    } else if (filters.priceFrom != null || filters.priceTo != null) {
      const from = filters.priceFrom ?? 0;
      const to = filters.priceTo ?? Infinity;
      if (rankingPrice >= from && rankingPrice <= to) {
        score += W_PRICE;
      } else {
        const bound = rankingPrice < from ? from : to;
        const relDiff = bound === Infinity ? 1 : Math.abs(rankingPrice - bound) / (bound || 1);
        score += Math.max(0, W_PRICE * 0.6 * (1 - Math.min(relDiff, 1)));
      }
    }
  }

  // 5. Số phòng ngủ phù hợp
  if (filters.bedrooms && product.bedrooms != null) {
    if (product.bedrooms === filters.bedrooms) score += W_BEDROOMS;
    else if (product.bedrooms > filters.bedrooms) score += W_BEDROOMS * 0.65;
    else score += W_BEDROOMS * 0.2 * (product.bedrooms / filters.bedrooms);
  }

  // 6. Tiện ích chính nếu khách có yêu cầu
  (["pool", "near_beach", "sea_view", "karaoke", "bbq", "pickleball", "near_lake"] as const).forEach((key) => {
    if (filters[key] && product[key]) score += W_AMENITY_EACH;
  });

  return score;
}

export function rankProducts(
  products: Product[],
  filters: SearchFilters,
  holidays: Holiday[]
): RankedProduct[] {
  return products
    .map((p) => {
      const { rankingPrice, context } = resolveProductPricing(p, filters, holidays);
      return {
        ...p,
        _score: scoreProduct(p, filters, rankingPrice),
        _pricing: context,
      };
    })
    .sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score;
      // Đồng điểm -> sản phẩm mới cập nhật hơn lên trước
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
}

// Áp dụng lọc cứng cho các điều kiện sale chọn thủ công qua "Bộ lọc"
// (khác với tìm kiếm tự nhiên, vốn chỉ dùng filters để XẾP HẠNG chứ
// không loại trừ, để luôn trả ra ~10 sản phẩm phù hợp nhất thay vì rỗng).
// Lưu ý: priceFrom/priceTo lọc theo cột `price` (villa/resort = price_weekday,
// hotel = giá phòng thấp nhất) — chỉ mang tính tham khảo nhanh; khi có "Ngày đi"
// cụ thể, thứ tự kết quả vẫn được xếp lại chính xác theo giá đúng ngày ở rankProducts.
export function applyExplicitFilters<T>(query: T, filters: SearchFilters): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = query;

  if (filters.area) q = q.ilike("area", `%${filters.area}%`);
  if (filters.type) q = q.eq("type", filters.type);
  if (filters.guests) q = q.gte("max_guests", filters.guests);
  if (filters.bedrooms) q = q.gte("bedrooms", filters.bedrooms);
  if (filters.priceFrom != null) q = q.gte("price", filters.priceFrom);
  if (filters.priceTo != null) q = q.lte("price", filters.priceTo);
  if (filters.pool) q = q.eq("pool", true);
  if (filters.near_beach) q = q.eq("near_beach", true);
  if (filters.sea_view) q = q.eq("sea_view", true);
  if (filters.karaoke) q = q.eq("karaoke", true);
  if (filters.bbq) q = q.eq("bbq", true);
  if (filters.pickleball) q = q.eq("pickleball", true);
  if (filters.near_lake) q = q.eq("near_lake", true);

  return q as T;
}
