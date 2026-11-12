import { notFound } from 'next/navigation';
import LocalAudioHologram from '../LocalAudioHologram';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Felencho · Local Audio Hologram Test', robots: { index: false, follow: false } };
export default async function Page({params}:{params:Promise<{persona:string}>}) {
  const {persona} = await params;
  if (persona !== 'lina' && persona !== 'bob') notFound();
  return <LocalAudioHologram persona={persona} />;
}
