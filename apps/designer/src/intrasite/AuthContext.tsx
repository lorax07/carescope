import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ApiError,
  loginRequest,
  logoutRequest,
  meRequest,
  setStoredToken,
  type IntrasiteUser,
} from "./api";

type AuthState = {
  user: IntrasiteUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function IntrasiteAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<IntrasiteUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    meRequest()
      .then((result) => {
        if (!cancelled) setUser(result.user);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          setStoredToken(null);
        }
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        const result = await loginRequest(email, password);
        setStoredToken(result.token);
        setUser(result.user);
      },
      logout: async () => {
        try {
          await logoutRequest();
        } finally {
          setStoredToken(null);
          setUser(null);
        }
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useIntrasiteAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useIntrasiteAuth must be used within IntrasiteAuthProvider");
  return ctx;
}
