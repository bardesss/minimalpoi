import type { ShareFormat, ShareVariant } from "./shareFormats";

export function shareFilename(routeName: string, format: ShareFormat, variant: ShareVariant): string {
  const clean = routeName
    .replace(/[/\\:*?"<>|]+/g, "-")  // path-unsafe → dash
    .trim()
    .replace(/\s+/g, " ");
  const base = clean || "route";
  return `${base} - ${format} - ${variant}.png`;
}
