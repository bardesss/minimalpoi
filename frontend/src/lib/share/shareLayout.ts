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
}

export function shareLayout(spec: ShareFormatSpec): ShareLayout {
  const { width, height } = spec;
  const margin = Math.round(width * 0.055);
  const logoSize = Math.round(width * 0.06);
  return {
    width,
    height,
    fitPadding: spec.fitPadding,
    margin,
    // Title + dates: top-left.
    title: { x: margin, y: margin + Math.round(width * 0.03), fontSize: Math.round(width * 0.05), maxWidth: width - margin * 2 },
    dates: { x: margin, y: margin + Math.round(width * 0.09), fontSize: Math.round(width * 0.026) },
    // Logo + wordmark: bottom-left.
    logo: { x: margin, y: height - margin - logoSize, size: logoSize },
    wordmark: { x: margin + logoSize + Math.round(width * 0.02), y: height - margin - Math.round(logoSize * 0.62), fontSize: Math.round(width * 0.03) },
    // Stats strip: bottom-right band.
    stats: { x: margin, y: height - margin - logoSize - Math.round(width * 0.06), gap: Math.round(width * 0.09), labelSize: Math.round(width * 0.02), valueSize: Math.round(width * 0.034) },
    scrimHeight: Math.round(height * 0.28),
  };
}
