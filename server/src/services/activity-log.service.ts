import type { Prisma } from "@prisma/client";
import { prisma } from "../models/prisma.js";

export interface ActivityLogInput {
  action: string;
  message: string;
  userId?: string | null;
  surveyId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export async function recordActivity(input: ActivityLogInput): Promise<void> {
  await prisma.activityLog.create({
    data: {
      action: input.action,
      message: input.message,
      userId: input.userId ?? null,
      surveyId: input.surveyId ?? null,
      metadata: input.metadata ?? undefined,
    },
  });
}

export interface ActivityLogFilter {
  userId?: string;
  surveyId?: string;
  action?: string;
  search?: string;
  from?: Date;
  to?: Date;
}

export function listActivities(filter: ActivityLogFilter, options: { skip: number; take: number }) {
  return prisma.activityLog.findMany({
    where: {
      ...(filter.userId === undefined ? {} : { userId: filter.userId }),
      ...(filter.surveyId === undefined ? {} : { surveyId: filter.surveyId }),
      ...(filter.action === undefined ? {} : { action: filter.action }),
      ...(filter.from === undefined && filter.to === undefined
        ? {}
        : {
            createdAt: {
              ...(filter.from === undefined ? {} : { gte: filter.from }),
              ...(filter.to === undefined ? {} : { lte: filter.to }),
            },
          }),
      ...(filter.search === undefined
        ? {}
        : {
            OR: [
              { message: { contains: filter.search, mode: "insensitive" } },
              { action: { contains: filter.search, mode: "insensitive" } },
            ],
          }),
    },
    orderBy: { createdAt: "desc" },
    skip: options.skip,
    take: options.take,
    include: {
      user: { select: { id: true, fullName: true, username: true, role: true } },
      survey: { select: { id: true, surveyCode: true, status: true } },
    },
  });
}

export function countActivities(filter: ActivityLogFilter) {
  return prisma.activityLog.count({
    where: {
      ...(filter.userId === undefined ? {} : { userId: filter.userId }),
      ...(filter.surveyId === undefined ? {} : { surveyId: filter.surveyId }),
      ...(filter.action === undefined ? {} : { action: filter.action }),
      ...(filter.from === undefined && filter.to === undefined
        ? {}
        : {
            createdAt: {
              ...(filter.from === undefined ? {} : { gte: filter.from }),
              ...(filter.to === undefined ? {} : { lte: filter.to }),
            },
          }),
      ...(filter.search === undefined
        ? {}
        : {
            OR: [
              { message: { contains: filter.search, mode: "insensitive" } },
              { action: { contains: filter.search, mode: "insensitive" } },
            ],
          }),
    },
  });
}
