"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { ChevronDown, ChevronUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Alert } from "@/components/app/alert";
import { AsyncBoundary } from "@/components/app/async-boundary";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { fieldIssuesOf, shortFieldName, toApiError } from "@/lib/api/errors";
import { networkApi } from "@/lib/api/network";
import {
  LINE_STATUS_LABELS,
  LINE_STATUS_TONES,
  LINE_STATUS_VALUES,
  LINE_TYPE_LABELS,
  LINE_TYPE_VALUES,
} from "@/lib/domain";
import { useAsync } from "@/lib/hooks/use-async";
import type { AreaDetail, LineRecord, LineStatus, LineType } from "@/lib/api/types";

function routeOf(line: LineRecord): string {
  if (line.hops.length > 0) {
    return line.hops.map((hop) => hop.nodeCode).join(" -> ");
  }

  return `${line.sourceCode} -> ${line.targetCode}`;
}

export function LinesManager() {
  const [refreshToken, setRefreshToken] = useState(0);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<LineRecord | null>(null);
  const [deleting, setDeleting] = useState<LineRecord | null>(null);

  const state = useAsync(`admin-lines:${refreshToken}`, async () => {
    const [lines, areas] = await Promise.all([networkApi.getLines(), networkApi.getAreas()]);
    return { lines: lines.lines, areas: areas.areas };
  });

  const refresh = () => setRefreshToken((value) => value + 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Lines carry the route (#7) from source to target through each box. Capacity decides feasibility.
        </p>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus aria-hidden />
          New line
        </Button>
      </div>

      <AsyncBoundary state={state} loadingLabel="Loading lines">
        {({ lines, areas }) => (
          <>
            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead className="hidden sm:table-cell">Area</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="font-medium">{line.code}</TableCell>
                      <TableCell>{LINE_TYPE_LABELS[line.type]}</TableCell>
                      <TableCell className="max-w-xs text-xs text-muted-foreground">
                        {routeOf(line)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {line.usedCapacity} / {line.capacity} used
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{line.area?.code ?? "-"}</TableCell>
                      <TableCell>
                        <StatusBadge tone={LINE_STATUS_TONES[line.status]}>
                          {LINE_STATUS_LABELS[line.status]}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing(line)}
                            aria-label={`Edit ${line.code}`}
                          >
                            <Pencil aria-hidden />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleting(line)}
                            aria-label={`Delete ${line.code}`}
                          >
                            <Trash2 aria-hidden />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <LineDialog
              open={creating || editing !== null}
              line={editing}
              areas={areas}
              onClose={() => {
                setCreating(false);
                setEditing(null);
              }}
              onSaved={() => {
                setCreating(false);
                setEditing(null);
                refresh();
              }}
            />
          </>
        )}
      </AsyncBoundary>

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${deleting?.code ?? "line"}`}
        description={`Line ${deleting?.code ?? ""} and its route hops will be removed. Lines still used by a service are refused by the server.`}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) {
            await networkApi.deleteLine(deleting.id);
            refresh();
          }
        }}
      />
    </div>
  );
}

interface LineDialogProps {
  open: boolean;
  line: LineRecord | null;
  areas: AreaDetail[];
  onClose: () => void;
  onSaved: () => void;
}

function LineDialog({ open, line, areas, onClose, onSaved }: LineDialogProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<LineType>("FIBER");
  const [status, setStatus] = useState<LineStatus>("ACTIVE");
  const [capacity, setCapacity] = useState("0");
  const [usedCapacity, setUsedCapacity] = useState("0");
  const [sourceCode, setSourceCode] = useState("");
  const [targetCode, setTargetCode] = useState("");
  const [cableInfo, setCableInfo] = useState("");
  const [areaId, setAreaId] = useState("");
  const [hops, setHops] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  const key = line?.id ?? "new";

  if (open && loadedFor !== key) {
    setLoadedFor(key);
    setCode(line?.code ?? "");
    setName(line?.name ?? "");
    setType(line?.type ?? "FIBER");
    setStatus(line?.status ?? "ACTIVE");
    setCapacity(line ? String(line.capacity) : "0");
    setUsedCapacity(line ? String(line.usedCapacity) : "0");
    setSourceCode(line?.sourceCode ?? "");
    setTargetCode(line?.targetCode ?? "");
    setCableInfo(line?.cableInfo ?? "");
    setAreaId(line?.areaId ?? "");
    setHops(line ? line.hops.map((hop) => hop.nodeCode) : []);
    setError(null);
  }

  if (!open && loadedFor !== null) {
    setLoadedFor(null);
  }

  const issues = fieldIssuesOf(error);

  function updateHop(index: number, value: string) {
    setHops((current) => current.map((hop, position) => (position === index ? value : hop)));
  }

  function moveHop(index: number, direction: -1 | 1) {
    setHops((current) => {
      const next = [...current];
      const target = index + direction;

      if (target < 0 || target >= next.length) {
        return current;
      }

      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved ?? "");

      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const route = hops.map((hop) => hop.trim()).filter((hop) => hop.length > 0);

    const body = {
      code: code.trim(),
      name: name.trim() || null,
      type,
      status,
      capacity: Number(capacity || 0),
      usedCapacity: Number(usedCapacity || 0),
      sourceCode: sourceCode.trim(),
      targetCode: targetCode.trim(),
      cableInfo: cableInfo.trim() || null,
      areaId: areaId || null,
      ...(route.length > 0 ? { hops: route.map((nodeCode) => ({ nodeCode })) } : {}),
    };

    try {
      if (line) {
        await networkApi.updateLine(line.id, body);
      } else {
        await networkApi.createLine(body);
      }
      onSaved();
    } catch (cause) {
      setError(toApiError(cause, "Could not save the line"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="max-w-2xl"
      title={line ? `Edit ${line.code}` : "New line"}
      description="The route lists every node from source to target. A node that matches a box code is linked automatically."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="line-form" disabled={submitting}>
            {submitting ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {line ? "Save changes" : "Create line"}
          </Button>
        </>
      }
    >
      <form id="line-form" className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="line-code">Code</Label>
            <Input
              id="line-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="LINE-11"
              required
              aria-invalid={Boolean(issues.find((issue) => issue.path.endsWith("code")))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="line-name">Name</Label>
            <Input
              id="line-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Bole backbone"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="line-type">Type</Label>
            <Select id="line-type" value={type} onChange={(event) => setType(event.target.value as LineType)}>
              {LINE_TYPE_VALUES.map((value) => (
                <option key={value} value={value}>
                  {LINE_TYPE_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="line-status">Status</Label>
            <Select
              id="line-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as LineStatus)}
            >
              {LINE_STATUS_VALUES.map((value) => (
                <option key={value} value={value}>
                  {LINE_STATUS_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="line-capacity">Capacity</Label>
            <Input
              id="line-capacity"
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              inputMode="numeric"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="line-used">Used capacity</Label>
            <Input
              id="line-used"
              value={usedCapacity}
              onChange={(event) => setUsedCapacity(event.target.value)}
              inputMode="numeric"
              aria-invalid={Boolean(issues.find((issue) => issue.path.endsWith("usedCapacity")))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="line-source">Source code</Label>
            <Input
              id="line-source"
              value={sourceCode}
              onChange={(event) => setSourceCode(event.target.value)}
              placeholder="MSAN-03"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="line-target">Target code</Label>
            <Input
              id="line-target"
              value={targetCode}
              onChange={(event) => setTargetCode(event.target.value)}
              placeholder="BOX-22"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="line-cable">Cable info</Label>
            <Input
              id="line-cable"
              value={cableInfo}
              onChange={(event) => setCableInfo(event.target.value)}
              placeholder="48F OPGW"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="line-area">Service area</Label>
            <Select id="line-area" value={areaId} onChange={(event) => setAreaId(event.target.value)}>
              <option value="">No area</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.code} - {area.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Route nodes</p>
              <p className="text-xs text-muted-foreground">
                Leave empty to use the source and target as the route.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHops([sourceCode.trim(), targetCode.trim()].filter(Boolean))}
              >
                Use source and target
              </Button>
              <Button variant="outline" size="sm" onClick={() => setHops((current) => [...current, ""])}>
                <Plus aria-hidden />
                Add node
              </Button>
            </div>
          </div>

          {hops.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No route nodes yet. The line will run {sourceCode.trim() || "source"} to{" "}
              {targetCode.trim() || "target"}.
            </p>
          ) : (
            <ul className="space-y-2">
              {hops.map((hop, index) => (
                <li key={`hop-${index}`} className="flex items-center gap-2">
                  <span className="w-6 text-xs text-muted-foreground tabular-nums">{index + 1}</span>
                  <Input
                    aria-label={`Route node ${index + 1}`}
                    value={hop}
                    onChange={(event) => updateHop(index, event.target.value)}
                    placeholder="BOX-15"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Move node ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => moveHop(index, -1)}
                  >
                    <ChevronUp aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Move node ${index + 1} down`}
                    disabled={index === hops.length - 1}
                    onClick={() => moveHop(index, 1)}
                  >
                    <ChevronDown aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove node ${index + 1}`}
                    onClick={() => setHops((current) => current.filter((_, position) => position !== index))}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {issues.length > 0 ? (
          <Alert tone="danger" title={error?.message ?? "Could not save"}>
            <ul className="list-disc space-y-0.5 pl-4">
              {issues.map((issue) => (
                <li key={`${issue.path}-${issue.message}`}>
                  <span className="font-medium">{shortFieldName(issue.path)}</span>: {issue.message}
                </li>
              ))}
            </ul>
          </Alert>
        ) : error ? (
          <Alert tone="danger" title={error.message} />
        ) : null}
      </form>
    </Dialog>
  );
}