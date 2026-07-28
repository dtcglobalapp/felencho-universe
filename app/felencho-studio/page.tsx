import type {
  Metadata,
} from "next";
import {
  redirect,
} from "next/navigation";

import {
  FELENCHO_STUDIO,
} from "../avatar-engine/config/GenesisConfig";

export const metadata: Metadata = {
  title: `${FELENCHO_STUDIO.name} v${FELENCHO_STUDIO.version}`,
  description: FELENCHO_STUDIO.tagline,
};

export default function FelenchoStudioPage() {
  redirect(
    "/felencho-studio/dashboard",
  );
}
