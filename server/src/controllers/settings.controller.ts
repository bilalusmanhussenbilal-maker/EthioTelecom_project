import type { RequestHandler } from "express";
import { SETTING_DEFINITIONS, SETTING_KEYS, updateSettingsSchema } from "../config/settings.js";
import { getAuthContext } from "../middleware/auth.js";
import {
  getSystemSettings,
  listStoredSettings,
  updateSystemSettings,
} from "../services/settings.service.js";
import { parseBody } from "../utils/validation.js";

// The field metadata is static, so it is built once. The admin screen renders its form straight
// from this list, which means a new setting needs no front-end change to appear.
const definitions = SETTING_KEYS.map((key) => ({ key, ...SETTING_DEFINITIONS[key] }));

/** Both handlers answer with the same body so the client can replace its state from either one. */
async function settingsResponse() {
  const [settings, stored] = await Promise.all([getSystemSettings(), listStoredSettings()]);

  return { settings, stored, definitions };
}

export const getSettingsHandler: RequestHandler = async (_req, res) => {
  res.status(200).json(await settingsResponse());
};

export const patchSettingsHandler: RequestHandler = async (req, res) => {
  const input = parseBody(updateSettingsSchema, req);
  const { changed } = await updateSystemSettings(input, getAuthContext(req));

  res.status(200).json({ ...(await settingsResponse()), changed });
};