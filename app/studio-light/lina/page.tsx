import StudioLightClient from "@/components/studio-light/StudioLightClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Lina | Felencho Mundial - Local Light Lab",
  robots: { index: false, follow: false },
};

export default async function Page({ searchParams }: {
  searchParams: Promise<{ dev?: string }>;
}) {
  const query = await searchParams;
  return <StudioLightClient character="lina" dev={query.dev === "1"} />;
}
