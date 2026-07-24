import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
// Read the raw stylesheet text so we can assert the rules exist (jsdom does
// not apply @media CSS to computed styles, so a content assertion is the
// practical regression guard for these CSS-only fixes). A Vite `?raw` import
// resolves to an empty string under Vitest's default CSS handling, so read
// the file directly instead. `import.meta.url` isn't a real file:// URL once
// Vitest transforms this module, so resolve via __dirname instead.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const css = readFileSync(path.join(__dirname, "index.css"), "utf8");

describe("index.css mobile ergonomics", () => {
  it("bumps inputs to 16px under the mobile media query (iOS zoom fix)", () => {
    // A @media (max-width: 768px) block sets input/textarea/select font-size:16px !important.
    const mobileBlocks = css.match(/@media[^{]*max-width:\s*768px[^{]*\{[\s\S]*?\}\s*\}/g) ?? [];
    const has16 = mobileBlocks.some((b: string) => /font-size:\s*16px\s*!important/.test(b) && /input/.test(b));
    expect(has16).toBe(true);
  });

  it("sets overscroll-behavior to stop pull-to-refresh from inner lists", () => {
    expect(/overscroll-behavior:\s*none/.test(css)).toBe(true);
  });
});
