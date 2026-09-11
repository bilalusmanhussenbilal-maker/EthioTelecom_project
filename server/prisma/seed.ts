import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password.js";

const prisma = new PrismaClient();

async function resetDomainData(): Promise<void> {
  await prisma.activityLog.deleteMany();
  await prisma.gpsRecord.deleteMany();
  await prisma.surveyAssignment.deleteMany();
  await prisma.survey.deleteMany();
  await prisma.oldNetwork.deleteMany();
  await prisma.newNetwork.deleteMany();
  await prisma.service.deleteMany();
  await prisma.lineHop.deleteMany();
  await prisma.line.deleteMany();
  await prisma.port.deleteMany();
  await prisma.box.deleteMany();
  await prisma.area.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.user.deleteMany();
}

async function main(): Promise<void> {
  await resetDomainData();

  const bole = await prisma.area.create({
    data: { code: "AREA-01", name: "Bole", zone: "Zone 3" },
  });
  const boleMichael = await prisma.area.create({
    data: { code: "AREA-01-A", name: "Bole Michael", zone: "Zone 3", parentId: bole.id },
  });
  const yeka = await prisma.area.create({
    data: { code: "AREA-02", name: "Yeka", zone: "Zone 4" },
  });

  const box15 = await prisma.box.create({
    data: { code: "BOX-15", type: "FDT", status: "ACTIVE", areaId: bole.id, name: "Bole FDT 15" },
  });
  const box18 = await prisma.box.create({
    data: { code: "BOX-18", type: "FDT", status: "ACTIVE", areaId: bole.id, name: "Bole FDT 18" },
  });
  const box22 = await prisma.box.create({
    data: { code: "BOX-22", type: "FDT", status: "ACTIVE", areaId: boleMichael.id, name: "Bole Michael FDT 22" },
  });
  const box30 = await prisma.box.create({
    data: { code: "BOX-30", type: "FDT", status: "ACTIVE", areaId: yeka.id, name: "Yeka FDT 30" },
  });

  const port15_01 = await prisma.port.create({ data: { code: "01", boxId: box15.id, status: "OCCUPIED" } });
  await prisma.port.create({ data: { code: "02", boxId: box15.id, status: "AVAILABLE" } });

  await prisma.port.create({ data: { code: "01", boxId: box18.id, status: "AVAILABLE" } });
  await prisma.port.create({ data: { code: "02", boxId: box18.id, status: "AVAILABLE" } });

  const port22_03 = await prisma.port.create({ data: { code: "03", boxId: box22.id, status: "AVAILABLE" } });
  const port22_05 = await prisma.port.create({ data: { code: "05", boxId: box22.id, status: "AVAILABLE" } });
  await prisma.port.create({ data: { code: "01", boxId: box22.id, status: "OCCUPIED" } });
  await prisma.port.create({ data: { code: "02", boxId: box22.id, status: "OCCUPIED" } });
  await prisma.port.create({ data: { code: "04", boxId: box22.id, status: "OCCUPIED" } });

  const port30_01 = await prisma.port.create({ data: { code: "01", boxId: box30.id, status: "OCCUPIED" } });
  await prisma.port.create({ data: { code: "02", boxId: box30.id, status: "OCCUPIED" } });
  await prisma.port.create({ data: { code: "03", boxId: box30.id, status: "OCCUPIED" } });
  await prisma.port.create({ data: { code: "04", boxId: box30.id, status: "FAULTY" } });

  const line05 = await prisma.line.create({
    data: {
      code: "LINE-05",
      name: "MSAN-03 to BOX-22 backbone",
      type: "FIBER",
      status: "ACTIVE",
      capacity: 48,
      usedCapacity: 30,
      sourceCode: "MSAN-03",
      targetCode: "BOX-22",
      cableInfo: "24F SM armoured",
      areaId: bole.id,
      hops: {
        create: [
          { sequence: 1, nodeCode: "MSAN-03" },
          { sequence: 2, nodeCode: "BOX-15", boxId: box15.id },
          { sequence: 3, nodeCode: "BOX-18", boxId: box18.id },
          { sequence: 4, nodeCode: "BOX-22", boxId: box22.id },
        ],
      },
    },
  });

  const line09 = await prisma.line.create({
    data: {
      code: "LINE-09",
      name: "MSAN-03 to BOX-30 feeder",
      type: "COPPER",
      status: "ACTIVE",
      capacity: 24,
      usedCapacity: 24,
      sourceCode: "MSAN-03",
      targetCode: "BOX-30",
      cableInfo: "10 pair copper",
      areaId: yeka.id,
      hops: {
        create: [
          { sequence: 1, nodeCode: "MSAN-03" },
          { sequence: 2, nodeCode: "BOX-30", boxId: box30.id },
        ],
      },
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      username: "admin",
      fullName: "System Administrator",
      passwordHash: await hashPassword("Admin@12345"),
      role: "ADMIN",
    },
  });

  const supervisorUser = await prisma.user.create({
    data: {
      username: "supervisor",
      fullName: "Almaz Bekele",
      passwordHash: await hashPassword("Super@12345"),
      role: "SUPERVISOR",
      phoneNumber: "+251911000201",
    },
  });

  const tech014User = await prisma.user.create({
    data: {
      username: "tech014",
      fullName: "Dawit Haile",
      passwordHash: await hashPassword("Tech@12345"),
      role: "TECHNICIAN",
      phoneNumber: "+251911000014",
      technician: {
        create: { employeeCode: "014", zone: "Zone 3" },
      },
    },
    include: { technician: true },
  });

  const tech015User = await prisma.user.create({
    data: {
      username: "tech015",
      fullName: "Hana Girma",
      passwordHash: await hashPassword("Tech@12345"),
      role: "TECHNICIAN",
      phoneNumber: "+251911000015",
      technician: {
        create: { employeeCode: "015", zone: "Zone 4" },
      },
    },
    include: { technician: true },
  });

  const tech014 = tech014User.technician!.id;
  const tech015 = tech015User.technician!.id;

  const service1 = await prisma.service.create({
    data: {
      serviceCode: "SRV-001",
      customerName: "Selam Retail Shop",
      serviceType: "LINE_SHIFT",
      serviceAddress: "Bole Michael, Building 12, Shop 3",
      street: "Bole Michael Road",
      houseNumber: "12",
      latitude: 8.9951,
      longitude: 38.7869,
      areaId: boleMichael.id,
      oldNetwork: {
        create: { boxId: box15.id, portId: port15_01.id, lineId: line05.id },
      },
      newNetwork: {
        create: {
          boxId: box22.id,
          portId: port22_03.id,
          lineId: line05.id,
          requiredCapacity: 1,
          changeType: "LINE_SHIFT",
        },
      },
    },
  });

  const service2 = await prisma.service.create({
    data: {
      serviceCode: "SRV-002",
      customerName: "Abyssinia Cafe",
      serviceType: "NEW_CONNECTION",
      serviceAddress: "Yeka Street 4, Building 7",
      street: "Yeka Street",
      houseNumber: "7",
      latitude: 9.0231,
      longitude: 38.8123,
      areaId: yeka.id,
      newNetwork: {
        create: {
          boxId: box30.id,
          portId: port30_01.id,
          lineId: line09.id,
          requiredCapacity: 2,
          changeType: "NEW_CONNECTION",
        },
      },
    },
  });

  const service3 = await prisma.service.create({
    data: {
      serviceCode: "SRV-003",
      customerName: "Nile Pharmacy",
      serviceType: "NEW_CONNECTION",
      serviceAddress: "Bole Michael, House 8",
      street: "Bole Michael Road",
      houseNumber: "8",
      latitude: 8.9962,
      longitude: 38.7881,
      areaId: boleMichael.id,
      newNetwork: {
        create: {
          boxId: box22.id,
          portId: port22_05.id,
          lineId: line05.id,
          requiredCapacity: 1,
          changeType: "NEW_CONNECTION",
        },
      },
    },
  });

  const survey1 = await prisma.survey.create({
    data: {
      surveyCode: "SV-001",
      serviceId: service1.id,
      status: "NEW",
      technicianId: tech014,
      createdById: supervisorUser.id,
    },
  });

  const survey2 = await prisma.survey.create({
    data: {
      surveyCode: "SV-002",
      serviceId: service2.id,
      status: "IN_PROGRESS",
      technicianId: tech014,
      createdById: supervisorUser.id,
    },
  });

  const survey3 = await prisma.survey.create({
    data: {
      surveyCode: "SV-003",
      serviceId: service3.id,
      status: "COMPLETED",
      technicianId: tech015,
      createdById: supervisorUser.id,
      boxStatus: "ACTIVE",
      portStatus: "AVAILABLE",
      lineStatus: "ACTIVE",
      availableCapacity: 18,
      requiredCapacity: 1,
      feasibilityStatus: "TECHNICALLY_FEASIBLE",
      feasibilityReasons: [],
      technicianRemark: "Box and port verified on site. Drop cable reachable.",
      submittedAt: new Date("2026-09-09T09:15:00.000Z"),
      completedAt: new Date("2026-09-09T09:15:00.000Z"),
    },
  });

  const survey4 = await prisma.survey.create({
    data: {
      surveyCode: "SV-004",
      serviceId: service2.id,
      status: "RETURNED",
      technicianId: tech014,
      createdById: supervisorUser.id,
      feasibilityStatus: "NOT_FEASIBLE",
      feasibilityReasons: [
        { code: "PORT_OCCUPIED", field: "newPortId", message: "Port 01 is already occupied" },
      ],
      technicianRemark: "Reported port free but it is in use by another service.",
      submittedAt: new Date("2026-09-08T11:40:00.000Z"),
      reviewedById: supervisorUser.id,
      reviewRemark: "Please re-check BOX-30 and confirm an available port.",
      reviewedAt: new Date("2026-09-08T14:05:00.000Z"),
    },
  });

  await prisma.surveyAssignment.createMany({
    data: [
      { surveyId: survey1.id, technicianId: tech014, assignedById: supervisorUser.id, note: "Priority: customer waiting" },
      { surveyId: survey2.id, technicianId: tech014, assignedById: supervisorUser.id },
      { surveyId: survey3.id, technicianId: tech015, assignedById: supervisorUser.id },
      { surveyId: survey4.id, technicianId: tech014, assignedById: supervisorUser.id, note: "Re-survey after return" },
    ],
  });

  await prisma.gpsRecord.create({
    data: {
      surveyId: survey3.id,
      latitude: 8.99624,
      longitude: 38.78814,
      accuracy: 12.5,
      capturedAt: new Date("2026-09-09T09:14:31.000Z"),
      distanceFromServiceMeters: 21.4,
      isWithinServiceArea: true,
    },
  });

  await prisma.activityLog.createMany({
    data: [
      { userId: supervisorUser.id, surveyId: survey1.id, action: "SURVEY_ASSIGNED", message: "Supervisor 003 assigned SV-001 to Technician 014" },
      { userId: tech014User.id, surveyId: survey1.id, action: "SURVEY_OPENED", message: "Technician 014 opened SV-001" },
      { userId: tech015User.id, surveyId: survey3.id, action: "SURVEY_SUBMITTED", message: "Technician 015 submitted SV-003" },
      { userId: supervisorUser.id, surveyId: survey3.id, action: "SURVEY_APPROVED", message: "Supervisor 003 approved SV-003" },
      { userId: supervisorUser.id, surveyId: survey4.id, action: "SURVEY_RETURNED", message: "Supervisor 003 returned SV-004 to Technician 014" },
    ],
  });

  console.log("Seed complete:");
  console.log(`  areas:     3`);
  console.log(`  boxes:     4 (BOX-22 ports per spec: 01 occupied, 02 occupied, 03 available, 04 occupied, 05 available)`);
  console.log(`  lines:     2 (LINE-05: MSAN-03 -> BOX-15 -> BOX-18 -> BOX-22)`);
  console.log(`  users:     4 (admin / supervisor / tech014 / tech015)`);
  console.log(`  services:  3, surveys: 4 (NEW, IN_PROGRESS, COMPLETED, RETURNED)`);
  console.log("");
  console.log("Sign in with:");
  console.log("  admin      / Admin@12345");
  console.log("  supervisor / Super@12345");
  console.log("  tech014    / Tech@12345");
  console.log("  tech015    / Tech@12345");
  console.log(`  admin id: ${adminUser.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
