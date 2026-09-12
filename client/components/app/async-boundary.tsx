"use client";

import type { ReactNode } from "react";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ApiError } from "@/lib/api/client";
import type { AsyncState } from "@/lib/hooks/use-async";

export interface AsyncBoundaryProps<T> {
  state: AsyncState<T>;
  children: (data: T) => ReactNode;
  loadingLabel?: string;
  errorTitle?: string;
}

/**
 * Renders the three states every API-backed view has to handle. A 401 gets its own wording so
 * an expired session does not look like a broken network connection.
 */
export function AsyncBoundary<T>({
  state,
  children,
  loadingLabel = "Loading",
  errorTitle,
}: AsyncBoundaryProps<T>) {
  // Only the very first load takes over the page. A background refresh - for example after the
  // survey form saves - keeps the current view mounted, so feedback the view is showing is not
  // wiped out by a flash of the loading state.
  if (state.isLoading && state.data === null) {
    return <LoadingState label={loadingLabel} />;
  }

  if (state.error || state.data === null) {
    const error: ApiError | null = state.error;

    if (error?.status === 401) {
      return (
        <ErrorState
          title="Your session has expired"
          description="Sign in again to continue where you left off."
          onRetry={state.reload}
        />
      );
    }

    return (
      <ErrorState
        title={errorTitle ?? (error?.isNetworkError ? "Cannot reach the server" : "Could not load this page")}
        description={error?.message ?? "Please try again."}
        onRetry={state.reload}
      />
    );
  }

  return <>{children(state.data)}</>;
}