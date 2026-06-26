// A small SVG country flag, looked up by ISO 3166-1 alpha-2 code.
//
// Uses country-flag-icons (inline SVG) rather than emoji — Windows has no
// regional-indicator flag glyphs, so flag emoji render as bare letters there.
import type { CSSProperties } from "react";
import { hasFlag } from "country-flag-icons";
import * as Flags from "country-flag-icons/react/3x2";

type FlagComponent = (props: { title?: string; style?: CSSProperties }) => JSX.Element;

export default function Flag({ code, title }: { code: string | null | undefined; title?: string }) {
  const cc = code?.trim().toUpperCase();
  if (!cc || !hasFlag(cc)) return null;
  const Svg = (Flags as Record<string, FlagComponent>)[cc];
  if (!Svg) return null;
  return <Svg title={title ?? cc} style={{ width: 15, height: 11, borderRadius: 1.5, flexShrink: 0 }} />;
}
