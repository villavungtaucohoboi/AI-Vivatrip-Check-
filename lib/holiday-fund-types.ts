export interface HolidayFundSheet {
  id: string;
  name: string;
  default_year: number;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface HolidayFundItem {
  id: string;
  post_id: string;
  sheet_id: string;
  name: string | null;
  fund_date: string | null; // YYYY-MM-DD
  price: number | null;
  raw_line: string;
  created_at: string;
  updated_at: string;
}

export interface HolidayFundImage {
  id: string;
  post_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

export interface HolidayFundPost {
  id: string;
  sheet_id: string;
  author_name: string;
  poster_token: string;
  raw_content: string;
  created_at: string;
  updated_at: string;
  holiday_fund_items?: HolidayFundItem[];
  holiday_fund_images?: HolidayFundImage[];
}
