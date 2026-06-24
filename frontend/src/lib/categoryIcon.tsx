import { icons, MapPin, type LucideProps } from "lucide-react";

function toPascal(name: string): string {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

export function CategoryIcon({ name, size = 14, color }: { name: string | null } & Pick<LucideProps, "size" | "color">) {
  const key = name ? toPascal(name) : "";
  const Icon = (key && (icons as Record<string, typeof MapPin>)[key]) || MapPin;
  return <Icon size={size} color={color} aria-hidden />;
}
