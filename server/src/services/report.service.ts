import type { Prisma, SurveyStatus } from "@prisma/client";
import { prisma } from "../models/prisma.js";
import { toCsv } from "../utils/csv.js";
import { calculateAvailableCapacity } from "./feasibility.service.js";
import { summarisePorts } from "./network.service.js";

export const REPORT_KEYS = [
  "survey-summary",
  "port-availability",
  "box-utilization",
  "line-capacity",
  "technician-performance",
  "services-by-area",
] as const;

export type ReportKey = (typeof REPORT_KEYS)[number];

export function isReportKey(value: string): value is ReportKey {
  return (REPORT_KEYS as readonly string[]).includes(value);
}

export type ReportCell = string | number | boolean | null;

export interface ReportTable {
  key: ReportKey;
  title: string;
  description: string;
  generatedAt: string;
  columns: Array<{ key: string; header: string }>;
  rows: Array<Record<string, ReportCell>>;
}

export interface ReportFilters {
  from?: Date;
  to?: Date;
  areaId?: string;
}

const SURVEY_STATUS_ORDER: readonly SurveyStatus[] = [
  "NEW",
  "IN_PROGRESS",
  "COMPLETED",
  "RETURNED",
  "REJECTED",
];

function percentage(part: number, whole: number): number {
  if (whole === 0) {
    return 0;
  }

  return Math.round((part / whole) * 1000) / 10;
}

function surveyWhere(filters: ReportFilters): Prisma.SurveyWhereInput {
  return {
    ...(filters.areaId === undefined ? {} : { service: { areaId: filters.areaId } }),
    ...(filters.from === undefined && filters.to === undefined
      ? {}
      : {
          createdAt: {
            ...(filters.from === undefined ? {} : { gte: filters.from }),
            ...(filters.to === undefined ? {} : { lte: filters.to }),
          },
        }),
  };
}

function baseTable(key: ReportKey, title: string, description: string): ReportTable {
  return {
    key,
    title,
    description,
    generatedAt: new Date().toISOString(),
    columns: [],
    rows: [],
  };
}

async function surveySummary(filters: ReportFilters): Promise<ReportTable> {
  const where = surveyWhere(filters);

  const [grouped, awaitingReview] = await Promise.all([
    prisma.survey.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.survey.count({ where: { ...where, status: "COMPLETED", completedAt: null } }),
  ]);

  const totals = new Map<SurveyStatus, number>();

  for (const row of grouped) {
    totals.set(row.status, row._count._all);
  }

  const all = [...totals.values()].reduce((sum, value) => sum + value, 0);

  const rows: Array<Record<string, ReportCell>> = SURVEY_STATUS_ORDER.map((status) => {
    const count = totals.get(status) ?? 0;

    return {
      status,
      count,
      percentOfTotal: percentage(count, all),
      label:
        status === "COMPLETED" && awaitingReview > 0
          ? `${count} (${awaitingReview} awaiting review)`
          : String(count),
    };
  });

  rows.push({ status: "TOTAL", count: all, percentOfTotal: 100, label: String(all) });

  return {
    ...baseTable("survey-summary", "Survey status summary", "Survey counts by status for the selected period"),
    columns: [
      { key: "status", header: "Status" },
      { key: "count", header: "Count" },
      { key: "percentOfTotal", header: "Share (%)" },
    ],
    rows,
  };
}

async function portAvailability(filters: ReportFilters): Promise<ReportTable> {
  const boxes = await prisma.box.findMany({
    where: filters.areaId === undefined ? {} : { areaId: filters.areaId },
    orderBy: { code: "asc" },
    include: { area: { select: { code: true, name: true } }, ports: { select: { status: true } } },
  });

  const rows = boxes.map((box) => {
    const summary = summarisePorts(box.ports);

    return {
      box: box.code,
      area: box.area?.name ?? "-",
      totalPorts: summary.total,
      available: summary.available,
      occupied: summary.occupied,
      faulty: summary.faulty,
      availablePercent: percentage(summary.available, summary.total),
    };
  });

  return {
    ...baseTable(
      "port-availability",
      "Port availability",
      "Available, occupied and faulty ports for every box",
    ),
    columns: [
      { key: "box", header: "Box" },
      { key: "area", header: "Service area" },
      { key: "totalPorts", header: "Total ports" },
      { key: "available", header: "Available" },
      { key: "occupied", header: "Occupied" },
      { key: "faulty", header: "Faulty" },
      { key: "availablePercent", header: "Available (%)" },
    ],
    rows,
  };
}

async function boxUtilization(filters: ReportFilters): Promise<ReportTable> {
  const areas = await prisma.area.findMany({
    where: filters.areaId === undefined ? {} : { id: filters.areaId },
    orderBy: { code: "asc" },
    include: {
      boxes: { include: { ports: { select: { status: true } } } },
    },
  });

  const rows = areas.map((area) => {
    const allPorts = area.boxes.flatMap((box) => box.ports);
    const summary = summarisePorts(allPorts);
    const fullyUtilized = area.boxes.filter(
      (box) => box.ports.length > 0 && box.ports.every((port) => port.status !== "AVAILABLE"),
    ).length;

    return {
      area: area.code,
      areaName: area.name,
      boxes: area.boxes.length,
      fullyUtilizedBoxes: fullyUtilized,
      totalPorts: summary.total,
      usedPorts: summary.total - summary.available,
      utilizationPercent: percentage(summary.total - summary.available, summary.total),
    };
  });

  return {
    ...baseTable(
      "box-utilization",
      "Box utilization",
      "How much capacity each service area is consuming",
    ),
    columns: [
      { key: "area", header: "Area code" },
      { key: "areaName", header: "Area name" },
      { key: "boxes", header: "Boxes" },
      { key: "fullyUtilizedBoxes", header: "Full boxes" },
      { key: "totalPorts", header: "Total ports" },
      { key: "usedPorts", header: "Used ports" },
      { key: "utilizationPercent", header: "Utilization (%)" },
    ],
    rows,
  };
}

async function lineCapacity(filters: ReportFilters): Promise<ReportTable> {
  const lines = await prisma.line.findMany({
    where: filters.areaId === undefined ? {} : { areaId: filters.areaId },
    orderBy: { code: "asc" },
    include: {
      area: { select: { name: true } },
      hops: { orderBy: { sequence: "asc" }, select: { nodeCode: true } },
    },
  });

  const rows = lines.map((line) => {
    const available = calculateAvailableCapacity(line);

    return {
      line: line.code,
      type: line.type,
      status: line.status,
      area: line.area?.name ?? "-",
      capacity: line.capacity,
      used: line.usedCapacity,
      available,
      utilizationPercent: percentage(line.usedCapacity, line.capacity),
      path: line.hops.map((hop) => hop.nodeCode).join(" -> "),
    };
  });

  return {
    ...baseTable("line-capacity", "Line capacity", "Capacity and remaining headroom for every line"),
    columns: [
      { key: "line", header: "Line" },
      { key: "type", header: "Type" },
      { key: "status", header: "Status" },
      { key: "area", header: "Service area" },
      { key: "capacity", header: "Capacity" },
      { key: "used", header: "Used" },
      { key: "available", header: "Available" },
      { key: "utilizationPercent", header: "Utilization (%)" },
      { key: "path", header: "Route" },
    ],
    rows,
  };
}

async function technicianPerformance(filters: ReportFilters): Promise<ReportTable> {
  const technicians = await prisma.technician.findMany({
    orderBy: { employeeCode: "asc" },
    include: { user: { select: { fullName: true, isActive: true } } },
  });

  const where = surveyWhere(filters);

  const [grouped, timing] = await Promise.all([
    prisma.survey.groupBy({
      by: ["technicianId", "status"],
      where: { ...where, technicianId: { not: null } },
      _count: { _all: true },
    }),
    prisma.survey.findMany({
      where: { ...where, technicianId: { not: null }, submittedAt: { not: null } },
      select: { technicianId: true, createdAt: true, submittedAt: true, completedAt: true },
    }),
  ]);

  const timingByTechnician = new Map<string, { totalHours: number; count: number }>();

  for (const survey of timing) {
    if (!survey.technicianId || !survey.submittedAt) {
      continue;
    }

    const end = survey.completedAt ?? survey.submittedAt;
    const hours = (end.getTime() - survey.createdAt.getTime()) / 3_600_000;
    const current = timingByTechnician.get(survey.technicianId) ?? { totalHours: 0, count: 0 };

    current.totalHours += hours;
    current.count += 1;
    timingByTechnician.set(survey.technicianId, current);
  }

  const rows = technicians.map((technician) => {
    const counts = new Map<SurveyStatus, number>();

    for (const row of grouped) {
      if (row.technicianId === technician.id) {
        counts.set(row.status, row._count._all);
      }
    }

    const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
    const timingEntry = timingByTechnician.get(technician.id);

    return {
      employeeCode: technician.employeeCode,
      technician: technician.user.fullName,
      zone: technician.zone ?? "-",
      active: technician.user.isActive,
      total,
      new: counts.get("NEW") ?? 0,
      inProgress: counts.get("IN_PROGRESS") ?? 0,
      completed: counts.get("COMPLETED") ?? 0,
      returned: counts.get("RETURNED") ?? 0,
      rejected: counts.get("REJECTED") ?? 0,
      averageCompletionHours: timingEntry
        ? Math.round((timingEntry.totalHours / timingEntry.count) * 10) / 10
        : 0,
    };
  });

  return {
    ...baseTable(
      "technician-performance",
      "Technician performance",
      "Workload mix and average turnaround per technician",
    ),
    columns: [
      { key: "employeeCode", header: "Employee code" },
      { key: "technician", header: "Technician" },
      { key: "zone", header: "Zone" },
      { key: "total", header: "Total surveys" },
      { key: "new", header: "New" },
      { key: "inProgress", header: "In progress" },
      { key: "completed", header: "Completed" },
      { key: "returned", header: "Returned" },
      { key: "rejected", header: "Rejected" },
      { key: "averageCompletionHours", header: "Average turnaround (h)" },
    ],
    rows,
  };
}

async function servicesByArea(filters: ReportFilters): Promise<ReportTable> {
  const areas = await prisma.area.findMany({
    where: filters.areaId === undefined ? {} : { id: filters.areaId },
    orderBy: { code: "asc" },
    include: { services: { select: { serviceType: true, status: true } } },
  });

  const rows = areas.map((area) => {
    const byType = (type: string) => area.services.filter((service) => service.serviceType === type).length;

    return {
      area: area.code,
      areaName: area.name,
      zone: area.zone ?? "-",
      total: area.services.length,
      newConnections: byType("NEW_CONNECTION"),
      lineShifts: byType("LINE_SHIFT"),
      serviceSurveys: byType("SERVICE_SURVEY"),
      networkVerifications: byType("NETWORK_VERIFICATION"),
      active: area.services.filter((service) => service.status === "ACTIVE").length,
    };
  });

  return {
    ...baseTable(
      "services-by-area",
      "Services by area",
      "Service volume and change type per service area",
    ),
    columns: [
      { key: "area", header: "Area code" },
      { key: "areaName", header: "Area name" },
      { key: "zone", header: "Zone" },
      { key: "total", header: "Total services" },
      { key: "newConnections", header: "New connections" },
      { key: "lineShifts", header: "Line shifts" },
      { key: "serviceSurveys", header: "Service surveys" },
      { key: "networkVerifications", header: "Network verifications" },
      { key: "active", header: "Active" },
    ],
    rows,
  };
}

const BUILDERS: Record<ReportKey, (filters: ReportFilters) => Promise<ReportTable>> = {
  "survey-summary": surveySummary,
  "port-availability": portAvailability,
  "box-utilization": boxUtilization,
  "line-capacity": lineCapacity,
  "technician-performance": technicianPerformance,
  "services-by-area": servicesByArea,
};

export function buildReport(key: ReportKey, filters: ReportFilters): Promise<ReportTable> {
  return BUILDERS[key](filters);
}

export async function buildAllReports(filters: ReportFilters): Promise<ReportTable[]> {
  return Promise.all(REPORT_KEYS.map((key) => buildReport(key, filters)));
}

export function reportToCsv(table: ReportTable): string {
  return toCsv(table.rows, table.columns.map((column) => ({ key: column.key, header: column.header, value: (row: Record<string, ReportCell>) => row[column.key] ?? null })));
}