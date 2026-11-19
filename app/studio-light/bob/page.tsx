import StudioLightClient from "@/components/studio-light/StudioLightClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Bob | Felencho Mundial - Local Light Lab",
  robots: { index: false, follow: false },
};

export default async function Page({ searchParams }: {
  searchParams: Promise<{ dev?: string }>;
}) {
  const query = await searchParams;
  return <StudioLightClient character="bob" dev={query.dev === "1"} />;
}
