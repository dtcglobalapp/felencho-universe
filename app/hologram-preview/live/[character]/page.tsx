import { notFound } from 'next/navigation';
import HologramLiveClient from './HologramLiveClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Felencho Studio — Hologram Live Audio Test', robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ character: string }> }) {
  const { character } = await params;
  if (character !== 'bob' && character !== 'lina') notFound();
  return <HologramLiveClient character={character} />;
}
