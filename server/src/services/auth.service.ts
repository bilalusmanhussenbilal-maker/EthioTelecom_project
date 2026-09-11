import type { Technician, User } from "@prisma/client";
import { findUserById, findUserByUsername } from "../models/user.model.js";
import type { UserRole } from "../models/roles.js";
import { ApiError } from "../utils/api-error.js";
import { signAuthToken } from "../utils/jwt.js";
import { verifyPassword } from "../utils/password.js";
import { recordActivity } from "./activity-log.service.js";

type UserWithTechnician = User & { technician: Technician | null };

export interface AuthenticatedUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  phoneNumber: string | null;
  technicianId: string | null;
  employeeCode: string | null;
}

export interface LoginResult {
  token: string;
  user: AuthenticatedUser;
}

function toAuthenticatedUser(user: UserWithTechnician): AuthenticatedUser {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    phoneNumber: user.phoneNumber,
    technicianId: user.technician?.id ?? null,
    employeeCode: user.technician?.employeeCode ?? null,
  };
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const user = await findUserByUsername(username);

  if (!user || !user.isActive) {
    throw ApiError.unauthorized("Invalid username or password");
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);

  if (!passwordMatches) {
    throw ApiError.unauthorized("Invalid username or password");
  }

  const token = await signAuthToken({
    userId: user.id,
    username: user.username,
    role: user.role,
    ...(user.technician ? { technicianId: user.technician.id } : {}),
  });

  await recordActivity({
    action: "USER_SIGNED_IN",
    message: `${user.fullName} signed in`,
    userId: user.id,
  });

  return { token, user: toAuthenticatedUser(user) };
}

export async function getCurrentUser(userId: string): Promise<AuthenticatedUser> {
  const user = await findUserById(userId);

  if (!user || !user.isActive) {
    throw ApiError.unauthorized("This account is no longer active");
  }

  return toAuthenticatedUser(user);
}
