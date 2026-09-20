"use client";

import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  /** Where "go back" should lead. The signed-in area points at the dashboard. */
  homeHref?: string;
  homeLabel?: string;
}

/**
 * Shared body for every route error boundary. In production Next.js replaces the message with a
 * generic one and attaches a `digest`, so the digest is shown too: it is the only thing a
 * technician in the field can read back to support.
 */
export function RouteError({
  error,
  reset,
  title = "Something went wrong",
  description = "This screen failed to load. Your saved work is not affected.",
  homeHref = "/dashboard",
  homeLabel = "Go to dashboard",
}: RouteErrorProps) {
  return (
    <div
      role="alert"
      className="mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center"
    >
      <AlertTriangle aria-hidden className="size-7 text-destructive" />

      <div className="space-y-1">
        <h1 className="text-base font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {error.message ? (
        <p className="w-full break-words rounded-md bg-muted/60 px-3 py-2 text-left font-mono text-xs text-muted-foreground">
          {error.message}
        </p>
      ) : null}

      {error.digest ? (
        <p className="text-xs text-muted-foreground">
          Reference code: <span className="font-mono">{error.digest}</span>
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={reset}>
          <RotateCcw aria-hidden className="size-4" />
          Try again
        </Button>
        <Link href={homeHref} className={buttonVariants({ variant: "outline" })}>
          <Home aria-hidden className="size-4" />
          {homeLabel}
        </Link>
      </div>
    </div>
  );
}
