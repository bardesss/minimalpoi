import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError } from "../api/client";
import { getMe, login as loginRequest, logout as logoutRequest } from "../api/auth";
import type { UserRead } from "../types/api";

interface AuthState {
  user: UserRead | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserRead | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getMe()
      .then((u) => {
        if (active) setUser(u);
      })
      .catch((err) => {
        if (!(err instanceof ApiError) || err.status !== 401) {
          // unexpected error; surface to console but stay logged out
          console.error("auth bootstrap failed", err);
        }
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const signIn = async (username: string, password: string) => {
    setUser(await loginRequest(username, password));
  };

  const signOut = async () => {
    await logoutRequest();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
