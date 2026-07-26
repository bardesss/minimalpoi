/** Split a free-text tag string on commas/semicolons/pipes, trimming blanks. */
export function splitTags(text: string): string[] {
  return text.split(/[,;|]/).map((t) => t.trim()).filter(Boolean);
}
