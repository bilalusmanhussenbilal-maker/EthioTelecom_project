export const USER_ROLES = ["TECHNICIAN", "SUPERVISOR", "ADMIN"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  TECHNICIAN: "Field Technician",
  SUPERVISOR: "Supervisor",
  ADMIN: "Administrator",
};
