import { notFound } from "next/navigation";
import FixedStudioDisplay from "../../studio/[character]/FixedStudioDisplay";

export const dynamic = "force-dynamic";

export default async function ScreenPage({ params }: { params: Promise<{ character: string }> }) {
  const { character } = await params;
  if (character !== "bob" && character !== "lina") notFound();
  return <FixedStudioDisplay character={character} />;
}
