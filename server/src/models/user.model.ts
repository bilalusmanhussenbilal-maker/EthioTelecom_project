import { prisma } from "./prisma.js";
import type { UserRole } from "./roles.js";

/**
 * Every admin-facing user projection goes through this select. `passwordHash` is a scalar on
 * the model, so a bare findMany/findMany-with-include would ship the hash to the client.
 */
export const userAdminSelect = {
  id: true,
  username: true,
  fullName: true,
  role: true,
  phoneNumber: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  technician: true,
} as const;

/** Auth-only projection. Contains the hash, so it must never be returned from a route. */
export function findUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username },
    include: { technician: true },
  });
}

/** Auth-only projection. Contains the hash, so it must never be returned from a route. */
export function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { technician: true },
  });
}

export interface UserListFilter {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
}

export function buildUserWhere(filter: UserListFilter) {
  return {
    ...(filter.role === undefined ? {} : { role: filter.role }),
    ...(filter.isActive === undefined ? {} : { isActive: filter.isActive }),
    ...(filter.search === undefined
      ? {}
      : {
          OR: [
            { username: { contains: filter.search, mode: "insensitive" as const } },
            { fullName: { contains: filter.search, mode: "insensitive" as const } },
            { technician: { employeeCode: { contains: filter.search, mode: "insensitive" as const } } },
          ],
        }),
  };
}

export function listUsers() {
  return prisma.user.findMany({
    orderBy: { fullName: "asc" },
    select: userAdminSelect,
  });
}

export function listUsersFiltered(filter: UserListFilter) {
  return prisma.user.findMany({
    where: buildUserWhere(filter),
    orderBy: [{ role: "asc" }, { fullName: "asc" }],
    select: userAdminSelect,
  });
}

export function findUserForAdmin(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: userAdminSelect,
  });
}

export interface UpdateUserInput {
  fullName?: string;
  phoneNumber?: string | null;
  zone?: string | null;
  isAvailable?: boolean;
}

export function updateUser(id: string, input: UpdateUserInput) {
  return prisma.user.update({
    where: { id },
    data: {
      ...(input.fullName === undefined ? {} : { fullName: input.fullName }),
      ...(input.phoneNumber === undefined ? {} : { phoneNumber: input.phoneNumber }),
      ...(input.zone === undefined && input.isAvailable === undefined
        ? {}
        : {
            technician: {
              update: {
                ...(input.zone === undefined ? {} : { zone: input.zone }),
                ...(input.isAvailable === undefined ? {} : { isAvailable: input.isAvailable }),
              },
            },
          }),
    },
    select: userAdminSelect,
  });
}

export function setUserActive(id: string, isActive: boolean) {
  return prisma.user.update({
    where: { id },
    data: { isActive },
    select: userAdminSelect,
  });
}

/** Changing the password ends every session that was opened with the old one. */
export function updateUserPassword(id: string, passwordHash: string) {
  return prisma.user.update({
    where: { id },
    data: { passwordHash, tokenVersion: { increment: 1 } },
    select: { id: true, username: true },
  });
}

/** Moves the account to the next session generation, invalidating the tokens issued so far. */
export function revokeUserSessions(id: string) {
  return prisma.user.update({
    where: { id },
    data: { tokenVersion: { increment: 1 } },
    select: { id: true, username: true },
  });
}