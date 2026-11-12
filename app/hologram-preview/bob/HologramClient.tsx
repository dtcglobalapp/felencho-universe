'use client';
import dynamic from 'next/dynamic';
import { characters } from '../../../src/hologram-config';
const Screen = dynamic(() => import('../../../src/hologram/BobScreen').then(m => m.BobScreen), { ssr: false });
export default function HologramClient() { return <Screen config={characters.bob} storage="local" />; }
