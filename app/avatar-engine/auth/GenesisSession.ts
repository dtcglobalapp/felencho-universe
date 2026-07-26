import "server-only";

import {
  normalizeFelenchoStudioPermissions,
  normalizeFelenchoStudioRole,
} from "./GenesisAccessPolicy";

import type {
  FelenchoStudioRole,
} from "./GenesisAccessPolicy";

export const FELENCHO_STUDIO_SESSION_COOKIE =
  "felencho_studio_session";

export interface FelenchoStudioSession {
  id: string;
  role: FelenchoStudioRole;
  permissions: string[];
  expiresAt: string;
}

interface SessionLookupResult {
  id: unknown;
  role: unknown;
  permissions?: unknown;
  expires_at: unknown;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function readSessionLookupResult(
  value: unknown,
): SessionLookupResult | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    id: value.id,
    role: value.role,
    permissions: value.permissions,
    expires_at: value.expires_at,
  };
}

async function sha256(value: string): Promise<string> {
  const encodedValue =
    new TextEncoder().encode(value);

  const digest = await crypto.subtle.digest(
    "SHA-256",
    encodedValue,
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) =>
      byte.toString(16).padStart(2, "0"),
    )
    .join("");
}

async function fetchSessionRows(
  url: string,
  serviceRoleKey: string,
): Promise<unknown[] | null> {
  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload: unknown = await response.json();

  return Array.isArray(payload) ? payload : null;
}

export async function getFelenchoStudioSession(
  token: string | undefined,
): Promise<FelenchoStudioSession | null> {
  if (!token) {
    return null;
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  try {
    const tokenHash = await sha256(token);
    const baseQuery =
      `${supabaseUrl}/rest/v1/studio_access_sessions` +
      `?session_token_hash=eq.${tokenHash}` +
      "&is_active=eq.true";

    let rows = await fetchSessionRows(
      `${baseQuery}&select=id,role,permissions,expires_at`,
      serviceRoleKey,
    );

    // The current production schema does not contain `permissions` yet.
    // Keep access compatible until the approved local migration is applied.
    if (rows === null) {
      rows = await fetchSessionRows(
        `${baseQuery}&select=id,role,expires_at`,
        serviceRoleKey,
      );
    }

    const sessionRow =
      readSessionLookupResult(rows?.[0]);

    if (
      !sessionRow ||
      typeof sessionRow.id !== "string" ||
      typeof sessionRow.expires_at !== "string"
    ) {
      return null;
    }

    const role =
      normalizeFelenchoStudioRole(
        sessionRow.role,
      );

    const expirationTime = new Date(
      sessionRow.expires_at,
    ).getTime();

    if (
      !role ||
      !Number.isFinite(expirationTime) ||
      expirationTime <= Date.now()
    ) {
      return null;
    }

    return {
      id: sessionRow.id,
      role,
      permissions:
        normalizeFelenchoStudioPermissions(
          sessionRow.permissions,
        ),
      expiresAt: sessionRow.expires_at,
    };
  } catch {
    return null;
  }
}
