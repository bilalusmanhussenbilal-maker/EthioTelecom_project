"use client";

import { RouteError } from "@/components/app/route-error";

/**
 * Catches render and data errors anywhere outside the signed-in area (the landing page, sign-in).
 * The signed-in area has its own boundary so the navigation survives.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <RouteError error={error} reset={reset} homeHref="/" homeLabel="Go to the start page" />
    </main>
  );
}
