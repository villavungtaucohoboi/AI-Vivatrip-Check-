export type UserRole = "admin" | "sale";

export type ProductType = "villa" | "hotel" | "resort";

export const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  villa: "Villa",
  hotel: "Khách sạn",
  resort: "Resort",
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
  address: string | null;
  bedrooms: number | null;
  beds: number | null;
  standard_guests: number | null;
  max_guests: number | null;
  /** Villa/resort: = price_weekday (tham khảo/sort khi không có ngày). Hotel: giá phòng thấp nhất, nhập tay. */
  price: number | null;
  /** Villa/resort only — null cho hotel */
  price_weekday: number | null;
  price_friday_sunday: number | null;
  price_saturday_holiday: number | null;
  /** uniform: dùng discount_type/discount_value cho cả 3 khung. by_day_type: dùng discount_weekday_type/value và discount_weekend_type/value */
  discount_scheme: DiscountScheme;
  discount_type: DiscountType;
  discount_value: number;
  discount_weekday_type: DiscountType;
  discount_weekday_value: number;
  discount_weekend_type: DiscountType;
  discount_weekend_value: number;
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
  price: number;
  capacity: number | null;
  breakfast: boolean;
  extra_bed_price: number | null;
  note: string | null;
  updated_at: string;
}

export interface ProductWithExtras extends Product {
  product_images?: ProductImage[];
  hotel_rates?: HotelRate[];
}

// Bộ lọc dùng chung cho cả tìm kiếm tự nhiên và bộ lọc thủ công
export interface SearchFilters {
  area?: string;
  type?: ProductType;
  guests?: number;
  bedrooms?: number;
  priceFrom?: number;
  priceTo?: number;
  budget?: number; // ngân sách "khoảng X" dùng để xếp hạng theo độ gần giá
  date?: string; // YYYY-MM-DD — "Ngày đi", ảnh hưởng giá villa/resort
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
}

export interface SearchResponseBody {
  results: RankedProduct[];
  total: number;
  parsedFilters: SearchFilters;
}

export interface ImportRow {
  product_code: string;
  product_name: string;
  type: string;
  area: string;
  address?: string;
  bedrooms?: number;
  beds?: number;
  standard_guests?: number;
  max_guests?: number;
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
  discount_weekend_type?: string;
  discount_weekend_value?: number;
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
