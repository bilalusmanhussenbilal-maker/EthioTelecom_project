"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api/client";
import { getMe, login as loginRequest, logout as logoutRequest } from "@/lib/api/auth";
import type { AuthenticatedUser } from "@/lib/api/types";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  status: AuthStatus;
  error: ApiError | null;
  signIn: (username: string, password: string) => Promise<AuthenticatedUser>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let cancelled = false;

    getMe()
      .then((response) => {
        if (!cancelled) {
          setUser(response.user);
          setStatus("authenticated");
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (cancelled) {
          return;
        }

        setUser(null);

        // A 401 simply means "not signed in yet". Anything else (usually a dead connection
        // in the field) is surfaced so the technician can retry instead of being bounced to login.
        if (cause instanceof ApiError && cause.status === 401) {
          setError(null);
          setStatus("anonymous");
          return;
        }

        setError(
          cause instanceof ApiError
            ? cause
            : new ApiError(0, { code: "UNKNOWN", message: "Sign-in check failed" }),
        );
        setStatus("anonymous");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const response = await loginRequest(username, password);
    setUser(response.user);
    setStatus("authenticated");
    setError(null);

    return response.user;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await getMe();
      setUser(response.user);
      setStatus("authenticated");
      setError(null);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setUser(null);
        setStatus("anonymous");
        return;
      }

      throw cause;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, error, signIn, signOut, refresh }),
    [user, status, error, signIn, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}