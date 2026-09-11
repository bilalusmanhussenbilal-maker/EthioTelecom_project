-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('TECHNICIAN', 'SUPERVISOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('NEW_CONNECTION', 'LINE_SHIFT', 'SERVICE_SURVEY', 'NETWORK_VERIFICATION');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('NEW_CONNECTION', 'LINE_SHIFT', 'VERIFICATION');

-- CreateEnum
CREATE TYPE "BoxType" AS ENUM ('MSAN', 'FDC', 'FDT', 'PILLAR', 'JOINT');

-- CreateEnum
CREATE TYPE "BoxStatus" AS ENUM ('ACTIVE', 'FAULTY', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PortStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'FAULTY');

-- CreateEnum
CREATE TYPE "LineType" AS ENUM ('FIBER', 'COPPER', 'MICROWAVE');

-- CreateEnum
CREATE TYPE "LineStatus" AS ENUM ('ACTIVE', 'FAULTY', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SurveyStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'COMPLETED', 'RETURNED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FeasibilityStatus" AS ENUM ('TECHNICALLY_FEASIBLE', 'NOT_FEASIBLE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "phoneNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technicians" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "zone" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technicians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zone" TEXT,
    "parentId" TEXT,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "serviceCode" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "serviceAddress" TEXT NOT NULL,
    "street" TEXT,
    "houseNumber" TEXT,
    "areaId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" "ServiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boxes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "type" "BoxType" NOT NULL,
    "status" "BoxStatus" NOT NULL DEFAULT 'ACTIVE',
    "areaId" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ports" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "boxId" TEXT NOT NULL,
    "status" "PortStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lines" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "type" "LineType" NOT NULL,
    "status" "LineStatus" NOT NULL DEFAULT 'ACTIVE',
    "capacity" INTEGER NOT NULL,
    "usedCapacity" INTEGER NOT NULL DEFAULT 0,
    "sourceCode" TEXT NOT NULL,
    "targetCode" TEXT NOT NULL,
    "cableInfo" TEXT,
    "areaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "line_hops" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "nodeCode" TEXT NOT NULL,
    "boxId" TEXT,

    CONSTRAINT "line_hops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "old_network" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "boxId" TEXT,
    "portId" TEXT,
    "lineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "old_network_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "new_network" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "boxId" TEXT,
    "portId" TEXT,
    "lineId" TEXT,
    "requiredCapacity" INTEGER NOT NULL DEFAULT 0,
    "changeType" "ChangeType" NOT NULL DEFAULT 'NEW_CONNECTION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "new_network_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surveys" (
    "id" TEXT NOT NULL,
    "surveyCode" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "status" "SurveyStatus" NOT NULL DEFAULT 'NEW',
    "technicianId" TEXT,
    "createdById" TEXT,
    "boxStatus" "BoxStatus",
    "portStatus" "PortStatus",
    "lineStatus" "LineStatus",
    "availableCapacity" INTEGER,
    "requiredCapacity" INTEGER,
    "feasibilityStatus" "FeasibilityStatus",
    "feasibilityReasons" JSONB,
    "technicianRemark" TEXT,
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewRemark" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_assignments" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "assignedById" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,

    CONSTRAINT "survey_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gps_records" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "distanceFromServiceMeters" DOUBLE PRECISION,
    "isWithinServiceArea" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gps_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "surveyId" TEXT,
    "action" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "technicians_userId_key" ON "technicians"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "technicians_employeeCode_key" ON "technicians"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "areas_code_key" ON "areas"("code");

-- CreateIndex
CREATE INDEX "areas_parentId_idx" ON "areas"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "services_serviceCode_key" ON "services"("serviceCode");

-- CreateIndex
CREATE INDEX "services_areaId_idx" ON "services"("areaId");

-- CreateIndex
CREATE INDEX "services_customerName_idx" ON "services"("customerName");

-- CreateIndex
CREATE UNIQUE INDEX "boxes_code_key" ON "boxes"("code");

-- CreateIndex
CREATE INDEX "boxes_areaId_idx" ON "boxes"("areaId");

-- CreateIndex
CREATE INDEX "ports_boxId_status_idx" ON "ports"("boxId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ports_boxId_code_key" ON "ports"("boxId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "lines_code_key" ON "lines"("code");

-- CreateIndex
CREATE INDEX "lines_areaId_idx" ON "lines"("areaId");

-- CreateIndex
CREATE INDEX "line_hops_nodeCode_idx" ON "line_hops"("nodeCode");

-- CreateIndex
CREATE UNIQUE INDEX "line_hops_lineId_sequence_key" ON "line_hops"("lineId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "old_network_serviceId_key" ON "old_network"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "new_network_serviceId_key" ON "new_network"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "surveys_surveyCode_key" ON "surveys"("surveyCode");

-- CreateIndex
CREATE INDEX "surveys_serviceId_idx" ON "surveys"("serviceId");

-- CreateIndex
CREATE INDEX "surveys_technicianId_status_idx" ON "surveys"("technicianId", "status");

-- CreateIndex
CREATE INDEX "surveys_status_idx" ON "surveys"("status");

-- CreateIndex
CREATE INDEX "survey_assignments_technicianId_isActive_idx" ON "survey_assignments"("technicianId", "isActive");

-- CreateIndex
CREATE INDEX "survey_assignments_surveyId_idx" ON "survey_assignments"("surveyId");

-- CreateIndex
CREATE UNIQUE INDEX "gps_records_surveyId_key" ON "gps_records"("surveyId");

-- CreateIndex
CREATE INDEX "activity_logs_surveyId_idx" ON "activity_logs"("surveyId");

-- CreateIndex
CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boxes" ADD CONSTRAINT "boxes_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ports" ADD CONSTRAINT "ports_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "boxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lines" ADD CONSTRAINT "lines_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_hops" ADD CONSTRAINT "line_hops_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_hops" ADD CONSTRAINT "line_hops_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "boxes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "old_network" ADD CONSTRAINT "old_network_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "old_network" ADD CONSTRAINT "old_network_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "boxes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "old_network" ADD CONSTRAINT "old_network_portId_fkey" FOREIGN KEY ("portId") REFERENCES "ports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "old_network" ADD CONSTRAINT "old_network_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "new_network" ADD CONSTRAINT "new_network_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "new_network" ADD CONSTRAINT "new_network_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "boxes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "new_network" ADD CONSTRAINT "new_network_portId_fkey" FOREIGN KEY ("portId") REFERENCES "ports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "new_network" ADD CONSTRAINT "new_network_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "technicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_assignments" ADD CONSTRAINT "survey_assignments_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_assignments" ADD CONSTRAINT "survey_assignments_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "technicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_assignments" ADD CONSTRAINT "survey_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gps_records" ADD CONSTRAINT "gps_records_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
