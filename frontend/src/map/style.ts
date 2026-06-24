import type { StyleSpecification } from "maplibre-gl";
import type { MapSettings } from "../types/api";

const GLYPHS = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";

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
