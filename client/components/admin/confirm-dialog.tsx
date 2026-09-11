"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Alert } from "@/components/app/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ApiError } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

/**
 * Confirmation gate for destructive network edits. The backend still refuses
 * anything that is still referenced, so a refusal surfaces here as an error
 * rather than a silent data loss.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function handleConfirm() {
    setBusy(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (cause) {
      setError(toApiError(cause, "Could not complete that action"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={busy}>
            {busy ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Alert tone="warning" title="This cannot be undone">
          <p>{description}</p>
        </Alert>
        {error ? <Alert tone="danger" title={error.message} /> : null}
      </div>
    </Dialog>
  );
}