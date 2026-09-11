import type { BoxStatus, PortStatus } from "@prisma/client";
import {
  findAreaById,
  findBoxByCode,
  findBoxById,
  findLineById,
  findServiceByCode,
  findServiceById,
  listAreas,
  listBoxes,
  listLines,
  listPortsByBox,
  listServices,
} from "../models/network.model.js";
import { ApiError } from "../utils/api-error.js";
import { calculateAvailableCapacity } from "./feasibility.service.js";

export interface PortSummary {
  total: number;
  available: number;
  occupied: number;
  faulty: number;
}

export function summarisePorts(ports: ReadonlyArray<{ status: PortStatus }>): PortSummary {
  return {
    total: ports.length,
    available: ports.filter((port) => port.status === "AVAILABLE").length,
    occupied: ports.filter((port) => port.status === "OCCUPIED").length,
    faulty: ports.filter((port) => port.status === "FAULTY").length,
  };
}

export function getAreas() {
  return listAreas();
}

export async function getArea(id: string) {
  const area = await findAreaById(id);

  if (!area) {
    throw ApiError.notFound("That service area does not exist");
  }

  return area;
}

export function getBoxes(filter: { areaId?: string; status?: BoxStatus }) {
  return listBoxes(filter);
}

export async function getBox(id: string) {
  const box = await findBoxById(id);

  if (!box) {
    throw ApiError.notFound("That box does not exist");
  }

  return { ...box, portSummary: summarisePorts(box.ports) };
}

export async function getBoxByCode(code: string) {
  const box = await findBoxByCode(code);

  if (!box) {
    throw ApiError.notFound(`Box ${code} does not exist`);
  }

  return { ...box, portSummary: summarisePorts(box.ports) };
}

export function getLines(filter: { areaId?: string }) {
  return listLines(filter);
}

export async function getLine(id: string) {
  const line = await findLineById(id);

  if (!line) {
    throw ApiError.notFound("That line does not exist");
  }

  return {
    ...line,
    availableCapacity: calculateAvailableCapacity(line),
    path: line.hops.map((hop) => hop.nodeCode),
  };
}

export function getServices(filter: { areaId?: string; status?: string }) {
  return listServices(filter);
}

export async function getService(id: string) {
  const service = await findServiceById(id);

  if (!service) {
    throw ApiError.notFound("That service does not exist");
  }

  return service;
}

export async function getServiceByCode(serviceCode: string) {
  const service = await findServiceByCode(serviceCode);

  if (!service) {
    throw ApiError.notFound(`Service ${serviceCode} does not exist`);
  }

  return service;
}

export async function getAvailablePorts(boxId: string) {
  const box = await findBoxById(boxId);

  if (!box) {
    throw ApiError.notFound("That box does not exist");
  }

  const available = box.ports.filter((port) => port.status === "AVAILABLE");

  return {
    box: { id: box.id, code: box.code, name: box.name, type: box.type, status: box.status },
    portSummary: summarisePorts(box.ports),
    availablePorts: available,
  };
}

/**
 * Reference data for the survey form. Sending boxes with their ports and lines with their
 * remaining capacity lets the UI block invalid choices (nonexistent box, occupied port)
 * before the technician ever submits - the backend still revalidates on submit.
 */
export async function getFormOptions(filter: { areaId?: string }) {
  const [areas, boxes, lines] = await Promise.all([
    listAreas(),
    listBoxes(filter.areaId === undefined ? {} : { areaId: filter.areaId }),
    listLines(filter.areaId === undefined ? {} : { areaId: filter.areaId }),
  ]);

  return {
    areas,
    boxes: boxes.map((box) => ({
      id: box.id,
      code: box.code,
      name: box.name,
      type: box.type,
      status: box.status,
      areaId: box.areaId,
      ports: box.ports,
      portSummary: summarisePorts(box.ports),
    })),
    lines: lines.map((line) => ({
      id: line.id,
      code: line.code,
      name: line.name,
      type: line.type,
      status: line.status,
      capacity: line.capacity,
      usedCapacity: line.usedCapacity,
      availableCapacity: calculateAvailableCapacity(line),
      sourceCode: line.sourceCode,
      targetCode: line.targetCode,
      areaId: line.areaId,
      path: line.hops.map((hop) => hop.nodeCode),
    })),
  };
}

export async function getPorts(boxId: string, status?: PortStatus) {
  const box = await findBoxById(boxId);

  if (!box) {
    throw ApiError.notFound("That box does not exist");
  }

  return listPortsByBox(boxId, status);
}