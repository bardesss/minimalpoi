import type { StyleSpecification } from "maplibre-gl";
import type { MapSettings } from "../types/api";

const GLYPHS = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";

/**
 * Fontstack for every symbol layer we add ourselves.
 *
 * Our layers are drawn over whichever style `resolveMapStyle` returns, so the
 * stack has to exist on *both* glyph servers. GLYPHS above serves only "Open
 * Sans Semibold" and "Noto Sans Regular" — it has no "Open Sans Bold", so
 * asking for Bold 404s and the labels never render on the raster path. Carto
 * (the default vector style) serves Semibold too, which makes it the one stack
 * that works either way. Keep this next to GLYPHS: changing one constrains the
 * other.
 */
export const MAP_FONT: [string] = ["Open Sans Semibold"];

export function resolveMapStyle(settings: MapSettings): string | StyleSpecification {
  const url = settings.map_tile_url;
  if (/\.json($|\?)/i.test(url)) {
    return url;
  }
  return {
    version: 8,
    glyphs: GLYPHS,
    sources: {
      "raster-tiles": {
        type: "raster",
        tiles: [url],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [{ id: "raster-layer", type: "raster", source: "raster-tiles" }],
  };
}
