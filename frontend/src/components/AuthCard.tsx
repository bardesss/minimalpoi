import type { FormEvent, ReactNode } from "react";
import { inputStyle, primaryButtonStyle, theme } from "../theme";
import BrandLogo from "./BrandLogo";

export interface AuthFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function AuthField({ id, label, value, onChange, type = "text", disabled, autoFocus }: AuthFieldProps) {
  return (
    <>
      <label htmlFor={id} style={{ fontSize: 12, fontWeight: 700, color: theme.color.textBody }}>{label}</label>
      <input
        id={id}
        type={type}
        style={inputStyle}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoFocus={autoFocus}
      />
    </>
  );
}

export interface AuthCardProps {
  /** The <form> aria-label, which is also its accessible name. */
  ariaLabel: string;
  heading: string;
  onSubmit: (e: FormEvent) => void;
  submitLabel: string;
  children: ReactNode;
  /** Rendered as a standardised role="alert" line below the fields. */
  error?: string | null;
  submitDisabled?: boolean;
  logoSize?: number;
  headingSize?: number;
  width?: number;
}

// The shared shell behind the three unauthenticated entry points (log in,
// first-run setup, and the public-route password gate): a centred card with the
// brand logo, a heading, the caller's fields, one error line, and a submit
// button. Each page keeps its own submit logic.
export function AuthCard({
  ariaLabel,
  heading,
  onSubmit,
  submitLabel,
  children,
  error,
  submitDisabled,
  logoSize = 32,
  headingSize = 16,
  width = 360,
}: AuthCardProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: theme.color.pageBg }}>
      <form
        onSubmit={onSubmit}
        aria-label={ariaLabel}
        style={{ width, background: theme.color.surface0, border: `1px solid ${theme.color.borderSubtle}`, borderRadius: theme.radius.modal, padding: "28px 26px", display: "flex", flexDirection: "column", gap: 14, boxShadow: theme.shadow.legend }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <BrandLogo size={logoSize} />
          <h1 style={{ margin: 0, fontSize: headingSize, fontWeight: 800, letterSpacing: "-.02em" }}>{heading}</h1>
        </div>
        {children}
        {error && <p role="alert" style={{ margin: 0, color: theme.color.dangerText, fontSize: 13 }}>{error}</p>}
        <button type="submit" style={{ ...primaryButtonStyle, marginTop: 4 }} disabled={submitDisabled}>{submitLabel}</button>
      </form>
    </div>
  );
}
