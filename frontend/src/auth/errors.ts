/** Thrown when the server accepts a login but the session it created cannot be
 * read back on the very next request — the browser did not keep the cookie.
 * The usual cause is a `Secure` cookie on a plain-HTTP origin, which the
 * browser discards silently. */
export class SessionNotPersistedError extends Error {
  constructor() {
    super("Signed in, but the browser did not keep the session.");
    this.name = "SessionNotPersistedError";
  }
}

/** The sentence shown to someone whose login was accepted but whose session
 * didn't survive. `protocol` is `window.location.protocol` at the call site;
 * on a plain-HTTP origin the cause is almost always this instance's
 * `cookie_secure` setting, which the UI cannot turn off while it is locking
 * the admin out — so the message has to say what to do instead. */
export function sessionNotPersistedMessage(protocol: string): string {
  if (protocol !== "https:") {
    return (
      "Signed in, but the browser discarded the session cookie. This instance is set to " +
      "require secure cookies, and those are only kept on an encrypted connection — " +
      "reopen MinimalPOI at its https:// address."
    );
  }
  return (
    "Signed in, but the browser discarded the session cookie, so no session was started. " +
    "Check that cookies aren't blocked for this site."
  );
}
