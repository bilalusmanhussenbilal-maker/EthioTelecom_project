import type { BoxStatus, ChangeType, PortStatus, Prisma } from "@prisma/client";
import { prisma, TRANSACTION_OPTIONS } from "./prisma.js";

export const areaSummarySelect = {
  id: true,
  code: true,
  name: true,
  zone: true,
} as const;

export const networkInclude = {
  box: { select: { id: true, code: true, name: true, type: true, status: true } },
  port: { select: { id: true, code: true, status: true } },
  line: {
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      status: true,
      capacity: true,
      usedCapacity: true,
      sourceCode: true,
      targetCode: true,
      cableInfo: true,
      hops: { orderBy: { sequence: "asc" }, select: { sequence: true, nodeCode: true, boxId: true } },
    },
  },
} as const;

const serviceInclude = {
  area: { select: areaSummarySelect },
  oldNetwork: { include: networkInclude },
  newNetwork: { include: networkInclude },
} as const;

export function listAreas() {
  return prisma.area.findMany({
    orderBy: { code: "asc" },
    include: {
      parent: { select: { id: true, code: true, name: true } },
      _count: { select: { children: true, services: true, boxes: true } },
    },
  });
}

export function findAreaById(id: string) {
  return prisma.area.findUnique({
    where: { id },
    include: {
      parent: { select: { id: true, code: true, name: true } },
      children: { select: { id: true, code: true, name: true } },
      _count: { select: { services: true, boxes: true, lines: true } },
    },
  });
}

export function listBoxes(filter: { areaId?: string; status?: BoxStatus }) {
  return prisma.box.findMany({
    where: {
      ...(filter.areaId === undefined ? {} : { areaId: filter.areaId }),
      ...(filter.status === undefined ? {} : { status: filter.status }),
    },
    orderBy: { code: "asc" },
    include: {
      area: { select: areaSummarySelect },
      ports: { orderBy: { code: "asc" } },
    },
  });
}

export function findBoxById(id: string) {
  return prisma.box.findUnique({
    where: { id },
    include: {
      area: { select: areaSummarySelect },
      ports: { orderBy: { code: "asc" } },
      lineHops: {
        include: { line: { select: { id: true, code: true, name: true, status: true } } },
      },
    },
  });
}

export function findBoxByCode(code: string) {
  return prisma.box.findUnique({
    where: { code },
    include: { area: { select: areaSummarySelect }, ports: { orderBy: { code: "asc" } } },
  });
}

export function listBoxesByCodes(codes: readonly string[]) {
  return prisma.box.findMany({
    where: { code: { in: [...codes] } },
    select: { id: true, code: true, name: true, status: true },
  });
}

export function listPortsByBox(boxId: string, status?: PortStatus) {
  return prisma.port.findMany({
    where: { boxId, ...(status === undefined ? {} : { status }) },
    orderBy: { code: "asc" },
  });
}

export function listLines(filter: { areaId?: string }) {
  return prisma.line.findMany({
    where: filter.areaId === undefined ? {} : { areaId: filter.areaId },
    orderBy: { code: "asc" },
    include: {
      area: { select: areaSummarySelect },
      hops: { orderBy: { sequence: "asc" }, select: { sequence: true, nodeCode: true, boxId: true } },
      _count: { select: { newNetworkRefs: true, oldNetworkRefs: true } },
    },
  });
}

export function findLineById(id: string) {
  return prisma.line.findUnique({
    where: { id },
    include: {
      area: { select: areaSummarySelect },
      hops: {
        orderBy: { sequence: "asc" },
        include: { box: { select: { id: true, code: true, status: true } } },
      },
    },
  });
}

export function listServices(filter: { areaId?: string; status?: string }) {
  return prisma.service.findMany({
    where: {
      ...(filter.areaId === undefined ? {} : { areaId: filter.areaId }),
      ...(filter.status === undefined ? {} : { status: filter.status as never }),
    },
    orderBy: { serviceCode: "asc" },
    include: {
      ...serviceInclude,
      surveys: { select: { id: true, surveyCode: true, status: true } },
    },
  });
}

export function findServiceById(id: string) {
  return prisma.service.findUnique({
    where: { id },
    include: {
      ...serviceInclude,
      surveys: {
        orderBy: { createdAt: "desc" },
        select: { id: true, surveyCode: true, status: true, createdAt: true },
      },
    },
  });
}

export function findServiceByCode(serviceCode: string) {
  return prisma.service.findUnique({
    where: { serviceCode },
    include: serviceInclude,
  });
}

export function countBoxes(where: { areaId?: string; status?: BoxStatus }) {
  return prisma.box.count({
    where: {
      ...(where.areaId === undefined ? {} : { areaId: where.areaId }),
      ...(where.status === undefined ? {} : { status: where.status }),
    },
  });
}
// ---------------------------------------------------------------------------
// Administrator mutations. The reads above serve every role; the queries below
// back the #2/#20 administrator management of network data and service areas.
// ---------------------------------------------------------------------------

const lineAdminInclude = {
  area: { select: areaSummarySelect },
  hops: { orderBy: { sequence: "asc" }, select: { sequence: true, nodeCode: true, boxId: true } },
  _count: { select: { newNetworkRefs: true, oldNetworkRefs: true } },
} as const;

const boxAdminInclude = {
  area: { select: areaSummarySelect },
  ports: { orderBy: { code: "asc" } },
  _count: { select: { lineHops: true, oldNetworkRefs: true, newNetworkRefs: true } },
} as const;

const serviceAdminInclude = {
  ...serviceInclude,
  _count: { select: { surveys: true } },
} as const;

export interface HopInput {
  nodeCode: string;
  boxId?: string | null;
}

export interface NetworkLinkInput {
  boxId?: string | null;
  portId?: string | null;
  lineId?: string | null;
}

/* ---------------------------------------------------------------- areas -- */

export function findAreaByCode(code: string) {
  return prisma.area.findUnique({ where: { code }, select: { id: true, code: true } });
}

export function countAreaReferences(id: string) {
  return prisma.area.findUnique({
    where: { id },
    select: { _count: { select: { children: true, services: true, boxes: true, lines: true } } },
  });
}

export function createArea(data: Prisma.AreaUncheckedCreateInput) {
  return prisma.area.create({
    data,
    include: {
      parent: { select: { id: true, code: true, name: true } },
      _count: { select: { children: true, services: true, boxes: true } },
    },
  });
}

export function updateArea(id: string, data: Prisma.AreaUncheckedUpdateInput) {
  return prisma.area.update({
    where: { id },
    data,
    include: {
      parent: { select: { id: true, code: true, name: true } },
      _count: { select: { children: true, services: true, boxes: true } },
    },
  });
}

export function deleteArea(id: string) {
  return prisma.area.delete({ where: { id }, select: { id: true, code: true } });
}

/* --------------------------------------------------------------- boxes -- */

export function findBoxByCodeSummary(code: string) {
  return prisma.box.findUnique({ where: { code }, select: { id: true, code: true } });
}

export function countBoxReferences(id: string) {
  return prisma.box.findUnique({
    where: { id },
    select: {
      _count: { select: { ports: true, lineHops: true, oldNetworkRefs: true, newNetworkRefs: true } },
    },
  });
}

export function createBox(data: Prisma.BoxUncheckedCreateInput) {
  return prisma.box.create({ data, include: boxAdminInclude });
}

export function updateBox(id: string, data: Prisma.BoxUncheckedUpdateInput) {
  return prisma.box.update({ where: { id }, data, include: boxAdminInclude });
}

export function deleteBox(id: string) {
  return prisma.box.delete({ where: { id }, select: { id: true, code: true } });
}

/* --------------------------------------------------------------- ports -- */

export function findPortById(id: string) {
  return prisma.port.findUnique({
    where: { id },
    include: { box: { select: { id: true, code: true } } },
  });
}

export function findPortByBoxAndCode(boxId: string, code: string) {
  return prisma.port.findUnique({ where: { boxId_code: { boxId, code } }, select: { id: true, code: true } });
}

export function countPortReferences(id: string) {
  return prisma.port.findUnique({
    where: { id },
    select: { _count: { select: { oldNetworkRefs: true, newNetworkRefs: true } } },
  });
}

export function createPort(data: Prisma.PortUncheckedCreateInput) {
  return prisma.port.create({ data });
}

export function updatePort(id: string, data: Prisma.PortUncheckedUpdateInput) {
  return prisma.port.update({ where: { id }, data });
}

export function deletePort(id: string) {
  return prisma.port.delete({ where: { id }, select: { id: true, code: true, boxId: true } });
}

/* --------------------------------------------------------------- lines -- */

export function findLineByCode(code: string) {
  return prisma.line.findUnique({ where: { code }, select: { id: true, code: true } });
}

export function countLineReferences(id: string) {
  return prisma.line.findUnique({
    where: { id },
    select: { _count: { select: { oldNetworkRefs: true, newNetworkRefs: true } } },
  });
}

export function createLineWithHops(data: Prisma.LineUncheckedCreateInput, hops: readonly HopInput[]) {
  return prisma.line.create({
    data: {
      ...data,
      hops: {
        create: hops.map((hop, index) => ({
          sequence: index + 1,
          nodeCode: hop.nodeCode,
          boxId: hop.boxId ?? null,
        })),
      },
    },
    include: lineAdminInclude,
  });
}

export function updateLineWithHops(
  id: string,
  data: Prisma.LineUncheckedUpdateInput,
  hops: readonly HopInput[] | undefined,
) {
  // Nested writes keep this to a single round-trip; a transaction would add
  // three more and risk the 5s interactive-transaction default.
  return prisma.line.update({
    where: { id },
    data: {
      ...data,
      ...(hops === undefined
        ? {}
        : {
            hops: {
              deleteMany: {},
              create: hops.map((hop, index) => ({
                sequence: index + 1,
                nodeCode: hop.nodeCode,
                boxId: hop.boxId ?? null,
              })),
            },
          }),
    },
    include: lineAdminInclude,
  });
}

export function deleteLine(id: string) {
  return prisma.line.delete({ where: { id }, select: { id: true, code: true } });
}

/* ------------------------------------------------------------ services -- */

export function countServiceReferences(id: string) {
  return prisma.service.findUnique({
    where: { id },
    select: { _count: { select: { surveys: true } } },
  });
}

export interface NewNetworkInput extends NetworkLinkInput {
  requiredCapacity: number;
  changeType: ChangeType;
}

export function createServiceFull(input: {
  service: Prisma.ServiceUncheckedCreateInput;
  oldNetwork: NetworkLinkInput | null;
  newNetwork: NewNetworkInput | null;
}) {
  return prisma.service.create({
    data: {
      ...input.service,
      ...(input.oldNetwork === null ? {} : { oldNetwork: { create: input.oldNetwork } }),
      ...(input.newNetwork === null ? {} : { newNetwork: { create: input.newNetwork } }),
    },
    include: serviceAdminInclude,
  });
}

/**
 * `undefined` leaves a network side untouched, `null` removes it, and an object
 * replaces it. That lets the form send only the parts the administrator edited.
 */
export function updateServiceFull(input: {
  id: string;
  service: Prisma.ServiceUncheckedUpdateInput;
  oldNetwork: NetworkLinkInput | null | undefined;
  newNetwork: NewNetworkInput | null | undefined;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.service.update({ where: { id: input.id }, data: input.service });

    if (input.oldNetwork === null) {
      await tx.oldNetwork.deleteMany({ where: { serviceId: input.id } });
    } else if (input.oldNetwork !== undefined) {
      await tx.oldNetwork.upsert({
        where: { serviceId: input.id },
        create: { serviceId: input.id, ...input.oldNetwork },
        update: input.oldNetwork,
      });
    }

    if (input.newNetwork === null) {
      await tx.newNetwork.deleteMany({ where: { serviceId: input.id } });
    } else if (input.newNetwork !== undefined) {
      await tx.newNetwork.upsert({
        where: { serviceId: input.id },
        create: { serviceId: input.id, ...input.newNetwork },
        update: input.newNetwork,
      });
    }

    return tx.service.findUniqueOrThrow({ where: { id: input.id }, include: serviceAdminInclude });
  }, TRANSACTION_OPTIONS);
}

export function deleteService(id: string) {
  return prisma.service.delete({ where: { id }, select: { id: true, serviceCode: true } });
}