'use client';
import dynamic from 'next/dynamic';
import { characters } from '../../src/hologram-config';
const Experience = dynamic(() => import('../../src/hologram/HologramExperience').then(m => m.HologramExperience), { ssr: false });
export default function HologramClient() { return <Experience characters={characters} initialPersona="lina" storage="local" screenPaths={{ lina: '/hologram-preview/lina', bob: '/hologram-preview/bob' }} />; }
