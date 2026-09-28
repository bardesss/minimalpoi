// Persisted preference for how the place list is laid out: photo cards in a
// grid, or compact one-line rows. `null` means the user never chose, so the
// caller picks a form-factor default (rows on phones, cards on desktop).
export type ListDensity = "cards" | "list";

const KEY = "minimalpoi.listDensity";

export function readListDensity(): ListDensity | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "cards" || v === "list" ? v : null;
  } catch {
    return null;
  }
}

export function writeListDensity(d: ListDensity): void {
  try {
    localStorage.setItem(KEY, d);
  } catch {
    /* private mode / storage disabled — preference just won't persist */
  }
}
