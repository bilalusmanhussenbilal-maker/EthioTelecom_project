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
  CHANGE_TYPE_LABELS,
  CHANGE_TYPE_VALUES,
  SERVICE_STATUS_LABELS,
  SERVICE_STATUS_TONES,
  SERVICE_STATUS_VALUES,
  SERVICE_TYPE_LABELS,
  SERVICE_TYPE_VALUES,
} from "@/lib/domain";
import { useAsync } from "@/lib/hooks/use-async";
import type {
  AreaDetail,
  BoxRecord,
  ChangeType,
  LineRecord,
  NetworkNode,
  ServiceRecord,
  ServiceStatus,
  ServiceType,
} from "@/lib/api/types";

function linkSummary(node: NetworkNode | null): string {
  if (!node) {
    return "-";
  }

  const parts = [
    node.box?.code ?? null,
    node.port?.code ? `port ${node.port.code}` : null,
    node.line?.code ?? null,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" / ") : "-";
}

interface FormOptions {
  boxes: BoxRecord[];
  areas: AreaDetail[];
  lines: LineRecord[];
}

export function ServicesManager() {
  const [refreshToken, setRefreshToken] = useState(0);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ServiceRecord | null>(null);
  const [deleting, setDeleting] = useState<ServiceRecord | null>(null);

  const state = useAsync(`admin-services:${refreshToken}`, async () => {
    const [services, boxes, areas, lines] = await Promise.all([
      networkApi.getServices(),
      networkApi.getBoxes(),
      networkApi.getAreas(),
      networkApi.getLines(),
    ]);

    return {
      services: services.services,
      boxes: boxes.boxes,
      areas: areas.areas,
      lines: lines.lines,
    };
  });

  const refresh = () => setRefreshToken((value) => value + 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          A service (#4/#5) links the old network a customer has today to the new network a shift or connection should reach.
        </p>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus aria-hidden />
          New service
        </Button>
      </div>

      <AsyncBoundary state={state} loadingLabel="Loading services">
        {(data) => (
          <>
            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">Old network</TableHead>
                    <TableHead className="hidden md:table-cell">New network</TableHead>
                    <TableHead className="hidden sm:table-cell">Area</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium">{service.serviceCode}</p>
                          <p className="text-xs text-muted-foreground">{service.customerName}</p>
                        </div>
                      </TableCell>
                      <TableCell>{SERVICE_TYPE_LABELS[service.serviceType]}</TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                        {linkSummary(service.oldNetwork)}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                        {linkSummary(service.newNetwork)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{service.area.code}</TableCell>
                      <TableCell>
                        <StatusBadge tone={SERVICE_STATUS_TONES[service.status]}>
                          {SERVICE_STATUS_LABELS[service.status]}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing(service)}
                            aria-label={`Edit ${service.serviceCode}`}
                          >
                            <Pencil aria-hidden />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleting(service)}
                            aria-label={`Delete ${service.serviceCode}`}
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

            <ServiceDialog
              open={creating || editing !== null}
              service={editing}
              options={data}
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
        title={`Delete ${deleting?.serviceCode ?? "service"}`}
        description={`Service ${deleting?.serviceCode ?? ""} and its network links will be removed. Services that already have surveys are refused by the server.`}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) {
            await networkApi.deleteService(deleting.id);
            refresh();
          }
        }}
      />
    </div>
  );
}

interface ServiceDialogProps {
  open: boolean;
  service: ServiceRecord | null;
  options: FormOptions;
  onClose: () => void;
  onSaved: () => void;
}

interface LinkState {
  boxId: string;
  portId: string;
  lineId: string;
}

const EMPTY_LINK: LinkState = { boxId: "", portId: "", lineId: "" };

function linkFromNode(node: NetworkNode | null): LinkState {
  return {
    boxId: node?.box?.id ?? "",
    portId: node?.port?.id ?? "",
    lineId: node?.line?.id ?? "",
  };
}

function NetworkLinkFields({
  idPrefix,
  link,
  boxes,
  lines,
  onChange,
}: {
  idPrefix: string;
  link: LinkState;
  boxes: BoxRecord[];
  lines: LineRecord[];
  onChange: (next: LinkState) => void;
}) {
  const selectedBox = boxes.find((box) => box.id === link.boxId) ?? null;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-box`}>Box</Label>
        <Select
          id={`${idPrefix}-box`}
          value={link.boxId}
          onChange={(event) => onChange({ ...link, boxId: event.target.value, portId: "" })}
        >
          <option value="">No box</option>
          {boxes.map((box) => (
            <option key={box.id} value={box.id}>
              {box.code}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-port`}>Port</Label>
        <Select
          id={`${idPrefix}-port`}
          value={link.portId}
          disabled={!selectedBox}
          onChange={(event) => onChange({ ...link, portId: event.target.value })}
        >
          <option value="">No port</option>
          {(selectedBox?.ports ?? []).map((port) => (
            <option key={port.id} value={port.id}>
              {port.code} - {port.status.toLowerCase()}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-line`}>Line</Label>
        <Select
          id={`${idPrefix}-line`}
          value={link.lineId}
          onChange={(event) => onChange({ ...link, lineId: event.target.value })}
        >
          <option value="">No line</option>
          {lines.map((line) => (
            <option key={line.id} value={line.id}>
              {line.code}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

function ServiceDialog({ open, service, options, onClose, onSaved }: ServiceDialogProps) {
  const [serviceCode, setServiceCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("NEW_CONNECTION");
  const [serviceAddress, setServiceAddress] = useState("");
  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [areaId, setAreaId] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [status, setStatus] = useState<ServiceStatus>("ACTIVE");
  const [oldLink, setOldLink] = useState<LinkState>(EMPTY_LINK);
  const [newLink, setNewLink] = useState<LinkState>(EMPTY_LINK);
  const [requiredCapacity, setRequiredCapacity] = useState("0");
  const [changeType, setChangeType] = useState<ChangeType>("NEW_CONNECTION");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  const key = service?.id ?? "new";

  if (open && loadedFor !== key) {
    setLoadedFor(key);
    setServiceCode(service?.serviceCode ?? "");
    setCustomerName(service?.customerName ?? "");
    setServiceType(service?.serviceType ?? "NEW_CONNECTION");
    setServiceAddress(service?.serviceAddress ?? "");
    setStreet(service?.street ?? "");
    setHouseNumber(service?.houseNumber ?? "");
    setAreaId(service?.area?.id ?? "");
    setLatitude(service?.latitude === null || service?.latitude === undefined ? "" : String(service.latitude));
    setLongitude(
      service?.longitude === null || service?.longitude === undefined ? "" : String(service.longitude),
    );
    setStatus(service?.status ?? "ACTIVE");
    setOldLink(linkFromNode(service?.oldNetwork ?? null));
    setNewLink(linkFromNode(service?.newNetwork ?? null));
    setRequiredCapacity(
      service?.newNetwork?.requiredCapacity === undefined
        ? "0"
        : String(service.newNetwork.requiredCapacity),
    );
    setChangeType(service?.newNetwork?.changeType ?? "NEW_CONNECTION");
    setError(null);
  }

  if (!open && loadedFor !== null) {
    setLoadedFor(null);
  }

  const issues = fieldIssuesOf(error);

  function toLink(link: LinkState) {
    return {
      boxId: link.boxId || null,
      portId: link.portId || null,
      lineId: link.lineId || null,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const hasOld = Boolean(oldLink.boxId || oldLink.portId || oldLink.lineId);
    const hasNew = Boolean(newLink.boxId || newLink.portId || newLink.lineId);

    const body = {
      serviceCode: serviceCode.trim(),
      customerName: customerName.trim(),
      serviceType,
      serviceAddress: serviceAddress.trim(),
      street: street.trim() || null,
      houseNumber: houseNumber.trim() || null,
      areaId,
      latitude: latitude.trim() ? Number(latitude) : null,
      longitude: longitude.trim() ? Number(longitude) : null,
      status,
      oldNetwork: hasOld ? toLink(oldLink) : null,
      newNetwork: hasNew
        ? {
            ...toLink(newLink),
            requiredCapacity: Number(requiredCapacity || 0),
            changeType,
          }
        : null,
    };

    try {
      if (service) {
        await networkApi.updateService(service.id, body);
      } else {
        await networkApi.createService(body);
      }
      onSaved();
    } catch (cause) {
      setError(toApiError(cause, "Could not save the service"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="max-w-3xl"
      title={service ? `Edit ${service.serviceCode}` : "New service"}
      description="The old network is what the customer has today. The new network is the proposed destination."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="service-form" disabled={submitting}>
            {submitting ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {service ? "Save changes" : "Create service"}
          </Button>
        </>
      }
    >
      <form id="service-form" className="space-y-5" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="service-code">Service code</Label>
            <Input
              id="service-code"
              value={serviceCode}
              onChange={(event) => setServiceCode(event.target.value)}
              placeholder="SRV-004"
              required
              aria-invalid={Boolean(issues.find((issue) => issue.path.endsWith("serviceCode")))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="service-customer">Customer name</Label>
            <Input
              id="service-customer"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Abebe Kebede"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="service-type">Service type</Label>
            <Select
              id="service-type"
              value={serviceType}
              onChange={(event) => setServiceType(event.target.value as ServiceType)}
            >
              {SERVICE_TYPE_VALUES.map((value) => (
                <option key={value} value={value}>
                  {SERVICE_TYPE_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="service-status">Status</Label>
            <Select
              id="service-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as ServiceStatus)}
            >
              {SERVICE_STATUS_VALUES.map((value) => (
                <option key={value} value={value}>
                  {SERVICE_STATUS_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="service-address">Service address</Label>
            <Input
              id="service-address"
              value={serviceAddress}
              onChange={(event) => setServiceAddress(event.target.value)}
              placeholder="Bole, Rwanda Street, House 214"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="service-street">Street</Label>
            <Input
              id="service-street"
              value={street}
              onChange={(event) => setStreet(event.target.value)}
              placeholder="Rwanda Street"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="service-house">House number</Label>
            <Input
              id="service-house"
              value={houseNumber}
              onChange={(event) => setHouseNumber(event.target.value)}
              placeholder="214"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="service-area">Service area</Label>
            <Select id="service-area" value={areaId} onChange={(event) => setAreaId(event.target.value)} required>
              <option value="">Select an area</option>
              {options.areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.code} - {area.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="service-latitude">Latitude</Label>
            <Input
              id="service-latitude"
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
              placeholder="9.0107"
              inputMode="decimal"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="service-longitude">Longitude</Label>
            <Input
              id="service-longitude"
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
              placeholder="38.7613"
              inputMode="decimal"
            />
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-sm font-medium">Old network</p>
          <NetworkLinkFields
            idPrefix="old"
            link={oldLink}
            boxes={options.boxes}
            lines={options.lines}
            onChange={setOldLink}
          />
        </div>

        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-sm font-medium">New network</p>
          <NetworkLinkFields
            idPrefix="new"
            link={newLink}
            boxes={options.boxes}
            lines={options.lines}
            onChange={setNewLink}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-capacity">Required capacity</Label>
              <Input
                id="new-capacity"
                value={requiredCapacity}
                onChange={(event) => setRequiredCapacity(event.target.value)}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-change-type">Change type</Label>
              <Select
                id="new-change-type"
                value={changeType}
                onChange={(event) => setChangeType(event.target.value as ChangeType)}
              >
                {CHANGE_TYPE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {CHANGE_TYPE_LABELS[value]}
                  </option>
                ))}
              </Select>
            </div>
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