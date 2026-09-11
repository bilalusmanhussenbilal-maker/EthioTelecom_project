import { api } from "./client";
import type { SearchResults, ServiceNetworkPath } from "./types";

export const searchApi = {
  search: (query: string, limit = 15) =>
    api.get<SearchResults>("/search", { query: { q: query, limit } }),

  getServiceNetworkPath: (serviceCode: string) =>
    api.get<ServiceNetworkPath>(`/search/services/${encodeURIComponent(serviceCode)}/network-path`),
};