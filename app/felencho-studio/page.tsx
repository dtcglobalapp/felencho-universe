import type {
  Metadata,
} from "next";

import {
  FELENCHO_STUDIO,
} from "../avatar-engine/config/GenesisConfig";
import StudioWelcome from "./components/StudioWelcome";

export const metadata: Metadata = {
  title: `${FELENCHO_STUDIO.name} | Create an Intelligent Digital Professional`,
  description: FELENCHO_STUDIO.tagline,
};

export default function FelenchoStudioPage() {
  return <StudioWelcome />;
}
