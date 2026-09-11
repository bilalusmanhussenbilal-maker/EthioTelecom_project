import type { BoxStatus, FeasibilityStatus, LineStatus, PortStatus, ServiceType, SurveyStatus } from "@prisma/client";
import { prisma } from "../models/prisma.js";
import { networkInclude } from "../models/network.model.js";
import { ApiError } from "../utils/api-error.js";
import { calculateAvailableCapacity } from "./feasibility.service.js";
import { summarisePorts, type PortSummary } from "./network.service.js";

const relatedServiceQuery = {
  select: {
    service: { select: { id: true, serviceCode: true, customerName: true, serviceType: true, status: true } },
  },
} as const;

export interface NetworkPathNode {
  box: { id: string; code: string; name: string | null; status: BoxStatus } | null;
  port: { id: string; code: string; status: PortStatus } | null;
  line: {
    id: string;
    code: string;
    name: string | null;
    status: LineStatus;
    capacity: number;
    usedCapacity: number;
    availableCapacity: number;
    path: string[];
  } | null;
}

export interface ServiceSearchResult {
  id: string;
  serviceCode: string;
  customerName: string;
  serviceType: ServiceType;
  serviceAddress: string;
  street: string | null;
  houseNumber: string | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
  area: { id: string; code: string; name: string; zone: string | null };
  oldNetwork: NetworkPathNode | null;
  newNetwork: NetworkPathNode | null;
  surveyStatus: SurveyStatus | null;
}

export interface RelatedService {
  id: string;
  serviceCode: string;
  customerName: string;
  serviceType: ServiceType;
  status: string;
}

export interface BoxSearchResult {
  id: string;
  code: string;
  name: string | null;
  type: string;
  status: BoxStatus;
  area: { id: string; code: string; name: string } | null;
  portSummary: PortSummary;
  relatedServices: RelatedService[];
}

export interface PortSearchResult {
  id: string;
  code: string;
  status: PortStatus;
  notes: string | null;
  box: { id: string; code: string; name: string | null; status: BoxStatus } | null;
  relatedServices: RelatedService[];
}

export interface LineSearchResult {
  id: string;
  code: string;
  name: string | null;
  type: string;
  status: LineStatus;
  capacity: number;
  usedCapacity: number;
  availableCapacity: number;
  sourceCode: string;
  targetCode: string;
  path: string[];
  relatedServices: RelatedService[];
}

export interface SearchResults {
  query: string;
  totals: { services: number; boxes: number; ports: number; lines: number };
  services: ServiceSearchResult[];
  boxes: BoxSearchResult[];
  ports: PortSearchResult[];
  lines: LineSearchResult[];
}

type NetworkRecord = {
  box: { id: string; code: string; name: string | null; status: BoxStatus } | null;
  port: { id: string; code: string; status: PortStatus } | null;
  line:
    | {
        id: string;
        code: string;
        name: string | null;
        status: LineStatus;
        capacity: number;
        usedCapacity: number;
        hops: Array<{ nodeCode: string }>;
      }
    | null;
} | null;

function toNetworkPath(record: NetworkRecord): NetworkPathNode | null {
  if (!record) {
    return null;
  }

  return {
    box: record.box,
    port: record.port,
    line: record.line
      ? {
          id: record.line.id,
          code: record.line.code,
          name: record.line.name,
          status: record.line.status,
          capacity: record.line.capacity,
          usedCapacity: record.line.usedCapacity,
          availableCapacity: calculateAvailableCapacity(record.line),
          path: record.line.hops.map((hop) => hop.nodeCode),
        }
      : null,
  };
}

function relatedServicesFromRefs(
  refs: ReadonlyArray<{ service: RelatedService }>,
): RelatedService[] {
  const seen = new Map<string, RelatedService>();

  for (const ref of refs) {
    seen.set(ref.service.id, ref.service);
  }

  return [...seen.values()];
}

export async function search(rawQuery: string, limit: number): Promise<SearchResults> {
  const query = rawQuery.trim();

  if (query.length < 2) {
    throw ApiError.badRequest("Search needs at least 2 characters");
  }

  const [services, boxes, ports, lines] = await Promise.all([
    searchServices(query, limit),
    searchBoxes(query, limit),
    searchPorts(query, limit),
    searchLines(query, limit),
  ]);

  return {
    query,
    totals: {
      services: services.length,
      boxes: boxes.length,
      ports: ports.length,
      lines: lines.length,
    },
    services,
    boxes,
    ports,
    lines,
  };
}

async function searchServices(query: string, limit: number): Promise<ServiceSearchResult[]> {
  const services = await prisma.service.findMany({
    where: {
      OR: [
        { serviceCode: { contains: query, mode: "insensitive" } },
        { customerName: { contains: query, mode: "insensitive" } },
        { serviceAddress: { contains: query, mode: "insensitive" } },
        { street: { contains: query, mode: "insensitive" } },
        { houseNumber: { contains: query, mode: "insensitive" } },
        { area: { code: { contains: query, mode: "insensitive" } } },
        { area: { name: { contains: query, mode: "insensitive" } } },
        { area: { zone: { contains: query, mode: "insensitive" } } },
        { oldNetwork: { box: { code: { contains: query, mode: "insensitive" } } } },
        { oldNetwork: { port: { code: { contains: query, mode: "insensitive" } } } },
        { oldNetwork: { line: { code: { contains: query, mode: "insensitive" } } } },
        { newNetwork: { box: { code: { contains: query, mode: "insensitive" } } } },
        { newNetwork: { port: { code: { contains: query, mode: "insensitive" } } } },
        { newNetwork: { line: { code: { contains: query, mode: "insensitive" } } } },
      ],
    },
    orderBy: { serviceCode: "asc" },
    take: limit,
    include: {
      area: { select: { id: true, code: true, name: true, zone: true } },
      oldNetwork: { include: networkInclude },
      newNetwork: { include: networkInclude },
      surveys: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
    },
  });

  return services.map((service) => ({
    id: service.id,
    serviceCode: service.serviceCode,
    customerName: service.customerName,
    serviceType: service.serviceType,
    serviceAddress: service.serviceAddress,
    street: service.street,
    houseNumber: service.houseNumber,
    status: service.status,
    latitude: service.latitude,
    longitude: service.longitude,
    area: service.area,
    oldNetwork: toNetworkPath(service.oldNetwork as NetworkRecord),
    newNetwork: toNetworkPath(service.newNetwork as NetworkRecord),
    surveyStatus: service.surveys[0]?.status ?? null,
  }));
}

async function searchBoxes(query: string, limit: number): Promise<BoxSearchResult[]> {
  const boxes = await prisma.box.findMany({
    where: {
      OR: [
        { code: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
        { ports: { some: { code: { contains: query, mode: "insensitive" } } } },
      ],
    },
    orderBy: { code: "asc" },
    take: limit,
    include: {
      area: { select: { id: true, code: true, name: true } },
      ports: { select: { status: true } },
      oldNetworkRefs: relatedServiceQuery,
      newNetworkRefs: relatedServiceQuery,
    },
  });

  return boxes.map((box) => ({
    id: box.id,
    code: box.code,
    name: box.name,
    type: box.type,
    status: box.status,
    area: box.area,
    portSummary: summarisePorts(box.ports),
    relatedServices: relatedServicesFromRefs([...box.oldNetworkRefs, ...box.newNetworkRefs]),
  }));
}

async function searchPorts(query: string, limit: number): Promise<PortSearchResult[]> {
  const ports = await prisma.port.findMany({
    where: {
      OR: [
        { code: { contains: query, mode: "insensitive" } },
        { box: { code: { contains: query, mode: "insensitive" } } },
      ],
    },
    orderBy: [{ box: { code: "asc" } }, { code: "asc" }],
    take: limit,
    include: {
      box: { select: { id: true, code: true, name: true, status: true } },
      oldNetworkRefs: relatedServiceQuery,
      newNetworkRefs: relatedServiceQuery,
    },
  });

  return ports.map((port) => ({
    id: port.id,
    code: port.code,
    status: port.status,
    notes: port.notes,
    box: port.box,
    relatedServices: relatedServicesFromRefs([...port.oldNetworkRefs, ...port.newNetworkRefs]),
  }));
}

async function searchLines(query: string, limit: number): Promise<LineSearchResult[]> {
  const lines = await prisma.line.findMany({
    where: {
      OR: [
        { code: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
        { sourceCode: { contains: query, mode: "insensitive" } },
        { targetCode: { contains: query, mode: "insensitive" } },
        { cableInfo: { contains: query, mode: "insensitive" } },
        { hops: { some: { nodeCode: { contains: query, mode: "insensitive" } } } },
      ],
    },
    orderBy: { code: "asc" },
    take: limit,
    include: {
      hops: { orderBy: { sequence: "asc" }, select: { nodeCode: true } },
      oldNetworkRefs: relatedServiceQuery,
      newNetworkRefs: relatedServiceQuery,
    },
  });

  return lines.map((line) => ({
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
    path: line.hops.map((hop) => hop.nodeCode),
    relatedServices: relatedServicesFromRefs([...line.oldNetworkRefs, ...line.newNetworkRefs]),
  }));
}

export interface ServiceNetworkPath {
  service: {
    id: string;
    serviceCode: string;
    customerName: string;
    serviceType: ServiceType;
    serviceAddress: string;
    status: string;
    latitude: number | null;
    longitude: number | null;
  };
  area: { id: string; code: string; name: string; zone: string | null };
  oldNetwork: NetworkPathNode | null;
  newNetwork: NetworkPathNode | null;
  changeType: string | null;
  requiredCapacity: number | null;
  surveys: Array<{
    id: string;
    surveyCode: string;
    status: SurveyStatus;
    feasibilityStatus: FeasibilityStatus | null;
    submittedAt: Date | null;
    completedAt: Date | null;
    technician: { id: string; employeeCode: string; fullName: string } | null;
  }>;
}

/**
 * The single "minimal navigation" view from AGENTS.md #16: one call returns the service
 * plus its old network, new network, change request and every survey raised against it.
 */
export async function getServiceNetworkPath(serviceCode: string): Promise<ServiceNetworkPath> {
  const service = await prisma.service.findUnique({
    where: { serviceCode },
    include: {
      area: { select: { id: true, code: true, name: true, zone: true } },
      oldNetwork: { include: networkInclude },
      newNetwork: { include: networkInclude },
      surveys: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          surveyCode: true,
          status: true,
          feasibilityStatus: true,
          submittedAt: true,
          completedAt: true,
          technician: {
            select: {
              id: true,
              employeeCode: true,
              user: { select: { fullName: true } },
            },
          },
        },
      },
    },
  });

  if (!service) {
    throw ApiError.notFound(`Service ${serviceCode} does not exist`);
  }

  return {
    service: {
      id: service.id,
      serviceCode: service.serviceCode,
      customerName: service.customerName,
      serviceType: service.serviceType,
      serviceAddress: service.serviceAddress,
      status: service.status,
      latitude: service.latitude,
      longitude: service.longitude,
    },
    area: service.area,
    oldNetwork: toNetworkPath(service.oldNetwork as NetworkRecord),
    newNetwork: toNetworkPath(service.newNetwork as NetworkRecord),
    changeType: service.newNetwork?.changeType ?? null,
    requiredCapacity: service.newNetwork?.requiredCapacity ?? null,
    surveys: service.surveys.map((survey) => ({
      id: survey.id,
      surveyCode: survey.surveyCode,
      status: survey.status,
      feasibilityStatus: survey.feasibilityStatus,
      submittedAt: survey.submittedAt,
      completedAt: survey.completedAt,
      technician: survey.technician
        ? {
            id: survey.technician.id,
            employeeCode: survey.technician.employeeCode,
            fullName: survey.technician.user.fullName,
          }
        : null,
    })),
  };
}