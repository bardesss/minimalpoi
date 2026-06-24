export type Role = "admin" | "member";

export interface UserRead {
  id: number;
  username: string;
  role: Role;
  preferred_team_id: number | null;
  disabled: boolean;
  created_at: string;
}

export interface SetupStatus {
  needs_setup: boolean;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string | null;
  created_by: number;
  trip_category_id: number | null;
  trip_sync_status: string;
}

export interface Poi {
  id: number;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  category_id: number | null;
  tags: string[];
  notes: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  image_url: string | null;
  source_url: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  trip_place_id: number | null;
  trip_sync_status: string;
}

export interface MapSettings {
  map_tile_url: string;
  default_map_center_lat: number;
  default_map_center_lng: number;
  default_map_zoom: number;
}

export interface PoiCreate {
  name: string;
  lat: number;
  lng: number;
  address?: string | null;
  category_id?: number | null;
  tags?: string[];
  notes?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  image_url?: string | null;
  source_url?: string | null;
}

export type PoiUpdate = Partial<PoiCreate>;

export interface DuplicateResult {
  duplicate_id: number | null;
}
