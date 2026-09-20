"use client";

import { Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SyncConflictBannerProps {
  surveyCode: string;
  message: string;
  baseVersion: number;
  currentVersion: number | null;
  /** How many queued edits "Rebase to Server" would discard. */
  pendingForSurvey: number;
  /** Replacing local work with the server's copy needs a connection to fetch that copy. */
  online: boolean;
  busy: boolean;
  onKeep: () => void;
  onRebase: () => void;
}

/**
 * Shown when the server rejected a queued edit because the survey moved on while the technician
 * was offline. Both outcomes are spelled out, because one of them throws away field work.
 */
export function SyncConflictBanner({
  surveyCode,
  message,
  baseVersion,
  currentVersion,
  pendingForSurvey,
  online,
  busy,
  onKeep,
  onRebase,
}: SyncConflictBannerProps) {
  const discardLabel =
    pendingForSurvey > 1 ? `discards ${pendingForSurvey} queued edits` : "discards your queued edit";

  return (
    <section
      role="alert"
      aria-labelledby="sync-conflict-title"
      className="rounded-lg border border-destructive/40 bg-destructive/5 p-4"
    >
      <div className="flex items-start gap-3">
        <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div className="space-y-1">
          <h2 id="sync-conflict-title" className="font-medium text-destructive">
            Survey {surveyCode} changed on the server
          </h2>
          <p className="text-sm text-muted-foreground">
            Someone else updated this survey while your edit was waiting to sync, so it was not
            applied. Your work is still saved on this device. Choose which version to keep.
          </p>
          <p className="text-xs text-muted-foreground">
            You edited version {baseVersion}
            {currentVersion !== null ? `; the server is now on version ${currentVersion}` : ""}.{" "}
            <span className="italic">{message}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={onKeep} disabled={busy} className="sm:flex-1">
          {busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
          Keep my changes
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onRebase}
          disabled={busy || !online}
          title={online ? undefined : "Reconnect to load the server version"}
          className="sm:flex-1"
        >
          Use the server version
        </Button>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        <strong className="font-medium">Keep my changes</strong> re-sends your edit and overwrites
        the server. <strong className="font-medium">Use the server version</strong> {discardLabel}{" "}
        and reloads this form from the server.
        {online ? "" : " You are offline, so only keeping your changes is available right now."}
      </p>
    </section>
  );
}
