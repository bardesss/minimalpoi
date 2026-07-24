// frontend/src/components/PoiFormModal.tsx
import { useEffect, useState, type ChangeEvent } from "react";
import type { Category, PlaceSearchResult, PoiCreate, PoiDraft } from "../types/api";
import { ApiError } from "../api/client";
import { safeImageCss } from "../lib/safeUrl";
import { ghostButtonStyle, inputStyle, monoInputStyle, primaryButtonStyle, textareaStyle, theme } from "../theme";
import { useIsMobile } from "../lib/useMediaQuery";
import { useDialog } from "../lib/useDialog";
import PhoneInput from "./PhoneInput";

export function splitTags(text: string): string[] {
  return text.split(/[,;|]/).map((t) => t.trim()).filter(Boolean);
}

// Parse a single coordinate field into a finite number, or null when it isn't
// usable. Accepts a decimal comma ("52,3676") as long as it's a lone value —
// so a pasted "lat, lng" pair (handled by parseCoordPair) isn't mistaken for
// one number.
export function parseCoord(raw: string): number | null {
  const s = raw.trim();
  if (s === "") return null;
  const normalized = /^-?\d+,\d+$/.test(s) ? s.replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

// A "lat, lng" pair pasted into one field → the two numbers. Only splits when
// it's unambiguous: separated by whitespace, or dot-decimals split by a comma.
// A lone "52,3676" stays a decimal-comma value.
export function parseCoordPair(raw: string): { lat: number; lng: number } | null {
  const s = raw.trim();
  if (!/\s/.test(s) && !(s.includes(".") && s.includes(","))) return null;
  const m = s.match(/^(-?\d+(?:[.,]\d+)?)\s*[,\s]\s*(-?\d+(?:[.,]\d+)?)$/);
  if (!m) return null;
  const lat = parseCoord(m[1]);
  const lng = parseCoord(m[2]);
  return lat != null && lng != null ? { lat, lng } : null;
}

export interface PoiFormInitial {
  name: string;
  address: string | null;
  city: string | null;
  country_code: string | null;
  lat: number;
  lng: number;
  category_id: number | null;
  tags: string[];
  notes: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  image_url: string | null;
}

const label = { fontSize: 12, fontWeight: 700, color: theme.color.textBody, marginBottom: 6, display: "block" } as const;
const nn = (s: string) => (s.trim() === "" ? null : s.trim());

export default function PoiFormModal({
  mode,
  initial,
  categories,
  coords,
  onSubmit,
  onClose,
  onCheckDuplicate,
  duplicateId,
  onEnrich,
  onSearchPlaces,
  onPickPlace,
  onUploadImage,
}: {
  mode: "add" | "edit";
  initial: PoiFormInitial | null;
  categories: Category[];
  coords: { lng: number; lat: number } | null;
  onSubmit: (payload: PoiCreate) => void | Promise<void>;
  onClose: () => void;
  onCheckDuplicate: (body: { name: string; lat: number; lng: number }) => void;
  duplicateId: number | null;
  onEnrich?: (url: string) => Promise<PoiDraft>;
  onSearchPlaces?: (query: string) => Promise<PlaceSearchResult[]>;
  onPickPlace?: (placeId: string) => Promise<PoiDraft>;
  onUploadImage?: (file: File) => Promise<{ url: string }>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [categoryId, setCategoryId] = useState<string>(initial?.category_id != null ? String(initial.category_id) : "");
  const [tagsText, setTagsText] = useState(initial?.tags.join(", ") ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  // City + country code are not edited directly; they ride along from
  // enrichment (or the existing place in edit mode) so the card can show them.
  const [city, setCity] = useState<string | null>(initial?.city ?? null);
  const [countryCode, setCountryCode] = useState<string | null>(initial?.country_code ?? null);
  const [lat, setLat] = useState(initial ? String(initial.lat) : coords ? String(coords.lat) : "");
  const [lng, setLng] = useState(initial ? String(initial.lng) : coords ? String(coords.lng) : "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const [enrichUrlText, setEnrichUrlText] = useState("");
  const [enriching, setEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.image_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fieldSources, setFieldSources] = useState<Record<string, string>>({});
  const [enrichHost, setEnrichHost] = useState<string | null>(null);
  const [filledCount, setFilledCount] = useState(0);

  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<PlaceSearchResult[]>([]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Click-to-place / map-center updates flow in via `coords` (add mode only).
  useEffect(() => {
    if (mode === "add" && coords) {
      setLat(String(coords.lat));
      setLng(String(coords.lng));
    }
  }, [coords, mode]);

  const isAdd = mode === "add";
  const isMobile = useIsMobile();
  const safeImage = safeImageCss(imageUrl);
  // Add mode is a non-modal click-through overlay (so the map stays clickable
  // behind it) — no backdrop-close, no focus trap. Edit mode is a true modal.
  const { dialogRef, onBackdropClick } = useDialog<HTMLDivElement>(onClose, { closeOnBackdrop: !isAdd, trapFocus: !isAdd });

  function applyDraft(draft: PoiDraft, source: string | null) {
    if (draft.name != null) setName(draft.name);
    if (draft.address != null) setAddress(draft.address);
    if (draft.city != null) setCity(draft.city);
    if (draft.country_code != null) setCountryCode(draft.country_code);
    if (draft.lat != null) setLat(String(draft.lat));
    if (draft.lng != null) setLng(String(draft.lng));
    if (draft.phone != null) setPhone(draft.phone);
    if (draft.website != null) setWebsite(draft.website);
    if (draft.description != null) setNotes(draft.description);
    setImageUrl(draft.image_url);
    setFieldSources(draft.field_sources);
    setFilledCount(Object.keys(draft.field_sources).length);
    setEnrichHost(source);
  }

  async function runEnrich() {
    if (!onEnrich || enrichUrlText.trim() === "") return;
    setEnriching(true);
    setEnrichError(null);
    try {
      const draft = await onEnrich(enrichUrlText.trim());
      let host: string | null = null;
      try {
        host = new URL(enrichUrlText.trim()).host;
      } catch {
        host = null;
      }
      applyDraft(draft, host);
    } catch {
      setEnrichError("Couldn't read that link — fill the form manually.");
    } finally {
      setEnriching(false);
    }
  }

  async function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file later
    if (!file || !onUploadImage) return;
    setUploading(true);
    setUploadError(null);
    try {
      const { url } = await onUploadImage(file);
      setImageUrl(url);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Upload failed — try a different image.");
    } finally {
      setUploading(false);
    }
  }

  async function runSearch() {
    if (!onSearchPlaces || searchText.trim() === "") return;
    setSearching(true);
    setSearchError(null);
    setResults([]);
    try {
      const found = await onSearchPlaces(searchText.trim());
      setResults(found);
      if (found.length === 0) setSearchError("No matching places found.");
    } catch {
      setSearchError("Search failed — add a Google API key in Settings, or fill the form manually.");
    } finally {
      setSearching(false);
    }
  }

  async function pickPlace(result: PlaceSearchResult) {
    if (!onPickPlace) return;
    setSearchError(null);
    setResults([]);
    setSearchText("");
    try {
      const draft = await onPickPlace(result.place_id);
      applyDraft(draft, "Google Places");
    } catch {
      setSearchError("Couldn't load that place — try another or fill the form manually.");
    }
  }

  const caption = (field: string) =>
    fieldSources[field] ? (
      <span style={{ fontFamily: theme.font.mono, fontSize: 11, color: theme.color.textPlaceholder }}>from {fieldSources[field]}</span>
    ) : null;

  async function submit() {
    const latNum = parseCoord(lat);
    const lngNum = parseCoord(lng);
    if (name.trim() === "") {
      setSaveError("Give the place a name.");
      return;
    }
    if (latNum === null || lngNum === null) {
      setSaveError("Enter valid coordinates, e.g. 52.3676, 4.9041.");
      return;
    }
    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      setSaveError("Coordinates are out of range (latitude ±90, longitude ±180).");
      return;
    }
    const payload: PoiCreate = {
      name: name.trim(),
      address: nn(address),
      city,
      country_code: countryCode,
      lat: latNum,
      lng: lngNum,
      category_id: categoryId === "" ? null : Number(categoryId),
      tags: splitTags(tagsText),
      notes: nn(notes),
      phone: nn(phone),
      email: nn(email),
      website: nn(website),
      image_url: imageUrl,
    };
    setSaving(true);
    setSaveError(null);
    try {
      await onSubmit(payload);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Couldn't save — please try again.");
    } finally {
      setSaving(false);
    }
  }

  function maybeCheckDuplicate() {
    if (mode === "add" && name.trim() && lat !== "" && lng !== "") {
      onCheckDuplicate({ name: name.trim(), lat: Number(lat), lng: Number(lng) });
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: isAdd ? "transparent" : "rgba(26,24,22,.42)", backdropFilter: isAdd ? "none" : "blur(2px)", pointerEvents: isAdd ? "none" : "auto", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", animation: "fadeIn .16s ease" }} onClick={onBackdropClick}>
      <div ref={dialogRef} role="dialog" aria-modal={isAdd ? false : true} aria-labelledby="poi-form-title" className="poi-scroll" style={{ width: isMobile ? "100%" : 540, maxWidth: "100%", maxHeight: isMobile ? "92vh" : "90vh", overflowY: "auto", background: "#fff", borderRadius: isMobile ? "18px 18px 0 0" : theme.radius.modal, paddingBottom: isMobile ? "env(safe-area-inset-bottom)" : undefined, boxShadow: theme.shadow.modal, animation: isMobile ? "sheetUp .26s cubic-bezier(.32,.72,0,1)" : "popIn .2s ease", pointerEvents: "auto" }}>
        <div style={{ position: "sticky", top: 0, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 16px", zIndex: 2 }}>
          <h2 id="poi-form-title" style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: "-.02em" }}>{mode === "add" ? "Add a new place" : "Edit place"}</h2>
          <button type="button" aria-label="Close" onClick={onClose} style={{ width: 30, height: 30, borderRadius: theme.radius.icon, border: "none", background: "#f5f4f2", color: theme.color.textSecondary, cursor: "pointer" }}>×</button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div style={{ padding: "0 24px 8px", display: "flex", flexDirection: "column", gap: 14 }}>
          {isAdd && onSearchPlaces && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={label} htmlFor="poi-place-search">Search places</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  id="poi-place-search"
                  style={inputStyle}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); runSearch(); } }}
                  placeholder="Search Google Places by name"
                />
                <button type="button" onClick={runSearch} disabled={searching} style={{ ...ghostButtonStyle, whiteSpace: "nowrap" }}>{searching ? "Searching…" : "Search"}</button>
              </div>
              {searchError && <div role="status" style={{ fontSize: 12, color: theme.color.dangerText }}>{searchError}</div>}
              {results.length > 0 && (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto", border: `1px solid ${theme.color.borderCard}`, borderRadius: theme.radius.input }}>
                  {results.map((r) => (
                    <li key={r.place_id}>
                      <button
                        type="button"
                        onClick={() => pickPlace(r)}
                        style={{ width: "100%", textAlign: "left", padding: "8px 10px", background: "transparent", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", gap: 2 }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 700, color: theme.color.textPrimary }}>{r.name}</span>
                        {r.address && <span style={{ fontSize: 11.5, color: theme.color.textPlaceholder }}>{r.address}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {isAdd && onEnrich && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={label} htmlFor="poi-enrich-url">Enrich from URL</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input id="poi-enrich-url" style={inputStyle} value={enrichUrlText} onChange={(e) => setEnrichUrlText(e.target.value)} placeholder="Paste a Google Maps or website link" />
                <button type="button" onClick={runEnrich} disabled={enriching} style={{ ...ghostButtonStyle, whiteSpace: "nowrap" }}>{enriching ? "Enriching…" : "Enrich"}</button>
              </div>
              {enrichError && <div role="status" style={{ fontSize: 12, color: theme.color.dangerText }}>{enrichError}</div>}
              {filledCount > 0 && enrichHost && (
                <div role="status" style={{ fontSize: 12, color: theme.color.deepIndigoText, background: theme.color.tintBg, border: `1px solid ${theme.color.tintBorder}`, borderRadius: theme.radius.input, padding: "8px 10px" }}>
                  Filled {filledCount} fields from {enrichHost} — review before saving.
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={label} htmlFor="poi-image">Photo</label>
            {safeImage && (
              <div aria-label="Image preview" style={{ width: 96, height: 64, borderRadius: theme.radius.input, backgroundImage: `url(${safeImage})`, backgroundSize: "cover", backgroundPosition: "center", border: `1px solid ${theme.color.borderCard}` }} />
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {onUploadImage && (
                <input id="poi-image" type="file" accept="image/*" aria-label="Choose image" onChange={onPickFile} style={{ fontSize: 12 }} />
              )}
              {imageUrl && (
                <button type="button" onClick={() => setImageUrl(null)} style={{ ...ghostButtonStyle, padding: "6px 12px" }}>Remove image</button>
              )}
            </div>
            {uploading && <span role="status" style={{ fontSize: 12, color: theme.color.textPlaceholder }}>Uploading…</span>}
            {uploadError && <div role="status" style={{ fontSize: 12, color: theme.color.dangerText }}>{uploadError}</div>}
          </div>

          {duplicateId != null && (
            <div role="status" style={{ padding: "10px 12px", borderRadius: theme.radius.input, background: theme.color.tintBg, border: `1px solid ${theme.color.tintBorder}`, color: theme.color.deepIndigoText, fontSize: 12.5 }}>
              This looks like a possible duplicate of an existing place. You can still save it.
            </div>
          )}

          <div>
            <label style={label} htmlFor="poi-name">Name</label>
            <input id="poi-name" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} onBlur={maybeCheckDuplicate} placeholder="e.g. Café Modern" />
            {caption("name")}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={label} htmlFor="poi-category">Category</label>
              <select id="poi-category" style={inputStyle} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Uncategorized</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={label} htmlFor="poi-tags">Tags</label>
              <input id="poi-tags" style={inputStyle} value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="comma, separated" />
            </div>
          </div>

          <div>
            <label style={label} htmlFor="poi-address">Address</label>
            <input id="poi-address" style={inputStyle} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street 12, Amsterdam" />
            {caption("address")}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={label} htmlFor="poi-lat">Latitude</label>
              <input
                id="poi-lat"
                style={monoInputStyle}
                value={lat}
                onChange={(e) => {
                  setSaveError(null);
                  const pair = parseCoordPair(e.target.value);
                  if (pair) {
                    setLat(String(pair.lat));
                    setLng(String(pair.lng));
                  } else {
                    setLat(e.target.value);
                  }
                }}
                onBlur={maybeCheckDuplicate}
                placeholder="52.3676"
              />
              {caption("lat")}
            </div>
            <div style={{ flex: 1 }}>
              <label style={label} htmlFor="poi-lng">Longitude</label>
              <input id="poi-lng" style={monoInputStyle} value={lng} onChange={(e) => { setSaveError(null); setLng(e.target.value); }} onBlur={maybeCheckDuplicate} placeholder="4.9041" />
              {caption("lng")}
            </div>
          </div>
          <p style={{ margin: "-6px 0 0", fontSize: 11.5, color: theme.color.textPlaceholder }}>Click anywhere on the map to drop the coordinates here.</p>

          <div>
            <label style={label} htmlFor="poi-phone">Phone</label>
            <PhoneInput id="poi-phone" value={phone} onChange={setPhone} />
            {caption("phone")}
          </div>

          <div>
            <label style={label} htmlFor="poi-email">Email</label>
            <input id="poi-email" type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </div>

          <div>
            <label style={label} htmlFor="poi-website">Website</label>
            <input id="poi-website" style={inputStyle} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
            {caption("website")}
          </div>

          <div>
            <label style={label} htmlFor="poi-notes">Notes</label>
            <textarea id="poi-notes" rows={3} style={textareaStyle} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering…" />
          </div>
        </div>

        <div style={{ position: "sticky", bottom: 0, background: "#fff", display: "flex", flexDirection: "column", gap: 8, padding: "14px 24px 22px" }}>
          {saveError && (
            <div role="alert" style={{ fontSize: 12.5, color: theme.color.dangerText, textAlign: "right" }}>{saveError}</div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" onClick={onClose} style={ghostButtonStyle}>Cancel</button>
            <button type="submit" disabled={saving} style={primaryButtonStyle}>{saving ? "Saving…" : mode === "add" ? "Add place" : "Save changes"}</button>
          </div>
        </div>
        </form>
      </div>
    </div>
  );
}
