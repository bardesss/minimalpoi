import { useEffect, useRef, useState } from "react";
import type { Category, PlaceSearchResult, PoiCreate, PoiDraft, TagInfo } from "../types/api";
import { ApiError } from "../api/client";
import { ghostButtonStyle, inputStyle, monoInputStyle, primaryButtonStyle, textareaStyle, theme } from "../theme";
import { useIsMobile } from "../lib/useMediaQuery";
import { useDialog } from "../lib/useDialog";
import PhoneInput from "./PhoneInput";
import TagInput from "./TagInput";
import { ImagePicker } from "./poiForm/ImagePicker";
import { EnrichSection } from "./poiForm/EnrichSection";
import { PlaceSearchSection } from "./poiForm/PlaceSearchSection";

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
  getMapCenter,
  tagSuggestions = [],
}: {
  mode: "add" | "edit";
  initial: PoiFormInitial | null;
  categories: Category[];
  tagSuggestions?: TagInfo[];
  coords: { lng: number; lat: number } | null;
  onSubmit: (payload: PoiCreate) => void | Promise<void>;
  onClose: () => void;
  onCheckDuplicate: (body: { name: string; lat: number; lng: number }) => void;
  duplicateId: number | null;
  onEnrich?: (url: string) => Promise<PoiDraft>;
  onSearchPlaces?: (query: string) => Promise<PlaceSearchResult[]>;
  onPickPlace?: (placeId: string) => Promise<PoiDraft>;
  onUploadImage?: (file: File) => Promise<{ url: string }>;
  getMapCenter?: () => { lng: number; lat: number } | null;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [categoryId, setCategoryId] = useState<string>(initial?.category_id != null ? String(initial.category_id) : "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
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

  const [imageUrl, setImageUrl] = useState<string | null>(initial?.image_url ?? null);
  const [fieldSources, setFieldSources] = useState<Record<string, string>>({});
  const [enrichHost, setEnrichHost] = useState<string | null>(null);
  const [filledCount, setFilledCount] = useState(0);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Mobile "pick on map" (add mode only): collapses the sheet to a peek so
  // the already-pannable map behind it is visible, under a fixed crosshair.
  const [picking, setPicking] = useState(false);
  const useThisLocationRef = useRef<HTMLButtonElement>(null);
  const pickOnMapRef = useRef<HTMLButtonElement>(null);
  // Tracks the previous `picking` value so the focus effect below can tell an
  // actual true→false transition apart from the initial mount (where picking
  // starts false and there's no "Pick on map" button to steal focus from yet).
  const wasPickingRef = useRef(picking);

  // Moves focus into/out of pick mode so keyboard/AT users aren't dropped to
  // <body> when the focused button unmounts (the sheet swaps its whole body).
  useEffect(() => {
    if (picking) {
      useThisLocationRef.current?.focus();
    } else if (wasPickingRef.current) {
      pickOnMapRef.current?.focus();
    }
    wasPickingRef.current = picking;
  }, [picking]);

  // Click-to-place / map-center updates flow in via `coords` (add mode only).
  useEffect(() => {
    if (mode === "add" && coords) {
      setLat(String(coords.lat));
      setLng(String(coords.lng));
    }
  }, [coords, mode]);

  const isAdd = mode === "add";
  const isMobile = useIsMobile();
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
      tags,
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

  function confirmPick() {
    const c = getMapCenter?.();
    if (c) {
      setLat(String(c.lat));
      setLng(String(c.lng));
    }
    setPicking(false);
  }

  function cancelPick() {
    setPicking(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: isAdd ? "transparent" : "rgba(26,24,22,.42)", backdropFilter: isAdd ? "none" : "blur(2px)", pointerEvents: isAdd ? "none" : "auto", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", animation: "fadeIn .16s ease" }} onClick={onBackdropClick}>
      <div ref={dialogRef} role="dialog" aria-modal={isAdd ? false : true} {...(picking ? { "aria-label": "Pick a location on the map" } : { "aria-labelledby": "poi-form-title" })} className="poi-scroll" style={{ width: isMobile ? "100%" : 540, maxWidth: "100%", maxHeight: picking ? "none" : isMobile ? "92vh" : "90vh", overflowY: picking ? "visible" : "auto", background: "#fff", borderRadius: isMobile ? "18px 18px 0 0" : theme.radius.modal, paddingBottom: isMobile ? "env(safe-area-inset-bottom)" : undefined, boxShadow: theme.shadow.modal, animation: isMobile ? "sheetUp .26s cubic-bezier(.32,.72,0,1)" : "popIn .2s ease", pointerEvents: "auto" }}>
        {picking ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "18px 24px" }}>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: theme.color.textBody }}>Pan the map so the crosshair marks the spot.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={cancelPick} style={{ ...ghostButtonStyle, flex: 1, minHeight: 44 }}>Cancel</button>
              <button ref={useThisLocationRef} type="button" onClick={confirmPick} style={{ ...primaryButtonStyle, flex: 1, minHeight: 44 }}>Use this location</button>
            </div>
          </div>
        ) : (
        <>
        <div style={{ position: "sticky", top: 0, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 16px", zIndex: 2 }}>
          <h2 id="poi-form-title" style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: "-.02em" }}>{mode === "add" ? "Add a new place" : "Edit place"}</h2>
          <button type="button" aria-label="Close" onClick={onClose} style={{ width: isMobile ? 44 : 30, height: isMobile ? 44 : 30, fontSize: isMobile ? 20 : 14, borderRadius: theme.radius.icon, border: "none", background: "#f5f4f2", color: theme.color.textSecondary, cursor: "pointer" }}>×</button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div style={{ padding: "0 24px 8px", display: "flex", flexDirection: "column", gap: 14 }}>
          {isAdd && onSearchPlaces && (
            <PlaceSearchSection onSearchPlaces={onSearchPlaces} onPickPlace={onPickPlace} onApplyDraft={applyDraft} />
          )}

          {isAdd && onEnrich && (
            <EnrichSection onEnrich={onEnrich} onApplyDraft={applyDraft} filledCount={filledCount} enrichHost={enrichHost} />
          )}

          <ImagePicker imageUrl={imageUrl} onImageUrl={setImageUrl} onUploadImage={onUploadImage} />

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
              <TagInput inputId="poi-tags" value={tags} onChange={setTags} suggestions={tagSuggestions} />
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
          {isAdd && isMobile && (
            <button ref={pickOnMapRef} type="button" onClick={() => setPicking(true)} style={{ ...ghostButtonStyle, alignSelf: "flex-start", minHeight: 44 }}>Pick on map</button>
          )}
          <p style={{ margin: "-6px 0 0", fontSize: 11.5, color: theme.color.textPlaceholder }}>
            {isAdd && isMobile
              ? "Or tap Pick on map to set the location by panning the map."
              : "Click anywhere on the map to drop the coordinates here."}
          </p>

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
        </>
        )}
      </div>
      {picking && (
        <div
          aria-hidden="true"
          style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 28, height: 28, pointerEvents: "none", zIndex: 2001 }}
        >
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, marginTop: -1, background: theme.color.primary, boxShadow: "0 0 0 1px #fff" }} />
          <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, marginLeft: -1, background: theme.color.primary, boxShadow: "0 0 0 1px #fff" }} />
          <div style={{ position: "absolute", top: "50%", left: "50%", width: 8, height: 8, marginTop: -4, marginLeft: -4, borderRadius: "50%", background: theme.color.primary, boxShadow: "0 0 0 2px #fff" }} />
        </div>
      )}
    </div>
  );
}
