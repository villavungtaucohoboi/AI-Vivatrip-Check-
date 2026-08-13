export interface AvailabilityLinkRegion {
  id: string;
  name: string;
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
