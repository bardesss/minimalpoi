// Guards for user-supplied, server-persisted, shared POI URL fields (website,
// image_url). Because the POI list is multi-user and rendered in other users'
// sessions, an unvalidated `href`/`url()` is a stored-XSS / resource-injection
// vector. Allow only http(s) absolute URLs.

/**
 * Return a safe href for a user-supplied link, or null if it must not be
 * rendered as a hyperlink. Allows only `http:`/`https:` absolute URLs; rejects
 * relative and protocol-relative paths (which would point at this app, e.g.
 * `/api/...`), `javascript:`, `data:`, `vbscript:`, bare domains, and anything
 * unparseable.
 */
export function safeLinkHref(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed === "") return null;
  try {
    const protocol = new URL(trimmed).protocol;
    return protocol === "http:" || protocol === "https:" ? trimmed : null;
  } catch {
    return null;
  }
}

const EMAIL_RE = /^[^\s@?&#]+@[^\s@?&#]+$/;

/** `mailto:` href for a user-supplied email, or null when it holds characters
 * (whitespace, `?`, `&`, `#`) that could inject extra mailto headers. */
export function safeMailtoHref(email: string | null | undefined): string | null {
  const trimmed = email?.trim();
  return trimmed && EMAIL_RE.test(trimmed) ? `mailto:${trimmed}` : null;
}

/**
 * Return a user-supplied image URL only if it is safe to interpolate into a
 * CSS `url(...)` token, else null. Allows http(s) URLs (via safeLinkHref) and
 * site-relative paths (`/images/...`, not protocol-relative `//host`) because
 * uploaded photos are stored as relative paths; additionally rejects characters
 * that could break out of the url() token: quotes, parentheses, backslash, and
 * whitespace.
 */
export function safeImageCss(url: string | null | undefined): string | null {
  const trimmed = url?.trim() ?? "";
  const href = trimmed.startsWith("/") && !trimmed.startsWith("//") ? trimmed : safeLinkHref(trimmed);
  if (!href) return null;
  if (/["'()\\\s]/.test(href)) return null;
  return href;
}
