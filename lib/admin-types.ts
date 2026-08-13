import type { ProductType } from "@/lib/types";

export interface ProductInput {
  product_code: string;
  product_name: string;
  type: ProductType;
  area: string;
  sub_region?: string | null;
  address?: string | null;
  bedrooms?: number | null;
  beds?: number | null;
  standard_guests?: number | null;
  max_guests?: number | null;
  /** Hotel: giá phòng thấp nhất (nhập tay). Villa/resort: = price_weekday, set tự động khi lưu. */
  price?: number | null;
  price_weekday?: number | null;
  price_friday_sunday?: number | null;
  price_saturday_holiday?: number | null;
  discount_scheme: "uniform" | "by_day_type";
  discount_type: "percent" | "amount";
  discount_value: number;
  discount_weekday_type: "percent" | "amount";
  discount_weekday_value: number;
  discount_friday_sunday_type: "percent" | "amount";
  discount_friday_sunday_value: number;
  discount_saturday_holiday_type: "percent" | "amount";
  discount_saturday_holiday_value: number;
  pool: boolean;
  near_beach: boolean;
  sea_view: boolean;
  karaoke: boolean;
  bbq: boolean;
  pickleball: boolean;
  near_lake: boolean;
  note?: string | null;
  google_maps_url?: string | null;
}

export interface HotelRateInput {
  room_type: string;
  price: number;
  capacity?: number | null;
  breakfast: boolean;
  extra_bed_price?: number | null;
  note?: string | null;
}

export function mapError(message: string): string {
  if (message.includes("products_product_code_key")) {
    return "Mã sản phẩm này đã tồn tại. Vui lòng dùng mã khác.";
  }
  return message;
}
