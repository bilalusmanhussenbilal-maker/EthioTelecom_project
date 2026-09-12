"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api/client";
import { getMe, login as loginRequest, logout as logoutRequest } from "@/lib/api/auth";
import { onSessionRejected } from "@/lib/api/session";
import type { AuthenticatedUser } from "@/lib/api/types";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  status: AuthStatus;
  error: ApiError | null;
  /** True when the session ended on the server: a logout elsewhere, or a password reset. */
  sessionExpired: boolean;
  signIn: (username: string, password: string) => Promise<AuthenticatedUser>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<ApiError | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Read inside the session listener, which must not re-subscribe on every status change.
  const authenticatedRef = useRef(false);

  useEffect(() => {
    authenticatedRef.current = status === "authenticated";
  }, [status]);

  // Declared before the initial /auth/me effect so the listener is in place first.
  useEffect(
    () =>
      onSessionRejected(() => {
        // The account was signed in when the 401 arrived, so the session is gone for good
        // rather than simply "not signed in yet". Retrying cannot help; end it here.
        if (!authenticatedRef.current) {
          return;
        }

        authenticatedRef.current = false;
        setUser(null);
        setStatus("anonymous");
        setError(null);
        setSessionExpired(true);
      }),
    [],
  );

  useEffect(() => {
    let cancelled = false;

    getMe()
      .then((response) => {
        if (!cancelled) {
          setUser(response.user);
          setStatus("authenticated");
          setError(null);
          setSessionExpired(false);
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
    setSessionExpired(false);

    return response.user;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
      setStatus("anonymous");
      setSessionExpired(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await getMe();
      setUser(response.user);
      setStatus("authenticated");
      setError(null);
      setSessionExpired(false);
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
    () => ({ user, status, error, sessionExpired, signIn, signOut, refresh }),
    [user, status, error, sessionExpired, signIn, signOut, refresh],
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