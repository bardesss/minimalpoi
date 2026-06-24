// frontend/src/components/PoiFormModal.tsx
import { useEffect, useState } from "react";
import type { Category, PoiCreate } from "../types/api";
import { ghostButtonStyle, inputStyle, monoInputStyle, primaryButtonStyle, textareaStyle, theme } from "../theme";

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
}: {
  mode: "add" | "edit";
  initial: PoiFormInitial | null;
  categories: Category[];
  coords: { lng: number; lat: number } | null;
  onSubmit: (payload: PoiCreate) => void;
  onClose: () => void;
  onCheckDuplicate: (body: { name: string; lat: number; lng: number }) => void;
  duplicateId: number | null;
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

  // Click-to-place / map-center updates flow in via `coords` (add mode only).
  useEffect(() => {
    if (mode === "add" && coords) {
      setLat(String(coords.lat));
      setLng(String(coords.lng));
    }
  }, [coords, mode]);

  function submit() {
    onSubmit({
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
    });
  }

  function maybeCheckDuplicate() {
    if (mode === "add" && name.trim() && lat !== "" && lng !== "") {
      onCheckDuplicate({ name: name.trim(), lat: Number(lat), lng: Number(lng) });
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(26,24,22,.42)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn .16s ease" }}>
      <div role="dialog" aria-modal="true" className="poi-scroll" style={{ width: 540, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", background: "#fff", borderRadius: theme.radius.modal, boxShadow: theme.shadow.modal, animation: "popIn .2s ease" }}>
        <div style={{ position: "sticky", top: 0, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 16px", zIndex: 2 }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: "-.02em" }}>{mode === "add" ? "Add a new place" : "Edit place"}</h2>
          <button type="button" aria-label="Close" onClick={onClose} style={{ width: 30, height: 30, borderRadius: theme.radius.icon, border: "none", background: "#f5f4f2", color: theme.color.textSecondary, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ padding: "0 24px 8px", display: "flex", flexDirection: "column", gap: 14 }}>
          {duplicateId != null && (
            <div role="status" style={{ padding: "10px 12px", borderRadius: theme.radius.input, background: theme.color.tintBg, border: `1px solid ${theme.color.tintBorder}`, color: theme.color.deepIndigoText, fontSize: 12.5 }}>
              This looks like a possible duplicate of an existing place. You can still save it.
            </div>
          )}

          <div>
            <label style={label} htmlFor="poi-name">Name</label>
            <input id="poi-name" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} onBlur={maybeCheckDuplicate} placeholder="e.g. Café Modern" />
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
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={label} htmlFor="poi-lat">Latitude</label>
              <input id="poi-lat" style={monoInputStyle} value={lat} onChange={(e) => setLat(e.target.value)} onBlur={maybeCheckDuplicate} placeholder="52.3676" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={label} htmlFor="poi-lng">Longitude</label>
              <input id="poi-lng" style={monoInputStyle} value={lng} onChange={(e) => setLng(e.target.value)} onBlur={maybeCheckDuplicate} placeholder="4.9041" />
            </div>
          </div>
          <p style={{ margin: "-6px 0 0", fontSize: 11.5, color: theme.color.textPlaceholder }}>Click anywhere on the map to drop the coordinates here.</p>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={label} htmlFor="poi-phone">Phone</label>
              <input id="poi-phone" style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={label} htmlFor="poi-email">Email</label>
              <input id="poi-email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={label} htmlFor="poi-website">Website</label>
            <input id="poi-website" style={inputStyle} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
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
