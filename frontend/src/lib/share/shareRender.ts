// maplibre-gl 6 dropped the default export; the namespace import replaces it.
import * as maplibregl from "maplibre-gl";
import type { Map as MlMap, LngLatBoundsLike } from "maplibre-gl";
import type { MapSettings, RouteDetail } from "../../types/api";
import { resolveMapStyle } from "../../map/style";
import { routeLine } from "../../map/routeLine";
import { shareStats } from "./shareStats";
import { shareLayout } from "./shareLayout";
import type { ShareFormatSpec, ShareVariant } from "./shareFormats";
import { theme } from "../../theme";

const LINE_COLOR = "#4f46e5";

export interface ShareRenderOptions {
  route: RouteDetail;
  settings: MapSettings;
  format: ShareFormatSpec;
  variant: ShareVariant;
}

function bounds(route: RouteDetail): LngLatBoundsLike | null {
  if (route.nodes.length === 0) return null;
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const n of route.nodes) {
    minLng = Math.min(minLng, n.lng); minLat = Math.min(minLat, n.lat);
    maxLng = Math.max(maxLng, n.lng); maxLat = Math.max(maxLat, n.lat);
  }
  return [[minLng, minLat], [maxLng, maxLat]];
}

/** Build a hidden preserveDrawingBuffer map, fit the route, wait for tiles.
 * Rejects (and cleans up the map + container) if the style/tiles never settle. */
async function idleMap(opts: ShareRenderOptions): Promise<{ map: MlMap; container: HTMLDivElement }> {
  const container = document.createElement("div");
  container.style.cssText = `position:fixed;left:-99999px;top:0;width:${opts.format.width}px;height:${opts.format.height}px;`;
  document.body.appendChild(container);
  let map: MlMap | undefined;
  try {
    map = new maplibregl.Map({
      container,
      style: resolveMapStyle(opts.settings),
      center: [opts.settings.default_map_center_lng, opts.settings.default_map_center_lat],
      zoom: opts.settings.default_map_zoom,
      // maplibre-gl 5.24 moved `preserveDrawingBuffer` off MapOptions and into
      // `canvasContextAttributes` (WebGLContextAttributesWithType); the brief's
      // top-level `preserveDrawingBuffer: true` no longer type-checks.
      canvasContextAttributes: { preserveDrawingBuffer: true },
      // maplibre types this as `false | AttributionControlOptions` — pass `{}` (not `true`).
      attributionControl: opts.variant === "map" ? {} : false,
      interactive: false,
    });
    const m = map;
    const waitFor = (ev: "load" | "idle", ms: number) =>
      new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Map "${ev}" timed out`)), ms);
        m.once(ev, () => { clearTimeout(timer); resolve(); });
      });
    await waitFor("load", 15000);
    const b = bounds(opts.route);
    if (b) m.fitBounds(b, { padding: opts.format.fitPadding, duration: 0, maxZoom: 14 });
    await waitFor("idle", 15000);
    return { map, container };
  } catch (err) {
    map?.remove();
    container.remove();
    throw err;
  }
}

// The lucide "map-pin" icon (24×24 viewBox) — the exact path BrandLogo renders,
// so the share image's mark matches the app logo instead of a plain dot.
const MAP_PIN_PATH = "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0";

function drawMapPin(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 24;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.4; // matches BrandLogo's strokeWidth, measured in the 24-unit space
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke(new Path2D(MAP_PIN_PATH));
  ctx.beginPath();
  ctx.arc(12, 10, 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function renderShareImage(opts: ShareRenderOptions): Promise<Blob> {
  const { route, format, variant } = opts;
  const { map, container } = await idleMap(opts);
  try {
    const mapCanvas = map.getCanvas();
    const scale = mapCanvas.width / format.width; // device-pixel-ratio the map rendered at
    const out = document.createElement("canvas");
    out.width = mapCanvas.width;
    out.height = mapCanvas.height;
    const ctx = out.getContext("2d")!;
    ctx.scale(scale, scale); // draw everything below in logical (format) coordinates

    // 1. Background.
    if (variant === "map") {
      ctx.drawImage(mapCanvas, 0, 0, format.width, format.height);
    }
    const L = shareLayout(format);

    // 2. Route line (road geometry when present, else straight segments).
    const { line, points } = routeLine(route.nodes, route.legs);
    ctx.lineWidth = Math.round(format.width * 0.006);
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    for (const seg of line.features) {
      const coords = seg.geometry.coordinates as [number, number][];
      ctx.beginPath();
      coords.forEach(([lng, lat], i) => {
        const p = map.project([lng, lat]);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }

    // 3. Pins — numbered middle stops, ▶ start / ■ end.
    const pinR = Math.round(format.width * 0.016);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const f of points.features) {
      const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates as [number, number];
      const p = map.project([lng, lat]);
      const props = f.properties as { seq?: number; role?: string; kind?: string };
      const isStay = props.kind === "stay";
      ctx.beginPath();
      ctx.arc(p.x, p.y, pinR, 0, Math.PI * 2);
      ctx.fillStyle = props.role || isStay ? LINE_COLOR : "#ffffff";
      ctx.fill();
      ctx.lineWidth = Math.round(pinR * 0.28);
      ctx.strokeStyle = LINE_COLOR;
      ctx.stroke();
      ctx.fillStyle = props.role || isStay ? "#ffffff" : LINE_COLOR;
      ctx.font = `700 ${Math.round(pinR * 1.1)}px system-ui, sans-serif`;
      ctx.fillText(props.role === "start" ? "▶" : props.role === "end" ? "■" : String(props.seq ?? ""), p.x, p.y);
    }

    // 4. Legibility scrim (map variant only): bottom gradient.
    if (variant === "map") {
      const g = ctx.createLinearGradient(0, format.height - L.scrimHeight, 0, format.height);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = g;
      ctx.fillRect(0, format.height - L.scrimHeight, format.width, L.scrimHeight);
      // Top scrim behind the brand + title block.
      const gt = ctx.createLinearGradient(0, 0, 0, L.topScrimHeight);
      gt.addColorStop(0, "rgba(0,0,0,0.5)");
      gt.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gt;
      ctx.fillRect(0, 0, format.width, L.topScrimHeight);
    }

    const onDark = variant === "map";
    const ink = onDark ? "#ffffff" : theme.color.textPrimary;
    const sub = onDark ? "rgba(255,255,255,0.85)" : theme.color.textSecondary;

    // 5. Title + dates (top-left).
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = ink;
    ctx.font = `800 ${L.title.fontSize}px system-ui, sans-serif`;
    ctx.fillText(truncate(ctx, route.name, L.title.maxWidth), L.title.x, L.title.y);
    ctx.fillStyle = sub;
    ctx.font = `500 ${L.dates.fontSize}px system-ui, sans-serif`;
    ctx.fillText(`${route.start_date} → ${route.end_date ?? route.scheduled_end_date}`, L.dates.x, L.dates.y);

    // 6. Stats strip.
    const stats = shareStats(route);
    const cells = [["Distance", stats.distance], ["Days", stats.days], ["Stops", stats.stops]];
    cells.forEach(([label, value], i) => {
      const x = L.stats.x + i * L.stats.gap;
      ctx.fillStyle = sub;
      ctx.font = `600 ${L.stats.labelSize}px system-ui, sans-serif`;
      ctx.fillText(label.toUpperCase(), x, L.stats.y);
      ctx.fillStyle = ink;
      ctx.font = `800 ${L.stats.valueSize}px system-ui, sans-serif`;
      ctx.fillText(value, x, L.stats.y + L.stats.valueSize + 6);
    });

    // 7. Branding — gradient logo mark + wordmark (bottom-left).
    const grad = ctx.createLinearGradient(L.logo.x, L.logo.y, L.logo.x + L.logo.size, L.logo.y + L.logo.size);
    grad.addColorStop(0, "#6366f1");
    grad.addColorStop(1, "#4f46e5");
    ctx.fillStyle = grad;
    roundRect(ctx, L.logo.x, L.logo.y, L.logo.size, L.logo.size, Math.round(L.logo.size * 0.28));
    ctx.fill();
    const iconSize = L.logo.size * 0.56;
    drawMapPin(ctx, L.logo.x + (L.logo.size - iconSize) / 2, L.logo.y + (L.logo.size - iconSize) / 2, iconSize);
    ctx.fillStyle = ink;
    ctx.font = `800 ${L.wordmark.fontSize}px system-ui, sans-serif`;
    ctx.fillText("MinimalPOI", L.wordmark.x, L.wordmark.y);

    // 8. Basemap attribution (map variant only) — the exact string the basemap declares.
    if (variant === "map") {
      const attrib = container.querySelector(".maplibregl-ctrl-attrib-inner")?.textContent?.trim();
      if (attrib) {
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.font = `500 ${Math.round(format.width * 0.014)}px system-ui, sans-serif`;
        ctx.textAlign = "right";
        ctx.fillText(attrib, format.width - 8, format.height - 8);
      }
    }

    return await new Promise<Blob>((resolve, reject) => {
      out.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))), "image/png");
    });
  } finally {
    map.remove();
    container.remove();
  }
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
  return t + "…";
}
