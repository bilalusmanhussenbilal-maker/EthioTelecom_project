"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Alert } from "@/components/app/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { usersApi } from "@/lib/api/users";

export interface ResetPasswordDialogProps {
  userId: string;
  username: string;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}

export function ResetPasswordDialog({ userId, username, open, onClose, onDone }: ResetPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await usersApi.resetPassword(userId, password);
      setPassword("");
      onDone();
    } catch (cause) {
      setError(toApiError(cause, "Could not reset the password"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Reset password for ${username}`}
      description="The user signs in with this password until they change it."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="reset-password-form" disabled={submitting || password.length < 8}>
            {submitting ? <Loader2 aria-hidden className="animate-spin" /> : null}
            Reset password
          </Button>
        </>
      }
    >
      <form id="reset-password-form" className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="reset-password">New password</Label>
          <Input
            id="reset-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
            autoComplete="new-password"
          />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>

        {error ? <Alert tone="danger" title={error.message} /> : null}
      </form>
    </Dialog>
  );
}