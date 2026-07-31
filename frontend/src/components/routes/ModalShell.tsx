import { createPortal } from "react-dom";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { useIsMobile } from "../../lib/useMediaQuery";
import { useDialog, type UseDialogOptions } from "../../lib/useDialog";
import { theme } from "../../theme";

export interface ModalShellProps {
  onClose: () => void;
  children: ReactNode;
  /** aria-label; when set applies role="dialog" + aria-modal. Omit for an unlabeled backdrop (NavigateDayModal keeps its data-testid instead). */
  label?: string;
  /** Backdrop tint: "warm" = rgba(26,24,22,.42)+blur(2px)+fadeIn (app default); "dark" = rgba(0,0,0,0.5), no blur/animation (share modals). */
  tint?: "warm" | "dark";
  /** Dock the card to the bottom as a sheet on mobile and apply the sheet frame. */
  mobileSheet?: boolean;
  /** Desktop card width in px for sheet modals (100% on mobile). */
  desktopWidth?: number;
  zIndex?: number;
  /** Styles merged onto the card AFTER the shell's frame styles. */
  cardStyle?: CSSProperties;
  cardClassName?: string;
  /** Forwarded to useDialog (e.g. { manageHistory: false }). */
  dialogOptions?: UseDialogOptions;
  /**
   * Extra backdrop attributes (e.g. data-testid). The `data-*` pattern index
   * signature is needed because TypeScript only special-cases data attributes
   * on JSX intrinsics, not in a props object literal.
   */
  backdropProps?: HTMLAttributes<HTMLDivElement> & Record<`data-${string}`, string>;
  /** Rendered inside the backdrop after the card (RouteFormModal's nested picker). */
  afterCard?: ReactNode;
}

// The shared frame behind every routes modal: portal to <body> (so
// `position: fixed` resolves against the viewport rather than a transformed
// ancestor — see PR #185), a click-to-close backdrop, the card, and the
// useDialog wiring for Escape / focus trap / history.
export default function ModalShell({
  onClose,
  children,
  label,
  tint = "warm",
  mobileSheet = false,
  desktopWidth,
  zIndex = 2100,
  cardStyle,
  cardClassName,
  dialogOptions,
  backdropProps,
  afterCard,
}: ModalShellProps) {
  const isMobile = useIsMobile();
  const { dialogRef, onBackdropClick } = useDialog<HTMLDivElement>(onClose, dialogOptions);
  const sheet = mobileSheet && isMobile;

  const backdropStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex,
    display: "flex",
    justifyContent: "center",
    alignItems: sheet ? "flex-end" : "center",
    background: tint === "dark" ? "rgba(0,0,0,0.5)" : "rgba(26,24,22,.42)",
    ...(tint === "warm" ? { backdropFilter: "blur(2px)", animation: "fadeIn .16s ease" } : {}),
  };

  // Only sheet modals get a computed frame; centred modals fully specify cardStyle.
  const frameStyle: CSSProperties = mobileSheet
    ? {
        width: isMobile ? "100%" : desktopWidth,
        maxWidth: "100%",
        maxHeight: isMobile ? "92vh" : "90vh",
        overflowY: "auto",
        background: "#fff",
        borderRadius: isMobile ? "18px 18px 0 0" : theme.radius.modal,
        paddingBottom: isMobile ? "env(safe-area-inset-bottom)" : undefined,
        boxShadow: theme.shadow.modal,
        animation: isMobile ? "sheetUp .26s cubic-bezier(.32,.72,0,1)" : "popIn .2s ease",
      }
    : {};

  const roleProps = label ? { role: "dialog", "aria-modal": true, "aria-label": label } : {};

  return createPortal(
    <div {...backdropProps} {...roleProps} onClick={onBackdropClick} style={backdropStyle}>
      <div ref={dialogRef} className={cardClassName} onClick={(e) => e.stopPropagation()} style={{ ...frameStyle, ...cardStyle }}>
        {children}
      </div>
      {afterCard}
    </div>,
    document.body,
  );
}
