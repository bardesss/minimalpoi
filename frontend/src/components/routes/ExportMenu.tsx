import { ghostButtonStyle } from "../../theme";
import type { RouteExportFormat } from "../../api/routes";
import { useIsMobile } from "../../lib/useMediaQuery";
import MenuButton from "../MenuButton";

const FORMATS: RouteExportFormat[] = ["geojson", "gpx", "kml"];
const LABEL: Record<RouteExportFormat, string> = { geojson: "GeoJSON", gpx: "GPX", kml: "KML" };

/** Export menu for a route: GeoJSON / GPX / KML. */
export default function ExportMenu({ onExport }: { onExport: (f: RouteExportFormat) => void }) {
  const isMobile = useIsMobile();
  return (
    <MenuButton
      label="Export ▾"
      menuLabel="Export route"
      triggerStyle={{ ...ghostButtonStyle, padding: "6px 12px", whiteSpace: "nowrap", minHeight: isMobile ? 44 : undefined }}
      items={FORMATS.map((f) => ({ key: f, label: LABEL[f], onSelect: () => onExport(f) }))}
    />
  );
}
