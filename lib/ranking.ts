import { Holiday, Product, RankedProduct, SearchFilters } from "./types";
import { resolveProductPricing } from "./pricing";
import { formatVND } from "./format";
import { getSearchCapacity } from "./capacity";

export function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

const AMENITY_KEYS = ["pool", "near_beach", "sea_view", "karaoke", "bbq", "pickleball", "near_lake"] as const;
type AmenityKey = (typeof AMENITY_KEYS)[number];

const AMENITY_NOTE_KEYWORDS: Record<AmenityKey, string[]> = {
  pool: ["ho boi", "be boi"],
  near_beach: ["sat bien"],
  sea_view: ["view bien"],
  karaoke: ["karaoke"],
  bbq: ["bbq", "nuong"],
  pickleball: ["pickleball"],
  near_lake: ["view ho", "gan ho"],
};

function amenityMatches(product: Product, key: AmenityKey): boolean {
  if (product[key]) return true;
  if (!product.note) return false;
  const noteNorm = normalize(product.note);
  return AMENITY_NOTE_KEYWORDS[key].some((kw) => noteNorm.includes(kw));
}

function requestedAmenities(filters: SearchFilters): AmenityKey[] {
  return AMENITY_KEYS.filter((k) => filters[k]);
}

// =========================================================
// 1. HARD FILTER — khu vực/loại/sức chứa là điều kiện LOẠI TRỪ, không phải
// điểm cộng. Khu vực khách yêu cầu chỉ trả đúng khu vực đó; muốn thêm khu
// vực lân cận phải có filters.expandRegions (Sale chủ động bấm "xem thêm").
// =========================================================
export function applyHardFilters(products: Product[], filters: SearchFilters): Product[] {
  let result = products;

  if (filters.area) {
    const wantedAreas = new Set(
      [filters.area, ...(filters.expandRegions ?? [])].map(normalize)
    );
    result = result.filter((p) => wantedAreas.has(normalize(p.area)));
  } else if (filters.areaCluster) {
    // Không có khu vực cụ thể (VD "quanh Hà Nội") -> cả vùng đó là phạm vi
    // hợp lệ, nhưng KHÔNG được lọt sang vùng miền khác.
    const wanted = new Set(filters.areaCluster.map(normalize));
    result = result.filter((p) => wanted.has(normalize(p.area)));
  }

  if (filters.type) {
    result = result.filter((p) => p.type === filters.type);
  }

  if (filters.guests) {
    // Dùng ngưỡng "sức chứa search" (max_guests thực tế nếu có, không thì tự
    // suy ra +80% từ số khách tiêu chuẩn) — KHÔNG loại villa chỉ vì Admin
    // chưa nhập max_guests. Villa hoàn toàn không có standard_guests lẫn
    // max_guests thì không có căn cứ nào để xác nhận đủ chỗ -> loại.
    result = result.filter((p) => {
      const capacity = getSearchCapacity(p);
      return capacity != null && capacity >= filters.guests!;
    });
  }

  return result;
}

// =========================================================
// 2. SOFT RANKING — chỉ chạy trên tập đã qua hard filter ở trên. Thứ tự ưu
// tiên: Tiểu khu vực > Giá sát ngân sách > Tiện ích yêu cầu > Sức chứa dư ít
// > Số phòng ngủ. Tên sản phẩm (nếu gõ trúng) luôn đứng trên hết.
// =========================================================
const W_NAME = 1_000_000;
const W_SUBREGION = 10_000;
const W_PRICE = 1_000;
const W_AMENITY_EACH = 100; // tối đa 7 tiện ích -> tối đa 700
const W_CAPACITY_FIT = 50;
const W_BEDROOMS = 5;

export function scoreProduct(product: Product, filters: SearchFilters, rankingPrice: number | null): number {
  let score = 0;

  // Tên sản phẩm — nếu sale gõ đúng 1 phần tên (VD "Doris"), ưu tiên tuyệt đối
  if (filters.name) {
    const productName = normalize(product.product_name);
    const nameQuery = normalize(filters.name);
    if (productName.includes(nameQuery)) score += W_NAME;
    else if (nameQuery.split(" ").some((w) => w.length >= 2 && productName.includes(w))) {
      score += W_NAME * 0.6;
    }
  }

  // 1. Tiểu khu vực — VD tìm "Đồng Đò Sóc Sơn": các căn đúng Đồng Đò lên trước
  if (filters.subRegion) {
    const sr = product.sub_region ? normalize(product.sub_region) : "";
    if (sr && sr === normalize(filters.subRegion)) score += W_SUBREGION;
  }

  // 2. Giá sát ngân sách/khoảng giá nhất. Lệch càng xa càng bị trừ mạnh:
  // "dưới 6tr" gần như loại các căn vượt xa 6tr; "tầm 6tr" vẫn chấp nhận
  // cao hơn ~20-30% nhưng vượt quá thì rớt hạng rõ rệt.
  if (rankingPrice != null) {
    if (filters.budget) {
      const relDiff = Math.abs(rankingPrice - filters.budget) / filters.budget;
      score += Math.max(0, W_PRICE * (1 - relDiff * 1.3));
    } else if (filters.priceFrom != null || filters.priceTo != null) {
      const from = filters.priceFrom ?? 0;
      const to = filters.priceTo ?? Infinity;
      if (rankingPrice >= from && rankingPrice <= to) {
        score += W_PRICE;
      } else {
        const bound = rankingPrice < from ? from : to;
        const relDiff = bound === Infinity ? 1 : Math.abs(rankingPrice - bound) / (bound || 1);
        score += Math.max(0, W_PRICE * 0.5 * (1 - Math.min(relDiff * 1.6, 1)));
      }
    }
  }

  // 3. Tiện ích được yêu cầu — càng khớp nhiều trên tổng số yêu cầu càng cao điểm
  requestedAmenities(filters).forEach((key) => {
    if (amenityMatches(product, key)) score += W_AMENITY_EACH;
  });

  // 4. Số khách tiêu chuẩn CÀNG GẦN nhu cầu càng ưu tiên (không phải max_guests
  // — đã đảm bảo đủ chỗ từ hard filter rồi). VD tìm 20 khách: căn tiêu chuẩn
  // 20 xếp trên căn tiêu chuẩn 18, xếp trên căn tiêu chuẩn 15 (dù cả 3 đều
  // hiện ra vì nằm trong ngưỡng search mở rộng).
  if (filters.guests && product.standard_guests != null) {
    const diff = Math.abs(product.standard_guests - filters.guests);
    score += Math.max(0, W_CAPACITY_FIT * (1 - Math.min(diff / filters.guests, 1)));
  }

  // 5. Số phòng ngủ phù hợp
  if (filters.bedrooms && product.bedrooms != null) {
    if (product.bedrooms === filters.bedrooms) score += W_BEDROOMS;
    else if (product.bedrooms > filters.bedrooms) score += W_BEDROOMS * 0.65;
    else score += W_BEDROOMS * 0.2 * (product.bedrooms / filters.bedrooms);
  }

  return score;
}

// =========================================================
// 3. LÝ DO KHỚP — chỉ dựa trên dữ liệu match thực tế (không để AI tự bịa).
// Dùng cho card Top 3 "phù hợp nhất".
// =========================================================
export function buildMatchReason(
  product: Product,
  filters: SearchFilters,
  rankingPrice: number | null
): string {
  const parts: string[] = [];

  if (filters.subRegion) {
    const sr = product.sub_region ? normalize(product.sub_region) : "";
    parts.push(sr === normalize(filters.subRegion) ? `Đúng ${filters.subRegion}` : `Cùng ${product.area}`);
  } else if (filters.area) {
    parts.push(`Đúng khu vực ${product.area}`);
  }

  if (rankingPrice != null) {
    if (filters.budget) {
      const diff = Math.abs(rankingPrice - filters.budget);
      parts.push(diff < 50_000 ? "Đúng ngân sách" : `Giá lệch ${formatVND(diff)}`);
    } else if (filters.priceFrom != null || filters.priceTo != null) {
      const from = filters.priceFrom ?? 0;
      const to = filters.priceTo ?? Infinity;
      parts.push(rankingPrice >= from && rankingPrice <= to ? "Trong khoảng giá yêu cầu" : "Giá gần khoảng yêu cầu");
    }
  }

  const requested = requestedAmenities(filters);
  if (requested.length > 0) {
    const matchedCount = requested.filter((k) => amenityMatches(product, k)).length;
    parts.push(
      matchedCount === requested.length
        ? `Đủ ${matchedCount}/${requested.length} tiện ích`
        : `${matchedCount}/${requested.length} tiện ích yêu cầu`
    );
  }

  if (filters.guests && product.standard_guests != null) {
    if (product.standard_guests >= filters.guests) {
      parts.push(`Đủ chỗ cho ${filters.guests} khách`);
    } else {
      const extra = filters.guests - product.standard_guests;
      parts.push(`${product.standard_guests} khách tiêu chuẩn, +${extra} khách vượt chuẩn`);
    }
  }

  return parts.slice(0, 3).join(" • ") || "Phù hợp với tiêu chí tìm kiếm";
}

export function rankProducts(products: Product[], filters: SearchFilters, holidays: Holiday[]): RankedProduct[] {
  const eligible = applyHardFilters(products, filters);

  const ranked: (RankedProduct & { _rankingPrice: number | null })[] = eligible
    .map((p) => {
      const { rankingPrice, context } = resolveProductPricing(p, filters, holidays);
      return {
        ...p,
        _score: scoreProduct(p, filters, rankingPrice),
        _pricing: context,
        _rankingPrice: rankingPrice,
      };
    })
    .sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  // Gắn lý do khớp cho Top 3 — dựa trên dữ liệu thật, không phải AI tự viết
  ranked.slice(0, 3).forEach((p) => {
    p._reason = buildMatchReason(p, filters, p._rankingPrice);
  });

  return ranked.map(({ _rankingPrice, ...rest }) => rest);
}
