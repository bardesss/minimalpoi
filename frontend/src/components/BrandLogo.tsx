import { MapPin } from "lucide-react";
import { theme } from "../theme";

export default function BrandLogo({ size = 32 }: { size?: number }) {
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: theme.radius.logo,
        background: theme.gradient.brand,
        boxShadow: "0 3px 10px rgba(79,70,229,.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <MapPin size={Math.round(size * 0.56)} color="#fff" strokeWidth={2.4} />
    </div>
  );
}
