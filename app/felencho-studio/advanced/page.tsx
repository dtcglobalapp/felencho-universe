import type {
  Metadata,
} from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AvatarStudio from "../../avatar-engine/studio/AvatarStudio";
import {
  canAccessFelenchoStudio,
} from "../../avatar-engine/auth/GenesisAccessPolicy";
import {
  FELENCHO_STUDIO_SESSION_COOKIE,
  getFelenchoStudioSession,
} from "../../avatar-engine/auth/GenesisSession";
import {
  FELENCHO_STUDIO,
  FELENCHO_STUDIO_VERSION_LABEL,
} from "../../avatar-engine/config/GenesisConfig";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title:
    `${FELENCHO_STUDIO_VERSION_LABEL} | ${FELENCHO_STUDIO.advancedMode}`,
  description:
    "Protected professional authoring tools for authorized Felencho Studio collaborators.",
};

export default async function AdvancedModePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(
    FELENCHO_STUDIO_SESSION_COOKIE,
  )?.value;

  const session =
    await getFelenchoStudioSession(token);

  if (
    !session ||
    !canAccessFelenchoStudio(
      session.role,
      session.permissions,
      "advanced",
    )
  ) {
    redirect(
      "/felencho-studio/auth?next=/felencho-studio/advanced",
    );
  }

  return <AvatarStudio />;
}
