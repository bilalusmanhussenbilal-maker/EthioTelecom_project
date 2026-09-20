import {
  Box,
  CheckCircle2,
  ClipboardEdit,
  Eye,
  HardHat,
  History,
  KeyRound,
  LogIn,
  LogOut,
  MapPin,
  Network,
  Plug,
  RotateCcw,
  Route,
  Save,
  Send,
  Settings2,
  Trash2,
  UserCog,
  UserPlus,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * One place that knows how every activity action is written and coloured.
 *
 * The same actions are read by the survey timeline and by the administrator's activity log, and a
 * badge that means "approved" in one of them has to mean the same thing in the other.
 */

const NEUTRAL = "bg-muted text-muted-foreground";
const INFO = "bg-sky-500/15 text-sky-700 dark:text-sky-300";
const SUCCESS = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
const WARNING = "bg-amber-500/15 text-amber-700 dark:text-amber-300";
const DANGER = "bg-destructive/15 text-destructive";

const SURVEY_WORKFLOW = "Survey workflow";
const NETWORK_DATA = "Network data";
const ACCOUNTS = "Accounts and access";
const SYSTEM = "System";

/** Declaration order is the order the filter offers the actions in. */
const GROUP_ORDER = [SURVEY_WORKFLOW, NETWORK_DATA, ACCOUNTS, SYSTEM];

export interface ActivityPresentation {
  label: string;
  group: string;
  icon: LucideIcon;
  className: string;
}

const ACTIVITY_PRESENTATION: Record<string, ActivityPresentation> = {
  SURVEY_CREATED: { label: "Survey created", group: SURVEY_WORKFLOW, icon: ClipboardEdit, className: NEUTRAL },
  SURVEY_ASSIGNED: { label: "Assigned", group: SURVEY_WORKFLOW, icon: UserCog, className: NEUTRAL },
  SURVEY_OPENED: { label: "Survey opened", group: SURVEY_WORKFLOW, icon: Eye, className: NEUTRAL },
  SURVEY_SAVED: { label: "Survey saved", group: SURVEY_WORKFLOW, icon: Save, className: NEUTRAL },
  SURVEY_SUBMITTED: { label: "Submitted", group: SURVEY_WORKFLOW, icon: Send, className: INFO },
  SURVEY_APPROVED: { label: "Approved", group: SURVEY_WORKFLOW, icon: CheckCircle2, className: SUCCESS },
  SURVEY_REJECTED: { label: "Rejected", group: SURVEY_WORKFLOW, icon: XCircle, className: DANGER },
  SURVEY_RETURNED: { label: "Returned", group: SURVEY_WORKFLOW, icon: RotateCcw, className: WARNING },

  AREA_CREATED: { label: "Service area added", group: NETWORK_DATA, icon: MapPin, className: NEUTRAL },
  AREA_UPDATED: { label: "Service area changed", group: NETWORK_DATA, icon: MapPin, className: NEUTRAL },
  AREA_DELETED: { label: "Service area removed", group: NETWORK_DATA, icon: Trash2, className: DANGER },
  BOX_CREATED: { label: "Box added", group: NETWORK_DATA, icon: Box, className: NEUTRAL },
  BOX_UPDATED: { label: "Box changed", group: NETWORK_DATA, icon: Box, className: NEUTRAL },
  BOX_DELETED: { label: "Box removed", group: NETWORK_DATA, icon: Trash2, className: DANGER },
  PORT_CREATED: { label: "Port added", group: NETWORK_DATA, icon: Plug, className: NEUTRAL },
  PORT_UPDATED: { label: "Port changed", group: NETWORK_DATA, icon: Plug, className: NEUTRAL },
  PORT_DELETED: { label: "Port removed", group: NETWORK_DATA, icon: Trash2, className: DANGER },
  LINE_CREATED: { label: "Line added", group: NETWORK_DATA, icon: Route, className: NEUTRAL },
  LINE_UPDATED: { label: "Line changed", group: NETWORK_DATA, icon: Route, className: NEUTRAL },
  LINE_DELETED: { label: "Line removed", group: NETWORK_DATA, icon: Trash2, className: DANGER },
  SERVICE_CREATED: { label: "Service added", group: NETWORK_DATA, icon: Network, className: NEUTRAL },
  SERVICE_UPDATED: { label: "Service changed", group: NETWORK_DATA, icon: Network, className: NEUTRAL },
  SERVICE_DELETED: { label: "Service removed", group: NETWORK_DATA, icon: Trash2, className: DANGER },

  USER_CREATED: { label: "Account created", group: ACCOUNTS, icon: UserPlus, className: NEUTRAL },
  USER_UPDATED: { label: "Account updated", group: ACCOUNTS, icon: UserCog, className: NEUTRAL },
  USER_PASSWORD_RESET: { label: "Password reset", group: ACCOUNTS, icon: KeyRound, className: WARNING },
  USER_SIGNED_IN: { label: "Signed in", group: ACCOUNTS, icon: LogIn, className: NEUTRAL },
  USER_SIGNED_OUT: { label: "Signed out", group: ACCOUNTS, icon: LogOut, className: NEUTRAL },
  TECHNICIAN_AVAILABILITY_CHANGED: {
    label: "Availability changed",
    group: ACCOUNTS,
    icon: HardHat,
    className: NEUTRAL,
  },

  SETTINGS_UPDATED: { label: "Settings changed", group: SYSTEM, icon: Settings2, className: INFO },
};

const FALLBACK: ActivityPresentation = {
  label: "Activity",
  group: SYSTEM,
  icon: History,
  className: NEUTRAL,
};

/** "SURVEY_APPROVED" -> "Approved". An action this build does not know still reads as words. */
function humanize(action: string): string {
  const words = action.toLowerCase().split("_").filter(Boolean);
  const first = words[0];

  if (!first) {
    return action;
  }

  return [first.charAt(0).toUpperCase() + first.slice(1), ...words.slice(1)].join(" ");
}

export function activityPresentation(action: string): ActivityPresentation {
  const known = ACTIVITY_PRESENTATION[action];

  return known ?? { ...FALLBACK, label: humanize(action) };
}

export interface ActivityGroup {
  label: string;
  actions: Array<{ action: string; label: string }>;
}

/** The actions an administrator can filter by, grouped for the select on the activity log. */
export function activityGroups(): ActivityGroup[] {
  const groups = new Map<string, Array<{ action: string; label: string }>>();

  for (const [action, presentation] of Object.entries(ACTIVITY_PRESENTATION)) {
    const actions = groups.get(presentation.group) ?? [];
    actions.push({ action, label: presentation.label });
    groups.set(presentation.group, actions);
  }

  return GROUP_ORDER.filter((label) => groups.has(label)).map((label) => ({
    label,
    actions: groups.get(label) ?? [],
  }));
}