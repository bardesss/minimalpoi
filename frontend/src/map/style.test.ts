import { describe, expect, it } from "vitest";
import type { MapSettings } from "../types/api";
import { resolveMapStyle } from "./style";

const base: MapSettings = { map_tile_url: "", default_map_center_lat: 52, default_map_center_lng: 4, default_map_zoom: 11, routes_enabled: false };

describe("resolveMapStyle", () => {
  it("passes a style.json URL straight through", () => {
    const url = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
    expect(resolveMapStyle({ ...base, map_tile_url: url })).toBe(url);
  });
  it("builds a raster style for a {z}/{x}/{y} template", () => {
    const tpl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
    const style = resolveMapStyle({ ...base, map_tile_url: tpl });
    expect(typeof style).toBe("object");
    const s = style as Exclude<typeof style, string>;
    expect(s.sources["raster-tiles"]).toMatchObject({ type: "raster", tiles: [tpl], tileSize: 256 });
    expect(s.layers[0]).toMatchObject({ id: "raster-layer", type: "raster", source: "raster-tiles" });
    expect(typeof s.glyphs).toBe("string");
  });
});
