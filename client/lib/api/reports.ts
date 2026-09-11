import { api } from "./client";
import type { ReportKey, ReportTable } from "./types";

export interface ReportFilters {
  from?: string;
  to?: string;
  areaId?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export const reportsApi = {
  list: (filters: ReportFilters = {}) =>
    api.get<{ reports: ReportTable[]; available: ReportKey[] }>("/reports", { query: { ...filters } }),

  get: (key: ReportKey, filters: ReportFilters = {}) =>
    api.get<{ report: ReportTable }>(`/reports/${key}`, { query: { ...filters } }),

  /**
   * The CSV endpoint is a file download, so the browser has to navigate to it rather than
   * read it through fetch. The session cookie rides along on a same-site top-level GET.
   */
  exportUrl: (key: ReportKey, filters: ReportFilters = {}) => {
    const base = API_BASE_URL.replace(/\/+$/, "");
    const search = new URLSearchParams({ format: "csv" });

    for (const [name, value] of Object.entries(filters)) {
      if (value) {
        search.set(name, value);
      }
    }

    return `${base}/reports/${key}/export?${search.toString()}`;
  },
};