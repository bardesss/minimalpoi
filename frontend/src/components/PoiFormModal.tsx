// frontend/src/components/PoiFormModal.tsx
import { useEffect, useState } from "react";
import type { Category, PoiCreate, PoiDraft } from "../types/api";
import { safeImageCss } from "../lib/safeUrl";
import { ghostButtonStyle, inputStyle, monoInputStyle, primaryButtonStyle, textareaStyle, theme } from "../theme";
import PhoneInput from "./PhoneInput";

export function splitTags(text: string): string[] {
  return text.split(/[,;|]/).map((t) => t.trim()).filter(Boolean);
}

export interface PoiFormInitial {
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  category_id: number | null;
  tags: string[];
  notes: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
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
}: {
  mode: "add" | "edit";
  initial: PoiFormInitial | null;
  categories: Category[];
  coords: { lng: number; lat: number } | null;
  onSubmit: (payload: PoiCreate) => void;
  onClose: () => void;
  onCheckDuplicate: (body: { name: string; lat: number; lng: number }) => void;
  duplicateId: number | null;
  onEnrich?: (url: string) => Promise<PoiDraft>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [categoryId, setCategoryId] = useState<string>(initial?.category_id != null ? String(initial.category_id) : "");
  const [tagsText, setTagsText] = useState(initial?.tags.join(", ") ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [lat, setLat] = useState(initial ? String(initial.lat) : coords ? String(coords.lat) : "");
  const [lng, setLng] = useState(initial ? String(initial.lng) : coords ? String(coords.lng) : "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const [enrichUrlText, setEnrichUrlText] = useState("");
  const [enriching, setEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fieldSources, setFieldSources] = useState<Record<string, string>>({});
  const [enrichHost, setEnrichHost] = useState<string | null>(null);
  const [filledCount, setFilledCount] = useState(0);

  // Click-to-place / map-center updates flow in via `coords` (add mode only).
  useEffect(() => {
    if (mode === "add" && coords) {
      setLat(String(coords.lat));
      setLng(String(coords.lng));
    }
  }, [coords, mode]);

  const isAdd = mode === "add";
  const safeImage = safeImageCss(imageUrl);

  async function runEnrich() {
    if (!onEnrich || enrichUrlText.trim() === "") return;
    setEnriching(true);
    setEnrichError(null);
    try {
      const draft = await onEnrich(enrichUrlText.trim());
      if (draft.name != null) setName(draft.name);
      if (draft.address != null) setAddress(draft.address);
      if (draft.lat != null) setLat(String(draft.lat));
      if (draft.lng != null) setLng(String(draft.lng));
      if (draft.phone != null) setPhone(draft.phone);
      if (draft.website != null) setWebsite(draft.website);
      if (draft.description != null) setNotes(draft.description);
      setImageUrl(draft.image_url);
      setFieldSources(draft.field_sources);
      setFilledCount(Object.keys(draft.field_sources).length);
      try {
        setEnrichHost(new URL(enrichUrlText.trim()).host);
      } catch {
        setEnrichHost(null);
      }
    } catch {
      setEnrichError("Couldn't read that link — fill the form manually.");
    } finally {
      setEnriching(false);
    }
  }

  const caption = (field: string) =>
    fieldSources[field] ? (
      <span style={{ fontFamily: theme.font.mono, fontSize: 11, color: theme.color.textPlaceholder }}>from {fieldSources[field]}</span>
    ) : null;

  function submit() {
    const payload: PoiCreate = {
      name: name.trim(),
      address: nn(address),
      lat: Number(lat),
      lng: Number(lng),
      category_id: categoryId === "" ? null : Number(categoryId),
      tags: splitTags(tagsText),
      notes: nn(notes),
      phone: nn(phone),
      email: nn(email),
      website: nn(website),
    };
    if (isAdd) payload.image_url = imageUrl;
    onSubmit(payload);
  }

  function maybeCheckDuplicate() {
    if (mode === "add" && name.trim() && lat !== "" && lng !== "") {
      onCheckDuplicate({ name: name.trim(), lat: Number(lat), lng: Number(lng) });
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: isAdd ? "transparent" : "rgba(26,24,22,.42)", backdropFilter: isAdd ? "none" : "blur(2px)", pointerEvents: isAdd ? "none" : "auto", display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn .16s ease" }}>
      <div role="dialog" aria-modal={isAdd ? false : true} className="poi-scroll" style={{ width: 540, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", background: "#fff", borderRadius: theme.radius.modal, boxShadow: theme.shadow.modal, animation: "popIn .2s ease", pointerEvents: "auto" }}>
        <div style={{ position: "sticky", top: 0, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 16px", zIndex: 2 }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: "-.02em" }}>{mode === "add" ? "Add a new place" : "Edit place"}</h2>
          <button type="button" aria-label="Close" onClick={onClose} style={{ width: 30, height: 30, borderRadius: theme.radius.icon, border: "none", background: "#f5f4f2", color: theme.color.textSecondary, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ padding: "0 24px 8px", display: "flex", flexDirection: "column", gap: 14 }}>
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
              {safeImage && (
                <div aria-label="Image preview" style={{ width: 96, height: 64, borderRadius: theme.radius.input, backgroundImage: `url(${safeImage})`, backgroundSize: "cover", backgroundPosition: "center", border: `1px solid ${theme.color.borderCard}` }} />
              )}
            </div>
          )}

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
              <input id="poi-lat" style={monoInputStyle} value={lat} onChange={(e) => setLat(e.target.value)} onBlur={maybeCheckDuplicate} placeholder="52.3676" />
              {caption("lat")}
            </div>
            <div style={{ flex: 1 }}>
              <label style={label} htmlFor="poi-lng">Longitude</label>
              <input id="poi-lng" style={monoInputStyle} value={lng} onChange={(e) => setLng(e.target.value)} onBlur={maybeCheckDuplicate} placeholder="4.9041" />
              {caption("lng")}
            </div>
          </div>
          <p style={{ margin: "-6px 0 0", fontSize: 11.5, color: theme.color.textPlaceholder }}>Click anywhere on the map to drop the coordinates here.</p>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={label} htmlFor="poi-phone">Phone</label>
              <PhoneInput id="poi-phone" value={phone} onChange={setPhone} />
              {caption("phone")}
            </div>
            <div style={{ flex: 1 }}>
              <label style={label} htmlFor="poi-email">Email</label>
              <input id="poi-email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
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

        <div style={{ position: "sticky", bottom: 0, background: "#fff", display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 24px 22px" }}>
          <button type="button" onClick={onClose} style={ghostButtonStyle}>Cancel</button>
          <button type="button" onClick={submit} style={primaryButtonStyle}>{mode === "add" ? "Add place" : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}
