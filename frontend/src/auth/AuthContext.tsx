import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, setUnauthorizedHandler } from "../api/client";
import { SessionNotPersistedError } from "./errors";
import { getMe, login as loginRequest, logout as logoutRequest } from "../api/auth";
import type { UserRead } from "../types/api";

interface AuthState {
  user: UserRead | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
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

  // A 401 from any authenticated endpoint means the session is gone, whatever
  // the UI still believes. Drop the user so RequireAuth sends them to the login
  // page, instead of rendering a signed-in shell whose every query fails.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  const signIn = async (username: string, password: string) => {
    const loggedIn = await loginRequest(username, password);
    // A 200 from the login endpoint doesn't prove a session exists — it proves
    // the credentials were right. The cookie carrying that session can still be
    // discarded by the browser (a Secure cookie on a plain-HTTP origin is), and
    // trusting the response body alone is what renders a signed-in shell whose
    // every request is anonymous. Read the session back before claiming it.
    try {
      await getMe();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) throw new SessionNotPersistedError();
      throw err;
    }
    setUser(loggedIn);
  };

  const signOut = async () => {
    await logoutRequest();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      setUser(await getMe());
    } catch {
      // leave the current user as-is on a transient failure
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
