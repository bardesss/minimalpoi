import { useEffect, useRef, useState } from "react";
import type { Category, PlaceSearchResult, PoiCreate, PoiDraft, TagInfo } from "../types/api";
import { ApiError } from "../api/client";
import { ghostButtonStyle, inputStyle, monoInputStyle, primaryButtonStyle, textareaStyle, theme, fieldLabelStyle } from "../theme";
import { useIsMobile } from "../lib/useMediaQuery";
import { useSidebarWidth } from "../lib/layout";
import { useDialog } from "../lib/useDialog";
import { useMapInset } from "../map/useMapInsets";
import { roundCoord } from "../lib/geo";
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
  onLocated,
  onCoordsChange,
  coversMap,
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
  onLocated?: (c: { lat: number; lng: number }) => void;
  /** Valid parsed coordinates, or null, every time the lat/lng fields change. */
  onCoordsChange?: (c: { lat: number; lng: number } | null) => void;
  /** Desktop only: the sidebar is collapsed, so the docked panel sits over the map. */
  coversMap?: boolean;
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
  // Controls the mobile "Edit coordinates" disclosure so a coordinate-related
  // save error is visible instead of hidden behind the closed <details>.
  const [coordsOpen, setCoordsOpen] = useState(false);

  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const canLocate = typeof navigator !== "undefined" && "geolocation" in navigator && window.isSecureContext !== false;

  // Guards the geolocation callbacks (which can resolve after the form has
  // unmounted) against updating state or calling onLocated post-unmount.
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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

  const isAdd = mode === "add";
  const isMobile = useIsMobile();
  const sidebarWidth = useSidebarWidth();

  // Click-to-place / map-center updates flow in via `coords`: always in add
  // mode, and on desktop (where the docked form sits over the interactive
  // map) in edit mode too. Mobile edit stays a modal sheet with no map
  // interaction behind it, so it doesn't pick up `coords`.
  useEffect(() => {
    if (coords && (mode === "add" || !isMobile)) {
      setLat(String(roundCoord(coords.lat)));
      setLng(String(roundCoord(coords.lng)));
    }
  }, [coords, mode, isMobile]);

  // Reports the currently-parsed, in-range coordinates (or null) so a parent
  // can mirror them onto a draggable map pin. Not called on unmount — the
  // parent clears its own pin when it closes the form.
  useEffect(() => {
    if (!onCoordsChange) return;
    const latNum = parseCoord(lat);
    const lngNum = parseCoord(lng);
    const valid = latNum !== null && lngNum !== null && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180;
    onCoordsChange(valid ? { lat: latNum, lng: lngNum } : null);
  }, [lat, lng, onCoordsChange]);

  // Desktop: docked, non-modal — the map behind it stays interactive, so no
  // backdrop-close and no focus trap. Mobile: add is a non-modal click-through
  // sheet (pick-on-map); edit is a true modal sheet with a backdrop.
  const modal = isMobile && !isAdd;
  const { dialogRef, onBackdropClick } = useDialog<HTMLDivElement>(onClose, { closeOnBackdrop: modal, trapFocus: modal });
  // On desktop the docked panel covers the map's left edge only when the
  // sidebar it replaces is collapsed (`coversMap`); otherwise it sits beside
  // the sidebar and the map needs no extra inset.
  useMapInset("poi-form", !isMobile && coversMap ? { left: sidebarWidth } : null);

  function applyDraft(draft: PoiDraft, source: string | null) {
    if (draft.name != null) setName(draft.name);
    if (draft.address != null) setAddress(draft.address);
    if (draft.city != null) setCity(draft.city);
    if (draft.country_code != null) setCountryCode(draft.country_code);
    if (draft.lat != null) setLat(String(roundCoord(draft.lat)));
    if (draft.lng != null) setLng(String(roundCoord(draft.lng)));
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
      setCoordsOpen(true);
      return;
    }
    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      setSaveError("Coordinates are out of range (latitude ±90, longitude ±180).");
      setCoordsOpen(true);
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

  // `lat`/`lng` state hasn't updated yet right after a caller sets it (e.g.
  // just before this runs), so an explicit `{ lat, lng }` lets locate/pick
  // check duplicates against the new coordinates instead of the stale ones.
  function maybeCheckDuplicate(explicit?: { lat: number; lng: number }) {
    if (mode !== "add" || !name.trim()) return;
    const latNum = explicit ? explicit.lat : lat !== "" ? Number(lat) : null;
    const lngNum = explicit ? explicit.lng : lng !== "" ? Number(lng) : null;
    if (latNum === null || lngNum === null) return;
    onCheckDuplicate({ name: name.trim(), lat: latNum, lng: lngNum });
  }

  function confirmPick() {
    const c = getMapCenter?.();
    if (c) {
      const rLat = roundCoord(c.lat);
      const rLng = roundCoord(c.lng);
      setLat(String(rLat));
      setLng(String(rLng));
      setPicking(false);
      maybeCheckDuplicate({ lat: rLat, lng: rLng });
    } else {
      setPicking(false);
    }
  }

  function cancelPick() {
    setPicking(false);
  }

  function useMyLocation() {
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!mountedRef.current) return;
        const rLat = roundCoord(pos.coords.latitude);
        const rLng = roundCoord(pos.coords.longitude);
        setLat(String(rLat));
        setLng(String(rLng));
        setLocateError(null);
        setLocating(false);
        onLocated?.({ lat: rLat, lng: rLng });
        maybeCheckDuplicate({ lat: rLat, lng: rLng });
      },
      (err) => {
        if (!mountedRef.current) return;
        setLocating(false);
        setLocateError(
          err.code === 1
            ? "Location permission was denied."
            : err.code === 3
            ? "Finding your location timed out."
            : "Couldn't find your location.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }

  return (
    <div
      style={
        isMobile
          ? { position: "fixed", inset: 0, zIndex: 2000, background: isAdd ? "transparent" : "rgba(26,24,22,.42)", backdropFilter: isAdd ? "none" : "blur(2px)", pointerEvents: isAdd ? "none" : "auto", display: "flex", alignItems: "flex-end", justifyContent: "center", animation: "fadeIn .16s ease" }
          // Desktop: docked to the sidebar column, not a full-screen overlay —
          // the rest of the page (map included) stays interactive around it.
          : { position: "fixed", top: 0, left: 0, bottom: 0, width: sidebarWidth, zIndex: 1500 }
      }
      onClick={onBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal={modal}
        {...(picking ? { "aria-label": "Pick a location on the map" } : { "aria-labelledby": "poi-form-title" })}
        className="poi-scroll"
        style={
          isMobile
            ? { width: "100%", maxWidth: "100%", maxHeight: picking ? "none" : "92vh", overflowY: picking ? "visible" : "auto", background: "#fff", borderRadius: "18px 18px 0 0", paddingBottom: "env(safe-area-inset-bottom)", boxShadow: theme.shadow.modal, animation: "sheetUp .26s cubic-bezier(.32,.72,0,1)", pointerEvents: "auto" }
            // Desktop: fills the docked column and scrolls internally.
            : { width: "100%", height: "100%", background: "#fff", borderRight: `1px solid ${theme.color.borderCard}`, boxShadow: theme.shadow.detail, overflowY: "auto", pointerEvents: "auto" }
        }
      >
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

        <form noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div style={{ padding: "0 24px 8px", display: "flex", flexDirection: "column", gap: 14 }}>
          {isAdd && onSearchPlaces && (
            <PlaceSearchSection onSearchPlaces={onSearchPlaces} onPickPlace={onPickPlace} onApplyDraft={applyDraft} />
          )}

          {isAdd && onEnrich && (
            <EnrichSection onEnrich={onEnrich} onApplyDraft={applyDraft} filledCount={filledCount} enrichHost={enrichHost} />
          )}

          <ImagePicker imageUrl={imageUrl} onImageUrl={setImageUrl} onUploadImage={onUploadImage} mobile={isMobile} />

          {duplicateId != null && (
            <div role="status" style={{ padding: "10px 12px", borderRadius: theme.radius.input, background: theme.color.tintBg, border: `1px solid ${theme.color.tintBorder}`, color: theme.color.deepIndigoText, fontSize: 12.5 }}>
              This looks like a possible duplicate of an existing place. You can still save it.
            </div>
          )}

          <div>
            <label style={fieldLabelStyle} htmlFor="poi-name">Name</label>
            <input id="poi-name" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} onBlur={() => maybeCheckDuplicate()} placeholder="e.g. Café Modern" />
            {caption("name")}
          </div>

          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={fieldLabelStyle} htmlFor="poi-category">Category</label>
              <select id="poi-category" style={inputStyle} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Uncategorized</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={fieldLabelStyle} htmlFor="poi-tags">Tags</label>
              <TagInput inputId="poi-tags" value={tags} onChange={setTags} suggestions={tagSuggestions} />
            </div>
          </div>

          <div>
            <label style={fieldLabelStyle} htmlFor="poi-address">Address</label>
            <input id="poi-address" style={inputStyle} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street 12, Amsterdam" />
            {caption("address")}
          </div>

          {(() => {
            const coordFields = (
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={fieldLabelStyle} htmlFor="poi-lat">Latitude</label>
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
                    onBlur={() => maybeCheckDuplicate()}
                    placeholder="52.3676"
                  />
                  {caption("lat")}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={fieldLabelStyle} htmlFor="poi-lng">Longitude</label>
                  <input id="poi-lng" style={monoInputStyle} value={lng} onChange={(e) => { setSaveError(null); setLng(e.target.value); }} onBlur={() => maybeCheckDuplicate()} placeholder="4.9041" />
                  {caption("lng")}
                </div>
              </div>
            );
            const locateButton = isAdd && canLocate && (
              <button type="button" onClick={useMyLocation} disabled={locating} style={{ ...ghostButtonStyle, alignSelf: "flex-start", minHeight: isMobile ? 44 : undefined }}>
                {locating ? "Locating…" : "Use my location"}
              </button>
            );
            const locateStatus = locateError && (
              <p role="status" style={{ margin: 0, fontSize: 11.5, color: theme.color.dangerText }}>{locateError}</p>
            );
            if (isMobile) {
              const hasCoords = lat !== "" && lng !== "";
              const latNum = Number(lat);
              const lngNum = Number(lng);
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ fontFamily: theme.font.mono, fontSize: 13, color: theme.color.textCoord }}>
                    {hasCoords && Number.isFinite(latNum) && Number.isFinite(lngNum)
                      ? `${latNum.toFixed(5)}, ${lngNum.toFixed(5)}`
                      : "No location yet"}
                  </span>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {locateButton}
                    {isAdd && (
                      <button ref={pickOnMapRef} type="button" onClick={() => setPicking(true)} style={{ ...ghostButtonStyle, alignSelf: "flex-start", minHeight: 44 }}>Pick on map</button>
                    )}
                  </div>
                  {locateStatus}
                  <details open={coordsOpen} onToggle={(e) => setCoordsOpen(e.currentTarget.open)}>
                    <summary style={{ fontSize: 12, fontWeight: 700, color: theme.color.textBody, cursor: "pointer" }}>Edit coordinates</summary>
                    <div style={{ marginTop: 10 }}>{coordFields}</div>
                  </details>
                </div>
              );
            }
            return (
              <>
                {coordFields}
                <p style={{ margin: "-6px 0 0", fontSize: 11.5, color: theme.color.textPlaceholder }}>
                  Click the map or drag the pin to set the location.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {locateButton}
                  {locateStatus}
                </div>
              </>
            );
          })()}

          <div>
            <label style={fieldLabelStyle} htmlFor="poi-phone">Phone</label>
            <PhoneInput id="poi-phone" value={phone} onChange={setPhone} />
            {caption("phone")}
          </div>

          <div>
            <label style={fieldLabelStyle} htmlFor="poi-email">Email</label>
            <input id="poi-email" type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </div>

          <div>
            <label style={fieldLabelStyle} htmlFor="poi-website">Website</label>
            <input id="poi-website" type="url" inputMode="url" style={inputStyle} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
            {caption("website")}
          </div>

          <div>
            <label style={fieldLabelStyle} htmlFor="poi-notes">Notes</label>
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
