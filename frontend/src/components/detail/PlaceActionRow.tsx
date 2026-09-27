import type { ReactNode } from "react";
import { Globe, Mail, Navigation, Phone, Share2 } from "lucide-react";
import type { Poi } from "../../types/api";
import { theme } from "../../theme";
import { safeLinkHref } from "../../lib/safeUrl";
import { telHref } from "../../lib/phone";
import { directionsUrl } from "../../lib/placeLinks";
import { useToast } from "../Toast";

const actionStyle = {
  display: "inline-flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  minWidth: 64,
  minHeight: 56,
  padding: "8px 10px",
  borderRadius: theme.radius.card,
  border: "none",
  background: theme.color.tintBg,
  color: theme.color.deepIndigoText,
  fontFamily: theme.font.ui,
  fontSize: 12,
  fontWeight: 700,
  textDecoration: "none",
  cursor: "pointer",
  flex: "none",
} as const;

function ActionLink({ href, icon, label, external = false }: { href: string; icon: ReactNode; label: string; external?: boolean }) {
  return (
    <a href={href} style={actionStyle} className="hover-btn" {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
      {icon}
      {label}
    </a>
  );
}

/** One-tap things to do with a place: get there, call, share, email, visit
 * (Share early so it stays in view on a phone-width row).
 * Each action shows only when its data exists; links are built from
 * sanitised values (tel digits, safeLinkHref) — never raw user strings. */
export default function PlaceActionRow({ poi }: { poi: Poi }) {
  const { notify } = useToast();
  const directions = directionsUrl(poi.lat, poi.lng);
  const tel = telHref(poi.phone);
  const website = safeLinkHref(poi.website);

  async function copyLink() {
    const text = [poi.name, poi.address, directions].filter(Boolean).join(" — ");
    try {
      await navigator.clipboard.writeText(text);
      notify("Copied to clipboard");
    } catch {
      notify("Couldn't copy the link", "error");
    }
  }

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: poi.name, text: poi.address ?? undefined, url: directions });
      } catch (e) {
        // The user dismissing the share sheet is not an error.
        if ((e as DOMException)?.name !== "AbortError") await copyLink();
      }
      return;
    }
    await copyLink();
  }

  return (
    <div role="group" aria-label="Place actions" className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", margin: "0 0 16px" }}>
      <ActionLink href={directions} icon={<Navigation size={18} aria-hidden />} label="Directions" external />
      {tel && <ActionLink href={tel} icon={<Phone size={18} aria-hidden />} label="Call" />}
      <button type="button" onClick={share} style={actionStyle} className="hover-btn">
        <Share2 size={18} aria-hidden />
        Share
      </button>
      {poi.email && <ActionLink href={`mailto:${poi.email}`} icon={<Mail size={18} aria-hidden />} label="Email" />}
      {website && <ActionLink href={website} icon={<Globe size={18} aria-hidden />} label="Website" external />}
    </div>
  );
}
