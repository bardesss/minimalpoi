import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { theme } from "../theme";

type ToastKind = "success" | "error";
interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}
interface ToastApi {
  notify: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const DISMISS_MS = 2800;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const notify = useCallback((message: string, kind: ToastKind = "success") => {
    const id = ++idRef.current;
    setToasts((cur) => [...cur, { id, message, kind }]);
    setTimeout(() => setToasts((cur) => cur.filter((t) => t.id !== id)), DISMISS_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: 22,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 4000,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            style={{
              padding: "10px 16px",
              borderRadius: theme.radius.input,
              fontSize: 13,
              fontWeight: 700,
              color: "#fff",
              background: t.kind === "error" ? theme.color.dangerText : theme.color.primary,
              boxShadow: theme.shadow.modal,
              animation: "popIn .18s ease",
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
