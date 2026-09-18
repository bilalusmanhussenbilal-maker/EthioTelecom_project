import type { Prisma } from "@prisma/client";
import { findBoxById } from "../models/network.model.js";
import { surveyListInclude } from "../models/survey.model.js";
import { prisma } from "../models/prisma.js";
import { checkTechnicalFeasibility } from "./feasibility.service.js";
import { getFormOptions } from "./network.service.js";
import type { FeasibilityPreview } from "./survey.service.js";

export type SurveyListRow = Prisma.SurveyGetPayload<{ include: typeof surveyListInclude }>;

export type NetworkOptions = Awaited<ReturnType<typeof buildNetworkOptions>>;

export async function listAssignedSurveys(technicianId: string): Promise<SurveyListRow[]> {
  return prisma.survey.findMany({
    where: { technicianId },
    orderBy: { updatedAt: "desc" },
    include: surveyListInclude,
  });
}

export async function buildNetworkOptions() {
  return getFormOptions({});
}

export async function loadFeasibilityPreview(
  newNetwork: { boxId: string | null; portId: string | null; lineId: string | null; requiredCapacity: number } | null,
): Promise<FeasibilityPreview | null> {
  if (!newNetwork) {
    return null;
  }

  const [box, port, line] = await Promise.all([
    newNetwork.boxId ? findBoxById(newNetwork.boxId) : null,
    newNetwork.portId ? prisma.port.findUnique({ where: { id: newNetwork.portId } }) : null,
    newNetwork.lineId ? prisma.line.findUnique({ where: { id: newNetwork.lineId }, include: { hops: true } }) : null,
  ]);

  const result = checkTechnicalFeasibility({
    targetBox: box ? { id: box.id, code: box.code, status: box.status } : null,
    targetPort: port ? { id: port.id, code: port.code, status: port.status, boxId: port.boxId } : null,
    targetLine: line
      ? {
          id: line.id,
          code: line.code,
          status: line.status,
          capacity: line.capacity,
          usedCapacity: line.usedCapacity,
          path: line.hops.map((hop) => hop.nodeCode),
        }
      : null,
    requiredCapacity: newNetwork.requiredCapacity,
  });

  return {
    status: result.status,
    feasible: result.feasible,
    reasons: result.reasons.map((reason) => ({
      code: reason.code,
      field: reason.field,
      message: reason.message,
    })),
    availableCapacity: result.availableCapacity,
  };
}
