import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { ghostButtonStyle, theme } from "../theme";
import { useIsMobile } from "../lib/useMediaQuery";

export interface MenuItem {
  key: string;
  label: ReactNode;
  onSelect: () => void;
  /** Destructive action: rendered in the danger colour. */
  danger?: boolean;
}

/**
 * Menu button implementing the WAI-ARIA menu pattern: keyboard-openable,
 * roving focus with wrap, Escape-to-close + return focus, select-to-run.
 */
export default function MenuButton({
  label,
  ariaLabel,
  menuLabel,
  items,
  triggerStyle,
  placement = "below",
  heading,
}: {
  label: ReactNode;
  ariaLabel?: string;
  menuLabel: string;
  items: MenuItem[];
  triggerStyle?: CSSProperties;
  placement?: "below" | "above";
  /** Rendered at the top of the open menu, not a menuitem, not focusable.
   * Visual only (aria-hidden): put anything a screen reader needs in `menuLabel`. */
  heading?: ReactNode;
}) {
  const isMobile = useIsMobile();
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
  function select(item: MenuItem) {
    close();
    item.onSelect();
  }

  function onTriggerKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openAt(0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      openAt(items.length - 1);
    }
  }
  function onMenuKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(items.length - 1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      // Keep Escape from also closing an enclosing dialog (useDialog listens on document).
      e.stopPropagation();
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
        aria-label={ariaLabel}
        style={triggerStyle ?? { ...ghostButtonStyle, padding: "6px 12px", whiteSpace: "nowrap", minHeight: isMobile ? 44 : undefined }}
        onClick={() => (open ? close() : openAt(0))}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {label}
      </button>
      {open && (
        <>
          <div onClick={() => close(false)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />
          <div
            role="menu"
            aria-label={menuLabel}
            onKeyDown={onMenuKeyDown}
            style={{
              position: "absolute",
              right: 0,
              ...(placement === "above" ? { bottom: "calc(100% + 4px)" } : { top: "calc(100% + 4px)" }),
              zIndex: 11,
              background: "#fff",
              border: `1px solid ${theme.color.borderCard}`,
              borderRadius: theme.radius.input,
              boxShadow: theme.shadow.modal,
              display: "flex",
              flexDirection: "column",
              minWidth: 150,
              overflow: "hidden",
            }}
          >
            {heading != null && (
              <div aria-hidden style={{ padding: "10px 12px 8px", borderBottom: `1px solid ${theme.color.borderSubtle}` }}>{heading}</div>
            )}
            {items.map((item, i) => (
              <button
                key={item.key}
                ref={(el) => { itemRefs.current[i] = el; }}
                type="button"
                role="menuitem"
                tabIndex={i === activeIndex ? 0 : -1}
                className="hover-row"
                onClick={() => select(item)}
                style={{ textAlign: "left", padding: isMobile ? "12px 12px" : "8px 12px", background: "transparent", border: "none", cursor: "pointer", fontFamily: theme.font.ui, fontSize: 13, fontWeight: 600, color: item.danger ? theme.color.dangerText : theme.color.textBody }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
