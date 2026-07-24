import type { CSSProperties } from "react";

function parseHex(hex: string): [number, number, number] {
  let h = hex.replace("#", "").toLowerCase();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
}

/** Mix `hex` toward white by `t` (0..1). Default 0.85 matches the reference tints. */
export function tintFromColor(hex: string, t = 0.85): string {
  const [r, g, b] = parseHex(hex);
  return `#${toHex(r + (255 - r) * t)}${toHex(g + (255 - g) * t)}${toHex(b + (255 - b) * t)}`;
}

export const theme = {
  color: {
    primary: "#4f46e5",
    primaryHover: "#4338ca",
    primaryLight: "#6366f1",
    tintBg: "#f4f5ff",
    tintBorder: "#d7d5f7",
    deepIndigoText: "#3730a3",
    pageBg: "#fafaf9",
    surface0: "#ffffff",
    surface1: "#f3f2f0",
    mapBg: "#eef1f4",
    borderSubtle: "#f1f0ee",
    borderStd: "#e7e5e1",
    borderCard: "#ececea",
    textPrimary: "#1a1a1a",
    textBody: "#46413a",
    textSecondary: "#6b655d",
    textMuted: "#5c574f",
    textPlaceholder: "#9a958f",
    textInputIcon: "#b3aea7",
    textCoord: "#a8a39b",
    link: "#2563eb",
    starActive: "#f59e0b",
    starInactive: "#d8d5d0",
    dangerText: "#c0392b",
    dangerBorder: "#f0d4cf",
    dangerHover: "#fdf3f1",
    fallbackPin: "#888888",
  },
  font: {
    ui: "'Manrope', system-ui, sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  radius: {
    pill: "999px",
    modal: "18px",
    card: "12px",
    input: "10px",
    icon: "8px",
    tag: "7px",
    logo: "9px",
  },
  shadow: {
    fab: "0 10px 26px rgba(79,70,229,.45), 0 2px 6px rgba(0,0,0,.16)",
    modal: "0 24px 60px rgba(0,0,0,.32)",
    detail: "6px 0 30px rgba(0,0,0,.12)",
    cardSelected: "0 4px 14px rgba(79,70,229,.18)",
    legend: "0 4px 16px rgba(0,0,0,.08)",
    expand: "0 4px 16px rgba(0,0,0,.12)",
  },
  gradient: {
    brand: "linear-gradient(135deg, #6366f1, #4f46e5)",
    fabHover: "linear-gradient(135deg, #4f46e5, #4338ca)",
    asideHeader: "linear-gradient(180deg, #f4f5ff 0%, #ffffff 100%)",
    detailHero: "linear-gradient(180deg, rgba(0,0,0,.28) 0%, rgba(0,0,0,0) 38%, rgba(0,0,0,.02) 100%)",
  },
} as const;

export const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: `1px solid ${theme.color.borderStd}`,
  borderRadius: theme.radius.input,
  fontFamily: theme.font.ui,
  fontSize: "13.5px",
  background: theme.color.pageBg,
  color: theme.color.textPrimary,
  boxSizing: "border-box",
};

export const monoInputStyle: CSSProperties = {
  ...inputStyle,
  fontFamily: theme.font.mono,
  fontSize: "12.5px",
};

export const textareaStyle: CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  lineHeight: 1.5,
};

export const primaryButtonStyle: CSSProperties = {
  background: theme.color.primary,
  color: "#fff",
  border: "none",
  borderRadius: theme.radius.input,
  padding: "11px 22px",
  fontFamily: theme.font.ui,
  fontWeight: 700,
  fontSize: "13.5px",
  cursor: "pointer",
};

export const ghostButtonStyle: CSSProperties = {
  background: theme.color.surface0,
  color: theme.color.textBody,
  border: `1px solid ${theme.color.borderStd}`,
  borderRadius: theme.radius.input,
  padding: "11px 18px",
  fontFamily: theme.font.ui,
  fontWeight: 700,
  fontSize: "13.5px",
  cursor: "pointer",
};

export const dangerButtonStyle: CSSProperties = {
  background: theme.color.surface0,
  color: theme.color.dangerText,
  border: `1px solid ${theme.color.dangerBorder}`,
  borderRadius: theme.radius.input,
  padding: "11px 16px",
  fontFamily: theme.font.ui,
  fontWeight: 700,
  fontSize: "13.5px",
  cursor: "pointer",
};
