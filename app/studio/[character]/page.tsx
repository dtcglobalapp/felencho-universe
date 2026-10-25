import { notFound } from "next/navigation";
import FixedStudioDisplay from "./FixedStudioDisplay";

export const dynamic = "force-dynamic";
export default async function StudioPage({ params }: { params: Promise<{ character: string }> }) {
  const { character } = await params;
  if (character !== "bob" && character !== "lina") notFound();
  return <FixedStudioDisplay character={character} />;
}
