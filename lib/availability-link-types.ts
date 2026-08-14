export interface AvailabilityLinkRegion {
  id: string;
  name: string;
  property_category: "villa" | "khach_san_resort";
  is_chain: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityLink {
  id: string;
  region_id: string;
  name: string;
  url: string;
  note: string | null;
  sort_order: number;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}
