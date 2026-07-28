import type {
  Metadata,
} from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  accessAreaForPath,
  canAccessFelenchoStudio,
} from "../../avatar-engine/auth/GenesisAccessPolicy";
import {
  FELENCHO_STUDIO_SESSION_COOKIE,
  getFelenchoStudioSession,
} from "../../avatar-engine/auth/GenesisSession";
import {
  FELENCHO_STUDIO,
} from "../../avatar-engine/config/GenesisConfig";
import GenesisAccessForm from "./GenesisAccessForm";

export const metadata: Metadata = {
  title: `Authorized Access | ${FELENCHO_STUDIO.name}`,
  description:
    "Authorized access to the private Felencho Studio production environment.",
};

export const dynamic = "force-dynamic";

interface FelenchoStudioAuthPageProps {
  searchParams: Promise<{
    next?: string | string[];
  }>;
}

export default async function FelenchoStudioAuthPage({
  searchParams,
}: FelenchoStudioAuthPageProps) {
  const requestedNext = (
    await searchParams
  ).next;

  const nextPath =
    typeof requestedNext === "string" &&
    accessAreaForPath(requestedNext)
      ? requestedNext
      : "/felencho-studio/dashboard";

  const cookieStore = await cookies();
  const token = cookieStore.get(
    FELENCHO_STUDIO_SESSION_COOKIE,
  )?.value;
  const session =
    await getFelenchoStudioSession(token);
  const accessArea =
    accessAreaForPath(nextPath);

  if (
    session &&
    accessArea &&
    canAccessFelenchoStudio(
      session.role,
      session.permissions,
      accessArea,
    )
  ) {
    redirect(nextPath);
  }

  return (
    <GenesisAccessForm
      nextPath={nextPath}
    />
  );
}
