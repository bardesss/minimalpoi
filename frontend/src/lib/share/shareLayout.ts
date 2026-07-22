import type { ShareFormatSpec } from "./shareFormats";

export interface ShareLayout {
  width: number;
  height: number;
  fitPadding: number;
  margin: number;
  logo: { x: number; y: number; size: number };
  wordmark: { x: number; y: number; fontSize: number };
  title: { x: number; y: number; fontSize: number; maxWidth: number };
  dates: { x: number; y: number; fontSize: number };
  stats: { x: number; y: number; gap: number; labelSize: number; valueSize: number };
  scrimHeight: number; // height of the bottom legibility gradient (map variant)
  topScrimHeight: number; // height of the top gradient behind the brand + title
}

// Layout: brand mark + wordmark top-left, then the title and dates beneath it;
// the stats strip runs along the bottom. Branding and stats live in separate
// bands (top vs bottom) so the logo never collides with the trip info, and the
// stat columns are spread wide enough that their values never touch.
export function shareLayout(spec: ShareFormatSpec): ShareLayout {
  const { width, height } = spec;
  const margin = Math.round(width * 0.055);
  const logoSize = Math.round(width * 0.06);
  const titleSize = Math.round(width * 0.05);
  const titleY = margin + logoSize + Math.round(width * 0.02) + titleSize;
  const datesY = titleY + Math.round(width * 0.035);
  const valueSize = Math.round(width * 0.034);
  return {
    width,
    height,
    fitPadding: spec.fitPadding,
    margin,
    // Brand: mark + wordmark, top-left.
    logo: { x: margin, y: margin, size: logoSize },
    wordmark: { x: margin + logoSize + Math.round(width * 0.02), y: margin + Math.round(logoSize * 0.7), fontSize: Math.round(width * 0.03) },
    // Title + dates: below the brand row.
    title: { x: margin, y: titleY, fontSize: titleSize, maxWidth: width - margin * 2 },
    dates: { x: margin, y: datesY, fontSize: Math.round(width * 0.026) },
    // Stats strip: along the bottom, generously spaced.
    stats: { x: margin, y: height - margin - valueSize - 8, gap: Math.round(width * 0.16), labelSize: Math.round(width * 0.02), valueSize },
    scrimHeight: Math.round(height * 0.28),
    topScrimHeight: datesY + Math.round(width * 0.04),
  };
}
