import { api } from "./client";
import type {
  AreaDetail,
  AreaSummary,
  BoxOption,
  BoxRecord,
  BoxStatus,
  LineDetail,
  LineRecord,
  PortRecord,
  PortStatus,
  PortSummary,
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
};

export type { AreaSummary };