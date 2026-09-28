import { useEffect, useSyncExternalStore } from "react";
import {
  Utensils, Coffee, Beer, Wine, Bed, TreePine, Mountain, Camera,
  Landmark, Store, ShoppingCart, Fuel, ParkingCircle, Bike,
  TrainFront, Plane, Ship, Music, Film, Dumbbell, Heart, Star,
  Flag as FlagIcon, MapPin,
  type LucideIcon, type LucideProps,
} from "lucide-react";

// Curated set the category picker offers today. Built from named imports so
// the bundler only pulls in these icons for the main entry chunk — the full
// lucide-react icon set (~600 kB) is loaded lazily, only when a place uses a
// category icon outside this list (e.g. imported data, or a future picker).
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  coffee: Coffee,
  beer: Beer,
  wine: Wine,
  bed: Bed,
  "tree-pine": TreePine,
  mountain: Mountain,
  camera: Camera,
  landmark: Landmark,
  store: Store,
  "shopping-cart": ShoppingCart,
  fuel: Fuel,
  "parking-circle": ParkingCircle,
  bike: Bike,
  "train-front": TrainFront,
  plane: Plane,
  ship: Ship,
  music: Music,
  film: Film,
  dumbbell: Dumbbell,
  heart: Heart,
  star: Star,
  flag: FlagIcon,
  "map-pin": MapPin,
};

function toPascal(name: string): string {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

let allIconsCache: Record<string, LucideIcon> | null = null;
let allIconsPromise: Promise<Record<string, LucideIcon> | null> | null = null;
const listeners = new Set<() => void>();

// Import the icon-index module directly, rather than `import("lucide-react")`.
// lucide-react's main barrel (lucide-react.mjs) is also statically imported
// elsewhere in the app for unrelated single icons (nav, search, filters), so
// a dynamic import() of that same specifier can't be split into its own
// chunk — the bundler has to keep it resident wherever it's already required
// synchronously. The barrel re-exports this icon-index module verbatim
// (`import * as index from './icons/index.mjs'; export { index as icons }`),
// and nothing else in the app imports this deep path statically, so it can
// become a genuinely separate, lazily-loaded chunk. lucide-react ships no
// "exports" map, so the deep import resolves; see src/types/lucide-icons.d.ts
// for why it's typed loosely and cast at the call site.
function loadAllIcons(): Promise<Record<string, LucideIcon> | null> {
  if (!allIconsPromise) {
    allIconsPromise = import("lucide-react/dist/esm/icons/index.mjs")
      .then((m) => {
        allIconsCache = m as unknown as Record<string, LucideIcon>;
        listeners.forEach((listener) => listener());
        return allIconsCache;
      })
      .catch(() => {
        // A failed chunk load (offline, or a stale hash after a deploy) keeps
        // the MapPin fallback; forget the promise so a later mount retries.
        allIconsPromise = null;
        return null;
      });
  }
  return allIconsPromise;
}

// Own-property lookup only: category icon names are free-form strings shared
// across users, so "constructor", "__proto__", "toString"… must not resolve to
// Object.prototype members and get rendered as a component.
function lookup(icons: Record<string, LucideIcon> | null, name: string): LucideIcon | undefined {
  return icons && Object.prototype.hasOwnProperty.call(icons, name) ? icons[name] : undefined;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return allIconsCache;
}

export function CategoryIcon({ name, size = 14, color }: { name: string | null } & Pick<LucideProps, "size" | "color">) {
  const allIcons = useSyncExternalStore(subscribe, getSnapshot);
  const curated = name ? lookup(CATEGORY_ICONS, name) : undefined;
  const lazy = !curated && name ? lookup(allIcons, toPascal(name)) : undefined;

  useEffect(() => {
    if (!curated && name) {
      loadAllIcons();
    }
  }, [curated, name]);

  const Icon = curated ?? lazy ?? MapPin;
  return <Icon size={size} color={color} aria-hidden />;
}
