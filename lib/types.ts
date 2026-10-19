export type UserRole = "admin" | "sale";

export type ProductType = "villa" | "hotel" | "resort" | "homestay";

export const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  villa: "Villa",
  hotel: "Khách sạn",
  resort: "Resort",
  homestay: "Homestay",
};

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  created_at: string;
}

export type PriceTier = "weekday" | "friday_sunday" | "saturday_holiday";
export type DiscountType = "percent" | "amount";
export type DiscountScheme = "uniform" | "by_day_type";

export interface Product {
  id: string;
  product_code: string;
  product_name: string;
  type: ProductType;
  area: string;
  sub_region: string | null;
  address: string | null;
  bedrooms: number | null;
  beds: number | null;
  standard_guests: number | null;
  max_guests: number | null;
  extra_guest_fee: number | null;
  /** Chỉ có ở hotel/resort — gắn kèm khi search trả kết quả, không phải cột thật trong bảng products */
  hotel_rates?: HotelRate[];
  /** Villa/resort: = price_weekday (tham khảo/sort khi không có ngày). Hotel: giá phòng thấp nhất, nhập tay. */
  price: number | null;
  /** Villa/resort only — null cho hotel */
  price_weekday: number | null;
  price_friday_sunday: number | null;
  price_saturday_holiday: number | null;
  /** uniform: dùng discount_type/discount_value cho cả 3 khung. by_day_type: dùng riêng từng khung — discount_weekday_*, discount_friday_sunday_*, discount_saturday_holiday_* */
  discount_scheme: DiscountScheme;
  discount_type: DiscountType;
  discount_value: number;
  discount_weekday_type: DiscountType;
  discount_weekday_value: number;
  discount_friday_sunday_type: DiscountType;
  discount_friday_sunday_value: number;
  discount_saturday_holiday_type: DiscountType;
  discount_saturday_holiday_value: number;
  pool: boolean;
  near_beach: boolean;
  sea_view: boolean;
  karaoke: boolean;
  bbq: boolean;
  pickleball: boolean;
  near_lake: boolean;
  note: string | null;
  google_maps_url: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
  // Resort / khách sạn (migration 0026)
  high_seasons?: { from: string; to: string }[] | null;
  weekend_nights?: number[] | null;
  surcharge_note?: string | null;
  contract_summary?: string | null;
  // Giai đoạn giá linh hoạt (migration 0027)
  rate_periods?: RatePeriod[] | null;
  star?: number | null;
  perks?: string | null;
  /** Giá mua của ai (nhà cung cấp / nguồn giá) — chỉ Sale xem */
  price_source?: string | null;
  /** Nhóm khách sạn để gộp nhiều đối tác (trống = theo tên) */
  group_key?: string | null;
  image_link?: string | null;
}

/** Giai đoạn giá của resort. from/to dạng "YYYY-MM-DD" (theo năm hợp đồng) hoặc "MM-DD" (lặp lại mỗi năm). */
export interface RatePeriod {
  key: string;
  name: string;
  ranges: { from: string; to: string }[];
  /** true = giai đoạn này áp dụng cho các ngày trong lịch ngày lễ chung của app */
  holiday?: boolean;
}
export interface PeriodPrice {
  wd: number | null; // giá ngày thường (hoặc giá cả tuần nếu không chia cuối tuần)
  we: number | null; // giá cuối tuần (null = như ngày thường)
}

export interface Holiday {
  id: string;
  holiday_date: string; // YYYY-MM-DD
  holiday_name: string;
  created_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
}

export interface HotelRate {
  id: string;
  product_id: string;
  room_type: string;
  /** Gói giá: Ăn sáng / 2 bữa (HB) / All Inclusive… (null = giá phòng chung) */
  rate_plan?: string | null;
  price: number;
  capacity: number | null;
  breakfast: boolean;
  extra_bed_price: number | null;
  note: string | null;
  updated_at: string;
  // Bảng giá theo mùa (migration 0026) — có thể null với dữ liệu cũ
  area_m2?: number | null;
  bed?: string | null;
  price_low_weekday?: number | null;
  price_low_weekend?: number | null;
  price_high_weekday?: number | null;
  price_high_weekend?: number | null;
  price_holiday?: number | null;
  discount_percent?: number | null;
  sort_order?: number | null;
  period_prices?: Record<string, PeriodPrice> | null;
  max_children?: number | null;
}

// Bộ lọc dùng chung cho cả tìm kiếm tự nhiên và bộ lọc thủ công
export interface SearchFilters {
  area?: string;
  areaCluster?: string[]; // các khu vực "cùng vùng miền" — CHỈ dùng để gợi ý mở rộng, không tự trộn vào kết quả chính
  subRegion?: string; // tiểu khu vực (VD "Đồng Đò" trong "Sóc Sơn")
  expandRegions?: string[]; // các khu vực Sale đã CHỦ ĐỘNG bấm "xem thêm" — chỉ khi có mới được trộn thêm vào kết quả
  type?: ProductType;
  /** Khoá cứng phạm vi loại sản phẩm (VD ["hotel","resort"]) — dùng để tách
   * hẳn trang "Tìm Resort/Hotel" khỏi Villa, không liên quan tới `type` ở
   * trên (đó là lọc 1 loại cụ thể trong phạm vi đã khoá). */
  types?: ProductType[];
  guests?: number;
  bedrooms?: number;
  priceFrom?: number;
  priceTo?: number;
  budget?: number; // ngân sách "khoảng X" dùng để xếp hạng theo độ gần giá
  date?: string; // YYYY-MM-DD — "Ngày đi", ảnh hưởng giá villa/resort
  star?: number; // hạng sao tối thiểu (resort / khách sạn)
  checkout?: string; // YYYY-MM-DD — ngày trả phòng (resort/khách sạn tính theo số đêm)
  /** Khung giá khách hỏi khi KHÔNG nói ngày cụ thể (VD "cuối tuần", "ngày
   * thường") — chỉ dùng để TÔ ĐỎ dòng giá tương ứng trên thẻ, không lọc. */
  dayTiers?: PriceTier[];
  name?: string; // từ khoá tên sản phẩm, VD "doris" trích từ "Doris villa sóc sơn"
  pool?: boolean;
  near_beach?: boolean;
  sea_view?: boolean;
  karaoke?: boolean;
  bbq?: boolean;
  pickleball?: boolean;
  near_lake?: boolean;
}

export interface SearchRequestBody {
  query?: string;
  filters?: SearchFilters;
  offset?: number;
  limit?: number;
}

export interface DatePricingContext {
  date: string; // YYYY-MM-DD
  tier: PriceTier;
  basePrice: number | null;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  finalPrice: number | null;
}

export interface RankedProduct extends Product {
  _score: number;
  _pricing?: DatePricingContext;
  _reason?: string; // lý do khớp thực tế (VD "Đúng Đồng Đò • Giá lệch 200k • Đủ 2 tiện ích") — chỉ có ở Top 3
}

export interface SearchResponseBody {
  results: RankedProduct[];
  total: number;
  parsedFilters: SearchFilters;
  /** Khu vực "lân cận" gợi ý mở rộng — CHỈ hiện làm nút bấm, không tự trộn vào results */
  suggestedRegions?: string[];
}

export interface ImportRow {
  product_code: string;
  product_name: string;
  type: string;
  area: string;
  sub_region?: string;
  address?: string;
  bedrooms?: number;
  beds?: number;
  standard_guests?: number;
  max_guests?: number;
  extra_guest_fee?: number;
  /** Hotel: giá phòng thấp nhất. Villa/resort: bỏ trống, dùng 3 cột giá theo thứ bên dưới. */
  price?: number;
  price_weekday?: number;
  price_friday_sunday?: number;
  price_saturday_holiday?: number;
  discount_scheme?: string;
  discount_type?: string;
  discount_value?: number;
  discount_weekday_type?: string;
  discount_weekday_value?: number;
  discount_friday_sunday_type?: string;
  discount_friday_sunday_value?: number;
  discount_saturday_holiday_type?: string;
  discount_saturday_holiday_value?: number;
  pool?: boolean;
  near_beach?: boolean;
  sea_view?: boolean;
  karaoke?: boolean;
  bbq?: boolean;
  pickleball?: boolean;
  near_lake?: boolean;
  note?: string;
}

export interface ImportRowResult extends ImportRow {
  _status: "new" | "update" | "error";
  _error?: string;
  _rowNumber: number;
}

export interface ImportSummary {
  inserted: number;
  updated: number;
  errors: number;
}
