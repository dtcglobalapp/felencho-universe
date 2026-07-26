export const FELENCHO_STUDIO_ROLES = [
  "owner",
  "developer",
  "artist",
  "tester",
  "guest",
] as const;

export type FelenchoStudioRole =
  (typeof FELENCHO_STUDIO_ROLES)[number];

export const FELENCHO_STUDIO_PERMISSIONS = {
  advancedMode: "felencho-studio.advanced",
  operations: "felencho-studio.operations",
} as const;

export type FelenchoStudioPermission =
  (typeof FELENCHO_STUDIO_PERMISSIONS)[keyof typeof FELENCHO_STUDIO_PERMISSIONS];

export type FelenchoStudioAccessArea =
  | "advanced"
  | "operations"
  | "invitation";

const LEGACY_ROLE_MAP: Readonly<
  Record<string, FelenchoStudioRole>
> = {
  owner: "owner",
  developer: "developer",
  artist: "artist",
  tester: "tester",
  guest: "guest",
  admin: "developer",
  producer: "artist",
  viewer: "tester",
};

export function normalizeFelenchoStudioRole(
  value: unknown,
): FelenchoStudioRole | null {
  if (typeof value !== "string") {
    return null;
  }

  return LEGACY_ROLE_MAP[value.trim().toLowerCase()] ?? null;
}

export function normalizeFelenchoStudioPermissions(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter(
          (permission): permission is string =>
            typeof permission === "string",
        )
        .map((permission) => permission.trim())
        .filter(Boolean),
    ),
  );
}

export function canAccessFelenchoStudio(
  role: FelenchoStudioRole,
  permissions: readonly string[],
  area: FelenchoStudioAccessArea,
): boolean {
  if (role === "owner" || role === "developer") {
    return true;
  }

  if (area === "invitation") {
    return role === "tester" || role === "guest";
  }

  if (role !== "artist") {
    return false;
  }

  const requiredPermission =
    area === "advanced"
      ? FELENCHO_STUDIO_PERMISSIONS.advancedMode
      : FELENCHO_STUDIO_PERMISSIONS.operations;

  return permissions.includes(requiredPermission);
}

export function accessAreaForPath(
  pathname: string,
): FelenchoStudioAccessArea | null {
  if (
    pathname === "/felencho-studio/advanced" ||
    pathname.startsWith("/felencho-studio/advanced/") ||
    pathname === "/avatar-engine/studio" ||
    pathname.startsWith("/avatar-engine/studio/")
  ) {
    return "advanced";
  }

  if (
    pathname === "/studio" ||
    pathname.startsWith("/studio/")
  ) {
    return "operations";
  }

  if (
    pathname === "/felencho-studio/invitation" ||
    pathname.startsWith("/felencho-studio/invitation/")
  ) {
    return "invitation";
  }

  return null;
}
