import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from "@react-three/postprocessing";
import { useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { LinaEntity } from "./LinaEntity";
import { BobEntity } from "./BobEntity";
import type { HologramPalette } from './characters';
import { hologram, type Persona } from "./engine";
import { photoCoreStore } from "./photoCoreStore";

function isLowPower() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|Android/i.test(ua) || (navigator.hardwareConcurrency ?? 8) <= 4;
}

export function HologramStage({ portraitDisplay = false, fixedPersona, palette, legacyFace }: { portraitDisplay?: boolean; fixedPersona?: Persona; palette?: HologramPalette; legacyFace?: ReactNode }) {
  const [low, setLow] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const [portrait, setPortrait] = useState(false);
  const [cameraDistance, setCameraDistance] = useState(9.5);
  const [persona, setPersona] = useState<Persona>(fixedPersona ?? hologram.persona);
  const [, refreshPhoto] = useState(0);
  useEffect(() => photoCoreStore.on(() => refreshPhoto(v => v + 1)), []);
  useEffect(() => { if (fixedPersona) { setPersona(fixedPersona); return; } setPersona(hologram.persona); return hologram.onPersona(setPersona) as () => void; }, [fixedPersona]);

  useEffect(() => {
    setLow(isLowPower());
    const onR = () => {
      const aspect = window.innerWidth / window.innerHeight;
      setPortrait(portraitDisplay || aspect < 1);
      setCameraDistance(portraitDisplay ? (persona === "bob" ? 20.4 : 19.2) : aspect < 1 ? Math.max(13, 5.8 / (Math.tan(Math.PI / 8) * aspect)) : 9.5);
    };
    onR();
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, [portraitDisplay, persona]);

  if (low === null) return <div className="fixed inset-0 bg-background" />;

  return (
    <div ref={wrap} className={portraitDisplay ? "presence-stage bg-background" : "fixed inset-0 bg-background"} data-scene-ready={ready ? "" : undefined} data-host={persona} data-photo-status={photoCoreStore.hasPhoto(persona) ? "photo" : "energy"}>
      <Canvas
        dpr={low ? [1, 1.5] : [1, 2]}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, portrait ? cameraDistance : 9.5], fov: 45 }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(new THREE.Color("#000000"));
          scene.fog = null;
          requestAnimationFrame(() => setReady(true));
        }}
      >
        {persona === 'bob'
          ? <BobEntity key={`bob-${JSON.stringify(palette)}`} lowPower={low} photoDisplay={portraitDisplay} palette={palette} legacyFace={legacyFace} />
          : <LinaEntity key={`lina-${JSON.stringify(palette)}`} lowPower={low} photoDisplay={portraitDisplay} palette={palette} legacyFace={legacyFace} />}
        <EffectComposer multisampling={0}>
          <Bloom intensity={low ? 1.1 : 1.5} luminanceThreshold={0.22} luminanceSmoothing={0.4} mipmapBlur radius={0.8} />
          <ChromaticAberration offset={new THREE.Vector2(0.0009, 0.0012)} radialModulation modulationOffset={0.3} />
          <Vignette darkness={0.9} offset={0.2} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
