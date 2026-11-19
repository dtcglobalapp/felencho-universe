import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, NormalBlending, SRGBColorSpace, Color, DoubleSide, Group, Mesh, ShaderMaterial } from 'three';
import type { PresenceConfig } from './config';
import { flowingParticles, hairFilaments, portraitRelief, samplePortrait } from '../light/v2/geometry';
import { anchorVertex, flowVertex, hairFragment, hairVertex, lightFragment, portraitVertex } from '../light/v2/shaders';
import { portraitFragment } from '../light/v2/shaders';
import { poseAt } from '../light/v2/rig';
import { type V3Controller } from '../light/v3/speech';
import type { AudioPlayer } from './player';

function World({ api, player, config, ready }: { api: V3Controller; player:AudioPlayer; config:PresenceConfig; ready: () => void }) {
  const [openTexture,closedTexture]=useTexture([config.portrait,config.closed]);
  const optics=useMemo(()=>({cyan:new Color(...config.palette.cyan),violet:new Color(...config.palette.violet),gold:new Color(...config.palette.gold)}),[config]);
  const orbit1=useRef<Group>(null),orbit2=useRef<Group>(null),halo=useRef<Group>(null),pulse=useRef<Mesh>(null),throat=useRef<Mesh>(null);
  const frames=useRef(0);
  const resources=useMemo(()=>{
    if(openTexture) openTexture.colorSpace=SRGBColorSpace;
    if(closedTexture) closedTexture.colorSpace=SRGBColorSpace;
    const uniforms={uPortrait:{value:openTexture},uClosed:{value:closedTexture},uTime:{value:0},uBass:{value:0},uMids:{value:0},uTreble:{value:0},uLevel:{value:0},uSleep:{value:0},uListening:{value:0},uThinking:{value:0},uSpeaking:{value:0},uWatching:{value:0},uYaw:{value:0},uBlink:{value:0},uLipAmplitude:{value:0},uLipOpen:{value:0},uLipRound:{value:0},uLipWide:{value:0}};
    const make=(vertexShader:string,fragmentShader:string,additive=true)=>new ShaderMaterial({uniforms,vertexShader,fragmentShader,transparent:true,depthWrite:false,depthTest:false,side:DoubleSide,blending:additive?AdditiveBlending:NormalBlending,toneMapped:false});
    // Sampling runs in this browser-only scene, after local texture loading.
    const image=openTexture?.image as CanvasImageSource;
    return {uniforms,portrait:portraitRelief(),anchors:samplePortrait(image),flow:flowingParticles(),hair:hairFilaments(),portraitMaterial:make(config.character==='bob'?portraitVertex.replace('p.z += head*(0.18', 'p.x += exp(-pow((uv.x-0.51)*9.0,2.0)-pow((uv.y-0.54)*7.0,2.0))*sin(uTime*3.0+uv.y*30.0)*uMids*0.024; p.z += head*(0.18'):portraitVertex,config.character==='bob'?portraitFragment.replace('vec2(0.585,0.352)','vec2(0.51,0.42)').replace('uBlink*eyeMask','0.0*eyeMask'):portraitFragment,false),anchorMaterial:make(anchorVertex,lightFragment),flowMaterial:make((config.character==='bob'?flowVertex.replace('vec3(0.92,0.45,0.85)','vec3(1.0,0.7,0.23)'):flowVertex).replace('gl_PointSize=2.0+aSeed*2.0+uTreble*1.6;', 'gl_PointSize=2.0+aSeed*2.0+uTreble*5.0+uLevel*3.0;').replace('gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);','p.xy*=1.0+uBass*0.16+uLevel*0.12; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);'),lightFragment),hairMaterial:make(config.character==='bob'?hairVertex.replace('vec3(0.78,0.2,0.6)','vec3(1.0,0.7,0.23)'):hairVertex,hairFragment)};
  },[openTexture,closedTexture,config]);
  useEffect(()=>()=>{resources.portrait.dispose();resources.anchors.dispose();resources.flow.dispose();resources.hair.dispose();resources.portraitMaterial.dispose();resources.anchorMaterial.dispose();resources.flowMaterial.dispose();resources.hairMaterial.dispose();},[resources]);
  useFrame((_,delta)=>{
    player.step(delta);
    api.rig.step(delta);
    const rig=api.rig.getSnapshot(),state=api.getSnapshot();
    const t=rig.time,p=poseAt(t,state.state),u=resources.uniforms;
    const smooth=1-Math.exp(-Math.min(delta,0.1)*18);
    u.uTime.value=t;
    const speech=api.speech.getSnapshot();
    u.uLipAmplitude.value=speech.mode==='lips'?speech.amplitude:0;
    u.uLipOpen.value=speech.shape.open;
    u.uLipRound.value=speech.shape.round;
    u.uLipWide.value=speech.shape.wide;
    if(rig.moving){
      for(const [uniform,target] of [[u.uBass,state.audio.bass],[u.uMids,state.audio.mids],[u.uTreble,state.audio.treble],[u.uLevel,state.audio.level],[u.uSleep,state.state==='SLEEP'?1:0],[u.uListening,state.state==='LISTENING'?1:0],[u.uThinking,state.state==='THINKING'?1:0],[u.uSpeaking,state.state==='SPEAKING'?1:0],[u.uWatching,state.state==='WATCHING'?1:0],[u.uYaw,p.headYaw]] as const) uniform.value+=(target-uniform.value)*smooth;
      u.uBlink.value=state.state==='SLEEP'?u.uSleep.value:p.blink;
    }
    if(orbit1.current){orbit1.current.rotation.set(0.50+Math.sin(t*0.8)*0.17,Math.sin(rig.orbitA)*0.42,rig.orbitA*0.25);}
    if(orbit2.current){orbit2.current.rotation.set(-0.5+Math.cos(t)*0.15,Math.sin(rig.orbitB)*0.5,rig.orbitB*0.25);}
    const level=u.uLevel.value,bass=u.uBass.value,mids=u.uMids.value,treble=u.uTreble.value;
    if(orbit1.current){orbit1.current.scale.setScalar(1+bass*0.22);orbit1.current.rotation.z+=level*0.5;}
    if(orbit2.current){orbit2.current.scale.setScalar(1+mids*0.18);orbit2.current.rotation.y+=treble*0.6;}
    if(halo.current){halo.current.rotation.set(0.15,Math.sin(t*0.6)*0.3,t*0.16);halo.current.scale.setScalar(1+level*0.12+treble*0.08);}
    if(pulse.current){const scale=1+((t*0.9)%1)*2+level*2;pulse.current.scale.set(scale,scale,scale);pulse.current.visible=state.state==='SPEAKING';}
    if(throat.current){const scale=1+((t*1.25)%1)*3+mids*1.5;throat.current.scale.set(scale,scale*0.45,scale);throat.current.visible=state.state==='SPEAKING';}
    if(frames.current++===4)ready();
  });
  return <>
    <mesh geometry={resources.portrait} material={resources.portraitMaterial} />
    <points geometry={resources.anchors} material={resources.anchorMaterial} frustumCulled={false} />
    <lineSegments geometry={resources.hair} material={resources.hairMaterial} frustumCulled={false} />
    <points geometry={resources.flow} material={resources.flowMaterial} frustumCulled={false} />
    <group ref={halo} position={[0,1.92,-0.55]}>
      <mesh renderOrder={5}><torusGeometry args={[1.54,0.008,6,160]} /><meshBasicMaterial color={optics.violet} transparent opacity={0.28} blending={AdditiveBlending} depthWrite={false} depthTest={false} /></mesh>
      <mesh renderOrder={5} rotation={[0.18,0,0.1]}><torusGeometry args={[1.59,0.003,4,160,5.4]} /><meshBasicMaterial color={optics.gold} transparent opacity={0.35} blending={AdditiveBlending} depthWrite={false} depthTest={false} /></mesh>
    </group>
    <group ref={orbit1} position={[0,-0.9,0.1]}><Orbit color={optics.cyan} phase={0} /></group>
    <group ref={orbit2} position={[0,-0.4,0.05]}><Orbit color={optics.violet} phase={2.4} /></group>
    <mesh ref={pulse} position={config.core}><torusGeometry args={[0.2,0.01,6,80]} /><meshBasicMaterial color={optics.cyan} transparent opacity={0.45} blending={AdditiveBlending} depthWrite={false} /></mesh>
    <mesh ref={throat} position={[0.03,0.3,0.48]}><torusGeometry args={[0.13,0.006,6,80]} /><meshBasicMaterial color={optics.violet} transparent opacity={0.36} blending={AdditiveBlending} depthWrite={false} depthTest={false} /></mesh>
    <EffectComposer multisampling={0}><Bloom intensity={0.35} luminanceThreshold={0.75} luminanceSmoothing={0.3} mipmapBlur resolutionScale={0.5} /></EffectComposer>
  </>;
}
function Orbit({color,phase}:{color:Color;phase:number}){
  return <><mesh scale={[1,0.38,1]}><torusGeometry args={[2.01,0.009,6,160,5.8]} /><meshBasicMaterial color={color} transparent opacity={0.6} blending={AdditiveBlending} depthWrite={false} /></mesh><mesh position={[Math.cos(phase)*2.01,Math.sin(phase)*0.76,0]}><sphereGeometry args={[0.037,8,8]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh></>;
}
export function Scene({api,player,config,ready}:{api:V3Controller;player:AudioPlayer;config:PresenceConfig;ready:()=>void}){
 return <Canvas dpr={1} camera={{position:[0,0,11],fov:40,near:0.1,far:30}} gl={{alpha:false,antialias:false,powerPreference:'high-performance'}}><Suspense fallback={null}><World api={api} player={player} config={config} ready={ready} /></Suspense></Canvas>;
}