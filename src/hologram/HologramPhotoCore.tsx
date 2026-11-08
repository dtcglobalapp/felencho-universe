import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { hologram, type Persona } from './engine';
import { photoCoreStore } from './photoCoreStore';
import { photoForState, profilePhotoUrls, profileStore } from './profiles';

// Original photograph on a gently bowed surface: photographic depth, NOT facial reconstruction.
const vertex = `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment = `uniform sampler2D uPhoto; uniform float uBrightness; uniform float uOpacity; varying vec2 vUv;
void main(){ vec2 oval=(vUv-.5)/vec2(.48,.49); float mask=1.-smoothstep(.84,1.,length(oval));
vec4 photo=texture2D(uPhoto,vUv); float a=photo.a*mask*uOpacity; if(a<.005)discard;
gl_FragColor=vec4(photo.rgb*uBrightness,a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;

const FADE_SECONDS = 0.6;

// Shared texture cache: profile photos are preloaded so state changes never hit the network.
const textureCache = new Map<string, Promise<THREE.Texture>>();
export function loadPhotoTexture(url: string): Promise<THREE.Texture> {
  let cached = textureCache.get(url);
  if (!cached) {
    cached = new Promise((resolve, reject) => {
      new THREE.TextureLoader().load(url, t => { t.colorSpace = THREE.SRGBColorSpace; resolve(t); }, undefined, reject);
    });
    textureCache.set(url, cached);
    cached.catch(() => { textureCache.delete(url); });
  }
  return cached;
}
export function preloadProfilePhotos(persona: Persona) {
  const profile = profileStore.selectedProfile(persona);
  if (profile) for (const url of profilePhotoUrls(profile)) void loadPhotoTexture(url).catch(() => {});
}

function makeMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment,
    uniforms: { uPhoto: { value: null }, uBrightness: { value: 1 }, uOpacity: { value: 0 } },
    transparent: true, depthWrite: false,
  });
}

export function HologramPhotoCore({ persona }: { persona: Persona }) {
  const config = photoCoreStore.active(persona);
  const profile = profileStore.selectedProfile(persona);
  const [holoState, setHoloState] = useState(hologram.state);
  const [, refreshProfiles] = useState(0);
  useEffect(() => hologram.onState(setHoloState) as () => void, []);
  useEffect(() => profileStore.on(() => refreshProfiles(v => v + 1)), []);
  useEffect(() => { preloadProfilePhotos(persona); }, [persona, profile?.id, profile?.updatedAt]);

  const image = profile ? photoForState(profile, holoState) : config?.image;
  const visual = profile ? profile.visual : config;
  const baseOpacity = visual?.opacity ?? 1;
  const brightness = visual?.brightness ?? 1;

  const meshA = useRef<THREE.Mesh>(null);
  const meshB = useRef<THREE.Mesh>(null);
  const matA = useMemo(makeMaterial, []);
  const matB = useMemo(makeMaterial, []);
  // shown = url fully displayed; pending = url fading in
  const shown = useRef<string | null>(null);
  const pending = useRef<string | null>(null);
  const fade = useRef(1);
  const [, bump] = useState(0);

  // Queue a transition whenever the target image changes.
  useEffect(() => {
    const target = image ?? null;
    if (target === shown.current || target === pending.current) return;
    if (!target) { pending.current = null; shown.current = null; return; }
    pending.current = target;
    loadPhotoTexture(target).then(texture => {
      if (pending.current !== target) return;
      const u = matB.uniforms['uPhoto'];
      if (u) u.value = texture;
      fade.current = shown.current ? 0 : 0.0001;
      bump(v => v + 1);
    }).catch(() => {
      if (pending.current === target) pending.current = null;
      photoCoreStore.fail(persona, 'La fotografía no pudo cargarse. Se mantiene la anterior.');
    });
  }, [image, matB, persona]);

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(3.8, 3.8, 24, 24);
    const pos = g.attributes['position'];
    if (pos) for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); pos.setZ(i, .10 * Math.max(0, 1 - (x / 1.7) ** 2 - (y / 1.9) ** 2)); }
    return g;
  }, []);
  useEffect(() => () => { geometry.dispose(); matA.dispose(); matB.dispose(); }, [geometry, matA, matB]);

  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    // Advance crossfade; the outgoing photo stays visible until the incoming one is ready.
    if (pending.current && matB.uniforms['uPhoto']?.value) {
      fade.current = Math.min(1, fade.current + dt / FADE_SECONDS);
      const e = fade.current * fade.current * (3 - 2 * fade.current);
      const opB = matB.uniforms['uOpacity'], opA = matA.uniforms['uOpacity'];
      if (opB) opB.value = e * baseOpacity;
      if (opA) opA.value = (1 - e) * baseOpacity;
      if (fade.current >= 1) {
        shown.current = pending.current;
        pending.current = null;
        const swapA = matA.uniforms['uPhoto'], swapB = matB.uniforms['uPhoto'];
        if (swapA && swapB) { swapA.value = swapB.value; swapB.value = null; }
        if (opA) opA.value = baseOpacity;
        if (opB) opB.value = 0;
      }
    } else {
      const opA = matA.uniforms['uOpacity'];
      if (opA) opA.value = baseOpacity;
    }
    const brA = matA.uniforms['uBrightness'], brB = matB.uniforms['uBrightness'];
    if (brA) brA.value = brightness;
    if (brB) brB.value = brightness;
    for (const mesh of [meshA.current, meshB.current]) if (mesh) mesh.quaternion.copy(camera.quaternion);
  });

  if (!config || photoCoreStore.errors[persona]) return null;
  const px = visual?.x ?? 0, py = visual?.y ?? 0, scale = visual?.scale ?? 1;
  return (
    <group position={[px, py + .1, .65]} scale={scale}>
      <mesh ref={meshA} geometry={geometry} material={matA} renderOrder={10} />
      <mesh ref={meshB} geometry={geometry} material={matB} renderOrder={11} />
    </group>
  );
}
