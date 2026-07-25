import AvatarStudio from "./AvatarStudio";
import {
  GENESIS_VERSION_LABEL,
} from "../config/GenesisConfig";

export const metadata = {
  title: `Felencho Avatar Studio | ${GENESIS_VERSION_LABEL}`,
  description:
    "Visual actor construction studio for Felencho Avatar Engine.",
};

export default function AvatarStudioPage() {
  return <AvatarStudio />;
}
