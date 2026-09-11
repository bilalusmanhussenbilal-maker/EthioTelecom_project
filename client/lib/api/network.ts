import { api } from "./client";
import type {
  AreaDetail,
  AreaPatch,
  AreaPayload,
  AreaSummary,
  BoxOption,
  BoxPatch,
  BoxPayload,
  BoxRecord,
  BoxStatus,
  DeletedArea,
  DeletedBox,
  DeletedLine,
  DeletedPort,
  DeletedService,
  LineDetail,
  LinePatch,
  LinePayload,
  LineRecord,
  PortPatch,
  PortPayload,
  PortRecord,
  PortStatus,
  PortSummary,
  ServicePatch,
  ServicePayload,
  ServiceRecord,
} from "./types";

export interface AvailablePortsResponse {
  box: { id: string; code: string; name: string | null; type: string; status: BoxStatus };
  portSummary: PortSummary;
  availablePorts: PortRecord[];
}

export interface FormOptionsResponse {
  areas: AreaDetail[];
  boxes: BoxOption[];
  lines: LineDetail[];
}

export const networkApi = {
  getOptions: (areaId?: string) =>
    api.get<FormOptionsResponse>("/network/options", { query: { areaId } }),

  getAreas: () => api.get<{ areas: AreaDetail[] }>("/network/areas"),

  getArea: (id: string) => api.get<{ area: AreaDetail }>(`/network/areas/${id}`),

  getBoxes: (filter: { areaId?: string; status?: BoxStatus } = {}) =>
    api.get<{ boxes: BoxRecord[] }>("/network/boxes", { query: { ...filter } }),

  getBox: (id: string) => api.get<{ box: BoxRecord & { portSummary: PortSummary } }>(`/network/boxes/${id}`),

  getBoxByCode: (code: string) =>
    api.get<{ box: BoxRecord & { portSummary: PortSummary } }>(`/network/boxes/code/${encodeURIComponent(code)}`),

  getBoxPorts: (boxId: string, status?: PortStatus) =>
    api.get<{ ports: PortRecord[] }>(`/network/boxes/${boxId}/ports`, { query: { status } }),

  getAvailablePorts: (boxId: string) =>
    api.get<AvailablePortsResponse>(`/network/boxes/${boxId}/available-ports`),

  getLines: (areaId?: string) => api.get<{ lines: LineRecord[] }>("/network/lines", { query: { areaId } }),

  getLine: (id: string) => api.get<{ line: LineDetail }>(`/network/lines/${id}`),

  getServices: (filter: { areaId?: string; status?: string } = {}) =>
    api.get<{ services: ServiceRecord[] }>("/network/services", { query: { ...filter } }),

  getService: (id: string) =>
    api.get<{ service: ServiceRecord & { surveys: Array<{ id: string; surveyCode: string; status: string; createdAt: string }> } }>(
      `/network/services/${id}`,
    ),

  getServiceByCode: (code: string) =>
    api.get<{ service: ServiceRecord }>(`/network/services/code/${encodeURIComponent(code)}`),

  /* ------------------------------------------------ administrator only -- */

  createArea: (body: AreaPayload) => api.post<{ area: AreaDetail }>("/network/areas", body),

  updateArea: (id: string, body: AreaPatch) =>
    api.patch<{ area: AreaDetail }>(`/network/areas/${id}`, body),

  deleteArea: (id: string) => api.delete<{ area: DeletedArea }>(`/network/areas/${id}`),

  createBox: (body: BoxPayload) => api.post<{ box: BoxRecord }>("/network/boxes", body),

  updateBox: (id: string, body: BoxPatch) =>
    api.patch<{ box: BoxRecord }>(`/network/boxes/${id}`, body),

  deleteBox: (id: string) => api.delete<{ box: DeletedBox }>(`/network/boxes/${id}`),

  createPort: (boxId: string, body: PortPayload) =>
    api.post<{ port: PortRecord }>(`/network/boxes/${boxId}/ports`, body),

  updatePort: (id: string, body: PortPatch) =>
    api.patch<{ port: PortRecord }>(`/network/ports/${id}`, body),

  deletePort: (id: string) => api.delete<{ port: DeletedPort }>(`/network/ports/${id}`),

  createLine: (body: LinePayload) => api.post<{ line: LineRecord }>("/network/lines", body),

  updateLine: (id: string, body: LinePatch) =>
    api.patch<{ line: LineRecord }>(`/network/lines/${id}`, body),

  deleteLine: (id: string) => api.delete<{ line: DeletedLine }>(`/network/lines/${id}`),

  createService: (body: ServicePayload) =>
    api.post<{ service: ServiceRecord }>("/network/services", body),

  updateService: (id: string, body: ServicePatch) =>
    api.patch<{ service: ServiceRecord }>(`/network/services/${id}`, body),

  deleteService: (id: string) =>
    api.delete<{ service: DeletedService }>(`/network/services/${id}`),
};

export type { AreaSummary };