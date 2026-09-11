import { prisma } from "../models/prisma.js";
import {
  buildUserWhere,
  findUserById,
  findUserByUsername,
  findUserForAdmin,
  listUsersFiltered,
  setUserActive,
  updateUser,
  updateUserPassword,
  userAdminSelect,
  type UserListFilter,
} from "../models/user.model.js";
import type { UserRole } from "../models/roles.js";
import { ApiError } from "../utils/api-error.js";
import { hashPassword } from "../utils/password.js";
import { paginate, toSkip, type Paginated } from "../utils/pagination.js";
import { recordActivity } from "./activity-log.service.js";

export interface AdminActor {
  userId: string;
  username: string;
  role: UserRole;
}

function assertAdmin(actor: AdminActor): void {
  if (actor.role !== "ADMIN") {
    throw ApiError.forbidden("Only an administrator can manage users");
  }
}

export interface CreateUserRequest {
  username: string;
  fullName: string;
  password: string;
  role: UserRole;
  phoneNumber?: string | null;
  employeeCode?: string | null;
  zone?: string | null;
}

/**
 * Creates the login account, and - when the role is TECHNICIAN - the linked technician
 * profile in the same transaction so a half-created technician can never exist.
 */
export async function createUserForAdmin(input: CreateUserRequest, actor: AdminActor) {
  assertAdmin(actor);

  const existing = await findUserByUsername(input.username);

  if (existing) {
    throw ApiError.conflict(`Username "${input.username}" is already taken`, {
      code: "USERNAME_TAKEN",
      details: [{ path: "body.username", message: "is already taken" }],
    });
  }

  if (input.role === "TECHNICIAN" && !input.employeeCode) {
    throw ApiError.unprocessable("An employee code is required for a technician account", {
      code: "EMPLOYEE_CODE_REQUIRED",
      details: [{ path: "body.employeeCode", message: "is required for the technician role" }],
    });
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        username: input.username,
        fullName: input.fullName,
        passwordHash,
        role: input.role,
        phoneNumber: input.phoneNumber ?? null,
      },
    });

    if (input.role === "TECHNICIAN") {
      await tx.technician.create({
        data: {
          userId: created.id,
          employeeCode: input.employeeCode as string,
          zone: input.zone ?? null,
        },
      });
    }

    return tx.user.findUniqueOrThrow({ where: { id: created.id }, select: userAdminSelect });
  });

  await recordActivity({
    action: "USER_CREATED",
    message: `${actor.username} created ${input.role} account ${user.username}`,
    userId: actor.userId,
    metadata: { createdUserId: user.id, role: user.role },
  });

  return user;
}

export async function listUsersForAdmin(
  actor: AdminActor,
  filter: UserListFilter,
  pagination: { page: number; pageSize: number },
): Promise<Paginated<Awaited<ReturnType<typeof listUsersFiltered>>[number]>> {
  assertAdmin(actor);

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where: buildUserWhere(filter),
      orderBy: [{ role: "asc" }, { fullName: "asc" }],
      skip: toSkip(pagination.page, pagination.pageSize),
      take: pagination.pageSize,
      select: { ...userAdminSelect, _count: { select: { activityLogs: true } } },
    }),
    prisma.user.count({ where: buildUserWhere(filter) }),
  ]);

  return paginate(items, pagination.page, pagination.pageSize, total);
}

export async function getUserForAdmin(id: string, actor: AdminActor) {
  assertAdmin(actor);

  const user = await findUserForAdmin(id);

  if (!user) {
    throw ApiError.notFound("That user does not exist");
  }

  const recentActivity = await prisma.activityLog.findMany({
    where: { userId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { survey: { select: { id: true, surveyCode: true, status: true } } },
  });

  return { user, recentActivity };
}

export interface UpdateUserRequest {
  fullName?: string;
  phoneNumber?: string | null;
  zone?: string | null;
  isAvailable?: boolean;
}

export async function updateUserForAdmin(id: string, input: UpdateUserRequest, actor: AdminActor) {
  assertAdmin(actor);

  const user = await findUserById(id);

  if (!user) {
    throw ApiError.notFound("That user does not exist");
  }

  if (
    (input.zone !== undefined || input.isAvailable !== undefined) &&
    !user.technician
  ) {
    throw ApiError.badRequest("That account is not a technician, so it has no technician profile to update");
  }

  const updated = await updateUser(id, input);

  await recordActivity({
    action: "USER_UPDATED",
    message: `${actor.username} updated account ${user.username}`,
    userId: actor.userId,
    metadata: { targetUserId: id, fields: Object.keys(input) },
  });

  return updated;
}

export async function setUserActiveForAdmin(id: string, isActive: boolean, actor: AdminActor) {
  assertAdmin(actor);

  if (id === actor.userId && !isActive) {
    throw ApiError.conflict("You cannot deactivate your own account", { code: "SELF_DEACTIVATION" });
  }

  const user = await findUserById(id);

  if (!user) {
    throw ApiError.notFound("That user does not exist");
  }

  const updated = await setUserActive(id, isActive);

  await recordActivity({
    action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    message: `${actor.username} ${isActive ? "activated" : "deactivated"} account ${user.username}`,
    userId: actor.userId,
    metadata: { targetUserId: id, isActive },
  });

  return updated;
}

export async function resetUserPassword(id: string, password: string, actor: AdminActor) {
  assertAdmin(actor);

  const user = await findUserById(id);

  if (!user) {
    throw ApiError.notFound("That user does not exist");
  }

  const passwordHash = await hashPassword(password);
  await updateUserPassword(id, passwordHash);

  await recordActivity({
    action: "USER_PASSWORD_RESET",
    message: `${actor.username} reset the password for ${user.username}`,
    userId: actor.userId,
    metadata: { targetUserId: id },
  });

  return { id, username: user.username };
}