import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPublicRoute, unlockPublicRoute, type PublicRouteView } from "../api/public";
import { ApiError } from "../api/client";
import type { RouteDetail } from "../types/api";
import RouteMap from "../components/routes/RouteMap";
import RouteTimeline from "../components/routes/RouteTimeline";
import { inputStyle, primaryButtonStyle, theme } from "../theme";
import BrandLogo from "../components/BrandLogo";

/** Adapts a `PublicRouteView` into the `RouteDetail` shape `RouteTimeline`
 * expects. Includes every field it actually reads (nodes, legs, round_trip,
 * start_date, attachments — see RouteTimeline.tsx:266, groupNodesByDay); the
 * unread `RouteSummary` fields get neutral placeholders since `can_edit:false`
 * means they're never displayed or mutated. */
export function routeDetailFromPublic(view: PublicRouteView): RouteDetail {
  return {
    id: 0,
    name: view.name,
    start_date: view.start_date,
    end_date: view.end_date,
    scheduled_end_date: view.scheduled_end_date,
    node_count: view.node_count,
    created_by: 0,
    owner_username: "",
    team_id: null,
    team_name: null,
    round_trip: view.round_trip,
    can_edit: false,
    nodes: view.nodes,
    legs: view.legs,
    attachments: [],
    total_distance_m: view.total_distance_m,
    total_duration_s: view.total_duration_s,
  };
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: theme.color.pageBg, padding: 24 }}>
      <p style={{ fontFamily: theme.font.ui, fontSize: 14, color: theme.color.textBody, textAlign: "center", maxWidth: 360 }}>{children}</p>
    </div>
  );
}

function PasswordGate({ token, onUnlocked }: { token: string; onUnlocked: (route: PublicRouteView) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await unlockPublicRoute(token, password);
      if (res.route) onUnlocked(res.route);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Incorrect password");
      } else if (err instanceof ApiError && err.status === 429) {
        setRateLimited(true);
        setError("Too many attempts — please wait and try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: theme.color.pageBg }}>
      <form
        onSubmit={onSubmit}
        aria-label="Unlock shared route"
        style={{ width: 320, background: theme.color.surface0, border: `1px solid ${theme.color.borderSubtle}`, borderRadius: theme.radius.modal, padding: "28px 26px", display: "flex", flexDirection: "column", gap: 14, boxShadow: theme.shadow.legend }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <BrandLogo size={28} />
          <h1 style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: "-.02em" }}>This route is password-protected</h1>
        </div>
        <label htmlFor="public-route-password" style={{ fontSize: 12, fontWeight: 700, color: theme.color.textBody }}>Password</label>
        <input
          id="public-route-password"
          type="password"
          style={inputStyle}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={rateLimited}
          autoFocus
        />
        {error && <p style={{ margin: 0, fontSize: 12.5, color: theme.color.dangerText }}>{error}</p>}
        <button type="submit" style={primaryButtonStyle} disabled={busy || rateLimited}>Unlock</button>
      </form>
    </div>
  );
}

export default function PublicRoutePage() {
  const { token = "" } = useParams();
  const qc = useQueryClient();
  const queryKey = ["public-route", token];
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => getPublicRoute(token),
    retry: false,
  });

  if (isLoading) {
    return <CenteredMessage>Loading shared route…</CenteredMessage>;
  }

  if (error) {
    if (error instanceof ApiError && error.status === 404) {
      return <CenteredMessage>This shared route isn&apos;t available (it may have been revoked or expired).</CenteredMessage>;
    }
    return <CenteredMessage>Something went wrong loading this shared route.</CenteredMessage>;
  }

  if (!data) return <CenteredMessage>Loading shared route…</CenteredMessage>;

  if (data.locked || !data.route) {
    return (
      <PasswordGate
        token={token}
        onUnlocked={(route) => qc.setQueryData(queryKey, { locked: false, route })}
      />
    );
  }

  const route = data.route;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: theme.color.pageBg }}>
      <header style={{ padding: "12px 20px", borderBottom: `1px solid ${theme.color.borderSubtle}`, background: theme.color.surface0, flex: "none" }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: theme.color.textPlaceholder }}>
          Read-only shared route
        </p>
        <h1 style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 800, color: theme.color.textPrimary }}>{route.name}</h1>
        <p style={{ margin: "2px 0 0", fontSize: 12.5, color: theme.color.textSecondary }}>
          {route.start_date}{route.end_date ? ` → ${route.end_date}` : ""}
        </p>
      </header>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
          <RouteMap
            nodes={route.nodes}
            legs={route.legs}
            pois={[]}
            categories={[]}
            settings={{ ...route.map, routes_enabled: true }}
            canAdd={false}
            onAddNode={() => {}}
            passedNodeIds={new Set()}
            highlightNodeId={null}
          />
        </div>
        <div style={{ width: 380, flex: "none", overflowY: "auto", padding: 16, borderLeft: `1px solid ${theme.color.borderSubtle}`, background: theme.color.surface0 }}>
          <RouteTimeline route={routeDetailFromPublic(route)} canEdit={false} />
        </div>
      </div>

      <footer style={{ padding: "8px 20px", textAlign: "center", flex: "none" }}>
        <p style={{ margin: 0, fontSize: 11, color: theme.color.textPlaceholder }}>Made with MinimalPOI</p>
      </footer>
    </div>
  );
}
