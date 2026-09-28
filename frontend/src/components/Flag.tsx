// A small SVG country flag, looked up by ISO 3166-1 alpha-2 code.
//
// Uses country-flag-icons (inline SVG) rather than emoji — Windows has no
// regional-indicator flag glyphs, so flag emoji render as bare letters there.
//
// The flag SVG set (~233 kB) is loaded lazily, only once a place with a
// country code actually renders — `hasFlag` alone is cheap and stays a
// static import so we can bail out without paying that cost for unknown codes.
import { useEffect, useSyncExternalStore, type CSSProperties, type ReactElement } from "react";
import { hasFlag } from "country-flag-icons";

type FlagComponent = (props: { title?: string; style?: CSSProperties }) => ReactElement;

let flagsCache: Record<string, FlagComponent> | null = null;
let flagsPromise: Promise<Record<string, FlagComponent> | null> | null = null;
const listeners = new Set<() => void>();

function loadFlags(): Promise<Record<string, FlagComponent> | null> {
  if (!flagsPromise) {
    flagsPromise = import("country-flag-icons/react/3x2")
      .then((m) => {
        flagsCache = m as unknown as Record<string, FlagComponent>;
        listeners.forEach((listener) => listener());
        return flagsCache;
      })
      .catch(() => {
        // A failed chunk load (offline, or a stale hash after a deploy) keeps
        // the placeholder; forget the promise so a later mount retries.
        flagsPromise = null;
        return null;
      });
  }
  return flagsPromise;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return flagsCache;
}

const boxStyle: CSSProperties = { display: "inline-block", width: 15, height: 11, borderRadius: 1.5, flexShrink: 0 };

export default function Flag({ code, title }: { code: string | null | undefined; title?: string }) {
  const flags = useSyncExternalStore(subscribe, getSnapshot);
  const cc = code?.trim().toUpperCase();
  const known = !!cc && hasFlag(cc);

  useEffect(() => {
    if (known) {
      loadFlags();
    }
  }, [known]);

  if (!known || !cc) return null;

  const Svg = flags?.[cc];
  if (!Svg) return <span style={boxStyle} />;
  return <Svg title={title ?? cc} style={{ width: 15, height: 11, borderRadius: 1.5, flexShrink: 0 }} />;
}
