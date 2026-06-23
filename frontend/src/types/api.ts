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
