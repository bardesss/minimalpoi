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
  city: string | null;
  country_code: string | null;
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
  avg_rating: number | null;
  rating_count: number;
}

export type VisitedFilter = "any" | "visited" | "not";

export interface PoiFilter {
  search: string;
  categoryIds: number[];
  visited: VisitedFilter; // visited-by-me
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
  city?: string | null;
  country_code?: string | null;
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

export interface PlaceSearchResult {
  place_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
}

export interface PoiDraft {
  name: string | null;
  address: string | null;
  city: string | null;
  country_code: string | null;
  lat: number | null;
  lng: number | null;
  image_url: string | null;
  description: string | null;
  phone: string | null;
  website: string | null;
  source_url: string | null;
  field_sources: Record<string, string>;
}

export interface ImportRowError {
  row: number;
  reason: string;
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: ImportRowError[];
  created_ids: number[];
}

export interface Settings {
  trip_base_url: string | null;
  trip_username: string | null;
  trip_password_set: boolean;
  trip_sync_enabled: boolean;
  trip_sync_interval_seconds: number;
  trip_conflict_policy: string;
  google_api_key_set: boolean;
  nominatim_url: string | null;
  map_tile_url: string;
  default_map_center_lat: number;
  default_map_center_lng: number;
  default_map_zoom: number;
  cookie_secure: boolean;
  trip_last_sync_at: string | null;
}

export interface SettingsUpdate {
  trip_base_url?: string | null;
  trip_username?: string | null;
  trip_password?: string | null;
  trip_sync_enabled?: boolean;
  trip_sync_interval_seconds?: number;
  trip_conflict_policy?: string;
  google_api_key?: string | null;
  nominatim_url?: string | null;
  map_tile_url?: string;
  default_map_center_lat?: number;
  default_map_center_lng?: number;
  default_map_zoom?: number;
  cookie_secure?: boolean;
}

export interface TagInfo {
  tag: string;
  count: number;
}

export interface CategoryCreate {
  name: string;
  color?: string;
  icon?: string | null;
}

export type CategoryUpdate = Partial<CategoryCreate>;

export interface VersionInfo {
  current: string;
  latest: string | null;
  update_available: boolean;
}

export interface UserCreate {
  username: string;
  password: string;
  role: Role;
}

export interface UserUpdate {
  password?: string;
  role?: Role;
  disabled?: boolean;
}

export interface Team {
  id: number;
  name: string;
  created_by: number;
  member_ids: number[];
}

export interface TeamCreate {
  name: string;
  member_ids: number[];
}

export interface TeamCandidate {
  id: number;
  username: string;
}

export interface Visit {
  poi_id: number;
  user_id: number;
  team_id: number | null;
  rating: number | null;
}

export interface VisitUpsert {
  team_id?: number | null;
  rating?: number | null;
}

export interface Comment {
  id: number;
  poi_id: number;
  user_id: number;
  username: string;
  text: string;
  created_at: string;
}

export interface CommentCreate {
  text: string;
}

export interface SyncStatus {
  enabled: boolean;
  last_run: string | null;
  error_count: number;
  conflict_count: number;
}

export interface SyncConflict {
  entity_type: "place" | "category";
  id: number;
  name: string;
  trip_id: number | null;
  status: "conflict" | "error";
  last_error: string | null;
}

export type SyncResolution = "local" | "trip";

export interface SyncResolve {
  entity_type: "place" | "category";
  id: number;
  resolution: SyncResolution;
}

export type RouteNodeKind = "stay" | "stop";
export type LegSource = "google" | "estimate";

export interface RouteSummary {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  node_count: number;
  created_by: number;
  owner_username: string;
}

export interface RouteNode {
  id: number;
  kind: RouteNodeKind;
  position: number;
  nights: number | null;
  notes: string | null;
  poi_id: number | null;
  name: string;
  lat: number;
  lng: number;
  arrive_date: string | null;
  depart_date: string | null;
  inbound_distance_m: number | null;
  inbound_duration_s: number | null;
}

export interface RouteLeg {
  from_node_id: number;
  to_node_id: number;
  distance_m: number;
  duration_s: number;
  source: LegSource;
}

export interface RouteDetail extends RouteSummary {
  nodes: RouteNode[];
  legs: RouteLeg[];
  total_distance_m: number;
  total_duration_s: number;
}

export interface RouteAttachment {
  id: number;
  route_id: number;
  node_id: number | null;
  filename: string;
  content_type: string;
  size: number;
  uploaded_by: number;
  uploaded_at: string;
}

export interface RouteCreate { name: string; start_date: string; }
export interface RouteUpdate { name?: string; start_date?: string; }
export interface RouteNodeCreate {
  kind: RouteNodeKind;
  poi_id?: number | null;
  name?: string | null;
  lat?: number | null;
  lng?: number | null;
  nights?: number | null;
  notes?: string | null;
  position?: number | null;
}
export interface RouteNodeUpdate { nights?: number | null; notes?: string | null; position?: number | null; }
