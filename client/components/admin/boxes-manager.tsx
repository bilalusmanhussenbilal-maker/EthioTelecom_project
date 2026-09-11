"use client";

import { Fragment, useState } from "react";
import type { FormEvent } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
  BOX_STATUS_LABELS,
  BOX_STATUS_TONES,
  BOX_STATUS_VALUES,
  BOX_TYPE_LABELS,
  BOX_TYPE_VALUES,
  PORT_STATUS_LABELS,
  PORT_STATUS_TONES,
  PORT_STATUS_VALUES,
} from "@/lib/domain";
import { useAsync } from "@/lib/hooks/use-async";
import type {
  AreaDetail,
  BoxRecord,
  BoxStatus,
  BoxType,
  PortRecord,
  PortStatus,
} from "@/lib/api/types";

export function BoxesManager() {
  const [refreshToken, setRefreshToken] = useState(0);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<BoxRecord | null>(null);
  const [deleting, setDeleting] = useState<BoxRecord | null>(null);
  const [managingPorts, setManagingPorts] = useState<BoxRecord | null>(null);

  const state = useAsync(`admin-boxes:${refreshToken}`, async () => {
    const [boxes, areas] = await Promise.all([networkApi.getBoxes(), networkApi.getAreas()]);
    return { boxes: boxes.boxes, areas: areas.areas };
  });

  const refresh = () => setRefreshToken((value) => value + 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Boxes hold the ports (#6). Port availability is what decides whether a connection can be built.
        </p>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus aria-hidden />
          New box
        </Button>
      </div>

      <AsyncBoundary state={state} loadingLabel="Loading boxes">
        {({ boxes, areas }) => (
          <>
            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead className="hidden md:table-cell">Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden sm:table-cell">Area</TableHead>
                    <TableHead>Ports</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boxes.map((box) => {
                    const available = box.ports.filter((port) => port.status === "AVAILABLE").length;
                    const faulty = box.ports.filter((port) => port.status === "FAULTY").length;

                    return (
                      <TableRow key={box.id}>
                        <TableCell className="font-medium">{box.code}</TableCell>
                        <TableCell className="hidden md:table-cell">{box.name ?? "-"}</TableCell>
                        <TableCell>{BOX_TYPE_LABELS[box.type]}</TableCell>
                        <TableCell className="hidden sm:table-cell">{box.area?.code ?? "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {available} available / {box.ports.length} total
                          {faulty > 0 ? ` (${faulty} faulty)` : ""}
                        </TableCell>
                        <TableCell>
                          <StatusBadge tone={BOX_STATUS_TONES[box.status]}>
                            {BOX_STATUS_LABELS[box.status]}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setManagingPorts(box)}>
                              Ports
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditing(box)}
                              aria-label={`Edit ${box.code}`}
                            >
                              <Pencil aria-hidden />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleting(box)}
                              aria-label={`Delete ${box.code}`}
                            >
                              <Trash2 aria-hidden />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <BoxDialog
              open={creating || editing !== null}
              box={editing}
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

      <PortsDialog
        key={managingPorts?.id ?? "no-box"}
        box={managingPorts}
        open={managingPorts !== null}
        onClose={() => setManagingPorts(null)}
        onChanged={refresh}
      />

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${deleting?.code ?? "box"}`}
        description={`Box ${deleting?.code ?? ""} is removed only when it has no ports left and no line route or service refers to it. The server refuses otherwise.`}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) {
            await networkApi.deleteBox(deleting.id);
            refresh();
          }
        }}
      />
    </div>
  );
}

interface BoxDialogProps {
  open: boolean;
  box: BoxRecord | null;
  areas: AreaDetail[];
  onClose: () => void;
  onSaved: () => void;
}

function BoxDialog({ open, box, areas, onClose, onSaved }: BoxDialogProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<BoxType>("FDT");
  const [status, setStatus] = useState<BoxStatus>("ACTIVE");
  const [areaId, setAreaId] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  const key = box?.id ?? "new";

  if (open && loadedFor !== key) {
    setLoadedFor(key);
    setCode(box?.code ?? "");
    setName(box?.name ?? "");
    setType(box?.type ?? "FDT");
    setStatus(box?.status ?? "ACTIVE");
    setAreaId(box?.areaId ?? "");
    setLatitude(box?.latitude === null || box?.latitude === undefined ? "" : String(box.latitude));
    setLongitude(box?.longitude === null || box?.longitude === undefined ? "" : String(box.longitude));
    setError(null);
  }

  if (!open && loadedFor !== null) {
    setLoadedFor(null);
  }

  const issues = fieldIssuesOf(error);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const body = {
      code: code.trim(),
      name: name.trim() || null,
      type,
      status,
      areaId: areaId || null,
      latitude: latitude.trim() ? Number(latitude) : null,
      longitude: longitude.trim() ? Number(longitude) : null,
    };

    try {
      if (box) {
        await networkApi.updateBox(box.id, body);
      } else {
        await networkApi.createBox(body);
      }
      onSaved();
    } catch (cause) {
      setError(toApiError(cause, "Could not save the box"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={box ? `Edit ${box.code}` : "New box"}
      description="Box codes appear in line routes, so keep them stable once lines point at them."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="box-form" disabled={submitting}>
            {submitting ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {box ? "Save changes" : "Create box"}
          </Button>
        </>
      }
    >
      <form id="box-form" className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="box-code">Code</Label>
            <Input
              id="box-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="BOX-23"
              required
              aria-invalid={Boolean(issues.find((issue) => issue.path.endsWith("code")))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="box-name">Name</Label>
            <Input
              id="box-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Bole cabinet 2"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="box-type">Type</Label>
            <Select id="box-type" value={type} onChange={(event) => setType(event.target.value as BoxType)}>
              {BOX_TYPE_VALUES.map((value) => (
                <option key={value} value={value}>
                  {BOX_TYPE_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="box-status">Status</Label>
            <Select
              id="box-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as BoxStatus)}
            >
              {BOX_STATUS_VALUES.map((value) => (
                <option key={value} value={value}>
                  {BOX_STATUS_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="box-area">Service area</Label>
            <Select id="box-area" value={areaId} onChange={(event) => setAreaId(event.target.value)}>
              <option value="">No area</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.code} - {area.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="box-latitude">Latitude</Label>
            <Input
              id="box-latitude"
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
              placeholder="9.0107"
              inputMode="decimal"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="box-longitude">Longitude</Label>
            <Input
              id="box-longitude"
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
              placeholder="38.7613"
              inputMode="decimal"
            />
          </div>
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

interface PortsDialogProps {
  box: BoxRecord | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}

function PortsDialog({ box, open, onClose, onChanged }: PortsDialogProps) {
  const [refreshToken, setRefreshToken] = useState(0);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<PortStatus>("AVAILABLE");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [rowError, setRowError] = useState<ApiError | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const state = useAsync(`admin-box-ports:${box?.id ?? "none"}:${refreshToken}`, () =>
    box ? networkApi.getBoxPorts(box.id).then((response) => response.ports) : Promise.resolve([] as PortRecord[]),
  );

  const refresh = () => {
    setRefreshToken((value) => value + 1);
    onChanged();
  };

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!box) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await networkApi.createPort(box.id, { code: code.trim(), status, notes: notes.trim() || null });
      setCode("");
      setStatus("AVAILABLE");
      setNotes("");
      refresh();
    } catch (cause) {
      setError(toApiError(cause, "Could not add the port"));
    } finally {
      setSubmitting(false);
    }
  }

  async function changeStatus(port: PortRecord, next: PortStatus) {
    setRowBusy(port.id);
    setRowError(null);

    try {
      await networkApi.updatePort(port.id, { status: next });
      refresh();
    } catch (cause) {
      setRowError(toApiError(cause, "Could not change the port status"));
    } finally {
      setRowBusy(null);
    }
  }

  async function removePort(id: string) {
    setRowBusy(id);
    setRowError(null);

    try {
      await networkApi.deletePort(id);
      setPendingDelete(null);
      refresh();
    } catch (cause) {
      setRowError(toApiError(cause, "Could not delete the port"));
    } finally {
      setRowBusy(null);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="max-w-2xl"
      title={box ? `Ports in ${box.code}` : "Ports"}
      description="Port 01 style codes are unique inside a box. Occupied and faulty ports cannot be assigned by a survey."
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        <form className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto]" onSubmit={handleAdd} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="port-code">Port code</Label>
            <Input
              id="port-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="06"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="port-status">Status</Label>
            <Select
              id="port-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as PortStatus)}
            >
              {PORT_STATUS_VALUES.map((value) => (
                <option key={value} value={value}>
                  {PORT_STATUS_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="port-notes">Notes</Label>
            <Input
              id="port-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="flex items-start pt-6">
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 aria-hidden className="animate-spin" /> : <Plus aria-hidden />}
              Add
            </Button>
          </div>
        </form>

        {error ? <Alert tone="danger" title={error.message} /> : null}
        {rowError ? <Alert tone="danger" title={rowError.message} /> : null}

        <AsyncBoundary state={state} loadingLabel="Loading ports">
          {(ports) =>
            ports.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                No ports yet. Add the first one above.
              </p>
            ) : (
              <TableContainer>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Port</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ports.map((port) => (
                      <Fragment key={port.id}>
                        <TableRow>
                          <TableCell className="font-medium">{port.code}</TableCell>
                          <TableCell>
                            <Select
                              aria-label={`Status of port ${port.code}`}
                              className="h-9 w-36"
                              value={port.status}
                              disabled={rowBusy === port.id}
                              onChange={(event) =>
                                void changeStatus(port, event.target.value as PortStatus)
                              }
                            >
                              {PORT_STATUS_VALUES.map((value) => (
                                <option key={value} value={value}>
                                  {PORT_STATUS_LABELS[value]}
                                </option>
                              ))}
                            </Select>
                          </TableCell>
                          <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                            {port.notes ?? "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Delete port ${port.code}`}
                              disabled={rowBusy === port.id}
                              onClick={() => setPendingDelete(port.id)}
                            >
                              <Trash2 aria-hidden />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {pendingDelete === port.id ? (
                          <TableRow>
                            <TableCell colSpan={4}>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="flex items-center gap-2 text-sm">
                                  <StatusBadge tone={PORT_STATUS_TONES[port.status]}>
                                    {PORT_STATUS_LABELS[port.status]}
                                  </StatusBadge>
                                  Delete port {port.code}? Ports still used by a service are refused.
                                </span>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm" onClick={() => setPendingDelete(null)}>
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    disabled={rowBusy === port.id}
                                    onClick={() => void removePort(port.id)}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          }
        </AsyncBoundary>
      </div>
    </Dialog>
  );
}