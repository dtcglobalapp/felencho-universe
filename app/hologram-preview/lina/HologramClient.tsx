'use client';
import dynamic from 'next/dynamic';
import { characters } from '../../../src/hologram-config';
const Screen = dynamic(() => import('../../../src/hologram/LinaScreen').then(m => m.LinaScreen), { ssr: false });
export default function HologramClient() { return <Screen config={characters.lina} storage="local" />; }
