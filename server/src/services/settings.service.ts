import type { Prisma } from "@prisma/client";
import {
  SETTING_DEFINITIONS,
  SETTING_KEYS,
  defaultSystemSettings,
  settingDefinition,
  type SettingDefinition,
  type SettingKey,
  type SystemSettings,
} from "../config/settings.js";
import { prisma } from "../models/prisma.js";
import { ApiError } from "../utils/api-error.js";
import { logger } from "../utils/logger.js";
import { recordActivity } from "./activity-log.service.js";

/**
 * Settings sit on the hot path of every form load and every submit, so they are cached briefly.
 * The window is short enough that a change made on one instance reaches the others quickly, and
 * `updateSystemSettings` refreshes the local cache the moment a value is written.
 */
const CACHE_TTL_MS = 30_000;

let cache: { value: SystemSettings; expiresAt: number } | null = null;

export function invalidateSystemSettings(): void {
  cache = null;
}

function isWithinBounds(definition: SettingDefinition, value: number): boolean {
  return Number.isInteger(value) && value >= definition.min && value <= definition.max;
}

/**
 * Reads a stored value defensively. A row that was hand-edited, written by an older build or left
 * half-written must not take the field app down: the deployment default is a safe answer, and the
 * warning is the signal that something needs attention.
 */
function readStoredValue(key: SettingKey, raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return null;
  }

  const rounded = Math.round(raw);

  return isWithinBounds(SETTING_DEFINITIONS[key], rounded) ? rounded : null;
}

/**
 * The effective configuration: deployment defaults with whatever an administrator has saved on
 * top. Never throws, because a settings outage must not become a survey outage.
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.value;
  }

  const settings = defaultSystemSettings();

  try {
    const rows = await prisma.systemSetting.findMany({ select: { key: true, value: true } });

    for (const row of rows) {
      if (settingDefinition(row.key) === null) {
        continue;
      }

      const key = row.key as SettingKey;
      const value = readStoredValue(key, row.value);

      if (value === null) {
        logger.warn({ key: row.key }, "ignoring an out-of-range system setting");
        continue;
      }

      settings[key] = value;
    }
  } catch (error) {
    // Retry on the next call rather than caching the failure.
    logger.error({ err: error }, "could not read system settings, using deployment defaults");

    return settings;
  }

  cache = { value: settings, expiresAt: Date.now() + CACHE_TTL_MS };

  return settings;
}

export interface StoredSetting {
  key: SettingKey;
  value: number;
  updatedAt: string;
  updatedBy: { id: string; fullName: string; username: string } | null;
}

/** Only the settings that differ from the deployment default, for the admin screen. */
export async function listStoredSettings(): Promise<StoredSetting[]> {
  const rows = await prisma.systemSetting.findMany({
    orderBy: { key: "asc" },
    include: { updatedBy: { select: { id: true, fullName: true, username: true } } },
  });

  const stored: StoredSetting[] = [];

  for (const row of rows) {
    if (settingDefinition(row.key) === null) {
      continue;
    }

    const key = row.key as SettingKey;
    const value = readStoredValue(key, row.value);

    if (value === null) {
      continue;
    }

    stored.push({
      key,
      value,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy,
    });
  }

  return stored;
}

export interface SettingsChange {
  key: SettingKey;
  label: string;
  from: number;
  to: number;
}

export interface UpdateSettingsResult {
  settings: SystemSettings;
  changed: SettingsChange[];
}

export async function updateSystemSettings(
  input: Partial<Record<SettingKey, number>>,
  actor: { userId: string; username: string },
): Promise<UpdateSettingsResult> {
  const current = await getSystemSettings();
  const changes: SettingsChange[] = [];

  // The route validates the body as well, but the service stays authoritative: it is the only
  // place that knows what each setting means and which values make sense.
  for (const key of SETTING_KEYS) {
    const next = input[key];

    if (next === undefined) {
      continue;
    }

    const definition = SETTING_DEFINITIONS[key];

    if (!isWithinBounds(definition, next)) {
      throw ApiError.unprocessable(
        `${definition.label} must be a whole number between ${definition.min} and ${definition.max}`,
        {
          code: "SETTING_OUT_OF_RANGE",
          details: [
            { path: `body.${key}`, message: `must be between ${definition.min} and ${definition.max}` },
          ],
        },
      );
    }

    if (next !== current[key]) {
      changes.push({ key, label: definition.label, from: current[key], to: next });
    }
  }

  if (changes.length === 0) {
    return { settings: current, changed: changes };
  }

  await prisma.$transaction(
    changes.map((change) =>
      prisma.systemSetting.upsert({
        where: { key: change.key },
        create: { key: change.key, value: change.to, updatedById: actor.userId },
        update: { value: change.to, updatedById: actor.userId },
      }),
    ),
  );

  const settings = { ...current };

  for (const change of changes) {
    settings[change.key] = change.to;
  }

  cache = { value: settings, expiresAt: Date.now() + CACHE_TTL_MS };

  await recordActivity({
    action: "SETTINGS_UPDATED",
    message: `System settings updated by ${actor.username}: ${changes
      .map((change) => `${change.label} ${change.from} -> ${change.to}`)
      .join(", ")}`,
    userId: actor.userId,
    metadata: { changes } as unknown as Prisma.InputJsonValue,
  });

  return { settings, changed: changes };
}