// Guards for user-supplied, server-persisted, shared POI URL fields (website,
// image_url). Because the POI list is multi-user and rendered in other users'
// sessions, an unvalidated `href`/`url()` is a stored-XSS / resource-injection
// vector. Allow only http(s) absolute URLs and site-relative paths.

/**
 * Return a safe href for a user-supplied link, or null if it must not be
 * rendered as a hyperlink. Allows `http:`/`https:` absolute URLs and
 * site-relative paths (`/...`, but not protocol-relative `//host`); rejects
 * `javascript:`, `data:`, `vbscript:`, bare domains, and anything unparseable.
 */
export function safeLinkHref(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed === "") return null;
  // Site-relative path (but not protocol-relative `//host`).
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  try {
    const protocol = new URL(trimmed).protocol;
    return protocol === "http:" || protocol === "https:" ? trimmed : null;
  } catch {
    return null;
  }
}

/**
 * Return a user-supplied image URL only if it is safe to interpolate into a
 * CSS `url(...)` token, else null. Builds on safeLinkHref (http(s)/relative
 * only) and additionally rejects characters that could break out of the
 * url() token: quotes, parentheses, backslash, and whitespace.
 */
export function safeImageCss(url: string | null | undefined): string | null {
  const href = safeLinkHref(url);
  if (!href) return null;
  if (/["'()\\\s]/.test(href)) return null;
  return href;
}
