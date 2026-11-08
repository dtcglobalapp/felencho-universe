import { notFound } from 'next/navigation';
import HologramStudioClient from './HologramStudioClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Felencho Hologram — Live Studio Test', robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ character: string }> }) {
  const { character } = await params;
  if (character !== 'bob' && character !== 'lina') notFound();
  return <HologramStudioClient character={character} />;
}
