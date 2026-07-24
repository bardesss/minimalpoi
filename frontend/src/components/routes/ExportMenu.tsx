import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ghostButtonStyle, theme } from "../../theme";
import type { RouteExportFormat } from "../../api/routes";

const FORMATS: RouteExportFormat[] = ["geojson", "gpx", "kml"];
const LABEL: Record<RouteExportFormat, string> = { geojson: "GeoJSON", gpx: "GPX", kml: "KML" };

/**
 * Export menu-button implementing the WAI-ARIA menu pattern: keyboard-openable,
 * roving focus with wrap, Escape-to-close + return focus, select-to-export.
 */
export default function ExportMenu({ onExport }: { onExport: (f: RouteExportFormat) => void }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Move DOM focus to the active item whenever the menu is open (roving focus).
  useEffect(() => {
    if (open) itemRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  function openAt(index: number) {
    setActiveIndex(index);
    setOpen(true);
  }
  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }
  function select(f: RouteExportFormat) {
    close();
    onExport(f);
  }

  function onTriggerKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openAt(0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      openAt(FORMATS.length - 1);
    }
  }
  function onMenuKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % FORMATS.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + FORMATS.length) % FORMATS.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(FORMATS.length - 1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      close(false); // let focus move on naturally
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        type="button"
        className="hover-btn"
        style={{ ...ghostButtonStyle, padding: "6px 12px", whiteSpace: "nowrap" }}
        onClick={() => (open ? close() : openAt(0))}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Export ▾
      </button>
      {open && (
        <>
          <div onClick={() => close(false)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />
          <div
            role="menu"
            aria-label="Export route"
            onKeyDown={onMenuKeyDown}
            style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 11, background: "#fff", border: `1px solid ${theme.color.borderCard}`, borderRadius: theme.radius.input, boxShadow: theme.shadow.modal, display: "flex", flexDirection: "column", minWidth: 130, overflow: "hidden" }}
          >
            {FORMATS.map((f, i) => (
              <button
                key={f}
                ref={(el) => { itemRefs.current[i] = el; }}
                type="button"
                role="menuitem"
                tabIndex={i === activeIndex ? 0 : -1}
                className="hover-row"
                onClick={() => select(f)}
                style={{ textAlign: "left", padding: "8px 12px", background: "transparent", border: "none", cursor: "pointer", fontFamily: theme.font.ui, fontSize: 13, fontWeight: 600, color: theme.color.textBody }}
              >
                {LABEL[f]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
