import { jsPDF } from "jspdf";
import type { MapSettings, RouteDetail } from "../../types/api";
import { renderShareImage } from "./shareRender";
import { shareFormat, type ShareVariant } from "./shareFormats";
import { sharePdfModel, type SharePdfModel } from "./sharePdfModel";

const MARGIN = 40;          // pt
const LINE = 15;            // pt between text lines
const INK = "#1f2937";
const SUB = "#6b7280";
const ACCENT = "#4f46e5";

// jsPDF's built-in Helvetica uses Windows-1252 (WinAnsi) encoding. A handful of
// glyphs we'd otherwise emit fall outside that codepage and render as garbage
// or blank space, so swap them for WinAnsi-safe equivalents before drawing.
// (`·`, `—`, `–`, `•` are already in Windows-1252 and pass through untouched.)
// Non-Latin user text is an accepted limitation — this is not a transliterator.
const WINANSI_REPLACEMENTS: [RegExp, string][] = [
  [/→/g, "–"], // right arrow -> en dash
  [/↓/g, "•"], // down arrow -> bullet
];

export function toWinAnsi(s: string): string {
  return WINANSI_REPLACEMENTS.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), s);
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

export async function renderSharePdf(opts: { route: RouteDetail; settings: MapSettings; variant: ShareVariant }): Promise<Blob> {
  const { route, settings, variant } = opts;
  const png = await renderShareImage({ route, settings, format: shareFormat("landscape"), variant });
  const dataUrl = await blobToDataUrl(png);
  const model = sharePdfModel(route);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;
  let y = MARGIN;

  const ensure = (needed: number) => {
    if (y + needed > pageH - MARGIN) { doc.addPage(); y = MARGIN; }
  };
  const text = (s: string, x: number, size: number, color: string, style: "normal" | "bold" = "normal") => {
    doc.setFont("helvetica", style); doc.setFontSize(size); doc.setTextColor(color);
    for (const ln of doc.splitTextToSize(toWinAnsi(s), contentW - (x - MARGIN))) { ensure(LINE); doc.text(ln, x, y); y += LINE; }
  };

  // Header.
  text(model.header.name, MARGIN, 20, INK, "bold");
  text(model.header.dateRange, MARGIN, 11, SUB);
  const s = model.header.stats;
  text(`${s.distance}   ·   ${s.days}   ·   ${s.stops}`, MARGIN, 11, SUB);
  y += 6;

  // Map image (page 1 only), scaled to content width.
  const imgH = contentW * (shareFormat("landscape").height / shareFormat("landscape").width);
  ensure(imgH + 10);
  doc.addImage(dataUrl, "PNG", MARGIN, y, contentW, imgH);
  y += imgH + 16;

  const bookend = (b: SharePdfModel["startBookend"]) => {
    if (!b) return;
    text(b.label.toUpperCase(), MARGIN, 8, ACCENT, "bold");
    text(b.name, MARGIN, 12, INK);
    y += 4;
  };

  bookend(model.startBookend);

  for (const day of model.days) {
    ensure(LINE * 2);
    y += 4;
    text(day.drivingTotal ? `${day.label}    —    ${day.drivingTotal}` : day.label, MARGIN, 13, ACCENT, "bold");
    for (const row of day.rows) {
      if (row.inboundLeg) text(`↓  ${row.inboundLeg.text}${row.inboundLeg.estimate ? "  (est.)" : ""}`, MARGIN + 14, 9, SUB);
      text(`${row.seq}.  ${row.name}`, MARGIN + 14, 12, INK);
      if (row.note) text(row.note, MARGIN + 28, 10, SUB);
    }
  }

  bookend(model.endBookend);

  return doc.output("blob");
}
