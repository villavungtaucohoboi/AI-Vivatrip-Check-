import type { ProductType } from "@/lib/types";

export interface ProductInput {
  product_code: string;
  product_name: string;
  type: ProductType;
  area: string;
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
  discount_percent: number;
  pool: boolean;
  near_beach: boolean;
  karaoke: boolean;
  bbq: boolean;
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
