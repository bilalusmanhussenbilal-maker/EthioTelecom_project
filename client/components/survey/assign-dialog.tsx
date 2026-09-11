"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Alert } from "@/components/app/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { surveysApi } from "@/lib/api/surveys";
import { techniciansApi } from "@/lib/api/technicians";
import { useAsync } from "@/lib/hooks/use-async";

export interface AssignDialogProps {
  surveyId: string;
  surveyCode: string;
  currentTechnicianId: string | null;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}

export function AssignDialog({
  surveyId,
  surveyCode,
  currentTechnicianId,
  open,
  onClose,
  onDone,
}: AssignDialogProps) {
  const [technicianId, setTechnicianId] = useState(currentTechnicianId ?? "");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const technicians = useAsync("assign-dialog-technicians", () => techniciansApi.list());

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!technicianId) {
      setError(new ApiError(422, { code: "VALIDATION_ERROR", message: "Choose a technician" }));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await surveysApi.assign(surveyId, {
        technicianId,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        note: note.trim() || null,
      });
      onDone();
    } catch (cause) {
      setError(toApiError(cause, "Could not assign the survey"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Assign ${surveyCode}`}
      description="The technician you pick becomes the owner of this survey."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="assign-survey-form" disabled={submitting || !technicianId}>
            {submitting ? <Loader2 aria-hidden className="animate-spin" /> : null}
            Assign
          </Button>
        </>
      }
    >
      <form id="assign-survey-form" className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="assign-technician">Technician</Label>
          <Select
            id="assign-technician"
            value={technicianId}
            onChange={(event) => setTechnicianId(event.target.value)}
            disabled={technicians.isLoading}
          >
            <option value="">{technicians.isLoading ? "Loading technicians" : "Select a technician"}</option>
            {(technicians.data?.technicians ?? [])
              .filter((technician) => technician.isActive)
              .map((technician) => (
                <option key={technician.id} value={technician.id}>
                  {technician.fullName} ({technician.employeeCode}) - {technician.counts.TOTAL} surveys
                </option>
              ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="assign-due">Due date</Label>
          <Input id="assign-due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="assign-note">Note</Label>
          <Textarea id="assign-note" value={note} onChange={(event) => setNote(event.target.value)} />
        </div>

        {error ? <Alert tone="danger" title={error.message} /> : null}
      </form>
    </Dialog>
  );
}