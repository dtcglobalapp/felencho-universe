import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { hologram, type Persona } from "./engine";
import { lipSync } from "./lipSync";
import { HologramPhotoCore } from "./HologramPhotoCore";
import { photoCoreStore } from "./photoCoreStore";
import { CHARACTERS, colorPalette, type HologramPalette } from "./characters";

// ---------- shared GLSL ----------
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

export const LINA_PALETTE = colorPalette(CHARACTERS.lina.palette);
export const BOB_PALETTE = colorPalette(CHARACTERS.bob.palette);

// ---------- plasma core ----------
const coreVert = /* glsl */ `
uniform float uTime; uniform float uAmp; uniform float uBass; uniform float uChaos;
varying vec3 vN; varying vec3 vV; varying float vD; varying vec3 vP;
${NOISE}
void main(){
  vec3 p = position;
  float n = snoise(p*1.6 + uTime*0.35) * (0.16 + uChaos*0.18);
  n += snoise(p*4.0 - uTime*0.8) * (0.05 + uAmp*0.22);
  n += uBass*0.18*snoise(p*0.9+uTime*1.5);
  p += normal * n;
  vD = n; vP = position;
  vec4 mv = modelViewMatrix*vec4(p,1.);
  vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix*mv;
}`;
const coreFrag = /* glsl */ `
uniform float uTime; uniform float uAmp; uniform float uEnergy; uniform float uTreble;
uniform vec3 cA; uniform vec3 cB; uniform vec3 cC; uniform vec3 cD;
varying vec3 vN; varying vec3 vV; varying float vD; varying vec3 vP;
void main(){
  float f = pow(1. - abs(dot(vN, vV)), 2.2);
  float bands = sin(vP.y*18. + uTime*2. + vD*20.)*.5+.5;
  vec3 col = mix(cA, cB, smoothstep(-.15,.25,vD));
  col = mix(col, cC, f);
  col += cD * bands * 0.25 * (0.5+uTreble);
  float core = pow(max(dot(vN,vV),0.), 6.);
  col += vec3(1.,.85,1.) * core * (0.35 + uAmp*1.4);
  float a = (0.25 + f*1.4 + core*0.6) * uEnergy;
  gl_FragColor = vec4(col * (1.2 + uAmp*2.2) * uEnergy, a);
}`;

// ---------- fresnel shell ----------
const shellVert = /* glsl */ `
uniform float uTime; uniform float uAmp;
varying vec3 vN; varying vec3 vV; varying vec3 vP;
${NOISE}
void main(){
  vec3 p = position + normal * snoise(position*0.8+uTime*0.2)*(0.08+uAmp*0.15);
  vP = position;
  vec4 mv = modelViewMatrix*vec4(p,1.);
  vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix*mv;
}`;
const shellFrag = /* glsl */ `
uniform float uTime; uniform float uAmp; uniform float uEnergy; uniform vec3 uColor; uniform vec3 uColor2; uniform float uLines;
varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main(){
  float f = pow(1. - abs(dot(vN, vV)), 3.);
  float scan = smoothstep(.92,1., sin(vP.y*uLines - uTime*3.)*.5+.5);
  float hex = smoothstep(.96,1., abs(sin(atan(vP.z,vP.x)*12.+uTime*.4)));
  vec3 col = mix(uColor, uColor2, f);
  float a = (f*0.9 + scan*0.35 + hex*0.15*f) * uEnergy * (0.7+uAmp);
  gl_FragColor = vec4(col*(1.+uAmp*1.5), a);
}`;

// ---------- energy ring ----------
const ringFrag = /* glsl */ `
uniform float uTime; uniform float uAmp; uniform float uEnergy; uniform vec3 uColor; uniform vec3 uColor2; uniform float uSpeed; uniform float uDash;
varying vec2 vUv;
void main(){
  float flow = fract(vUv.x*uDash - uTime*uSpeed);
  float pulse = smoothstep(0.,.08,flow)*smoothstep(1.,.35,flow);
  float edge = 1. - abs(vUv.y-.5)*2.;
  vec3 col = mix(uColor, uColor2, pulse);
  float a = (0.18 + pulse*0.9) * pow(edge, 0.6) * uEnergy;
  gl_FragColor = vec4(col*(1.3+uAmp*2.5), a);
}`;
const uvVert = /* glsl */ `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

// ---------- particles ----------
const ptsVert = /* glsl */ `
uniform float uTime; uniform float uAmp; uniform float uPix; uniform float uSwirl; uniform float uInflow;
attribute vec3 aSeed; varying float vA; varying float vMix;
void main(){
  float r = aSeed.x; float th = aSeed.y + uTime*(0.15+uSwirl)*(1.6/r); float ph = aSeed.z;
  float rr = r * (1. + uAmp*0.35) ;
  rr = mix(rr, 0.6 + fract(r*7.3 - uTime*0.35)*r, uInflow);
  vec3 p = vec3(cos(th)*rr*sin(ph), cos(ph)*rr*0.75 + sin(uTime+r*3.)*0.05, sin(th)*rr*sin(ph));
  vec4 mv = modelViewMatrix*vec4(p,1.);
  gl_PointSize = uPix * (1.2 + uAmp*2.) * (8. / -mv.z) * (0.4+fract(r*13.1));
  vA = 0.5 + 0.5*sin(uTime*2. + r*20.); vMix = fract(ph*3.);
  gl_Position = projectionMatrix*mv;
}`;
const ptsFrag = /* glsl */ `
uniform vec3 cA; uniform vec3 cB; uniform float uEnergy; varying float vA; varying float vMix;
void main(){
  float d = length(gl_PointCoord-.5); float g = smoothstep(.5,0.,d); g*=g;
  gl_FragColor = vec4(mix(cA,cB,vMix)*1.6, g*vA*uEnergy*step(0.02,g));
}`;

// ---------- sound wave (listening) ----------
const waveFrag = /* glsl */ `
uniform float uTime; uniform float uEnergy; uniform vec3 uColor; varying vec2 vUv;
void main(){
  vec2 c = vUv-.5; float r = length(c)*2.;
  float w = 0.;
  for(int i=0;i<4;i++){ float ph = fract(float(i)*.25 - uTime*.35); w += smoothstep(.025,0.,abs(r-ph)) * (1.-ph); }
  float a = w * uEnergy * smoothstep(1.,.2,r);
  gl_FragColor = vec4(uColor*1.8, a);
}`;

function set(mat: THREE.ShaderMaterial, vals: Record<string, number>) {
  for (const k in vals) { const u = mat.uniforms[k]; if (u) u.value = vals[k]; }
}

const additive = {
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
} as const;

function useMat(vertexShader: string, fragmentShader: string, uniforms: Record<string, unknown>, side: THREE.Side = THREE.FrontSide) {
  return useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: Object.fromEntries(Object.entries(uniforms).map(([k, v]) => [k, { value: v }])),
        side,
        ...additive,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
}

interface RingDef {
  r: number;
  tube: number;
  tilt: [number, number, number];
  speed: number;
  spin: number;
  c1: THREE.Color;
  c2: THREE.Color;
  dash: number;
}

export interface EntityProps { lowPower?: boolean; photoDisplay?: boolean; palette?: HologramPalette | undefined; legacyFace?: ReactNode }
export function HologramEntity({ lowPower = false, persona = "lina", photoDisplay = false, palette, legacyFace }: EntityProps & { persona?: Persona }) {
  const photoConfig = photoCoreStore.active(persona);
  const photoVisible = photoCoreStore.hasPhoto(persona);
  const managedPhoto = photoDisplay || Boolean(photoConfig?.image) || photoConfig?.mode === "energy";
  const P = useMemo(() => palette ? colorPalette(palette) : persona === "bob" ? BOB_PALETTE : LINA_PALETTE, [palette, persona]);
  const orbit = persona === "bob" ? 1.12 : 1;
  const root = useRef<THREE.Group>(null);
  const tiltG = useRef<THREE.Group>(null);
  const coreM = useRef<THREE.Mesh>(null);
  const shellA = useRef<THREE.Mesh>(null);
  const shellB = useRef<THREE.Mesh>(null);
  const cage = useRef<THREE.LineSegments>(null);
  const ringRefs = useRef<(THREE.Group | null)[]>([]);
  const petals = useRef<THREE.Group>(null);
  const wave = useRef<THREE.Mesh>(null);

  const coreMat = useMat(coreVert, coreFrag, { uTime: 0, uAmp: 0, uBass: 0, uChaos: 0, uEnergy: 1, uTreble: 0, cA: P.a, cB: P.b, cC: P.c, cD: P.d });
  const shellMatA = useMat(shellVert, shellFrag, { uTime: 0, uAmp: 0, uEnergy: 1, uColor: P.d, uColor2: P.c, uLines: 40 }, THREE.DoubleSide);
  const shellMatB = useMat(shellVert, shellFrag, { uTime: 0, uAmp: 0, uEnergy: 1, uColor: P.a, uColor2: P.b, uLines: 24 }, THREE.DoubleSide);
  const waveMat = useMat(uvVert, waveFrag, { uTime: 0, uEnergy: 0, uColor: P.c }, THREE.DoubleSide);

  const rings: RingDef[] = useMemo(
    () => [
      { r: 2.2, tube: 0.012, tilt: [1.2, 0, 0.3], speed: 0.35, spin: 0.25, c1: P.c, c2: P.b, dash: 3 },
      { r: 2.55, tube: 0.008, tilt: [0.4, 0.6, 1.1], speed: -0.25, spin: -0.18, c1: P.a, c2: P.c, dash: 5 },
      { r: 2.9, tube: 0.018, tilt: [1.57, 0.2, 0], speed: 0.2, spin: 0.12, c1: P.b, c2: P.d, dash: 2 },
      { r: 3.3, tube: 0.006, tilt: [0.9, -0.8, 0.4], speed: -0.4, spin: 0.22, c1: P.d, c2: P.c, dash: 8 },
      { r: 3.75, tube: 0.01, tilt: [1.4, 0.9, -0.5], speed: 0.15, spin: -0.09, c1: P.c, c2: P.a, dash: 4 },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const ringMats = useMemo(
    () =>
      rings.map(
        (r) =>
          new THREE.ShaderMaterial({
            vertexShader: uvVert,
            fragmentShader: ringFrag,
            uniforms: {
              uTime: { value: 0 }, uAmp: { value: 0 }, uEnergy: { value: 1 },
              uColor: { value: r.c1 }, uColor2: { value: r.c2 }, uSpeed: { value: r.speed }, uDash: { value: r.dash },
            },
            ...additive,
            side: THREE.DoubleSide,
          }),
      ),
    [rings],
  );

  // Particle field
  const ptsCount = lowPower ? 1800 : 5000;
  const { ptsGeo, ptsMat } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const seeds = new Float32Array(ptsCount * 3);
    let s = 1234567;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < ptsCount; i++) {
      seeds[i * 3] = 1.6 + Math.pow(rnd(), 1.6) * 4.2;
      seeds[i * 3 + 1] = rnd() * Math.PI * 2;
      seeds[i * 3 + 2] = Math.acos(2 * rnd() - 1);
    }
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ptsCount * 3), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);
    const m = new THREE.ShaderMaterial({
      vertexShader: ptsVert,
      fragmentShader: ptsFrag,
      uniforms: {
        uTime: { value: 0 }, uAmp: { value: 0 }, uPix: { value: 2 }, uSwirl: { value: 0 }, uInflow: { value: 0 },
        uEnergy: { value: 1 }, cA: { value: P.c }, cB: { value: P.b },
      },
      ...additive,
    });
    return { ptsGeo: g, ptsMat: m };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ptsCount]);

  const cageGeo = useMemo(() => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.75, 1)), []);
  const cageMat = useMemo(() => new THREE.LineBasicMaterial({ color: P.c, ...additive, opacity: 0.35 }), [P.c]);

  // Sculptural petals: 6 thin luminous torus-knot arcs around the core
  const petalGeo = useMemo(() => new THREE.TorusKnotGeometry(1.25, 0.012, lowPower ? 160 : 320, 6, 2, 5), [lowPower]);
  const petalMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: uvVert,
        fragmentShader: ringFrag,
        uniforms: {
          uTime: { value: 0 }, uAmp: { value: 0 }, uEnergy: { value: 1 },
          uColor: { value: P.b }, uColor2: { value: P.c }, uSpeed: { value: 0.3 }, uDash: { value: 6 },
        },
        ...additive,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const time = useRef(0);
  const rot = useRef(0);
  useEffect(() => () => {
    [coreMat, shellMatA, shellMatB, waveMat, petalMat, ptsMat, cageMat, ...ringMats].forEach(material => material.dispose());
    [ptsGeo, cageGeo, petalGeo].forEach(geometry => geometry.dispose());
  }, [coreMat, shellMatA, shellMatB, waveMat, petalMat, ptsMat, cageMat, ringMats, ptsGeo, cageGeo, petalGeo]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    hologram.step(dt);
    lipSync.step();
    const w = hologram.weights;
    const a = hologram.audio;
    const speak = w.speaking;
    const amp = a.level * (speak + w.listening * 0.4);
    const energy = 1 - w.sleep * 0.93;
    const face = photoVisible ? 1 : managedPhoto ? 0 : hologram.faceWeight;
    const tScale = 1 + w.thinking * 1.4 + speak * a.mids * 0.8 - w.sleep * 0.8;
    time.current += dt * tScale;
    const t = time.current;
    const breathe = 1 + Math.sin(t * 1.1) * 0.035 * (1 - w.sleep);

    rot.current += dt * (0.18 + w.thinking * 0.5 + speak * a.bass * 0.9) * (1 - w.sleep * 0.85) * (photoDisplay && persona === "bob" ? 0.72 : 1);
    if (root.current) {
      root.current.rotation.y = rot.current;
      const s = (breathe + a.bass * speak * 0.12) * (1 - w.sleep * 0.35);
      root.current.scale.setScalar(s);
      root.current.position.y = Math.sin(t * 0.6) * 0.08;
    }
    if (tiltG.current) {
      // watching: lean toward attention target
      const at = hologram.attention;
      tiltG.current.rotation.x += (at.y * 0.45 - tiltG.current.rotation.x) * 0.08;
      tiltG.current.rotation.z += (-at.x * 0.25 - tiltG.current.rotation.z) * 0.08;
      tiltG.current.position.x += (at.x * 0.5 - tiltG.current.position.x) * 0.05;
    }

    set(coreMat,{uTime:t,uAmp:amp,uBass:a.bass*speak,uTreble:a.treble*speak,uChaos:w.thinking+hologram.attention.intensity*0.3,uEnergy:energy*(1-face*0.75)*(persona==="bob"?0.55:1)});

    if (coreM.current) {
      coreM.current.rotation.x = t * 0.2;
      coreM.current.rotation.z = t * 0.13;
      coreM.current.scale.setScalar(1 + amp * 0.25);
    }
    for (const [m, ref, dir] of [[shellMatA, shellA, 1], [shellMatB, shellB, -1]] as const) {
      set(m,{uTime:t,uAmp:amp,uEnergy:energy*(0.8+w.watching*0.4)*(1-face*0.5)});
      if (ref.current) { ref.current.rotation.y = t * 0.15 * dir; ref.current.rotation.x = t * 0.07 * dir; }
    }
    if (cage.current) {
      cage.current.rotation.y = -t * 0.12; cage.current.rotation.x = t * 0.05 + w.thinking * Math.sin(t) * 0.6;
      cageMat.opacity = (0.18 + amp * 0.5 + w.thinking * 0.3) * energy;
      cage.current.scale.setScalar(1 + a.treble * speak * 0.15 + w.thinking * 0.1);
    }
    rings.forEach((r, i) => {
      const g = ringRefs.current[i];
      const ringMat = ringMats[i];
      if (ringMat) set(ringMat,{uTime:t,uAmp:amp,uEnergy:energy*(0.8+w.thinking*0.6)});
      if (g) {
        g.rotation.x = r.tilt[0] + Math.sin(t * 0.3 + i) * (0.15 + w.thinking * 0.9);
        g.rotation.y = r.tilt[1] + t * r.spin * (1 + w.thinking * 2.5);
        g.rotation.z = r.tilt[2] + Math.cos(t * 0.21 + i * 2) * (0.1 + w.thinking * 0.6);
        const band = i % 3 === 0 ? a.bass : i % 3 === 1 ? a.mids : a.treble;
        g.scale.setScalar(1 + band * speak * 0.12 * (1 + i * 0.2) - w.sleep * 0.3);
      }
    });
    set(petalMat,{uTime:t,uAmp:amp,uEnergy:energy});
    if (petals.current) {
      petals.current.rotation.y = -t * 0.25; petals.current.rotation.x = Math.sin(t * 0.17) * 0.5;
      petals.current.scale.setScalar(1 + a.mids * speak * 0.15);
    }
    set(ptsMat,{uTime:t,uAmp:amp,uSwirl:w.thinking*0.6+speak*a.mids*0.3,uInflow:w.listening*0.85,uEnergy:energy*0.9,uPix:state.viewport.dpr*1.6});


    set(waveMat,{uTime:t,uEnergy:w.listening*(0.6+a.level)});
    if (wave.current) wave.current.quaternion.copy(state.camera.quaternion);
  });

  return (
    <group ref={tiltG}>
      <group ref={root}>
        <mesh ref={coreM} material={coreMat}>
          <icosahedronGeometry args={[1, lowPower ? 32 : 64]} />
        </mesh>
        <mesh ref={shellA} material={shellMatA}>
          <icosahedronGeometry args={[1.45, lowPower ? 12 : 24]} />
        </mesh>
        <mesh ref={shellB} material={shellMatB} scale={[1.95, 1.6, 1.95]}>
          <sphereGeometry args={[1, lowPower ? 32 : 64, lowPower ? 24 : 48]} />
        </mesh>
        <lineSegments ref={cage} geometry={cageGeo} material={cageMat} />
        <group ref={petals}>
          <mesh geometry={petalGeo} material={petalMat} />
          <mesh geometry={petalGeo} material={petalMat} rotation={[Math.PI / 2, 0, 0]} scale={1.15} />
        </group>
        {rings.map((r, i) => (
          <group key={i} scale={orbit}><group ref={(el) => { ringRefs.current[i] = el; }}>
            <mesh material={ringMats[i] ?? petalMat}>
              <torusGeometry args={[r.r, r.tube, 8, lowPower ? 160 : 320]} />
            </mesh>
            <mesh position={[r.r, 0, 0]}>
              <sphereGeometry args={[0.045, 12, 12]} />
              <meshBasicMaterial color={r.c1} toneMapped={false} />
            </mesh>
          </group></group>
        ))}
      </group>
      {!managedPhoto && legacyFace}
      {photoVisible && <HologramPhotoCore persona={persona} />}
      <points geometry={ptsGeo} material={ptsMat} />
      <mesh ref={wave} material={waveMat}>
        <planeGeometry args={[11, 11]} />
      </mesh>
    </group>
  );
}
