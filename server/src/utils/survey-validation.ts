import { z } from "zod";

const networkTargetSchema = {
  newBoxId: z.string().min(1).nullable().optional(),
  newPortId: z.string().min(1).nullable().optional(),
  newLineId: z.string().min(1).nullable().optional(),
  requiredCapacity: z.coerce.number().int().min(0).max(10_000).nullable().optional(),
};

export const fieldDataSchema = z.object({
  ...networkTargetSchema,
  boxStatus: z.enum(["ACTIVE", "FAULTY", "INACTIVE"]).nullable().optional(),
  portStatus: z.enum(["AVAILABLE", "OCCUPIED", "FAULTY"]).nullable().optional(),
  lineStatus: z.enum(["ACTIVE", "FAULTY", "INACTIVE"]).nullable().optional(),
  availableCapacity: z.coerce.number().int().min(0).max(100_000).nullable().optional(),
  technicianRemark: z.string().trim().max(2000).nullable().optional(),
});

export const submitSchema = fieldDataSchema.extend({
  gps: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().positive().max(100_000),
    capturedAt: z.coerce.date().optional(),
  }),
});

const mutationFields = {
  mutationId: z.uuid(),
  surveyId: z.string().min(1),
  baseVersion: z.number().int().min(1).max(2_147_483_647),
};

export const syncPushSchema = z.discriminatedUnion("action", [
  z.strictObject({ ...mutationFields, action: z.literal("SAVE"), data: fieldDataSchema.strict() }),
  z.strictObject({ ...mutationFields, action: z.literal("SUBMIT"), data: submitSchema.strict() }),
]);

export type SyncPushInput = z.output<typeof syncPushSchema>;
