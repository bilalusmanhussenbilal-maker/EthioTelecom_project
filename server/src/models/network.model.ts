import type { BoxStatus, PortStatus } from "@prisma/client";
import { prisma } from "./prisma.js";

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