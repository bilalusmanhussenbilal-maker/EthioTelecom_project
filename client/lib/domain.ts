import type {
  BoxStatus,
  ChangeType,
  FeasibilityStatus,
  LineStatus,
  PortStatus,
  ReviewState,
  ServiceType,
  SurveyStatus,
  UserRole,
} from "@/lib/api/types";

export type Tone = "neutral" | "info" | "progress" | "success" | "warning" | "danger";

export const SURVEY_STATUS_LABELS: Record<SurveyStatus, string> = {
  NEW: "New",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  RETURNED: "Returned",
  REJECTED: "Rejected",
};

export const SURVEY_STATUS_TONES: Record<SurveyStatus, Tone> = {
  NEW: "info",
  IN_PROGRESS: "progress",
  COMPLETED: "success",
  RETURNED: "warning",
  REJECTED: "danger",
};

export const REVIEW_STATE_LABELS: Record<ReviewState, string> = {
  DRAFT: "Draft",
  AWAITING_REVIEW: "Awaiting review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RETURNED: "Returned",
};

export const REVIEW_STATE_TONES: Record<ReviewState, Tone> = {
  DRAFT: "neutral",
  AWAITING_REVIEW: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  RETURNED: "warning",
};

export const FEASIBILITY_LABELS: Record<FeasibilityStatus, string> = {
  TECHNICALLY_FEASIBLE: "Technically feasible",
  NOT_FEASIBLE: "Not feasible",
};

export const FEASIBILITY_TONES: Record<FeasibilityStatus, Tone> = {
  TECHNICALLY_FEASIBLE: "success",
  NOT_FEASIBLE: "danger",
};

export const BOX_STATUS_LABELS: Record<BoxStatus, string> = {
  ACTIVE: "Active",
  FAULTY: "Faulty",
  INACTIVE: "Inactive",
};

export const BOX_STATUS_TONES: Record<BoxStatus, Tone> = {
  ACTIVE: "success",
  FAULTY: "danger",
  INACTIVE: "neutral",
};

export const PORT_STATUS_LABELS: Record<PortStatus, string> = {
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
  FAULTY: "Faulty",
};

export const PORT_STATUS_TONES: Record<PortStatus, Tone> = {
  AVAILABLE: "success",
  OCCUPIED: "neutral",
  FAULTY: "danger",
};

export const LINE_STATUS_LABELS: Record<LineStatus, string> = {
  ACTIVE: "Active",
  FAULTY: "Faulty",
  INACTIVE: "Inactive",
};

export const LINE_STATUS_TONES: Record<LineStatus, Tone> = {
  ACTIVE: "success",
  FAULTY: "danger",
  INACTIVE: "neutral",
};

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  NEW_CONNECTION: "New connection",
  LINE_SHIFT: "Line shift",
  SERVICE_SURVEY: "Service survey",
  NETWORK_VERIFICATION: "Network verification",
};

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  NEW_CONNECTION: "New connection",
  LINE_SHIFT: "Line shift",
  VERIFICATION: "Verification",
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  TECHNICIAN: "Field technician",
  SUPERVISOR: "Supervisor",
  ADMIN: "Administrator",
};

export const HOME_FOR_ROLE: Record<UserRole, string> = {
  TECHNICIAN: "/dashboard",
  SUPERVISOR: "/dashboard",
  ADMIN: "/dashboard",
};

/** AGENTS.md #10 reason codes, phrased for the technician. */
export const FEASIBILITY_REASON_LABELS: Record<string, string> = {
  BOX_NOT_FOUND: "The selected box does not exist",
  BOX_NOT_ACTIVE: "The box is not active",
  PORT_NOT_FOUND: "The selected port does not exist",
  PORT_BOX_MISMATCH: "The port does not belong to the selected box",
  PORT_OCCUPIED: "The port is already occupied",
  PORT_FAULTY: "The port is faulty",
  LINE_NOT_FOUND: "The selected line does not exist",
  LINE_NOT_ACTIVE: "The line is not active",
  LINE_ROUTE_DISCONNECTED: "The line does not reach the selected box",
  LINE_CAPACITY_INSUFFICIENT: "Line capacity is insufficient",
};

export function labelOf<T extends string>(map: Record<T, string>, value: T | null | undefined): string {
  return value === null || value === undefined ? "-" : (map[value] ?? value);
}