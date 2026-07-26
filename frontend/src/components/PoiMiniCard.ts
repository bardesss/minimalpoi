import type { Poi } from "../types/api";
import { safeImageCss, safeLinkHref } from "../lib/safeUrl";
import { theme, tintFromColor } from "../theme";

/** Bare host of a safe website URL (e.g. "cafemodern.nl"), or null. */
export function poiWebsiteHost(website: string | null | undefined): string | null {
  const href = safeLinkHref(website);
  if (!href) return null;
  try {
    return new URL(href).host || null;
  } catch {
    return null;
  }
}

export interface PoiMiniCardOpts {
  poi: Poi;
  color: string;
  pinned: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  onAdd?: (kind: "stay" | "stop") => void;
  bigTap?: boolean;
}

/** Imperative DOM (matches the existing route popup pattern). All user strings
 *  set via textContent / safe helpers — never innerHTML. */
export function buildPoiMiniCard(opts: PoiMiniCardOpts): HTMLElement {
  const { poi, color, pinned, onOpen, onClose, onAdd, bigTap } = opts;
  const root = document.createElement("div");
  root.style.cssText = `font-family:${theme.font.ui};width:200px;`;

  // Thumbnail: only rendered when the place has a safe image. Imageless items —
  // notably an unsaved route node, which has no photo and no category — render
  // name-first with no empty image band. An unsafe image url is treated as no
  // image (dropped, not injected).
  const img = safeImageCss(poi.image_url);
  if (img) {
    const tint = tintFromColor(color);
    const thumb = document.createElement("div");
    thumb.dataset.testid = "mini-thumb";
    thumb.style.cssText = `height:96px;border-radius:${theme.radius.card};margin-bottom:8px;background:center/cover no-repeat url("${img}"), ${tint};`;
    root.appendChild(thumb);
  }

  if (pinned && onClose) {
    const close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Close");
    close.textContent = "×";
    const closeSize = bigTap ? "44px" : "26px";
    close.style.cssText = `position:absolute;top:6px;right:6px;width:${closeSize};height:${closeSize};border-radius:50%;border:none;background:rgba(255,255,255,.92);box-shadow:0 1px 5px rgba(0,0,0,.2);cursor:pointer;font-size:15px;line-height:1;display:flex;align-items:center;justify-content:center;`;
    close.addEventListener("click", onClose);
    root.style.position = "relative";
    root.appendChild(close);
  }

  const name = document.createElement("div");
  name.textContent = poi.name;
  name.style.cssText = `font-weight:700;font-size:13.5px;color:${theme.color.textPrimary};`;
  root.appendChild(name);

  const host = poiWebsiteHost(poi.website);
  const safeHref = safeLinkHref(poi.website);
  if (host && safeHref) {
    const a = document.createElement("a");
    a.href = safeHref;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = host;
    a.style.cssText = `display:block;margin-top:2px;font-size:12px;font-weight:600;color:${theme.color.link};text-decoration:none;`;
    root.appendChild(a);
  }

  const btnH = bigTap ? "44px" : "auto";
  const minH = bigTap ? "44px" : "0";

  if (pinned && onOpen) {
    const open = document.createElement("button");
    open.type = "button";
    open.textContent = "Open";
    open.style.cssText = `margin-top:10px;width:100%;padding:8px;height:${btnH};min-height:${minH};border-radius:${theme.radius.input};border:1px solid ${theme.color.borderStd};background:${theme.color.surface0};color:${theme.color.textBody};font-weight:700;font-size:12px;cursor:pointer;`;
    open.addEventListener("click", onOpen);
    root.appendChild(open);
  }

  if (pinned && onAdd) {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:6px;margin-top:8px;";
    const mk = (label: string, kind: "stay" | "stop") => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.style.cssText = `flex:1;padding:8px;height:${btnH};min-height:${minH};border-radius:${theme.radius.input};border:none;background:${theme.color.primary};color:#fff;font-size:12px;font-weight:700;cursor:pointer;`;
      b.addEventListener("click", () => onAdd(kind));
      return b;
    };
    row.appendChild(mk("+ Stay", "stay"));
    row.appendChild(mk("+ Stop", "stop"));
    root.appendChild(row);
  }

  return root;
}
