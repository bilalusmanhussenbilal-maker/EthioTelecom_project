"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";

export type AsyncStatus = "loading" | "ready" | "error";

export interface AsyncState<T> {
  data: T | null;
  error: ApiError | null;
  status: AsyncStatus;
  isLoading: boolean;
  reload: () => void;
}

/**
 * Small data-fetching hook for the client-rendered app area.
 *
 * `key` identifies the request: when it changes the loader runs again. The loader itself is
 * read through a ref that is refreshed in its own effect, so it is always the latest closure
 * without needing `useCallback` at every call site.
 */
export function useAsync<T>(key: string, loader: () => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<{ data: T | null; error: ApiError | null; status: AsyncStatus }>({
    data: null,
    error: null,
    status: "loading",
  });
  const [nonce, setNonce] = useState(0);

  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    let cancelled = false;

    loaderRef
      .current()
      .then((result) => {
        if (!cancelled) {
          setState({ data: result, error: null, status: "ready" });
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setState({
            data: null,
            error:
              cause instanceof ApiError
                ? cause
                : new ApiError(0, { code: "UNKNOWN", message: "Something went wrong" }),
            status: "error",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  const reload = useCallback(() => {
    setState((previous) => ({ ...previous, status: "loading" }));
    setNonce((value) => value + 1);
  }, []);

  return {
    data: state.data,
    error: state.error,
    status: state.status,
    isLoading: state.status === "loading",
    reload,
  };
}