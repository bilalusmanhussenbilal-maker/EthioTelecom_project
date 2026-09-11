import type { Prisma } from "@prisma/client";
import {
  countAreaReferences,
  countBoxReferences,
  countLineReferences,
  countPortReferences,
  countServiceReferences,
  createArea,
  createBox,
  createLineWithHops,
  createPort,
  createServiceFull,
  deleteArea,
  deleteBox,
  deleteLine,
  deletePort,
  deleteService,
  findAreaByCode,
  findAreaById,
  findBoxByCodeSummary,
  findBoxById,
  findLineByCode,
  findLineById,
  findPortByBoxAndCode,
  findPortById,
  findServiceByCode,
  findServiceById,
  updateArea,
  updateBox,
  updateLineWithHops,
  updatePort,
  updateServiceFull,
  type HopInput,
  type NetworkLinkInput,
  type NewNetworkInput,
} from "../models/network.model.js";
import type { UserRole } from "../models/roles.js";
import { ApiError } from "../utils/api-error.js";
import { recordActivity } from "./activity-log.service.js";

export interface NetworkAdminActor {
  userId: string;
  username: string;
  role: UserRole;
}

/** AGENTS.md #20: only an administrator gets full network management. */
function assertAdmin(actor: NetworkAdminActor): void {
  if (actor.role !== "ADMIN") {
    throw ApiError.forbidden("Only an administrator can change network data");
  }
}

function conflict(message: string, code: string, path: string): ApiError {
  return ApiError.conflict(message, { code, details: [{ path, message: "is already in use" }] });
}

async function assertAreaExists(areaId: string, path = "body.areaId"): Promise<void> {
  if (!(await findAreaById(areaId))) {
    throw ApiError.unprocessable("That service area does not exist", {
      code: "UNKNOWN_AREA",
      details: [{ path, message: "does not exist" }],
    });
  }
}

/** #6: a port can only be attached to the box it actually lives in. */
async function assertPortBelongsToBox(
  portId: string,
  boxId: string | null | undefined,
  path: string,
): Promise<void> {
  const port = await findPortById(portId);

  if (!port) {
    throw ApiError.unprocessable("That port does not exist", {
      code: "UNKNOWN_PORT",
      details: [{ path, message: "does not exist" }],
    });
  }

  if (boxId !== null && boxId !== undefined && port.boxId !== boxId) {
    throw ApiError.unprocessable(`Port ${port.code} does not belong to the selected box`, {
      code: "PORT_BOX_MISMATCH",
      details: [{ path, message: `belongs to box ${port.box.code}` }],
    });
  }
}

async function assertLinksExist(
  link: NetworkLinkInput,
  prefix: string,
): Promise<void> {
  if (link.boxId !== null && link.boxId !== undefined && !(await findBoxById(link.boxId))) {
    throw ApiError.unprocessable("That box does not exist", {
      code: "UNKNOWN_BOX",
      details: [{ path: `${prefix}.boxId`, message: "does not exist" }],
    });
  }

  if (link.lineId !== null && link.lineId !== undefined && !(await findLineById(link.lineId))) {
    throw ApiError.unprocessable("That line does not exist", {
      code: "UNKNOWN_LINE",
      details: [{ path: `${prefix}.lineId`, message: "does not exist" }],
    });
  }

  if (link.portId !== null && link.portId !== undefined) {
    await assertPortBelongsToBox(link.portId, link.boxId, `${prefix}.portId`);
  }
}

/* ---------------------------------------------------------------- areas -- */

export interface AreaInput {
  code: string;
  name: string;
  zone?: string | null;
  parentId?: string | null;
}

export async function createAreaForAdmin(input: AreaInput, actor: NetworkAdminActor) {
  assertAdmin(actor);

  if (await findAreaByCode(input.code)) {
    throw conflict(`Service area ${input.code} already exists`, "AREA_CODE_TAKEN", "body.code");
  }

  if (input.parentId !== null && input.parentId !== undefined) {
    await assertAreaExists(input.parentId, "body.parentId");
  }

  const area = await createArea({
    code: input.code,
    name: input.name,
    zone: input.zone ?? null,
    parentId: input.parentId ?? null,
  });

  await recordActivity({
    action: "AREA_CREATED",
    message: `${actor.username} created service area ${area.code} (${area.name})`,
    userId: actor.userId,
    metadata: { areaId: area.id, code: area.code },
  });

  return area;
}

export interface AreaUpdateInput {
  code?: string;
  name?: string;
  zone?: string | null;
  parentId?: string | null;
}

export async function updateAreaForAdmin(id: string, input: AreaUpdateInput, actor: NetworkAdminActor) {
  assertAdmin(actor);

  const area = await findAreaById(id);

  if (!area) {
    throw ApiError.notFound("That service area does not exist");
  }

  if (input.code !== undefined && input.code !== area.code) {
    const existing = await findAreaByCode(input.code);

    if (existing && existing.id !== id) {
      throw conflict(`Service area ${input.code} already exists`, "AREA_CODE_TAKEN", "body.code");
    }
  }

  if (input.parentId !== undefined && input.parentId !== null) {
    if (input.parentId === id) {
      throw ApiError.unprocessable("A service area cannot be its own parent", {
        code: "AREA_CYCLE",
        details: [{ path: "body.parentId", message: "cannot be the area itself" }],
      });
    }

    await assertAreaExists(input.parentId, "body.parentId");

    const parent = await findAreaById(input.parentId);

    if (parent?.parentId === id) {
      throw ApiError.unprocessable("A service area cannot be nested under its own child", {
        code: "AREA_CYCLE",
        details: [{ path: "body.parentId", message: "creates a loop" }],
      });
    }
  }

  const updated = await updateArea(id, {
    ...(input.code === undefined ? {} : { code: input.code }),
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.zone === undefined ? {} : { zone: input.zone }),
    ...(input.parentId === undefined ? {} : { parentId: input.parentId }),
  });

  await recordActivity({
    action: "AREA_UPDATED",
    message: `${actor.username} updated service area ${updated.code}`,
    userId: actor.userId,
    metadata: { areaId: id, fields: Object.keys(input) },
  });

  return updated;
}

export async function deleteAreaForAdmin(id: string, actor: NetworkAdminActor) {
  assertAdmin(actor);

  const area = await findAreaById(id);

  if (!area) {
    throw ApiError.notFound("That service area does not exist");
  }

  const counts = await countAreaReferences(id);
  const inUse =
    (counts?._count.children ?? 0) +
    (counts?._count.services ?? 0) +
    (counts?._count.boxes ?? 0) +
    (counts?._count.lines ?? 0);

  if (inUse > 0) {
    throw ApiError.conflict(`Service area ${area.code} is still in use`, {
      code: "AREA_IN_USE",
      details: [{ path: "params.id", message: "still has sub-areas, boxes, lines or services" }],
    });
  }

  const deleted = await deleteArea(id);

  await recordActivity({
    action: "AREA_DELETED",
    message: `${actor.username} deleted service area ${deleted.code}`,
    userId: actor.userId,
    metadata: { areaId: id, code: deleted.code },
  });

  return deleted;
}

/* --------------------------------------------------------------- boxes -- */

export interface BoxInput {
  code: string;
  name?: string | null;
  type: "MSAN" | "FDC" | "FDT" | "PILLAR" | "JOINT";
  status?: "ACTIVE" | "FAULTY" | "INACTIVE";
  areaId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export async function createBoxForAdmin(input: BoxInput, actor: NetworkAdminActor) {
  assertAdmin(actor);

  if (await findBoxByCodeSummary(input.code)) {
    throw conflict(`Box ${input.code} already exists`, "BOX_CODE_TAKEN", "body.code");
  }

  if (input.areaId !== null && input.areaId !== undefined) {
    await assertAreaExists(input.areaId);
  }

  const box = await createBox({
    code: input.code,
    name: input.name ?? null,
    type: input.type,
    ...(input.status === undefined ? {} : { status: input.status }),
    areaId: input.areaId ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
  });

  await recordActivity({
    action: "BOX_CREATED",
    message: `${actor.username} created box ${box.code}`,
    userId: actor.userId,
    metadata: { boxId: box.id, code: box.code, type: box.type },
  });

  return box;
}

export type BoxUpdateInput = Partial<BoxInput>;

export async function updateBoxForAdmin(id: string, input: BoxUpdateInput, actor: NetworkAdminActor) {
  assertAdmin(actor);

  const box = await findBoxById(id);

  if (!box) {
    throw ApiError.notFound("That box does not exist");
  }

  if (input.code !== undefined && input.code !== box.code) {
    const existing = await findBoxByCodeSummary(input.code);

    if (existing && existing.id !== id) {
      throw conflict(`Box ${input.code} already exists`, "BOX_CODE_TAKEN", "body.code");
    }
  }

  if (input.areaId !== null && input.areaId !== undefined) {
    await assertAreaExists(input.areaId);
  }

  const updated = await updateBox(id, {
    ...(input.code === undefined ? {} : { code: input.code }),
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.type === undefined ? {} : { type: input.type }),
    ...(input.status === undefined ? {} : { status: input.status }),
    ...(input.areaId === undefined ? {} : { areaId: input.areaId }),
    ...(input.latitude === undefined ? {} : { latitude: input.latitude }),
    ...(input.longitude === undefined ? {} : { longitude: input.longitude }),
  });

  await recordActivity({
    action: "BOX_UPDATED",
    message: `${actor.username} updated box ${updated.code}`,
    userId: actor.userId,
    metadata: { boxId: id, fields: Object.keys(input) },
  });

  return updated;
}

export async function deleteBoxForAdmin(id: string, actor: NetworkAdminActor) {
  assertAdmin(actor);

  const box = await findBoxById(id);

  if (!box) {
    throw ApiError.notFound("That box does not exist");
  }

  const counts = await countBoxReferences(id);
  const inUse =
    (counts?._count.ports ?? 0) +
    (counts?._count.lineHops ?? 0) +
    (counts?._count.oldNetworkRefs ?? 0) +
    (counts?._count.newNetworkRefs ?? 0);

  if (inUse > 0) {
    throw ApiError.conflict(`Box ${box.code} is still in use`, {
      code: "BOX_IN_USE",
      details: [{ path: "params.id", message: "remove its ports and network references first" }],
    });
  }

  const deleted = await deleteBox(id);

  await recordActivity({
    action: "BOX_DELETED",
    message: `${actor.username} deleted box ${deleted.code}`,
    userId: actor.userId,
    metadata: { boxId: id, code: deleted.code },
  });

  return deleted;
}

/* --------------------------------------------------------------- ports -- */

export interface PortInput {
  code: string;
  status?: "AVAILABLE" | "OCCUPIED" | "FAULTY";
  notes?: string | null;
}

export async function createPortForAdmin(boxId: string, input: PortInput, actor: NetworkAdminActor) {
  assertAdmin(actor);

  const box = await findBoxById(boxId);

  if (!box) {
    throw ApiError.notFound("That box does not exist");
  }

  if (await findPortByBoxAndCode(boxId, input.code)) {
    throw conflict(`Port ${input.code} already exists in ${box.code}`, "PORT_CODE_TAKEN", "body.code");
  }

  const port = await createPort({
    boxId,
    code: input.code,
    ...(input.status === undefined ? {} : { status: input.status }),
    notes: input.notes ?? null,
  });

  await recordActivity({
    action: "PORT_CREATED",
    message: `${actor.username} added port ${port.code} to ${box.code}`,
    userId: actor.userId,
    metadata: { portId: port.id, boxId, code: port.code, status: port.status },
  });

  return port;
}

export interface PortUpdateInput {
  code?: string;
  status?: "AVAILABLE" | "OCCUPIED" | "FAULTY";
  notes?: string | null;
}

export async function updatePortForAdmin(id: string, input: PortUpdateInput, actor: NetworkAdminActor) {
  assertAdmin(actor);

  const port = await findPortById(id);

  if (!port) {
    throw ApiError.notFound("That port does not exist");
  }

  if (input.code !== undefined && input.code !== port.code) {
    const existing = await findPortByBoxAndCode(port.boxId, input.code);

    if (existing && existing.id !== id) {
      throw conflict(
        `Port ${input.code} already exists in ${port.box.code}`,
        "PORT_CODE_TAKEN",
        "body.code",
      );
    }
  }

  const updated = await updatePort(id, {
    ...(input.code === undefined ? {} : { code: input.code }),
    ...(input.status === undefined ? {} : { status: input.status }),
    ...(input.notes === undefined ? {} : { notes: input.notes }),
  });

  await recordActivity({
    action: "PORT_UPDATED",
    message:
      input.status === undefined
        ? `${actor.username} updated port ${updated.code} in ${port.box.code}`
        : `${actor.username} marked port ${updated.code} in ${port.box.code} as ${updated.status}`,
    userId: actor.userId,
    metadata: { portId: id, boxId: port.boxId, status: updated.status },
  });

  return updated;
}

export async function deletePortForAdmin(id: string, actor: NetworkAdminActor) {
  assertAdmin(actor);

  const port = await findPortById(id);

  if (!port) {
    throw ApiError.notFound("That port does not exist");
  }

  const counts = await countPortReferences(id);
  const inUse = (counts?._count.oldNetworkRefs ?? 0) + (counts?._count.newNetworkRefs ?? 0);

  if (inUse > 0) {
    throw ApiError.conflict(`Port ${port.code} is still referenced by a service`, {
      code: "PORT_IN_USE",
      details: [{ path: "params.id", message: "a service is using this port" }],
    });
  }

  const deleted = await deletePort(id);

  await recordActivity({
    action: "PORT_DELETED",
    message: `${actor.username} deleted port ${deleted.code} from ${port.box.code}`,
    userId: actor.userId,
    metadata: { portId: id, boxId: port.boxId, code: deleted.code },
  });

  return deleted;
}

/* --------------------------------------------------------------- lines -- */

export interface LineInput {
  code: string;
  name?: string | null;
  type: "FIBER" | "COPPER" | "MICROWAVE";
  status?: "ACTIVE" | "FAULTY" | "INACTIVE";
  capacity: number;
  usedCapacity?: number;
  sourceCode: string;
  targetCode: string;
  cableInfo?: string | null;
  areaId?: string | null;
  hops?: HopInput[];
}

/** #7: a route runs source -> target, so fall back to those two nodes. */
function resolveHops(input: {
  sourceCode: string;
  targetCode: string;
  hops?: HopInput[] | undefined;
}): HopInput[] {
  if (input.hops !== undefined && input.hops.length > 0) {
    return input.hops;
  }

  return [{ nodeCode: input.sourceCode }, { nodeCode: input.targetCode }];
}

async function resolveHopBoxes(hops: readonly HopInput[]): Promise<HopInput[]> {
  const resolved: HopInput[] = [];

  for (const hop of hops) {
    if (hop.boxId !== null && hop.boxId !== undefined) {
      if (!(await findBoxById(hop.boxId))) {
        throw ApiError.unprocessable(`Box for hop ${hop.nodeCode} does not exist`, {
          code: "UNKNOWN_BOX",
          details: [{ path: "body.hops", message: `${hop.nodeCode} does not exist` }],
        });
      }

      resolved.push({ nodeCode: hop.nodeCode, boxId: hop.boxId });
      continue;
    }

    // #7: route nodes are normally box codes, so link the box automatically
    // when one matches. An explicit boxId always wins.
    const match = await findBoxByCodeSummary(hop.nodeCode);
    resolved.push({ nodeCode: hop.nodeCode, boxId: match?.id ?? null });
  }

  return resolved;
}

function assertCapacity(capacity: number, usedCapacity: number): void {
  if (usedCapacity > capacity) {
    throw ApiError.unprocessable("Used capacity cannot be higher than the line capacity", {
      code: "CAPACITY_EXCEEDED",
      details: [{ path: "body.usedCapacity", message: "is higher than the capacity" }],
    });
  }
}

export async function createLineForAdmin(input: LineInput, actor: NetworkAdminActor) {
  assertAdmin(actor);

  if (await findLineByCode(input.code)) {
    throw conflict(`Line ${input.code} already exists`, "LINE_CODE_TAKEN", "body.code");
  }

  if (input.areaId !== null && input.areaId !== undefined) {
    await assertAreaExists(input.areaId);
  }

  const usedCapacity = input.usedCapacity ?? 0;
  assertCapacity(input.capacity, usedCapacity);

  const hops = await resolveHopBoxes(resolveHops(input));

  const line = await createLineWithHops(
    {
      code: input.code,
      name: input.name ?? null,
      type: input.type,
      ...(input.status === undefined ? {} : { status: input.status }),
      capacity: input.capacity,
      usedCapacity,
      sourceCode: input.sourceCode,
      targetCode: input.targetCode,
      cableInfo: input.cableInfo ?? null,
      areaId: input.areaId ?? null,
    },
    hops,
  );

  await recordActivity({
    action: "LINE_CREATED",
    message: `${actor.username} created line ${line.code} (${line.sourceCode} -> ${line.targetCode})`,
    userId: actor.userId,
    metadata: { lineId: line.id, code: line.code, capacity: line.capacity },
  });

  return line;
}

export interface LineUpdateInput extends Partial<LineInput> {
  hops?: HopInput[];
}

export async function updateLineForAdmin(id: string, input: LineUpdateInput, actor: NetworkAdminActor) {
  assertAdmin(actor);

  const line = await findLineById(id);

  if (!line) {
    throw ApiError.notFound("That line does not exist");
  }

  if (input.code !== undefined && input.code !== line.code) {
    const existing = await findLineByCode(input.code);

    if (existing && existing.id !== id) {
      throw conflict(`Line ${input.code} already exists`, "LINE_CODE_TAKEN", "body.code");
    }
  }

  if (input.areaId !== null && input.areaId !== undefined) {
    await assertAreaExists(input.areaId);
  }

  const capacity = input.capacity ?? line.capacity;
  const usedCapacity = input.usedCapacity ?? line.usedCapacity;
  assertCapacity(capacity, usedCapacity);

  const hops = input.hops === undefined ? undefined : await resolveHopBoxes(input.hops);

  const updated = await updateLineWithHops(
    id,
    {
      ...(input.code === undefined ? {} : { code: input.code }),
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.type === undefined ? {} : { type: input.type }),
      ...(input.status === undefined ? {} : { status: input.status }),
      ...(input.capacity === undefined ? {} : { capacity: input.capacity }),
      ...(input.usedCapacity === undefined ? {} : { usedCapacity: input.usedCapacity }),
      ...(input.sourceCode === undefined ? {} : { sourceCode: input.sourceCode }),
      ...(input.targetCode === undefined ? {} : { targetCode: input.targetCode }),
      ...(input.cableInfo === undefined ? {} : { cableInfo: input.cableInfo }),
      ...(input.areaId === undefined ? {} : { areaId: input.areaId }),
    },
    hops,
  );

  await recordActivity({
    action: "LINE_UPDATED",
    message: `${actor.username} updated line ${updated.code}`,
    userId: actor.userId,
    metadata: { lineId: id, fields: Object.keys(input) },
  });

  return updated;
}

export async function deleteLineForAdmin(id: string, actor: NetworkAdminActor) {
  assertAdmin(actor);

  const line = await findLineById(id);

  if (!line) {
    throw ApiError.notFound("That line does not exist");
  }

  const counts = await countLineReferences(id);
  const inUse = (counts?._count.oldNetworkRefs ?? 0) + (counts?._count.newNetworkRefs ?? 0);

  if (inUse > 0) {
    throw ApiError.conflict(`Line ${line.code} is still referenced by a service`, {
      code: "LINE_IN_USE",
      details: [{ path: "params.id", message: "a service is using this line" }],
    });
  }

  const deleted = await deleteLine(id);

  await recordActivity({
    action: "LINE_DELETED",
    message: `${actor.username} deleted line ${deleted.code}`,
    userId: actor.userId,
    metadata: { lineId: id, code: deleted.code },
  });

  return deleted;
}

/* ------------------------------------------------------------ services -- */

export interface ServiceInput {
  serviceCode: string;
  customerName: string;
  serviceType: "NEW_CONNECTION" | "LINE_SHIFT" | "SERVICE_SURVEY" | "NETWORK_VERIFICATION";
  serviceAddress: string;
  street?: string | null;
  houseNumber?: string | null;
  areaId: string;
  latitude?: number | null;
  longitude?: number | null;
  status?: "ACTIVE" | "SUSPENDED" | "TERMINATED";
  oldNetwork?: NetworkLinkInput | null;
  newNetwork?: NewNetworkInput | null;
}

export async function createServiceForAdmin(input: ServiceInput, actor: NetworkAdminActor) {
  assertAdmin(actor);

  if (await findServiceByCode(input.serviceCode)) {
    throw conflict(`Service ${input.serviceCode} already exists`, "SERVICE_CODE_TAKEN", "body.serviceCode");
  }

  await assertAreaExists(input.areaId);

  const oldNetwork = input.oldNetwork ?? null;
  const newNetwork = input.newNetwork ?? null;

  if (oldNetwork) {
    await assertLinksExist(oldNetwork, "body.oldNetwork");
  }

  if (newNetwork) {
    await assertLinksExist(newNetwork, "body.newNetwork");
  }

  const service = await createServiceFull({
    service: {
      serviceCode: input.serviceCode,
      customerName: input.customerName,
      serviceType: input.serviceType,
      serviceAddress: input.serviceAddress,
      street: input.street ?? null,
      houseNumber: input.houseNumber ?? null,
      areaId: input.areaId,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      ...(input.status === undefined ? {} : { status: input.status }),
    },
    oldNetwork,
    newNetwork,
  });

  await recordActivity({
    action: "SERVICE_CREATED",
    message: `${actor.username} created service ${service.serviceCode} (${service.customerName})`,
    userId: actor.userId,
    metadata: { serviceId: service.id, serviceCode: service.serviceCode },
  });

  return service;
}

export interface ServiceUpdateInput extends Partial<Omit<ServiceInput, "oldNetwork" | "newNetwork">> {
  oldNetwork?: NetworkLinkInput | null;
  newNetwork?: NewNetworkInput | null;
}

export async function updateServiceForAdmin(id: string, input: ServiceUpdateInput, actor: NetworkAdminActor) {
  assertAdmin(actor);

  const service = await findServiceById(id);

  if (!service) {
    throw ApiError.notFound("That service does not exist");
  }

  if (input.serviceCode !== undefined && input.serviceCode !== service.serviceCode) {
    const existing = await findServiceByCode(input.serviceCode);

    if (existing && existing.id !== id) {
      throw conflict(`Service ${input.serviceCode} already exists`, "SERVICE_CODE_TAKEN", "body.serviceCode");
    }
  }

  if (input.areaId !== undefined) {
    await assertAreaExists(input.areaId);
  }

  if (input.oldNetwork !== undefined && input.oldNetwork !== null) {
    await assertLinksExist(input.oldNetwork, "body.oldNetwork");
  }

  if (input.newNetwork !== undefined && input.newNetwork !== null) {
    await assertLinksExist(input.newNetwork, "body.newNetwork");
  }

  const updated = await updateServiceFull({
    id,
    service: {
      ...(input.serviceCode === undefined ? {} : { serviceCode: input.serviceCode }),
      ...(input.customerName === undefined ? {} : { customerName: input.customerName }),
      ...(input.serviceType === undefined ? {} : { serviceType: input.serviceType }),
      ...(input.serviceAddress === undefined ? {} : { serviceAddress: input.serviceAddress }),
      ...(input.street === undefined ? {} : { street: input.street }),
      ...(input.houseNumber === undefined ? {} : { houseNumber: input.houseNumber }),
      ...(input.areaId === undefined ? {} : { areaId: input.areaId }),
      ...(input.latitude === undefined ? {} : { latitude: input.latitude }),
      ...(input.longitude === undefined ? {} : { longitude: input.longitude }),
      ...(input.status === undefined ? {} : { status: input.status }),
    } satisfies Prisma.ServiceUncheckedUpdateInput,
    oldNetwork: input.oldNetwork,
    newNetwork: input.newNetwork,
  });

  await recordActivity({
    action: "SERVICE_UPDATED",
    message: `${actor.username} updated service ${updated.serviceCode}`,
    userId: actor.userId,
    metadata: { serviceId: id, fields: Object.keys(input) },
  });

  return updated;
}

export async function deleteServiceForAdmin(id: string, actor: NetworkAdminActor) {
  assertAdmin(actor);

  const service = await findServiceById(id);

  if (!service) {
    throw ApiError.notFound("That service does not exist");
  }

  const counts = await countServiceReferences(id);

  if ((counts?._count.surveys ?? 0) > 0) {
    throw ApiError.conflict(`Service ${service.serviceCode} still has surveys`, {
      code: "SERVICE_IN_USE",
      details: [{ path: "params.id", message: "delete or reassign its surveys first" }],
    });
  }

  const deleted = await deleteService(id);

  await recordActivity({
    action: "SERVICE_DELETED",
    message: `${actor.username} deleted service ${deleted.serviceCode}`,
    userId: actor.userId,
    metadata: { serviceId: id, serviceCode: deleted.serviceCode },
  });

  return deleted;
}