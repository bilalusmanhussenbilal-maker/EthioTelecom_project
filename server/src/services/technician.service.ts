import type { SurveyStatus } from "@prisma/client";
import { prisma } from "../models/prisma.js";
import { findTechnicianById, listTechnicians, setTechnicianAvailability } from "../models/technician.model.js";
import { surveyListInclude } from "../models/survey.model.js";
import { ApiError } from "../utils/api-error.js";
import type { UserRole } from "../models/roles.js";
import { recordActivity } from "./activity-log.service.js";

export interface TechnicianActor {
  userId: string;
  username: string;
  role: UserRole;
  technicianId?: string;
}

export interface SurveyStatusCounts {
  NEW: number;
  IN_PROGRESS: number;
  COMPLETED: number;
  RETURNED: number;
  REJECTED: number;
  TOTAL: number;
  AWAITING_REVIEW: number;
  APPROVED: number;
}

const EMPTY_COUNTS: SurveyStatusCounts = {
  NEW: 0,
  IN_PROGRESS: 0,
  COMPLETED: 0,
  RETURNED: 0,
  REJECTED: 0,
  TOTAL: 0,
  AWAITING_REVIEW: 0,
  APPROVED: 0,
};

export async function getStatusCounts(technicianId?: string): Promise<SurveyStatusCounts> {
  const where = technicianId === undefined ? {} : { technicianId };

  const [grouped, awaitingReview] = await Promise.all([
    prisma.survey.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.survey.count({ where: { ...where, status: "COMPLETED", completedAt: null } }),
  ]);

  const counts: SurveyStatusCounts = { ...EMPTY_COUNTS };

  for (const row of grouped) {
    counts[row.status as SurveyStatus] = row._count._all;
    counts.TOTAL += row._count._all;
  }

  counts.AWAITING_REVIEW = awaitingReview;
  counts.APPROVED = counts.COMPLETED - awaitingReview;

  return counts;
}

export function getTechnicians() {
  return listTechnicians();
}

export async function getTechniciansWithWorkload() {
  const technicians = await listTechnicians();

  if (technicians.length === 0) {
    return [];
  }

  const grouped = await prisma.survey.groupBy({
    by: ["technicianId", "status"],
    where: { technicianId: { in: technicians.map((technician) => technician.id) } },
    _count: { _all: true },
  });

  return technicians.map((technician) => {
    const counts: SurveyStatusCounts = { ...EMPTY_COUNTS };

    for (const row of grouped) {
      if (row.technicianId !== technician.id) {
        continue;
      }

      counts[row.status as SurveyStatus] = row._count._all;
      counts.TOTAL += row._count._all;
    }

    return {
      id: technician.id,
      employeeCode: technician.employeeCode,
      zone: technician.zone,
      isAvailable: technician.isAvailable,
      isActive: technician.user.isActive,
      fullName: technician.user.fullName,
      username: technician.user.username,
      phoneNumber: technician.user.phoneNumber,
      counts,
    };
  });
}

export async function getTechnicianProfile(id: string) {
  const technician = await findTechnicianById(id);

  if (!technician) {
    throw ApiError.notFound("That technician does not exist");
  }

  return technician;
}

export async function getTechnicianDashboard(technicianId: string) {
  const technician = await getTechnicianProfile(technicianId);

  const [counts, recentSurveys, nextAssignment] = await Promise.all([
    getStatusCounts(technicianId),
    prisma.survey.findMany({
      where: { technicianId },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: surveyListInclude,
    }),
    prisma.surveyAssignment.findFirst({
      where: { technicianId, isActive: true, dueDate: { not: null } },
      orderBy: { dueDate: "asc" },
      include: { survey: { select: { id: true, surveyCode: true, status: true } } },
    }),
  ]);

  return {
    technician: {
      id: technician.id,
      employeeCode: technician.employeeCode,
      zone: technician.zone,
      isAvailable: technician.isAvailable,
      fullName: technician.user.fullName,
      username: technician.user.username,
      phoneNumber: technician.user.phoneNumber,
    },
    counts,
    recentSurveys,
    nextDueDate: nextAssignment?.dueDate ?? null,
    nextDueSurvey: nextAssignment?.survey ?? null,
  };
}

export async function getMyDashboard(actor: TechnicianActor) {
  if (!actor.technicianId) {
    throw ApiError.forbidden("This account is not linked to a technician profile");
  }

  return getTechnicianDashboard(actor.technicianId);
}

export async function setAvailability(id: string, isAvailable: boolean, actor: TechnicianActor) {
  const technician = await getTechnicianProfile(id);
  const updated = await setTechnicianAvailability(id, isAvailable);

  await recordActivity({
    action: "TECHNICIAN_AVAILABILITY_CHANGED",
    message: `${technician.user.fullName} (${technician.employeeCode}) marked ${isAvailable ? "available" : "unavailable"} by ${actor.username}`,
    userId: actor.userId,
    metadata: { technicianId: id, isAvailable },
  });

  return updated;
}