import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { findSurveyById, listAssignedSurveyDetails } from "../models/survey.model.js";
import { inTransaction, prisma } from "../models/prisma.js";
import { ApiError } from "../utils/api-error.js";
import type { SyncPushInput } from "../utils/survey-validation.js";
import { buildNetworkOptions } from "./survey-sync-shared.js";
import {
  assertCanRead,
  buildSurveyDetail,
  buildSurveyFormData,
  saveFieldData,
  submitSurvey,
  type SurveyActor,
} from "./survey.service.js";

function requireTechnician(actor: SurveyActor): string {
  if (actor.role !== "TECHNICIAN" || !actor.technicianId) {
    throw ApiError.forbidden("Offline sync is only available to field technicians");
  }

  return actor.technicianId;
}

function hashMutation(input: SyncPushInput): string {
  const canonical = JSON.stringify({
    surveyId: input.surveyId,
    baseVersion: input.baseVersion,
    action: input.action,
    data: input.data,
  });

  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * Full snapshot of the technician's work so the field app can keep operating without a
 * connection. Reassignment removes a survey from `surveyIds`, which is how the client knows
 * to drop its local copy.
 */
export async function pullSyncData(actor: SurveyActor) {
  const technicianId = requireTechnician(actor);
  const surveys = await listAssignedSurveyDetails(technicianId);

  const [surveyPayloads, forms, networkOptions] = await Promise.all([
    Promise.all(surveys.map((survey) => buildSurveyDetail(survey))),
    Promise.all(surveys.map((survey) => buildSurveyFormData(survey))),
    buildNetworkOptions(),
  ]);

  return {
    syncedAt: new Date().toISOString(),
    technicianId,
    surveyIds: surveys.map((survey) => survey.id),
    surveys: surveyPayloads,
    forms,
    networkOptions,
  };
}

export interface SyncPushResult {
  mutationId: string;
  survey: Prisma.JsonValue;
}

/**
 * Applies a locally recorded mutation. The mutation id makes retries idempotent: the first
 * successful run stores its response in `sync_receipts`, and every later retry with the same
 * payload replays that response instead of writing again. A retry with a different payload is
 * rejected, because that means the client reused an id by mistake.
 *
 * `baseVersion` guards against the survey moving on while the technician was offline. A stale
 * base version returns a 409 `SYNC_CONFLICT` with the current version so the client can rebase.
 */
export async function pushSyncMutation(input: SyncPushInput, actor: SurveyActor): Promise<SyncPushResult> {
  const technicianId = requireTechnician(actor);
  const payloadHash = hashMutation(input);

  const survey = await inTransaction(async () => {
    const receipt = await prisma.syncReceipt.findUnique({
      where: { userId_mutationId: { userId: actor.userId, mutationId: input.mutationId } },
    });

    if (receipt) {
      if (receipt.payloadHash !== payloadHash) {
        throw ApiError.conflict("This sync mutation id was already used with a different payload", {
          code: "SYNC_MUTATION_REUSED",
          details: { mutationId: input.mutationId },
        });
      }

      return receipt.response;
    }

    const current = await findSurveyById(input.surveyId);

    if (!current) {
      throw ApiError.notFound("That survey does not exist");
    }

    assertCanRead(actor, current);

    if (current.technicianId !== technicianId) {
      throw ApiError.forbidden("You can only sync surveys assigned to you");
    }

    if (current.version !== input.baseVersion) {
      throw ApiError.conflict("This survey was updated on the server after it was cached", {
        code: "SYNC_CONFLICT",
        details: { currentVersion: current.version, baseVersion: input.baseVersion },
      });
    }

    if (input.action === "SAVE") {
      await saveFieldData(input.surveyId, input.data, actor);
    } else {
      await submitSurvey(input.surveyId, input.data, actor);
    }

    const detail = await buildSurveyDetail(
      (await findSurveyById(input.surveyId)) ?? current,
    );
    const response = JSON.parse(JSON.stringify(detail)) as Prisma.InputJsonValue;

    await prisma.syncReceipt.create({
      data: {
        userId: actor.userId,
        mutationId: input.mutationId,
        surveyId: input.surveyId,
        payloadHash,
        response,
      },
    });

    return response as unknown as Prisma.JsonValue;
  });

  return { mutationId: input.mutationId, survey };
}
