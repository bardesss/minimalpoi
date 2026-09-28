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
let allIconsPromise: Promise<Record<string, LucideIcon>> | null = null;
const listeners = new Set<() => void>();

function loadAllIcons(): Promise<Record<string, LucideIcon>> {
  if (!allIconsPromise) {
    allIconsPromise = import("lucide-react").then((m) => {
      allIconsCache = m.icons as unknown as Record<string, LucideIcon>;
      listeners.forEach((listener) => listener());
      return allIconsCache;
    });
  }
  return allIconsPromise;
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
  const curated = name ? CATEGORY_ICONS[name] : undefined;
  const lazy = !curated && name ? allIcons?.[toPascal(name)] : undefined;

  useEffect(() => {
    if (!curated && name) {
      loadAllIcons();
    }
  }, [curated, name]);

  const Icon = curated ?? lazy ?? MapPin;
  return <Icon size={size} color={color} aria-hidden />;
}
