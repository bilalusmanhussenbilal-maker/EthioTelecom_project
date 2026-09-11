"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Loader2, Search } from "lucide-react";
import { Alert } from "@/components/app/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import { toApiError, fieldIssuesOf, shortFieldName } from "@/lib/api/errors";
import { networkApi } from "@/lib/api/network";
import { searchApi } from "@/lib/api/search";
import { surveysApi } from "@/lib/api/surveys";
import { techniciansApi } from "@/lib/api/technicians";
import { SERVICE_TYPE_LABELS } from "@/lib/domain";
import { useAsync } from "@/lib/hooks/use-async";
import { cn } from "@/lib/utils";
import type { RelatedService, SearchResults } from "@/lib/api/types";

export interface CreateSurveyDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateSurveyDialog({ open, onClose, onCreated }: CreateSurveyDialogProps) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const [service, setService] = useState<RelatedService | null>(null);

  const [technicianId, setTechnicianId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [boxId, setBoxId] = useState("");
  const [portId, setPortId] = useState("");
  const [lineId, setLineId] = useState("");
  const [requiredCapacity, setRequiredCapacity] = useState("1");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const options = useAsync("create-survey-options", async () => {
    const [technicians, network] = await Promise.all([
      techniciansApi.list(),
      networkApi.getOptions(),
    ]);

    return { technicians: technicians.technicians, network };
  });

  const boxes = options.data?.network.boxes ?? [];
  const selectedBox = boxes.find((box) => box.id === boxId) ?? null;
  const availablePorts = selectedBox?.ports.filter((port) => port.status === "AVAILABLE") ?? [];
  const linesForBox = selectedBox
    ? (options.data?.network.lines ?? []).filter((line) => line.path.includes(selectedBox.code))
    : [];

  const issues = fieldIssuesOf(error);

  async function runSearch() {
    const query = term.trim();

    if (query.length < 2) {
      setError(new ApiError(422, { code: "VALIDATION_ERROR", message: "Type at least 2 characters to search" }));
      return;
    }

    setSearching(true);
    setError(null);

    try {
      setResults(await searchApi.search(query, 10));
    } catch (cause) {
      setError(toApiError(cause, "Search failed"));
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!service) {
      setError(new ApiError(422, { code: "VALIDATION_ERROR", message: "Select the service this survey is for" }));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await surveysApi.create({
        serviceId: service.id,
        technicianId: technicianId || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        note: note.trim() || null,
        ...(boxId ? { newBoxId: boxId } : {}),
        ...(portId ? { newPortId: portId } : {}),
        ...(lineId ? { newLineId: lineId } : {}),
        ...(requiredCapacity ? { requiredCapacity: Number(requiredCapacity) } : {}),
      });

      onCreated();
    } catch (cause) {
      setError(toApiError(cause, "Could not create the survey"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New survey"
      description="Pick the service, assign a technician and optionally set the proposed new network."
      className="max-w-3xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="create-survey-form" disabled={submitting || !service}>
            {submitting ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {submitting ? "Creating" : "Create survey"}
          </Button>
        </>
      }
    >
      <form id="create-survey-form" className="space-y-5" onSubmit={handleSubmit} noValidate>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Service</legend>

          <div className="flex gap-2">
            <Input
              aria-label="Search services"
              placeholder="Service ID, customer name, box or address"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
            />
            <Button type="button" variant="outline" onClick={runSearch} disabled={searching}>
              {searching ? <Loader2 aria-hidden className="animate-spin" /> : <Search aria-hidden />}
              <span className="sr-only">Search</span>
            </Button>
          </div>

          {service ? (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
              <span className="font-medium">{service.serviceCode}</span> - {service.customerName} (
              {SERVICE_TYPE_LABELS[service.serviceType]})
            </p>
          ) : null}

          {results && results.services.length > 0 && !service ? (
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
              {results.services.map((candidate) => (
                <li key={candidate.id}>
                  <button
                    type="button"
                    onClick={() => setService(candidate)}
                    className={cn(
                      "w-full rounded-md px-2 py-1.5 text-left text-sm",
                      "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    <span className="font-medium">{candidate.serviceCode}</span> - {candidate.customerName}
                    <span className="block text-xs text-muted-foreground">{candidate.serviceAddress}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {results && results.services.length === 0 ? (
            <p className="text-sm text-muted-foreground">No service matched that search.</p>
          ) : null}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="create-technician">Technician</Label>
            <Select
              id="create-technician"
              value={technicianId}
              onChange={(event) => setTechnicianId(event.target.value)}
            >
              <option value="">Unassigned</option>
              {(options.data?.technicians ?? [])
                .filter((technician) => technician.isActive)
                .map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {technician.fullName} ({technician.employeeCode})
                    {technician.isAvailable ? "" : " - unavailable"}
                  </option>
                ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-due">Due date</Label>
            <Input
              id="create-due"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Proposed new network (optional)</legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="create-box">Box</Label>
              <Select
                id="create-box"
                value={boxId}
                onChange={(event) => {
                  setBoxId(event.target.value);
                  setPortId("");
                  setLineId("");
                }}
              >
                <option value="">Keep the existing target</option>
                {boxes.map((box) => (
                  <option key={box.id} value={box.id}>
                    {box.code} - {box.portSummary.available} port(s) free
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-port">Port</Label>
              <Select
                id="create-port"
                value={portId}
                onChange={(event) => setPortId(event.target.value)}
                disabled={!selectedBox}
              >
                <option value="">{selectedBox ? "Select a port" : "Select a box first"}</option>
                {availablePorts.map((port) => (
                  <option key={port.id} value={port.id}>
                    {port.code}
                  </option>
                ))}
              </Select>
              {selectedBox && availablePorts.length === 0 ? (
                <p className="text-xs text-destructive">This box has no available ports.</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-line">Line</Label>
              <Select
                id="create-line"
                value={lineId}
                onChange={(event) => setLineId(event.target.value)}
                disabled={!selectedBox}
              >
                <option value="">{selectedBox ? "Select a line" : "Select a box first"}</option>
                {linesForBox.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.code} - {line.availableCapacity} free
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-capacity">Required capacity</Label>
              <Input
                id="create-capacity"
                type="number"
                min={0}
                value={requiredCapacity}
                onChange={(event) => setRequiredCapacity(event.target.value)}
              />
            </div>
          </div>
        </fieldset>

        <div className="space-y-1.5">
          <Label htmlFor="create-note">Note for the technician</Label>
          <Textarea
            id="create-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Anything the field technician should know before visiting."
          />
        </div>

        {error ? (
          <Alert tone={error.isNetworkError ? "warning" : "danger"} title={error.message}>
            {issues.length > 0 ? (
              <ul className="list-disc space-y-0.5 pl-4">
                {issues.map((issue) => (
                  <li key={`${issue.path}-${issue.message}`}>
                    <span className="font-medium">{shortFieldName(issue.path)}</span>: {issue.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </Alert>
        ) : null}
      </form>
    </Dialog>
  );
}