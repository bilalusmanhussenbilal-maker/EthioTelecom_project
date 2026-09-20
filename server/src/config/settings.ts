import { z } from "zod";
import { env } from "./env.js";

/**
 * Administrator-editable runtime configuration.
 *
 * Every setting is declared exactly once, here: the API, the admin form and the server-side
 * readers all take the key, the bounds and the default from this table, so adding a setting is a
 * one-file change that immediately shows up in the admin UI.
 *
 * Defaults come from the environment. An operator can therefore still pin a value at deploy time,
 * and the database only holds the settings an administrator actually changed.
 */
export interface SettingDefinition {
  readonly group: string;
  readonly label: string;
  readonly description: string;
  readonly unit: string | null;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly defaultValue: number;
}

export const SETTING_DEFINITIONS = {
  gpsMaxAccuracyMeters: {
    group: "GPS verification",
    label: "Maximum accepted GPS accuracy",
    description:
      "A captured location is refused when its accuracy radius is larger than this. Raise it to accept coarser fixes between tall buildings, lower it to insist on a tighter fix.",
    unit: "m",
    min: 5,
    max: 10_000,
    step: 5,
    defaultValue: env.GPS_MAX_ACCURACY_METERS,
  },
  gpsServiceRadiusMeters: {
    group: "GPS verification",
    label: "Service area radius",
    description:
      "How far a captured location may sit from the service address and still count as on site. The survey record is flagged when it falls outside this radius.",
    unit: "m",
    min: 10,
    max: 100_000,
    step: 10,
    defaultValue: env.GPS_SERVICE_RADIUS_METERS,
  },
  surveyOpenedDedupeMinutes: {
    group: "Activity log",
    label: "Repeat open window",
    description:
      "A technician reopening the same survey inside this window counts as the same visit, so reloading a form does not flood the activity log. Set it to 0 to log every open.",
    unit: "min",
    min: 0,
    max: 1_440,
    step: 5,
    defaultValue: 30,
  },
} as const satisfies Record<string, SettingDefinition>;

export type SettingKey = keyof typeof SETTING_DEFINITIONS;

export type SystemSettings = { [Key in SettingKey]: number };

export const SETTING_KEYS = Object.keys(SETTING_DEFINITIONS) as SettingKey[];

export function defaultSystemSettings(): SystemSettings {
  const settings = {} as SystemSettings;

  for (const key of SETTING_KEYS) {
    settings[key] = SETTING_DEFINITIONS[key].defaultValue;
  }

  return settings;
}

/** Returns null for a key this build does not know, such as a row left by a newer release. */
export function settingDefinition(key: string): SettingDefinition | null {
  return Object.prototype.hasOwnProperty.call(SETTING_DEFINITIONS, key)
    ? SETTING_DEFINITIONS[key as SettingKey]
    : null;
}

function settingField(key: SettingKey) {
  const definition = SETTING_DEFINITIONS[key];

  return z.number().int().min(definition.min).max(definition.max).optional();
}

// The keys are listed a second time on purpose: `satisfies` turns a forgotten setting into a
// compile error rather than a field the admin form can display but never save.
const settingFields = {
  gpsMaxAccuracyMeters: settingField("gpsMaxAccuracyMeters"),
  gpsServiceRadiusMeters: settingField("gpsServiceRadiusMeters"),
  surveyOpenedDedupeMinutes: settingField("surveyOpenedDedupeMinutes"),
} satisfies Record<SettingKey, unknown>;

export const updateSettingsSchema = z
  .strictObject(settingFields)
  .refine((value) => Object.keys(value).length > 0, {
    message: "provide at least one setting to change",
  });

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;