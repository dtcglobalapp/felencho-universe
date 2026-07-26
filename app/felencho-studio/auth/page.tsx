import type {
  Metadata,
} from "next";

import {
  accessAreaForPath,
} from "../../avatar-engine/auth/GenesisAccessPolicy";
import {
  FELENCHO_STUDIO,
} from "../../avatar-engine/config/GenesisConfig";
import GenesisAccessForm from "./GenesisAccessForm";

export const metadata: Metadata = {
  title: `Authorized Access | ${FELENCHO_STUDIO.name}`,
  description:
    "Private Beta access for authorized Felencho Studio collaborators.",
};

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
      : "/felencho-studio/advanced";

  return (
    <GenesisAccessForm
      nextPath={nextPath}
    />
  );
}
