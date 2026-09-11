import { api } from "./client";
import type { AuthenticatedUser } from "./types";

export function login(username: string, password: string) {
  return api.post<{ user: AuthenticatedUser }>("/auth/login", { username, password });
}

export function logout() {
  return api.post<void>("/auth/logout");
}

export function getMe() {
  return api.get<{ user: AuthenticatedUser }>("/auth/me");
}