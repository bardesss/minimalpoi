export type ShareFormat = "square" | "story" | "landscape";
export type ShareVariant = "map" | "transparent";

export interface ShareFormatSpec {
  key: ShareFormat;
  label: string;
  width: number;
  height: number;
  fitPadding: number; // px padding when fitting the route bounds
}

export const SHARE_FORMATS: ShareFormatSpec[] = [
  { key: "square", label: "Square", width: 1080, height: 1080, fitPadding: 120 },
  { key: "story", label: "Story", width: 1080, height: 1920, fitPadding: 160 },
  { key: "landscape", label: "Landscape", width: 1200, height: 675, fitPadding: 100 },
];

export function shareFormat(key: ShareFormat): ShareFormatSpec {
  const spec = SHARE_FORMATS.find((f) => f.key === key);
  if (!spec) throw new Error(`Unknown share format: ${key}`);
  return spec;
}
