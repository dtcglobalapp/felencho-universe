'use client';
import dynamic from 'next/dynamic';
import { LiveKitAudioBridge } from '../../../../src/hologram/LiveKitAudioBridge';
import { characters } from '../../../../src/hologram-config';

const Lina = dynamic(() => import('../../../../src/hologram/LinaScreen').then(m => m.LinaScreen), { ssr: false });
const Bob = dynamic(() => import('../../../../src/hologram/BobScreen').then(m => m.BobScreen), { ssr: false });

export default function HologramLiveClient({ character }: { character: 'bob' | 'lina' }) {
  return <main className="relative h-[100dvh] w-full overflow-hidden bg-black">
    {character === 'bob' ? <Bob config={characters.bob} storage="local" /> : <Lina config={characters.lina} storage="local" />}
    <LiveKitAudioBridge persona={character} />
  </main>;
}
