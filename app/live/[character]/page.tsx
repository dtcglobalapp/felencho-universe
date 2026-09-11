import { notFound } from "next/navigation";
import LiveCharacterClient from "./LiveCharacterClient";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ character: string }>;
};

export default async function LiveCharacterPage({ params }: Props) {
  const { character } = await params;

  if (character !== "lina" && character !== "bob") {
    notFound();
  }

  return <LiveCharacterClient character={character} />;
}
