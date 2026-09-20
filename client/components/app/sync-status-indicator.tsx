"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, CloudOff, RefreshCw, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-provider";
import { useSync } from "@/lib/offline/sync-provider";
import type { SyncState } from "@/lib/offline/sync-manager";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "outline" | "muted" | "destructive";

interface Presentation {
  variant: BadgeVariant;
  icon: typeof CloudOff;
  label: string;
  spin?: boolean;
}

/** One place that turns sync state into the five states the field app has to make obvious. */
function presentationFor(state: SyncState): Presentation {
  if (state.conflict) {
    return {
      variant: "destructive",
      icon: AlertTriangle,
      label: state.conflict.surveyCode ? `Conflict · ${state.conflict.surveyCode}` : "Conflict",
    };
  }
  if (!state.online) {
    return {
      variant: "muted",
      icon: CloudOff,
      label: state.pendingCount > 0 ? `Offline · ${state.pendingCount} pending` : "Offline",
    };
  }
  if (state.phase === "syncing") {
    return { variant: "default", icon: RefreshCw, label: "Syncing", spin: true };
  }
  if (state.phase === "error") {
    return { variant: "destructive", icon: AlertTriangle, label: "Sync failed" };
  }
  if (state.pendingCount > 0) {
    return { variant: "secondary", icon: Upload, label: `${state.pendingCount} pending` };
  }
  return { variant: "outline", icon: CheckCircle2, label: "Synced" };
}

export function SyncStatusIndicator() {
  const { user } = useAuth();
  const { state, retry } = useSync();

  // Only technicians sync; for everyone else the badge would always read "Synced".
  if (user?.role !== "TECHNICIAN") {
    return null;
  }

  const { variant, icon: Icon, label, spin } = presentationFor(state);
  const canRetry = state.online && !state.conflict && (state.phase === "error" || state.pendingCount > 0);
  const detail = state.storageError ?? state.lastError;

  const badge = (
    <Badge
      variant={variant}
      className="gap-1.5"
      title={
        detail ??
        (state.lastSyncedAt ? `Last synced ${new Date(state.lastSyncedAt).toLocaleString()}` : undefined)
      }
    >
      <Icon aria-hidden className={cn("size-3.5", spin && "animate-spin")} />
      <span className="hidden text-xs sm:inline">{label}</span>
      <span className="sr-only">{label}</span>
    </Badge>
  );

  return (
    <div className="flex items-center gap-1.5" role="status" aria-live="polite">
      {state.conflict ? (
        // A conflict can only be resolved on the survey's own form, so make the badge the way there.
        <Link
          href={`/surveys/${state.conflict.surveyId}/survey`}
          aria-label={`Resolve sync conflict on survey ${state.conflict.surveyCode ?? state.conflict.surveyId}`}
          className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {badge}
        </Link>
      ) : (
        badge
      )}

      {canRetry ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Retry sync"
          title="Retry sync"
          disabled={state.phase === "syncing"}
          onClick={() => {
            void retry();
          }}
        >
          <RefreshCw aria-hidden className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
