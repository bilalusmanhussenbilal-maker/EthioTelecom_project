"use client";

import { useState } from "react";
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
import { useAsync } from "@/lib/hooks/use-async";
import type { AreaDetail } from "@/lib/api/types";

export function AreasManager() {
  const [refreshToken, setRefreshToken] = useState(0);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AreaDetail | null>(null);
  const [deleting, setDeleting] = useState<AreaDetail | null>(null);

  const state = useAsync(`admin-areas:${refreshToken}`, () =>
    networkApi.getAreas().then((response) => response.areas),
  );

  const refresh = () => setRefreshToken((value) => value + 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Service areas (#8) group boxes, lines and services, and give every address a home.
        </p>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus aria-hidden />
          New area
        </Button>
      </div>

      <AsyncBoundary state={state} loadingLabel="Loading service areas">
        {(areas) => (
          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Zone</TableHead>
                  <TableHead className="hidden lg:table-cell">Parent</TableHead>
                  <TableHead>In use</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {areas.map((area) => (
                  <TableRow key={area.id}>
                    <TableCell className="font-medium">{area.code}</TableCell>
                    <TableCell>{area.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">{area.zone ?? "-"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{area.parent?.code ?? "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {area._count.boxes} boxes, {area._count.lines} lines, {area._count.services} services
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditing(area)}
                          aria-label={`Edit ${area.code}`}
                        >
                          <Pencil aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleting(area)}
                          aria-label={`Delete ${area.code}`}
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
        )}
      </AsyncBoundary>

      <AreaDialog
        open={creating || editing !== null}
        area={editing}
        areas={state.data ?? []}
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

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${deleting?.code ?? "area"}`}
        description={`Service area ${deleting?.code ?? ""} will be removed. Areas that still have boxes, lines, sub-areas or services are refused by the server.`}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) {
            await networkApi.deleteArea(deleting.id);
            refresh();
          }
        }}
      />
    </div>
  );
}

interface AreaDialogProps {
  open: boolean;
  area: AreaDetail | null;
  areas: AreaDetail[];
  onClose: () => void;
  onSaved: () => void;
}

function AreaDialog({ open, area, areas, onClose, onSaved }: AreaDialogProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [zone, setZone] = useState("");
  const [parentId, setParentId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  const key = area?.id ?? "new";

  if (open && loadedFor !== key) {
    setLoadedFor(key);
    setCode(area?.code ?? "");
    setName(area?.name ?? "");
    setZone(area?.zone ?? "");
    setParentId(area?.parentId ?? "");
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
      name: name.trim(),
      zone: zone.trim() || null,
      parentId: parentId || null,
    };

    try {
      if (area) {
        await networkApi.updateArea(area.id, body);
      } else {
        await networkApi.createArea(body);
      }
      onSaved();
    } catch (cause) {
      setError(toApiError(cause, "Could not save the service area"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={area ? `Edit ${area.code}` : "New service area"}
      description="Codes are what technicians search by, so keep them short and stable."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="area-form" disabled={submitting}>
            {submitting ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {area ? "Save changes" : "Create area"}
          </Button>
        </>
      }
    >
      <form id="area-form" className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="area-code">Code</Label>
            <Input
              id="area-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="AREA-03"
              required
              aria-invalid={Boolean(issues.find((issue) => issue.path.endsWith("code")))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="area-name">Name</Label>
            <Input
              id="area-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Bole"
              required
              aria-invalid={Boolean(issues.find((issue) => issue.path.endsWith("name")))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="area-zone">Zone</Label>
            <Input
              id="area-zone"
              value={zone}
              onChange={(event) => setZone(event.target.value)}
              placeholder="Zone 3"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="area-parent">Parent area</Label>
            <Select
              id="area-parent"
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
            >
              <option value="">No parent</option>
              {areas
                .filter((candidate) => candidate.id !== area?.id)
                .map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.code} - {candidate.name}
                  </option>
                ))}
            </Select>
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