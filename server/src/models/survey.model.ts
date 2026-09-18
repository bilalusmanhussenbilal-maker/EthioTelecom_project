import type { Prisma, SurveyStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { areaSummarySelect, networkInclude } from "./network.model.js";

export const surveyListInclude = {
  service: {
    select: {
      id: true,
      serviceCode: true,
      customerName: true,
      serviceType: true,
      serviceAddress: true,
      status: true,
      area: { select: areaSummarySelect },
      newNetwork: { include: networkInclude },
    },
  },
  technician: {
    include: { user: { select: { id: true, fullName: true, username: true, phoneNumber: true } } },
  },
  gpsRecord: { select: { accuracy: true, capturedAt: true } },
} as const;

export const surveyDetailInclude = {
  service: {
    include: {
      area: { select: areaSummarySelect },
      oldNetwork: { include: networkInclude },
      newNetwork: { include: networkInclude },
    },
  },
  technician: {
    include: { user: { select: { id: true, fullName: true, username: true, phoneNumber: true } } },
  },
  createdBy: { select: { id: true, fullName: true, username: true } },
  reviewedBy: { select: { id: true, fullName: true, username: true } },
  gpsRecord: true,
  assignments: {
    orderBy: { assignedAt: "desc" },
    include: {
      technician: {
        include: { user: { select: { id: true, fullName: true, username: true } } },
      },
      assignedBy: { select: { id: true, fullName: true, username: true } },
    },
  },
} as const;

export interface SurveyListFilter {
  status?: SurveyStatus;
  technicianId?: string;
  serviceId?: string;
  areaId?: string;
  serviceCode?: string;
  search?: string;
}

export function buildSurveyWhere(filter: SurveyListFilter): Prisma.SurveyWhereInput {
  return {
    ...(filter.status === undefined ? {} : { status: filter.status }),
    ...(filter.technicianId === undefined ? {} : { technicianId: filter.technicianId }),
    ...(filter.serviceId === undefined ? {} : { serviceId: filter.serviceId }),
    ...(filter.areaId === undefined ? {} : { service: { areaId: filter.areaId } }),
    ...(filter.serviceCode === undefined ? {} : { service: { serviceCode: filter.serviceCode } }),
    ...(filter.search === undefined
      ? {}
      : {
          OR: [
            { surveyCode: { contains: filter.search, mode: "insensitive" } },
            { service: { serviceCode: { contains: filter.search, mode: "insensitive" } } },
            { service: { customerName: { contains: filter.search, mode: "insensitive" } } },
          ],
        }),
  };
}

export function listSurveys(filter: SurveyListFilter, options: { skip: number; take: number }) {
  return prisma.survey.findMany({
    where: buildSurveyWhere(filter),
    orderBy: [{ updatedAt: "desc" }],
    skip: options.skip,
    take: options.take,
    include: surveyListInclude,
  });
}

export function countSurveys(filter: SurveyListFilter) {
  return prisma.survey.count({ where: buildSurveyWhere(filter) });
}

export function findSurveyById(id: string) {
  return prisma.survey.findUnique({ where: { id }, include: surveyDetailInclude });
}

export function listAssignedSurveyDetails(technicianId: string) {
  return prisma.survey.findMany({
    where: { technicianId },
    orderBy: { updatedAt: "desc" },
    include: surveyDetailInclude,
  });
}

export function findSurveyByCode(surveyCode: string) {
  return prisma.survey.findUnique({ where: { surveyCode }, include: surveyDetailInclude });
}

export function groupSurveysByStatus(where: Prisma.SurveyWhereInput) {
  return prisma.survey.groupBy({ by: ["status"], where, _count: { _all: true } });
}

export function createSurvey(data: Prisma.SurveyUncheckedCreateInput) {
  return prisma.survey.create({ data, include: surveyDetailInclude });
}

export function updateSurvey(id: string, data: Prisma.SurveyUncheckedUpdateInput) {
  return prisma.survey.update({
    where: { id },
    data: { ...data, version: { increment: 1 } },
    include: surveyDetailInclude,
  });
}

export function deactivateAssignments(surveyId: string) {
  return prisma.surveyAssignment.updateMany({
    where: { surveyId, isActive: true },
    data: { isActive: false },
  });
}

export function createAssignment(data: Prisma.SurveyAssignmentUncheckedCreateInput) {
  return prisma.surveyAssignment.create({ data });
}

export function upsertGpsRecord(data: Prisma.GpsRecordUncheckedCreateInput) {
  const { surveyId, ...rest } = data;

  return prisma.gpsRecord.upsert({
    where: { surveyId },
    create: data,
    update: rest,
  });
}

export function listSurveyActivity(surveyId: string, take = 50) {
  return prisma.activityLog.findMany({
    where: { surveyId },
    orderBy: { createdAt: "desc" },
    take,
    include: { user: { select: { id: true, fullName: true, username: true, role: true } } },
  });
}

export function findSurveyServiceId(id: string) {
  return prisma.survey.findUnique({ where: { id }, select: { id: true, serviceId: true, surveyCode: true } });
}

/**
 * Next SURVEY code in the SV-### format. Uses a numeric max so SV-10 sorts after SV-9.
 * The caller retries on a unique-constraint conflict.
 */
export async function nextSurveyCode(): Promise<string> {
  const rows = await prisma.$queryRaw<Array<{ max: number | bigint | null }>>`
    SELECT MAX(CAST(SUBSTRING("surveyCode" FROM 4) AS INTEGER)) AS max
    FROM "surveys"
    WHERE "surveyCode" LIKE 'SV-%'
  `;

  const current = rows[0]?.max ?? 0;
  const next = Number(current) + 1;

  return `SV-${String(next).padStart(3, "0")}`;
}