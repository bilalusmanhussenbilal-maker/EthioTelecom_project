"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle2, Loader2, RotateCcw, XCircle } from "lucide-react";
import { Alert } from "@/components/app/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { surveysApi } from "@/lib/api/surveys";
import type { ReviewDecision } from "@/lib/api/surveys";
import { cn } from "@/lib/utils";

const DECISIONS: Array<{ value: ReviewDecision; label: string; icon: typeof CheckCircle2 }> = [
  { value: "APPROVE", label: "Approve", icon: CheckCircle2 },
  { value: "RETURN", label: "Return for rework", icon: RotateCcw },
  { value: "REJECT", label: "Reject", icon: XCircle },
];

export interface ReviewDialogProps {
  surveyId: string;
  surveyCode: string;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}

export function ReviewDialog({ surveyId, surveyCode, open, onClose, onDone }: ReviewDialogProps) {
  const [decision, setDecision] = useState<ReviewDecision>("APPROVE");
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const remarkRequired = decision !== "APPROVE";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (remarkRequired && remark.trim().length === 0) {
      setError(
        new ApiError(422, {
          code: "VALIDATION_ERROR",
          message: `A remark is required when you ${decision === "REJECT" ? "reject" : "return"} a survey`,
        }),
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await surveysApi.review(surveyId, { decision, remark: remark.trim() || null });
      onDone();
    } catch (cause) {
      setError(toApiError(cause, "Could not record the review"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Review ${surveyCode}`}
      description="Approve the survey, or send it back with a remark explaining what to fix."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="review-survey-form"
            variant={decision === "APPROVE" ? "default" : "destructive"}
            disabled={submitting}
          >
            {submitting ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {decision === "APPROVE" ? "Approve survey" : decision === "RETURN" ? "Return survey" : "Reject survey"}
          </Button>
        </>
      }
    >
      <form id="review-survey-form" className="space-y-4" onSubmit={handleSubmit} noValidate>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Decision</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {DECISIONS.map((option) => {
              const active = option.value === decision;

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setDecision(option.value)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <option.icon aria-hidden className="size-4" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="space-y-1.5">
          <Label htmlFor="review-remark">
            Remark {remarkRequired ? <span className="text-destructive">*</span> : "(optional)"}
          </Label>
          <Textarea
            id="review-remark"
            value={remark}
            onChange={(event) => setRemark(event.target.value)}
            placeholder="What did you check, and what needs to change?"
            required={remarkRequired}
            aria-invalid={remarkRequired && remark.trim().length === 0}
          />
        </div>

        {error ? <Alert tone="danger" title={error.message} /> : null}
      </form>
    </Dialog>
  );
}