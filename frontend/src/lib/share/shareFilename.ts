import type { ShareFormat, ShareVariant } from "./shareFormats";

function slug(routeName: string): string {
  const clean = routeName.replace(/[/\\:*?"<>|]+/g, "-").trim().replace(/\s+/g, " ");
  return clean || "route";
}

export function shareFilename(routeName: string, format: ShareFormat, variant: ShareVariant): string {
  return `${slug(routeName)} - ${format} - ${variant}.png`;
}

export function sharePdfFilename(routeName: string): string {
  return `${slug(routeName)} - itinerary.pdf`;
}
