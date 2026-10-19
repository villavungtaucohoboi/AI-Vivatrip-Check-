export interface TourDay {
  t: string;
  meals: string;
  items: string[];
  hotel?: string;
}

export interface Tour {
  id: string;
  code: string | null;
  name: string;
  country: string;
  from_city: string;
  days: number | null;
  nights: number | null;
  airline: string | null;
  flights: string | null;
  route_text: string | null;
  places: string[];
  highlights: string[];
  itinerary: TourDay[];
  includes: string[];
  excludes: string[];
  visa_notes: string[];
  sale_terms: string[];
  partner: string | null;
  partner_file: string | null;
  source_link: string | null;
  group_label: string | null;
  cover_url: string | null;
  single_usd: number | null;
  tips_usd: number | null;
  visa_discount: number;
  route_key: string | null;
  hidden: boolean;
  updated_at?: string;
}

export interface TourDeparture {
  id?: string;
  tour_id?: string;
  depart_date: string; // YYYY-MM-DD
  adult: number;
  old_adult: number | null;
  child: number | null;
  infant: number | null;
  com: number | null;
  seats: number | null;
  sold: number | null;
  tag: string | null;
}

export type TourWithDeps = Tour & { departures: TourDeparture[] };
