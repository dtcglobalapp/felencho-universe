import { ClientOnly } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
const Experience=lazy(()=>import('./Experience'));
export function BobView({dev=false,pair=false}:{dev?:boolean;pair?:boolean}){return <ClientOnly fallback={<div className="light-stage" />}><Suspense fallback={<div className="light-stage" />}><Experience dev={dev} pair={pair} /></Suspense></ClientOnly>;}