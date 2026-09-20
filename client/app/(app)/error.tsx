"use client";

import { RouteError } from "@/components/app/route-error";

/**
 * Boundary for the signed-in area. It renders inside `AppShell`, so a failing screen keeps the
 * navigation and the sync indicator: a technician can still reach their other surveys.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-8">
      <RouteError error={error} reset={reset} />
    </div>
  );
}
