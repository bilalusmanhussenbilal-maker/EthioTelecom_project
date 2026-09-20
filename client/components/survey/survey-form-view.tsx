"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, Crosshair, Loader2, MapPin, Save, Send, TriangleAlert } from "lucide-react";
import { Alert } from "@/components/app/alert";
import { AsyncBoundary } from "@/components/app/async-boundary";
import { KeyValue, KeyValueGrid } from "@/components/app/key-value";
import { PageHeader } from "@/components/app/page-header";
import { FeasibilityBadge } from "@/components/app/survey-badges";
import { RouteChips } from "@/components/survey/network-path-view";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { toApiError, issueFor } from "@/lib/api/errors";
import { networkApi } from "@/lib/api/network";
import { surveysApi } from "@/lib/api/surveys";
import { useAuth } from "@/lib/auth/auth-provider";
import { FEASIBILITY_REASON_LABELS, SERVICE_TYPE_LABELS } from "@/lib/domain";
import { formatCoordinate, formatMeters } from "@/lib/format";
import { useAsync } from "@/lib/hooks/use-async";
import { clearSurveyDraft, loadSurveyDraft, saveSurveyDraft } from "@/lib/survey-draft";
import type { SurveyDraftInput } from "@/lib/survey-draft";
import type {
  BoxStatus,
  FeasibilityPreview,
  LineStatus,
  PortStatus,
  SurveyFormData,
} from "@/lib/api/types";
import { useSync } from "@/lib/offline/sync-provider";
import type { QueuedMutation } from "@/lib/offline/storage";
import { SyncConflictBanner } from "@/components/app/sync-conflict-banner";

const BOX_STATUS_OPTIONS: BoxStatus[] = ["ACTIVE", "FAULTY", "INACTIVE"];
const PORT_STATUS_OPTIONS: PortStatus[] = ["AVAILABLE", "OCCUPIED", "FAULTY"];
const LINE_STATUS_OPTIONS: LineStatus[] = ["ACTIVE", "FAULTY", "INACTIVE"];

/** "synced" means the verdict on screen was computed for the selection currently in the form. */
type FeasibilityCheckState = "synced" | "checking" | "offline" | "failed";

interface CapturedLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
}

function geolocationErrorMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission was denied. Allow location access for this site and try again.";
  }

  if (error.code === error.POSITION_UNAVAILABLE) {
    return "The device could not determine your position. Step outside or move away from the cabinet and retry.";
  }

  return "Timed out while reading the GPS. Try again.";
}

export function SurveyFormView() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";

  const state = useAsync(`survey-form:${id}`, async () => {
    const [form, options] = await Promise.all([surveysApi.getFormData(id), networkApi.getOptions()]);

    return { form, options };
  });

  return (
    <div className="space-y-5">
      <Link
        href={`/surveys/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to survey
      </Link>

      <AsyncBoundary state={state} loadingLabel="Loading the survey form">
        {({ form, options }) => (
          <SurveyForm key={form.survey.id} id={id} initial={form} options={options} onSaved={state.reload} />
        )}
      </AsyncBoundary>
    </div>
  );
}

interface SurveyFormProps {
  id: string;
  initial: SurveyFormData;
  options: Awaited<ReturnType<typeof networkApi.getOptions>>;
  onSaved: () => void;
}

function SurveyForm({ id, initial, options, onSaved }: SurveyFormProps) {
  const router = useRouter();
  const { user } = useAuth();

  /**
   * Scope the draft to the signed-in technician. Field devices are sometimes shared, and nobody
   * should find another technician's unsaved edits waiting in their form.
   */
  const draftOwner = user?.id ?? "";

  /**
   * COMPLETED is the only status closed to field edits. RETURNED and REJECTED are both rework:
   * the technician corrects the data and submits again.
   */
  const locked = initial.survey.status === "COMPLETED";
  const needsRework = initial.survey.status === "RETURNED" || initial.survey.status === "REJECTED";

  /**
   * Put back anything the technician typed before. This component only mounts on the client, once
   * the survey data has loaded, so reading stored state while rendering is safe: there is no
   * server-rendered markup for it to disagree with.
   */
  const [draft] = useState<SurveyDraftInput | null>(() => (locked ? null : loadSurveyDraft(draftOwner, id)));

  // Only restore references the form can still offer; the network may have changed since.
  const restoredBoxId =
    draft && options.boxes.some((box) => box.id === draft.boxId)
      ? draft.boxId
      : initial.newNetwork?.box?.id ?? "";
  const restoredBox = options.boxes.find((box) => box.id === restoredBoxId) ?? null;
  const restoredPortId =
    draft && restoredBox?.ports.some((port) => port.id === draft.portId)
      ? draft.portId
      : initial.newNetwork?.port?.id ?? "";
  const restoredLineId =
    draft && options.lines.some((line) => line.id === draft.lineId)
      ? draft.lineId
      : initial.newNetwork?.line?.id ?? "";

  const [boxStatus, setBoxStatus] = useState<BoxStatus | "">(
    draft?.boxStatus ?? initial.fieldSurvey.boxStatus ?? "",
  );
  const [portStatus, setPortStatus] = useState<PortStatus | "">(
    draft?.portStatus ?? initial.fieldSurvey.portStatus ?? "",
  );
  const [lineStatus, setLineStatus] = useState<LineStatus | "">(
    draft?.lineStatus ?? initial.fieldSurvey.lineStatus ?? "",
  );
  const [remark, setRemark] = useState(draft?.remark ?? initial.fieldSurvey.technicianRemark ?? "");

  const [boxId, setBoxId] = useState(restoredBoxId);
  const [portId, setPortId] = useState(restoredPortId);
  const [lineId, setLineId] = useState(restoredLineId);
  const [requiredCapacity, setRequiredCapacity] = useState(
    draft?.requiredCapacity ??
      String(initial.requiredCapacity ?? initial.fieldSurvey.requiredCapacity ?? 0),
  );

  const [location, setLocation] = useState<CapturedLocation | null>(
    initial.gps
      ? {
          latitude: initial.gps.latitude,
          longitude: initial.gps.longitude,
          accuracy: initial.gps.accuracy,
          capturedAt: initial.gps.capturedAt,
        }
      : null,
  );
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  const { enqueue, state: syncState, keepLocalChanges, discardLocalChanges } = useSync();

  /** Only surface a conflict on the survey it actually belongs to. */
  const conflict = syncState.conflict?.surveyId === id ? syncState.conflict : null;
  const [resolvingConflict, setResolvingConflict] = useState(false);

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(draft !== null);
  /** Work the debounce below has not written yet, so leaving the form never drops the last edit. */
  const pendingDraft = useRef<SurveyDraftInput | null>(null);

  const selectedBox = options.boxes.find((box) => box.id === boxId) ?? null;
  const assignablePorts = selectedBox?.ports.filter((port) => port.status === "AVAILABLE") ?? [];
  const linesForBox = selectedBox
    ? options.lines.filter((line) => line.path.includes(selectedBox.code))
    : [];

  /**
   * Live feasibility. `initial.feasibility` is what the server computed for the target it loaded;
   * as soon as the technician picks a different box, port, line or capacity that answer is stale,
   * so we re-check against the server rather than leave a misleading verdict on screen.
   */
  const initialTargetKey = useMemo(
    () =>
      JSON.stringify([
        initial.newNetwork?.box?.id ?? "",
        initial.newNetwork?.port?.id ?? "",
        initial.newNetwork?.line?.id ?? "",
        String(initial.requiredCapacity ?? initial.fieldSurvey.requiredCapacity ?? 0),
      ]),
    [initial],
  );
  const targetKey = JSON.stringify([boxId, portId, lineId, requiredCapacity]);
  const targetChanged = targetKey !== initialTargetKey;

  // Results are stamped with the target they were computed for, so a response that arrives after
  // the technician has moved on is simply ignored rather than shown as a current verdict.
  const [liveResult, setLiveResult] = useState<{
    key: string;
    feasibility: FeasibilityPreview | null;
  } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  useEffect(() => {
    // Product decision: no local approximation offline. Save and submit re-check on the server.
    if (locked || !targetChanged || !syncState.online) {
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const { feasibility: result } = await surveysApi.checkFeasibility(
            {
              newBoxId: boxId === "" ? null : boxId,
              newPortId: portId === "" ? null : portId,
              newLineId: lineId === "" ? null : lineId,
              requiredCapacity: requiredCapacity === "" ? null : Number(requiredCapacity),
            },
            { signal: controller.signal },
          );

          setLiveResult({ key: targetKey, feasibility: result });
        } catch {
          // A newer keystroke aborted this request; that one owns the state now.
          if (controller.signal.aborted) {
            return;
          }
          setFailedKey(targetKey);
        }
      })();
    }, 500);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [locked, targetChanged, syncState.online, targetKey, boxId, portId, lineId, requiredCapacity]);

  const liveIsCurrent = liveResult?.key === targetKey;

  const checkState: FeasibilityCheckState =
    locked || !targetChanged
      ? "synced"
      : !syncState.online
        ? "offline"
        : liveIsCurrent
          ? "synced"
          : failedKey === targetKey
            ? "failed"
            : "checking";

  /** Never show a verdict we are not currently sure of. */
  const feasibility = !targetChanged
    ? initial.feasibility
    : liveIsCurrent
      ? liveResult.feasibility
      : null;

  const feasibilityHint =
    checkState === "checking"
      ? "Checking feasibility…"
      : checkState === "offline"
        ? "Feasibility will be checked when you reconnect."
        : checkState === "failed"
          ? "Could not check feasibility right now. It is verified again when you save."
          : null;

  const serverSnapshot = useMemo(
    () =>
      JSON.stringify({
        boxStatus: initial.fieldSurvey.boxStatus ?? "",
        portStatus: initial.fieldSurvey.portStatus ?? "",
        lineStatus: initial.fieldSurvey.lineStatus ?? "",
        remark: initial.fieldSurvey.technicianRemark ?? "",
        boxId: initial.newNetwork?.box?.id ?? "",
        portId: initial.newNetwork?.port?.id ?? "",
        lineId: initial.newNetwork?.line?.id ?? "",
        requiredCapacity: String(initial.requiredCapacity ?? initial.fieldSurvey.requiredCapacity ?? 0),
      }),
    [initial],
  );

  /** Keep the draft in step with the form, and drop it once the form matches the saved values. */
  useEffect(() => {
    if (locked || id === "" || draftOwner === "") {
      return;
    }

    const current: SurveyDraftInput = {
      boxStatus,
      portStatus,
      lineStatus,
      remark,
      boxId,
      portId,
      lineId,
      requiredCapacity,
    };

    const matchesSaved = JSON.stringify(current) === serverSnapshot;
    pendingDraft.current = matchesSaved ? null : current;

    const timer = window.setTimeout(() => {
      if (matchesSaved) {
        clearSurveyDraft(draftOwner, id);
      } else {
        saveSurveyDraft(draftOwner, id, current);
      }

      pendingDraft.current = null;
    }, 500);

    return () => window.clearTimeout(timer);
  }, [
    locked,
    id,
    draftOwner,
    serverSnapshot,
    boxStatus,
    portStatus,
    lineStatus,
    remark,
    boxId,
    portId,
    lineId,
    requiredCapacity,
  ]);

  // Flush whatever the debounce has not written when the technician leaves the form.
  useEffect(
    () => () => {
      if (pendingDraft.current) {
        saveSurveyDraft(draftOwner, id, pendingDraft.current);
      }
    },
    [draftOwner, id],
  );

  function discardDraft() {
    clearSurveyDraft(draftOwner, id);
    setBoxStatus(initial.fieldSurvey.boxStatus ?? "");
    setPortStatus(initial.fieldSurvey.portStatus ?? "");
    setLineStatus(initial.fieldSurvey.lineStatus ?? "");
    setRemark(initial.fieldSurvey.technicianRemark ?? "");
    setBoxId(initial.newNetwork?.box?.id ?? "");
    setPortId(initial.newNetwork?.port?.id ?? "");
    setLineId(initial.newNetwork?.line?.id ?? "");
    setRequiredCapacity(String(initial.requiredCapacity ?? initial.fieldSurvey.requiredCapacity ?? 0));
    setDraftRestored(false);
  }

  function captureLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationMessage("This device does not expose a geolocation API.");
      return;
    }

    setLocating(true);
    setLocationMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: new Date().toISOString(),
        });
        setLocating(false);
      },
      (geoError) => {
        setLocationMessage(geolocationErrorMessage(geoError));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  }

  function fieldPayload() {
    return {
      boxStatus: boxStatus || null,
      portStatus: portStatus || null,
      lineStatus: lineStatus || null,
      technicianRemark: remark.trim() || null,
      newBoxId: boxId || null,
      newPortId: portId || null,
      newLineId: lineId || null,
      requiredCapacity: requiredCapacity === "" ? null : Number(requiredCapacity),
    };
  }

  /**
   * A failed write must never vanish. When the request could not leave the device we hand the
   * edit to the sync queue instead, and only clear the local draft once that write is durable.
   */
  async function queueOffline(mutation: QueuedMutation): Promise<boolean> {
    try {
      await enqueue(mutation);
      clearSurveyDraft(draftOwner, id);
      setDraftRestored(false);
      return true;
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : "the reason is unknown";
      setError(
        new ApiError(0, {
          code: "OFFLINE_STORAGE_FAILED",
          message: `You are offline and this device could not store the survey: ${reason}. Keep this page open and try again once you have a connection.`,
        }),
      );
      return false;
    }
  }

  /**
   * Both outcomes reload the form afterwards: "keep" so the version on screen matches what the
   * server now holds, "rebase" because the server's values are the whole point of that choice.
   */
  async function resolveConflict(choice: "keep" | "rebase") {
    setResolvingConflict(true);
    setError(null);
    setNotice(null);

    try {
      if (choice === "keep") {
        await keepLocalChanges();
        // Deliberately does not claim the send succeeded: if the flush that follows fails, or we
        // are offline, the edit simply stays queued.
        setNotice("Your changes were kept. They will overwrite the server copy on the next sync.");
      } else {
        await discardLocalChanges();
        setNotice("Your queued changes were discarded. This form now shows the server's version.");
      }
      onSaved();
    } catch (cause) {
      setError(toApiError(cause, "Could not resolve the sync conflict"));
    } finally {
      setResolvingConflict(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setNotice(null);

    const payload = fieldPayload();

    try {
      await surveysApi.saveFieldData(id, payload);
      clearSurveyDraft(draftOwner, id);
      setDraftRestored(false);
      setNotice("Saved. Feasibility has been re-checked against the latest values.");
      onSaved();
    } catch (cause) {
      const failure = toApiError(cause, "Could not save the survey");

      if (!failure.isNetworkError) {
        setError(failure);
        return;
      }

      const queued = await queueOffline({
        mutationId: crypto.randomUUID(),
        surveyId: id,
        baseVersion: initial.survey.version,
        action: "SAVE",
        data: payload,
        queuedAt: new Date().toISOString(),
      });

      if (queued) {
        setNotice("You are offline. This save is stored on your device and will sync automatically.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!location) {
      setError(
        new ApiError(422, {
          code: "GPS_REQUIRED",
          message: "Capture the GPS location before submitting. It is required on every survey.",
        }),
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotice(null);

    const payload = { ...fieldPayload(), gps: location };

    try {
      await surveysApi.submit(id, payload);
      clearSurveyDraft(draftOwner, id);
      router.push(`/surveys/${id}`);
    } catch (cause) {
      const failure = toApiError(cause, "Could not submit the survey");

      if (!failure.isNetworkError) {
        setError(failure);
        return;
      }

      const queued = await queueOffline({
        mutationId: crypto.randomUUID(),
        surveyId: id,
        baseVersion: initial.survey.version,
        action: "SUBMIT",
        data: payload,
        queuedAt: new Date().toISOString(),
      });

      if (queued) {
        // Staying put is honest: the server has not accepted the submission yet.
        setNotice(
          "You are offline. This submission is stored on your device and will be sent automatically once you are back online.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  const accuracyTooWeak = location !== null && location.accuracy > 150;

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <PageHeader
        title={`Survey ${initial.survey.surveyCode}`}
        description="Confirm what you see in the field. Everything else is already filled in from the database."
      />

      {conflict ? (
        <SyncConflictBanner
          surveyCode={conflict.surveyCode ?? initial.survey.surveyCode}
          message={conflict.message}
          baseVersion={conflict.baseVersion}
          currentVersion={conflict.currentVersion}
          pendingForSurvey={conflict.pendingForSurvey}
          online={syncState.online}
          busy={resolvingConflict}
          onKeep={() => {
            void resolveConflict("keep");
          }}
          onRebase={() => {
            void resolveConflict("rebase");
          }}
        />
      ) : null}

      {locked ? (
        <Alert tone="info" title="This survey is closed">
          <p>
            It has been submitted and is{" "}
            {initial.survey.reviewState === "APPROVED" ? "approved" : "awaiting supervisor review"}, so
            it can no longer be edited.{" "}
            <Link href={`/surveys/${id}`} className="underline">
              View the result
            </Link>
            .
          </p>
        </Alert>
      ) : null}

      {needsRework ? (
        <Alert
          tone="warning"
          title={
            initial.survey.status === "REJECTED"
              ? "This survey was rejected and needs correcting"
              : "This survey was returned for correction"
          }
        >
          <p>{initial.survey.reviewRemark ?? "The supervisor did not leave a remark."}</p>
          <p>Correct the field data below, then submit it again for review.</p>
        </Alert>
      ) : null}

      {draftRestored ? (
        <Alert tone="info" title="Your unsaved changes were restored">
          <p>
            This form was left with unsaved changes, so they have been put back.{" "}
            <button type="button" className="underline" onClick={discardDraft}>
              Discard them
            </button>{" "}
            to start again from the saved values. The GPS fix is not kept, so capture a fresh one
            before submitting.
          </p>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Service and network (auto-filled)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <KeyValueGrid>
            <KeyValue label="Service ID">{initial.service.serviceCode}</KeyValue>
            <KeyValue label="Customer">{initial.service.customerName}</KeyValue>
            <KeyValue label="Request">{SERVICE_TYPE_LABELS[initial.service.serviceType]}</KeyValue>
            <KeyValue label="Address">{initial.service.serviceAddress}</KeyValue>
            <KeyValue label="Service area">{initial.service.area.name}</KeyValue>
            <KeyValue label="Old box / port">
              {initial.oldNetwork?.box?.code ?? "-"} / {initial.oldNetwork?.port?.code ?? "-"}
            </KeyValue>
          </KeyValueGrid>

          {initial.oldNetwork?.line ? (
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Old line {initial.oldNetwork.line.code}
              </p>
              <RouteChips
                path={
                  initial.oldNetwork.line.path ??
                  initial.oldNetwork.line.hops.map((hop) => hop.nodeCode)
                }
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New network (target)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="form-box">Box</Label>
              <Select
                id="form-box"
                value={boxId}
                disabled={locked}
                onChange={(event) => {
                  setBoxId(event.target.value);
                  setPortId("");
                  setLineId("");
                }}
                aria-invalid={Boolean(issueFor(error, "newBoxId"))}
              >
                <option value="">Not set</option>
                {options.boxes.map((box) => (
                  <option key={box.id} value={box.id}>
                    {box.code} ({box.portSummary.available} free)
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="form-port">Port</Label>
              <Select
                id="form-port"
                value={portId}
                disabled={locked || !selectedBox}
                onChange={(event) => setPortId(event.target.value)}
                aria-invalid={Boolean(issueFor(error, "newPortId"))}
              >
                <option value="">{selectedBox ? "Not set" : "Select a box first"}</option>
                {assignablePorts.map((port) => (
                  <option key={port.id} value={port.id}>
                    {port.code} (available)
                  </option>
                ))}
              </Select>
              {selectedBox && assignablePorts.length === 0 ? (
                <p className="text-xs text-destructive">No port is free in this box.</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="form-line">Line</Label>
              <Select
                id="form-line"
                value={lineId}
                disabled={locked || !selectedBox}
                onChange={(event) => setLineId(event.target.value)}
                aria-invalid={Boolean(issueFor(error, "newLineId"))}
              >
                <option value="">{selectedBox ? "Not set" : "Select a box first"}</option>
                {linesForBox.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.code} ({line.availableCapacity} free)
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="form-capacity">Required capacity</Label>
              <Input
                id="form-capacity"
                type="number"
                min={0}
                value={requiredCapacity}
                disabled={locked}
                onChange={(event) => setRequiredCapacity(event.target.value)}
                aria-invalid={Boolean(issueFor(error, "requiredCapacity"))}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <FeasibilityBadge status={feasibility?.status ?? null} />
            {feasibility !== null && feasibility.availableCapacity !== null ? (
              <span className="text-sm text-muted-foreground tabular-nums">
                {feasibility.availableCapacity} capacity available
              </span>
            ) : null}
            {feasibilityHint ? (
              <span
                aria-live="polite"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
              >
                {checkState === "checking" ? (
                  <Loader2 aria-hidden className="size-3.5 animate-spin" />
                ) : null}
                {feasibilityHint}
              </span>
            ) : null}
            {!locked ? (
              <Button type="button" variant="ghost" size="sm" onClick={handleSave} disabled={saving || resolvingConflict}>
                {saving ? <Loader2 aria-hidden className="animate-spin" /> : <Save aria-hidden />}
                Re-check and save
              </Button>
            ) : null}
          </div>

          {feasibility && !feasibility.feasible ? (
            <Alert tone="danger" title="Not technically feasible">
              <ul className="list-inside list-disc space-y-0.5">
                {feasibility.reasons.map((reason) => (
                  <li key={`${reason.code}-${reason.message}`}>
                    <span className="font-medium">{FEASIBILITY_REASON_LABELS[reason.code] ?? reason.code}</span>
                    : {reason.message}
                  </li>
                ))}
              </ul>
              <p className="mt-1">
                You can still submit, but a technician remark explaining the situation is required.
              </p>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Field observations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="form-box-status">Box condition</Label>
              <Select
                id="form-box-status"
                value={boxStatus}
                disabled={locked}
                onChange={(event) => setBoxStatus(event.target.value as BoxStatus | "")}
                aria-invalid={Boolean(issueFor(error, "boxStatus"))}
              >
                <option value="">Not observed</option>
                {BOX_STATUS_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="form-port-status">Port condition</Label>
              <Select
                id="form-port-status"
                value={portStatus}
                disabled={locked}
                onChange={(event) => setPortStatus(event.target.value as PortStatus | "")}
                aria-invalid={Boolean(issueFor(error, "portStatus"))}
              >
                <option value="">Not observed</option>
                {PORT_STATUS_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="form-line-status">Line condition</Label>
              <Select
                id="form-line-status"
                value={lineStatus}
                disabled={locked}
                onChange={(event) => setLineStatus(event.target.value as LineStatus | "")}
                aria-invalid={Boolean(issueFor(error, "lineStatus"))}
              >
                <option value="">Not observed</option>
                {LINE_STATUS_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="form-remark">
              Technician remark
              {feasibility && !feasibility.feasible ? <span className="text-destructive"> *</span> : null}
            </Label>
            <Textarea
              id="form-remark"
              value={remark}
              disabled={locked}
              onChange={(event) => setRemark(event.target.value)}
              placeholder="What did you find on site?"
              aria-invalid={Boolean(issueFor(error, "technicianRemark"))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin aria-hidden className="size-4 text-muted-foreground" />
            GPS location (required)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={captureLocation} disabled={locating || locked}>
              {locating ? <Loader2 aria-hidden className="animate-spin" /> : <Crosshair aria-hidden />}
              {locating ? "Reading GPS" : location ? "Recapture location" : "Capture location"}
            </Button>
            {location ? (
              <span className="text-sm text-muted-foreground">
                {formatCoordinate(location.latitude)}, {formatCoordinate(location.longitude)} - accuracy{" "}
                {formatMeters(location.accuracy)}
              </span>
            ) : null}
          </div>

          {locationMessage ? <Alert tone="warning" title={locationMessage} /> : null}

          {accuracyTooWeak ? (
            <Alert tone="warning" title="Weak GPS fix">
              <p>
                Accuracy is {formatMeters(location?.accuracy ?? null)}, which is worse than the 150 m the server
                accepts. Move to an open area and capture again.
              </p>
            </Alert>
          ) : null}

          {location ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <TriangleAlert aria-hidden className="size-3.5" />
              Captured at {new Date(location.capturedAt).toLocaleString()}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {error ? (
        <Alert tone="danger" title={error.message}>
          {error.code === "GPS_ACCURACY_TOO_LOW" ? (
            <p>Move to an open area and capture the location again before submitting.</p>
          ) : null}
        </Alert>
      ) : null}

      {notice ? <Alert tone="success" title={notice} /> : null}

      <div className="sticky bottom-20 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background/95 p-3 backdrop-blur sm:bottom-4">
        {!locked ? (
          <>
            <Button type="submit" disabled={submitting || saving || resolvingConflict || !location}>
              {submitting ? <Loader2 aria-hidden className="animate-spin" /> : <Send aria-hidden />}
              {submitting ? "Submitting" : "Submit survey"}
            </Button>
            <Button type="button" variant="outline" onClick={handleSave} disabled={saving || submitting || resolvingConflict}>
              {saving ? <Loader2 aria-hidden className="animate-spin" /> : <Save aria-hidden />}
              Save progress
            </Button>
          </>
        ) : null}
        <Link href={`/surveys/${id}`} className={buttonVariants({ variant: "ghost", size: "md" })}>
          View result
        </Link>
      </div>
    </form>
  );
}