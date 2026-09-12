import { SignJWT, jwtVerify } from "jose";
import { env } from "../config/env.js";
import { isUserRole } from "../models/roles.js";
import type { UserRole } from "../models/roles.js";

const ALGORITHM = "HS256";
const secret = new TextEncoder().encode(env.JWT_SECRET);

export interface AuthTokenPayload {
  userId: string;
  username: string;
  role: UserRole;
  technicianId?: string;
  /**
   * Session generation. The token is only accepted while this still matches the stored
   * `User.tokenVersion`, so logging out or resetting a password can revoke it early.
   */
  tokenVersion: number;
}

export async function signAuthToken(payload: AuthTokenPayload): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + env.JWT_TTL_SECONDS;

  return new SignJWT({
    username: payload.username,
    role: payload.role,
    ver: payload.tokenVersion,
    ...(payload.technicianId === undefined ? {} : { technicianId: payload.technicianId }),
  })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secret);
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: [ALGORITHM] });

    if (typeof payload.sub !== "string" || !isUserRole(payload.role) || typeof payload.username !== "string") {
      return null;
    }

    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
      // Tokens minted before session versioning carry no `ver`; they belong to generation 0.
      tokenVersion:
        typeof payload.ver === "number" && Number.isInteger(payload.ver) && payload.ver >= 0
          ? payload.ver
          : 0,
      ...(typeof payload.technicianId === "string" ? { technicianId: payload.technicianId } : {}),
    };
  } catch {
    return null;
  }
}
