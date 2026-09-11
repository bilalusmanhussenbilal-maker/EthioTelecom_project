import { prisma } from "./prisma.js";

/** Technician queries never expose the linked account's password hash. */
export const technicianUserSelect = {
  id: true,
  username: true,
  fullName: true,
  role: true,
  phoneNumber: true,
  isActive: true,
} as const;

const technicianInclude = {
  user: { select: technicianUserSelect },
} as const;

export interface CreateTechnicianInput {
  userId: string;
  employeeCode: string;
  zone?: string | null;
}

export function findTechnicianById(id: string) {
  return prisma.technician.findUnique({
    where: { id },
    include: technicianInclude,
  });
}

export function findTechnicianByUserId(userId: string) {
  return prisma.technician.findUnique({
    where: { userId },
    include: technicianInclude,
  });
}

export function listTechnicians() {
  return prisma.technician.findMany({
    orderBy: { employeeCode: "asc" },
    include: technicianInclude,
  });
}

export function createTechnician(input: CreateTechnicianInput) {
  return prisma.technician.create({
    data: {
      userId: input.userId,
      employeeCode: input.employeeCode,
      zone: input.zone ?? null,
    },
    include: technicianInclude,
  });
}

export function setTechnicianAvailability(id: string, isAvailable: boolean) {
  return prisma.technician.update({
    where: { id },
    data: { isAvailable },
  });
}