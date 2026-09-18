import type { RequestHandler } from "express";
import { getAuthContext } from "../middleware/auth.js";
import { pullSyncData, pushSyncMutation } from "../services/sync.service.js";
import { syncPushSchema } from "../utils/survey-validation.js";
import { parseBody } from "../utils/validation.js";

export const getSyncPullHandler: RequestHandler = async (req, res) => {
  res.status(200).json(await pullSyncData(getAuthContext(req)));
};

export const postSyncPushHandler: RequestHandler = async (req, res) => {
  const body = parseBody(syncPushSchema, req);
  const result = await pushSyncMutation(body, getAuthContext(req));

  res.status(200).json(result);
};
