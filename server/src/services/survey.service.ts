import { Prisma } from "@prisma/client";
import type {
  BoxStatus,
  ChangeType,
  LineStatus,
  PortStatus,
  SurveyStatus,
} from "@prisma/client";
import { env } from "../config/env.js";
import { findBoxById, findLineById } from "../models/network.model.js";
import {
  countSurveys,
  createAssignment,
  createSurvey,
  deactivateAssignments,
  findSurveyById,
  listSurveyActivity,
  listSurveys,
  nextSurveyCode,
  updateSurvey,
  upsertGpsRecord,
  type SurveyListFilter,
} from "../models/survey.model.js";
import { findTechnicianById } from "../models/technician.model.js";
import { inTransaction, prisma } from "../models/prisma.js";
import { ApiError } from "../utils/api-error.js";
import { distanceInMeters, roundMeters } from "../utils/geo.js";
import type { UserRole } from "../models/roles.js";
import type { Paginated } from "../utils/pagination.js";
import { paginate, toSkip } from "../utils/pagination.js";
import { recordActivity } from "./activity-log.service.js";
import {
  calculateAvailableCapacity,
  checkTechnicalFeasibility,
  type BoxSnapshot,
  type LineSnapshot,
  type PortSnapshot,
} from "./feasibility.service.js";

export interface SurveyActor {
  userId: string;
  username: string;
  role: UserRole;
  technicianId?: string;
}


export type ReviewState = "AWAITING_REVIEW" | "APPROVED" | "REJECTED" | "RETURNED" | "DRAFT";

const SURVEY_STATUSES: readonly SurveyStatus[] = [
  "NEW",
  "IN_PROGRESS",
  "COMPLETED",
  "RETURNED",
  "REJECTED",
];

export function isSurveyStatus(value: string): value is SurveyStatus {
  return (SURVEY_STATUSES as readonly string[]).includes(value);
}

export function reviewStateOf(survey: {
  status: SurveyStatus;
  submittedAt: Date | null;
  completedAt: Date | null;
}): ReviewState {
  if (survey.status === "REJECTED") {
    return "REJECTED";
  }

  if (survey.status === "RETURNED") {
    return "RETURNED";
  }

  if (survey.status === "COMPLETED") {
    return survey.completedAt === null ? "AWAITING_REVIEW" : "APPROVED";
  }

  return "DRAFT";
}

function isPrivileged(actor: SurveyActor): boolean {
  return actor.role === "SUPERVISOR" || actor.role === "ADMIN";
}

/**
 * Technicians only ever see surveys assigned to them. Supervisors and admins see everything.
 * This is enforced here, not in the UI.
 */
function scopeToActor(actor: SurveyActor, filter: SurveyListFilter): SurveyListFilter {
  if (isPrivileged(actor)) {
    return filter;
  }

  if (!actor.technicianId) {
    throw ApiError.forbidden("This account is not linked to a technician profile");
  }

  return { ...filter, technicianId: actor.technicianId };
}

export function assertCanRead(
  actor: SurveyActor,
  survey: { technicianId: string | null },
): void {
  if (isPrivileged(actor)) {
    return;
  }

  if (!actor.technicianId || survey.technicianId !== actor.technicianId) {
    throw ApiError.forbidden("You can only view surveys assigned to you");
  }
}

function assertCanEdit(
  actor: SurveyActor,
  survey: { technicianId: string | null; status: SurveyStatus },
): void {
  assertCanRead(actor, survey);

  if (isPrivileged(actor)) {
    return;
  }

  if (survey.status === "COMPLETED") {
    throw ApiError.conflict("This survey has already been submitted and cannot be edited");
  }
}

export async function listSurveysForActor(
  actor: SurveyActor,
  filter: SurveyListFilter,
  pagination: { page: number; pageSize: number },
): Promise<Paginated<Awaited<ReturnType<typeof listSurveys>>[number]>> {
  const scoped = scopeToActor(actor, filter);

  const [items, total] = await Promise.all([
    listSurveys(scoped, { skip: toSkip(pagination.page, pagination.pageSize), take: pagination.pageSize }),
    countSurveys(scoped),
  ]);

  return paginate(items, pagination.page, pagination.pageSize, total);
}

export type SurveyDetailRecord = NonNullable<Awaited<ReturnType<typeof findSurveyById>>>;

export async function buildSurveyDetail(survey: SurveyDetailRecord) {
  const feasibility = await computeFeasibility(
    survey.service.newNetwork
      ? {
          boxId: survey.service.newNetwork.boxId,
          portId: survey.service.newNetwork.portId,
          lineId: survey.service.newNetwork.lineId,
          requiredCapacity: survey.service.newNetwork.requiredCapacity,
        }
      : null,
  );

  return {
    ...survey,
    reviewState: reviewStateOf(survey),
    feasibility,
  };
}

export async function getSurveyDetail(id: string, actor: SurveyActor) {
  const survey = await findSurveyById(id);

  if (!survey) {
    throw ApiError.notFound("That survey does not exist");
  }

  assertCanRead(actor, survey);

  return buildSurveyDetail(survey);
}
type NewNetworkRecord = {
  boxId: string | null;
  portId: string | null;
  lineId: string | null;
  requiredCapacity: number;
} | null;

export function newNetworkRefFromDetail(record: NewNetworkRecord): NewNetworkRef | null {
  if (!record) {
    return null;
  }

  return {
    boxId: record.boxId,
    portId: record.portId,
    lineId: record.lineId,
    requiredCapacity: record.requiredCapacity,
  };
}

export interface FeasibilityPreview {
  status: "TECHNICALLY_FEASIBLE" | "NOT_FEASIBLE";
  feasible: boolean;
  reasons: Array<{ code: string; field: string; message: string }>;
  availableCapacity: number | null;
}

interface NewNetworkRef {
  boxId: string | null;
  portId: string | null;
  lineId: string | null;
  requiredCapacity: number;
}

async function loadFeasibilitySnapshots(newNetwork: NewNetworkRef | null): Promise<{
  box: BoxSnapshot | null;
  port: PortSnapshot | null;
  line: LineSnapshot | null;
}> {
  if (!newNetwork) {
    return { box: null, port: null, line: null };
  }

  const [box, line, port] = await Promise.all([
    newNetwork.boxId === null ? null : findBoxById(newNetwork.boxId),
    newNetwork.lineId === null ? null : findLineById(newNetwork.lineId),
    newNetwork.portId === null
      ? null
      : prisma.port.findUnique({ where: { id: newNetwork.portId } }),
  ]);

  return {
    box: box ? { id: box.id, code: box.code, status: box.status } : null,
    port: port ? { id: port.id, code: port.code, status: port.status, boxId: port.boxId } : null,
    line: line
      ? {
          id: line.id,
          code: line.code,
          status: line.status,
          capacity: line.capacity,
          usedCapacity: line.usedCapacity,
          path: line.hops.map((hop) => hop.nodeCode),
        }
      : null,
  };
}

export async function computeFeasibility(newNetwork: NewNetworkRef | null): Promise<FeasibilityPreview | null> {
  if (!newNetwork) {
    return null;
  }

  const snapshots = await loadFeasibilitySnapshots(newNetwork);

  const result = checkTechnicalFeasibility({
    targetBox: snapshots.box,
    targetPort: snapshots.port,
    targetLine: snapshots.line,
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



/**
 * Everything the survey form needs, already populated from the database.
 * The technician only confirms or corrects what the field actually shows.
 */
export async function getSurveyFormData(id: string, actor: SurveyActor) {
  const survey = await findSurveyById(id);

  if (!survey) {
    throw ApiError.notFound("That survey does not exist");
  }

  assertCanRead(actor, survey);

  return buildSurveyFormData(survey);
}

export async function buildSurveyFormData(survey: SurveyDetailRecord) {
  const newNetworkRef = newNetworkRefFromDetail(survey.service.newNetwork);
  const [feasibility, availablePorts, candidateLines] = await Promise.all([
    computeFeasibility(newNetworkRef),
    newNetworkRef?.boxId
      ? prisma.port.findMany({
          where: { boxId: newNetworkRef.boxId, status: "AVAILABLE" },
          orderBy: { code: "asc" },
        })
      : Promise.resolve([]),
    newNetworkRef?.boxId
      ? (async () => {
          const box = await findBoxById(newNetworkRef.boxId as string);

          if (!box) {
            return [];
          }

          return prisma.line.findMany({
            where: { hops: { some: { boxId: box.id } }, status: "ACTIVE" },
            orderBy: { code: "asc" },
            include: { hops: { orderBy: { sequence: "asc" }, select: { nodeCode: true } } },
          });
        })()
      : Promise.resolve([]),
  ]);

  return {
    survey: {
      id: survey.id,
      version: survey.version,
      surveyCode: survey.surveyCode,
      status: survey.status,
      reviewState: reviewStateOf(survey),
      technicianRemark: survey.technicianRemark,
      submittedAt: survey.submittedAt,
      completedAt: survey.completedAt,
      reviewedAt: survey.reviewedAt,
      reviewRemark: survey.reviewRemark,
    },
    service: survey.service,
    oldNetwork: survey.service.oldNetwork,
    newNetwork: survey.service.newNetwork,
    changeType: survey.service.newNetwork?.changeType ?? null,
    requiredCapacity: survey.service.newNetwork?.requiredCapacity ?? null,
    fieldSurvey: {
      boxStatus: survey.boxStatus,
      portStatus: survey.portStatus,
      lineStatus: survey.lineStatus,
      availableCapacity: survey.availableCapacity,
      requiredCapacity: survey.requiredCapacity,
      technicianRemark: survey.technicianRemark,
    },
    gps: survey.gpsRecord,
    feasibility,
    availablePorts,
    candidateLines: candidateLines.map((line) => ({
      id: line.id,
      code: line.code,
      name: line.name,
      type: line.type,
      status: line.status,
      capacity: line.capacity,
      usedCapacity: line.usedCapacity,
      availableCapacity: calculateAvailableCapacity(line),
      path: line.hops.map((hop) => hop.nodeCode),
    })),
  };
}

export interface CreateSurveyInput {
  serviceId: string;
  technicianId?: string | null;
  dueDate?: Date | null;
  note?: string | null;
  changeType?: ChangeType;
  newBoxId?: string | null;
  newPortId?: string | null;
  newLineId?: string | null;
  requiredCapacity?: number | null;
}

async function applyNewNetwork(
  serviceId: string,
  input: {
    newBoxId?: string | null;
    newPortId?: string | null;
    newLineId?: string | null;
    requiredCapacity?: number | null;
    changeType?: ChangeType;
  },
): Promise<void> {
  const touchesTarget =
    input.newBoxId !== undefined ||
    input.newPortId !== undefined ||
    input.newLineId !== undefined ||
    input.requiredCapacity !== undefined ||
    input.changeType !== undefined;

  if (!touchesTarget) {
    return;
  }

  const data = {
    ...(input.newBoxId === undefined ? {} : { boxId: input.newBoxId }),
    ...(input.newPortId === undefined ? {} : { portId: input.newPortId }),
    ...(input.newLineId === undefined ? {} : { lineId: input.newLineId }),
    ...(input.requiredCapacity === undefined || input.requiredCapacity === null
      ? {}
      : { requiredCapacity: input.requiredCapacity }),
    ...(input.changeType === undefined ? {} : { changeType: input.changeType }),
  };

  const existing = await prisma.newNetwork.findUnique({ where: { serviceId } });
  const target = {
    boxId: existing?.boxId ?? null,
    portId: existing?.portId ?? null,
    lineId: existing?.lineId ?? null,
    requiredCapacity: existing?.requiredCapacity ?? 0,
    changeType: existing?.changeType ?? "NEW_CONNECTION",
    ...data,
  };
  const [box, port, line] = await Promise.all([
    target.boxId ? findBoxById(target.boxId) : null,
    target.portId ? prisma.port.findUnique({ where: { id: target.portId } }) : null,
    target.lineId ? findLineById(target.lineId) : null,
  ]);
  if ((target.boxId && !box) || (target.portId && !port) || (target.lineId && !line)) {
    throw ApiError.unprocessable("The selected network record does not exist", { code: "INVALID_NETWORK_TARGET" });
  }
  if (port && port.boxId !== target.boxId) {
    throw ApiError.unprocessable("The selected port does not belong to the selected box", { code: "PORT_BOX_MISMATCH" });
  }
  if (port && port.id !== existing?.portId && port.status !== "AVAILABLE") {
    throw ApiError.unprocessable("The selected port is not available", { code: "PORT_UNAVAILABLE" });
  }
  if (box && line && !line.hops.some((hop) => hop.boxId === box.id || hop.nodeCode === box.code)) {
    throw ApiError.unprocessable("The selected line does not reach the selected box", { code: "LINE_BOX_MISMATCH" });
  }
  if (existing && Object.entries(target).every(([key, value]) => existing[key as keyof typeof target] === value)) {
    return;
  }
  await prisma.survey.updateMany({ where: { serviceId }, data: { version: { increment: 1 } } });
  await prisma.newNetwork.upsert({
    where: { serviceId },
    create: {
      serviceId,
      boxId: input.newBoxId ?? null,
      portId: input.newPortId ?? null,
      lineId: input.newLineId ?? null,
      requiredCapacity: input.requiredCapacity ?? 0,
      ...(input.changeType === undefined ? {} : { changeType: input.changeType }),
    },
    update: data,
  });
}

/**
 * Surveys are raised by a supervisor or admin, never by the technician - the technician
 * receives work. An optional technicianId assigns the survey in the same call.
 */
export function createSurveyForActor(input: CreateSurveyInput, actor: SurveyActor) {
  return inTransaction(() => createSurveyInTransaction(input, actor));
}

async function createSurveyInTransaction(input: CreateSurveyInput, actor: SurveyActor) {
  if (!isPrivileged(actor)) {
    throw ApiError.forbidden("Only a supervisor or administrator can create a survey");
  }

  const service = await prisma.service.findUnique({
    where: { id: input.serviceId },
    select: { id: true, serviceCode: true, customerName: true },
  });

  if (!service) {
    throw ApiError.notFound("That service does not exist");
  }

  if (input.technicianId) {
    const technician = await findTechnicianById(input.technicianId);

    if (!technician || !technician.user.isActive) {
      throw ApiError.badRequest("That technician does not exist or is not active");
    }
  }

  const survey = await createWithGeneratedCode({
    serviceId: service.id,
    status: "NEW",
    technicianId: input.technicianId ?? null,
    createdById: actor.userId,
  });

  await applyNewNetwork(service.id, input);

  if (input.technicianId) {
    await createAssignment({
      surveyId: survey.id,
      technicianId: input.technicianId,
      assignedById: actor.userId,
      ...(input.dueDate === undefined || input.dueDate === null
        ? {}
        : { dueDate: new Date(input.dueDate) }),
      ...(input.note === undefined || input.note === null ? {} : { note: input.note }),
    });
  }

  await recordActivity({
    action: "SURVEY_CREATED",
    message: `Survey ${survey.surveyCode} created for service ${service.serviceCode}`,
    userId: actor.userId,
    surveyId: survey.id,
    metadata: { serviceCode: service.serviceCode, technicianId: input.technicianId ?? null },
  });

  const detail = await findSurveyById(survey.id);

  return detail ?? survey;
}

async function createWithGeneratedCode(
  data: Omit<Prisma.SurveyUncheckedCreateInput, "surveyCode">,
  attempt = 0,
): Promise<Awaited<ReturnType<typeof createSurvey>>> {
  const surveyCode = await nextSurveyCode();

  try {
    return await createSurvey({ ...data, surveyCode });
  } catch (error) {
    const isUniqueViolation =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2002";

    if (isUniqueViolation && attempt < 3) {
      return createWithGeneratedCode(data, attempt + 1);
    }

    throw error;
  }
}

export interface AssignSurveyInput {
  technicianId: string;
  dueDate?: Date | null;
  note?: string | null;
}

export function assignSurvey(id: string, input: AssignSurveyInput, actor: SurveyActor) {
  return inTransaction(() => assignSurveyInTransaction(id, input, actor));
}

async function assignSurveyInTransaction(id: string, input: AssignSurveyInput, actor: SurveyActor) {
  if (!isPrivileged(actor)) {
    throw ApiError.forbidden("Only a supervisor or administrator can assign surveys");
  }

  const survey = await findSurveyById(id);

  if (!survey) {
    throw ApiError.notFound("That survey does not exist");
  }

  const technician = await findTechnicianById(input.technicianId);

  if (!technician || !technician.user.isActive) {
    throw ApiError.badRequest("That technician does not exist or is not active");
  }

  await deactivateAssignments(survey.id);
  await createAssignment({
    surveyId: survey.id,
    technicianId: technician.id,
    assignedById: actor.userId,
    ...(input.dueDate === undefined || input.dueDate === null
      ? {}
      : { dueDate: new Date(input.dueDate) }),
    ...(input.note === undefined || input.note === null ? {} : { note: input.note }),
  });

  const updated = await updateSurvey(survey.id, { technicianId: technician.id });

  await recordActivity({
    action: "SURVEY_ASSIGNED",
    message: `Survey ${survey.surveyCode} assigned to ${technician.user.fullName} (${technician.employeeCode})`,
    userId: actor.userId,
    surveyId: survey.id,
    metadata: { technicianId: technician.id, employeeCode: technician.employeeCode },
  });

  return updated;
}

export interface FieldDataInput {
  newBoxId?: string | null;
  newPortId?: string | null;
  newLineId?: string | null;
  requiredCapacity?: number | null;
  boxStatus?: BoxStatus | null;
  portStatus?: PortStatus | null;
  lineStatus?: LineStatus | null;
  availableCapacity?: number | null;
  technicianRemark?: string | null;
}

export function saveFieldData(id: string, input: FieldDataInput, actor: SurveyActor) {
  return inTransaction(() => saveFieldDataInTransaction(id, input, actor));
}

async function saveFieldDataInTransaction(id: string, input: FieldDataInput, actor: SurveyActor) {
  const survey = await findSurveyById(id);

  if (!survey) {
    throw ApiError.notFound("That survey does not exist");
  }

  assertCanEdit(actor, survey);

  await applyNewNetwork(survey.serviceId, input);

  const data: Prisma.SurveyUncheckedUpdateInput = {
    ...(input.boxStatus === undefined ? {} : { boxStatus: input.boxStatus }),
    ...(input.portStatus === undefined ? {} : { portStatus: input.portStatus }),
    ...(input.lineStatus === undefined ? {} : { lineStatus: input.lineStatus }),
    ...(input.availableCapacity === undefined ? {} : { availableCapacity: input.availableCapacity }),
    ...(input.requiredCapacity === undefined ? {} : { requiredCapacity: input.requiredCapacity }),
    ...(input.technicianRemark === undefined ? {} : { technicianRemark: input.technicianRemark }),
    ...(survey.status === "NEW" || survey.status === "RETURNED" ? { status: "IN_PROGRESS" } : {}),
  };

  await recordActivity({
    action: "SURVEY_SAVED",
    message: `Survey ${survey.surveyCode} saved by ${actor.username}`,
    userId: actor.userId,
    surveyId: id,
  });
  const updated = await updateSurvey(id, data);

  const feasibility = await computeFeasibility(
    updated.service.newNetwork
      ? {
          boxId: updated.service.newNetwork.boxId,
          portId: updated.service.newNetwork.portId,
          lineId: updated.service.newNetwork.lineId,
          requiredCapacity: updated.service.newNetwork.requiredCapacity,
        }
      : null,
  );

  // Backfill the observed capacity from the network record so the technician does not retype
  // something the database already knows, unless they explicitly overrode it.
  if (input.availableCapacity === undefined && feasibility?.availableCapacity !== null && feasibility !== null) {
    const synced = await updateSurvey(id, { availableCapacity: feasibility.availableCapacity });

    return { survey: synced, feasibility };
  }

  return { survey: updated, feasibility };
}

export interface GpsInput {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt?: Date | null;
}

export interface SubmitSurveyInput {
  gps: GpsInput;
  boxStatus?: BoxStatus | null;
  portStatus?: PortStatus | null;
  lineStatus?: LineStatus | null;
  availableCapacity?: number | null;
  technicianRemark?: string | null;
  newBoxId?: string | null;
  newPortId?: string | null;
  newLineId?: string | null;
  requiredCapacity?: number | null;
}

/**
 * Submission is the field technician's sign-off. GPS is mandatory (AGENTS.md #12), the
 * technical feasibility from #10 is computed with the authoritative backend engine, and the
 * technician's own observations are frozen onto the record.
 */
export function submitSurvey(id: string, input: SubmitSurveyInput, actor: SurveyActor) {
  return inTransaction(() => submitSurveyInTransaction(id, input, actor));
}

async function submitSurveyInTransaction(id: string, input: SubmitSurveyInput, actor: SurveyActor) {
  const survey = await findSurveyById(id);

  if (!survey) {
    throw ApiError.notFound("That survey does not exist");
  }

  assertCanEdit(actor, survey);

  if (input.gps.accuracy > env.GPS_MAX_ACCURACY_METERS) {
    throw ApiError.unprocessable(
      `GPS accuracy is ${Math.round(input.gps.accuracy)}m, which is weaker than the required ${env.GPS_MAX_ACCURACY_METERS}m. Move to an open area and capture the location again.`,
      { code: "GPS_ACCURACY_TOO_LOW", details: { maxAccuracyMeters: env.GPS_MAX_ACCURACY_METERS } },
    );
  }

  const touchingTarget =
    input.newBoxId !== undefined ||
    input.newPortId !== undefined ||
    input.newLineId !== undefined ||
    input.requiredCapacity !== undefined;

  if (touchingTarget) {
    await applyNewNetwork(survey.serviceId, input);
  }

  const refreshed = await findSurveyById(id);

  if (!refreshed) {
    throw ApiError.notFound("That survey does not exist");
  }

  const newNetwork = refreshed.service.newNetwork;
  const feasibility = await computeFeasibility(
    newNetwork
      ? {
          boxId: newNetwork.boxId,
          portId: newNetwork.portId,
          lineId: newNetwork.lineId,
          requiredCapacity: newNetwork.requiredCapacity,
        }
      : null,
  );

  const boxStatus = input.boxStatus ?? refreshed.boxStatus;
  const portStatus = input.portStatus ?? refreshed.portStatus;

  if (newNetwork?.boxId && boxStatus === null) {
    throw ApiError.unprocessable("Record the field condition of the box before submitting", {
      code: "BOX_STATUS_REQUIRED",
      details: [{ path: "body.boxStatus", message: "is required for this survey" }],
    });
  }

  if (newNetwork?.portId && portStatus === null) {
    throw ApiError.unprocessable("Record the field condition of the port before submitting", {
      code: "PORT_STATUS_REQUIRED",
      details: [{ path: "body.portStatus", message: "is required for this survey" }],
    });
  }

  const technicianRemark = input.technicianRemark ?? refreshed.technicianRemark;

  if (feasibility !== null && !feasibility.feasible && !technicianRemark) {
    throw ApiError.unprocessable(
      "This survey is not technically feasible, so a technician remark explaining why is required",
      {
        code: "REMARK_REQUIRED",
        details: (feasibility.reasons.length > 0 ? feasibility.reasons : []).map((reason) => ({
          path: "body.technicianRemark",
          message: reason.message,
        })),
      },
    );
  }

  const capturedAt = input.gps.capturedAt ?? new Date();
  const submittedAt = new Date();

  let distanceFromServiceMeters: number | null = null;
  let isWithinServiceArea: boolean | null = null;

  if (refreshed.service.latitude !== null && refreshed.service.longitude !== null) {
    const distance = distanceInMeters(
      { latitude: input.gps.latitude, longitude: input.gps.longitude },
      { latitude: refreshed.service.latitude, longitude: refreshed.service.longitude },
    );

    distanceFromServiceMeters = roundMeters(distance);
    isWithinServiceArea = distance <= env.GPS_SERVICE_RADIUS_METERS;
  }

  await upsertGpsRecord({
    surveyId: id,
    latitude: input.gps.latitude,
    longitude: input.gps.longitude,
    accuracy: input.gps.accuracy,
    capturedAt,
    distanceFromServiceMeters,
    isWithinServiceArea,
  });

  const updated = await updateSurvey(id, {
    status: "COMPLETED",
    submittedAt,
    boxStatus: boxStatus ?? null,
    portStatus: portStatus ?? null,
    lineStatus: input.lineStatus ?? refreshed.lineStatus ?? null,
    availableCapacity: feasibility?.availableCapacity ?? input.availableCapacity ?? null,
    requiredCapacity: newNetwork?.requiredCapacity ?? null,
    feasibilityStatus: feasibility?.status ?? null,
    feasibilityReasons: feasibility ? (feasibility.reasons as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
    technicianRemark: technicianRemark ?? null,
  });

  await recordActivity({
    action: "SURVEY_SUBMITTED",
    message: `Survey ${refreshed.surveyCode} submitted by ${actor.username} (${feasibility?.status ?? "NO_TARGET_NETWORK"})`,
    userId: actor.userId,
    surveyId: id,
    metadata: {
      latitude: input.gps.latitude,
      longitude: input.gps.longitude,
      accuracy: input.gps.accuracy,
      distanceFromServiceMeters,
      isWithinServiceArea,
      feasibilityStatus: feasibility?.status ?? null,
    },
  });

  return {
    ...updated,
    reviewState: reviewStateOf(updated),
    feasibility,
    gps: {
      latitude: input.gps.latitude,
      longitude: input.gps.longitude,
      accuracy: input.gps.accuracy,
      capturedAt,
      distanceFromServiceMeters,
      isWithinServiceArea,
    },
  };
}

export interface ReviewInput {
  decision: "APPROVE" | "REJECT" | "RETURN";
  remark?: string | null;
}

export function reviewSurvey(id: string, input: ReviewInput, actor: SurveyActor) {
  return inTransaction(() => reviewSurveyInTransaction(id, input, actor));
}

async function reviewSurveyInTransaction(id: string, input: ReviewInput, actor: SurveyActor) {
  if (!isPrivileged(actor)) {
    throw ApiError.forbidden("Only a supervisor or administrator can review a survey");
  }

  const survey = await findSurveyById(id);

  if (!survey) {
    throw ApiError.notFound("That survey does not exist");
  }

  if (survey.status !== "COMPLETED") {
    throw ApiError.conflict(
      `Survey ${survey.surveyCode} is ${survey.status} and can only be reviewed once it has been submitted`,
    );
  }

  if ((input.decision === "REJECT" || input.decision === "RETURN") && !input.remark) {
    throw ApiError.unprocessable(`A remark is required when you ${input.decision.toLowerCase()} a survey`, {
      code: "REMARK_REQUIRED",
      details: [{ path: "body.remark", message: `is required to ${input.decision.toLowerCase()} this survey` }],
    });
  }

  const reviewedAt = new Date();

  const data: Prisma.SurveyUncheckedUpdateInput =
    input.decision === "APPROVE"
      ? {
          completedAt: reviewedAt,
          reviewedById: actor.userId,
          reviewedAt,
          reviewRemark: input.remark ?? null,
        }
      : {
          status: input.decision === "REJECT" ? "REJECTED" : "RETURNED",
          reviewedById: actor.userId,
          reviewedAt,
          reviewRemark: input.remark ?? null,
        };

  const updated = await updateSurvey(id, data);

  const actionByDecision: Record<ReviewInput["decision"], string> = {
    APPROVE: "SURVEY_APPROVED",
    REJECT: "SURVEY_REJECTED",
    RETURN: "SURVEY_RETURNED",
  };

  const verb = input.decision === "APPROVE" ? "approved" : input.decision === "REJECT" ? "rejected" : "returned";

  await recordActivity({
    action: actionByDecision[input.decision],
    message: `Survey ${survey.surveyCode} ${verb} by ${actor.username}${input.remark ? `: ${input.remark}` : ""}`,
    userId: actor.userId,
    surveyId: id,
    ...(input.remark ? { metadata: { remark: input.remark } } : {}),
  });

  return { ...updated, reviewState: reviewStateOf(updated) };
}

export async function getSurveyTimeline(id: string, actor: SurveyActor) {
  const survey = await findSurveyById(id);

  if (!survey) {
    throw ApiError.notFound("That survey does not exist");
  }

  assertCanRead(actor, survey);

  return listSurveyActivity(id);
}
