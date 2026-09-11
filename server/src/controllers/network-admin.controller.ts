import type { RequestHandler } from "express";
import { z } from "zod";
import { getAuthContext } from "../middleware/auth.js";
import {
  createAreaForAdmin,
  createBoxForAdmin,
  createLineForAdmin,
  createPortForAdmin,
  createServiceForAdmin,
  deleteAreaForAdmin,
  deleteBoxForAdmin,
  deleteLineForAdmin,
  deletePortForAdmin,
  deleteServiceForAdmin,
  updateAreaForAdmin,
  updateBoxForAdmin,
  updateLineForAdmin,
  updatePortForAdmin,
  updateServiceForAdmin,
} from "../services/network-admin.service.js";
import type { NewNetworkInput, NetworkLinkInput } from "../models/network.model.js";
import { parseBody, parseParams } from "../utils/validation.js";

const idParams = z.object({ id: z.string().min(1) });

const boxType = z.enum(["MSAN", "FDC", "FDT", "PILLAR", "JOINT"]);
const boxStatus = z.enum(["ACTIVE", "FAULTY", "INACTIVE"]);
const portStatus = z.enum(["AVAILABLE", "OCCUPIED", "FAULTY"]);
const lineType = z.enum(["FIBER", "COPPER", "MICROWAVE"]);
const lineStatus = z.enum(["ACTIVE", "FAULTY", "INACTIVE"]);
const serviceType = z.enum(["NEW_CONNECTION", "LINE_SHIFT", "SERVICE_SURVEY", "NETWORK_VERIFICATION"]);
const serviceStatus = z.enum(["ACTIVE", "SUSPENDED", "TERMINATED"]);
const changeType = z.enum(["NEW_CONNECTION", "LINE_SHIFT", "VERIFICATION"]);

const longitude = z.number().min(-180).max(180).nullable().optional();
const latitude = z.number().min(-90).max(90).nullable().optional();

const areaBody = z.object({
  code: z.string().trim().min(1).max(32),
  name: z.string().trim().min(2).max(120),
  zone: z.string().trim().max(64).nullable().optional(),
  parentId: z.string().trim().min(1).nullable().optional(),
});
const areaPatchBody = areaBody.partial();

const boxBody = z.object({
  code: z.string().trim().min(1).max(32),
  name: z.string().trim().max(120).nullable().optional(),
  type: boxType,
  status: boxStatus.optional(),
  areaId: z.string().trim().min(1).nullable().optional(),
  latitude,
  longitude,
});
const boxPatchBody = boxBody.partial();

const portBody = z.object({
  code: z.string().trim().min(1).max(16),
  status: portStatus.optional(),
  notes: z.string().trim().max(280).nullable().optional(),
});
const portPatchBody = portBody.partial();

const hopBody = z.object({
  nodeCode: z.string().trim().min(1).max(64),
  boxId: z.string().trim().min(1).nullable().optional(),
});

const lineBody = z.object({
  code: z.string().trim().min(1).max(32),
  name: z.string().trim().max(120).nullable().optional(),
  type: lineType,
  status: lineStatus.optional(),
  capacity: z.coerce.number().int().min(0).max(1_000_000),
  usedCapacity: z.coerce.number().int().min(0).max(1_000_000).optional(),
  sourceCode: z.string().trim().min(1).max(64),
  targetCode: z.string().trim().min(1).max(64),
  cableInfo: z.string().trim().max(160).nullable().optional(),
  areaId: z.string().trim().min(1).nullable().optional(),
  hops: z.array(hopBody).min(1).max(64).optional(),
});
const linePatchBody = lineBody.partial();

const linkBody = z.object({
  boxId: z.string().trim().min(1).nullable().optional(),
  portId: z.string().trim().min(1).nullable().optional(),
  lineId: z.string().trim().min(1).nullable().optional(),
});
const newNetworkBody = linkBody.extend({
  requiredCapacity: z.coerce.number().int().min(0).max(1_000_000),
  changeType: changeType.optional(),
});

const serviceBody = z.object({
  serviceCode: z.string().trim().min(1).max(32),
  customerName: z.string().trim().min(2).max(160),
  serviceType,
  serviceAddress: z.string().trim().min(3).max(240),
  street: z.string().trim().max(120).nullable().optional(),
  houseNumber: z.string().trim().max(32).nullable().optional(),
  areaId: z.string().trim().min(1),
  latitude,
  longitude,
  status: serviceStatus.optional(),
  oldNetwork: linkBody.nullable().optional(),
  newNetwork: newNetworkBody.nullable().optional(),
});
const servicePatchBody = serviceBody.partial();

type LinkBody = z.infer<typeof linkBody>;
type NewNetworkBody = z.infer<typeof newNetworkBody>;

/** Keeps `undefined` (leave alone) distinct from `null` (clear) on PATCH. */
function toLink(input: LinkBody): NetworkLinkInput {
  return {
    ...(input.boxId === undefined ? {} : { boxId: input.boxId }),
    ...(input.portId === undefined ? {} : { portId: input.portId }),
    ...(input.lineId === undefined ? {} : { lineId: input.lineId }),
  };
}

function toNewNetwork(input: NewNetworkBody): NewNetworkInput {
  return {
    ...toLink(input),
    requiredCapacity: input.requiredCapacity,
    changeType: input.changeType ?? "NEW_CONNECTION",
  };
}

/* ---------------------------------------------------------------- areas -- */

export const postAreaHandler: RequestHandler = async (req, res) => {
  const body = parseBody(areaBody, req);
  res.status(201).json({ area: await createAreaForAdmin(body, getAuthContext(req)) });
};

export const patchAreaHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  const body = parseBody(areaPatchBody, req);
  res.status(200).json({ area: await updateAreaForAdmin(id, body, getAuthContext(req)) });
};

export const deleteAreaHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  res.status(200).json({ area: await deleteAreaForAdmin(id, getAuthContext(req)) });
};

/* --------------------------------------------------------------- boxes -- */

export const postBoxHandler: RequestHandler = async (req, res) => {
  const body = parseBody(boxBody, req);
  res.status(201).json({ box: await createBoxForAdmin(body, getAuthContext(req)) });
};

export const patchBoxHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  const body = parseBody(boxPatchBody, req);
  res.status(200).json({ box: await updateBoxForAdmin(id, body, getAuthContext(req)) });
};

export const deleteBoxHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  res.status(200).json({ box: await deleteBoxForAdmin(id, getAuthContext(req)) });
};

/* --------------------------------------------------------------- ports -- */

export const postPortHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  const body = parseBody(portBody, req);
  res.status(201).json({ port: await createPortForAdmin(id, body, getAuthContext(req)) });
};

export const patchPortHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  const body = parseBody(portPatchBody, req);
  res.status(200).json({ port: await updatePortForAdmin(id, body, getAuthContext(req)) });
};

export const deletePortHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  res.status(200).json({ port: await deletePortForAdmin(id, getAuthContext(req)) });
};

/* --------------------------------------------------------------- lines -- */

export const postLineHandler: RequestHandler = async (req, res) => {
  const body = parseBody(lineBody, req);
  res.status(201).json({ line: await createLineForAdmin(body, getAuthContext(req)) });
};

export const patchLineHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  const body = parseBody(linePatchBody, req);
  res.status(200).json({ line: await updateLineForAdmin(id, body, getAuthContext(req)) });
};

export const deleteLineHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  res.status(200).json({ line: await deleteLineForAdmin(id, getAuthContext(req)) });
};

/* ------------------------------------------------------------ services -- */

export const postServiceHandler: RequestHandler = async (req, res) => {
  const body = parseBody(serviceBody, req);

  const service = await createServiceForAdmin(
    {
      serviceCode: body.serviceCode,
      customerName: body.customerName,
      serviceType: body.serviceType,
      serviceAddress: body.serviceAddress,
      ...(body.street === undefined ? {} : { street: body.street }),
      ...(body.houseNumber === undefined ? {} : { houseNumber: body.houseNumber }),
      areaId: body.areaId,
      ...(body.latitude === undefined ? {} : { latitude: body.latitude }),
      ...(body.longitude === undefined ? {} : { longitude: body.longitude }),
      ...(body.status === undefined ? {} : { status: body.status }),
      oldNetwork:
        body.oldNetwork === undefined || body.oldNetwork === null ? null : toLink(body.oldNetwork),
      newNetwork:
        body.newNetwork === undefined || body.newNetwork === null
          ? null
          : toNewNetwork(body.newNetwork),
    },
    getAuthContext(req),
  );

  res.status(201).json({ service });
};

export const patchServiceHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  const body = parseBody(servicePatchBody, req);

  const service = await updateServiceForAdmin(
    id,
    {
      ...(body.serviceCode === undefined ? {} : { serviceCode: body.serviceCode }),
      ...(body.customerName === undefined ? {} : { customerName: body.customerName }),
      ...(body.serviceType === undefined ? {} : { serviceType: body.serviceType }),
      ...(body.serviceAddress === undefined ? {} : { serviceAddress: body.serviceAddress }),
      ...(body.street === undefined ? {} : { street: body.street }),
      ...(body.houseNumber === undefined ? {} : { houseNumber: body.houseNumber }),
      ...(body.areaId === undefined ? {} : { areaId: body.areaId }),
      ...(body.latitude === undefined ? {} : { latitude: body.latitude }),
      ...(body.longitude === undefined ? {} : { longitude: body.longitude }),
      ...(body.status === undefined ? {} : { status: body.status }),
      oldNetwork:
        body.oldNetwork === undefined
          ? undefined
          : body.oldNetwork === null
            ? null
            : toLink(body.oldNetwork),
      newNetwork:
        body.newNetwork === undefined
          ? undefined
          : body.newNetwork === null
            ? null
            : toNewNetwork(body.newNetwork),
    },
    getAuthContext(req),
  );

  res.status(200).json({ service });
};

export const deleteServiceHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  res.status(200).json({ service: await deleteServiceForAdmin(id, getAuthContext(req)) });
};