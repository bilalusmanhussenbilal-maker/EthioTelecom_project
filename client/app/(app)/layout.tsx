"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app/app-shell";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { useAuth } from "@/lib/auth/auth-provider";

/**
 * Gate for the signed-in area. The session lives in an httpOnly cookie held by the API origin,
 * so the browser is the only place that can read it - which is why this area is client rendered.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { status, error, refresh } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous" && !error) {
      router.replace("/login");
    }
  }, [status, error, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingState label="Checking your session" />
      </div>
    );
  }

  if (status === "anonymous") {
    if (error) {
      return (
        <div className="mx-auto flex min-h-dvh w-full max-w-md items-center p-4">
          <ErrorState
            title={error.isNetworkError ? "Cannot reach the server" : "Could not verify your session"}
            description={error.message}
            onRetry={() => {
              void refresh().catch(() => undefined);
            }}
          />
        </div>
      );
    }

    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingState label="Redirecting to sign in" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}