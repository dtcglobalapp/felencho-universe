import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Play, Pause, RotateCcw, Upload, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { LIGHT_STATES } from '../light/controller';
import { createV3Controller } from '../light/v3/speech';
import { createAudioPlayer, type AudioPlayer } from './player';
import { Scene } from './Scene';
import { createPresenceBridge, type Character } from '@/bridge/FelenchoPresenceBridge';
import { configs, type PresenceConfig } from './config';
import type { V3Controller } from '../light/v3/speech';
function Panel({api,player,config,onClean}:{api:V3Controller;player:AudioPlayer;config:PresenceConfig;onClean:()=>void}){
 const input=useRef<HTMLInputElement>(null);
 const [status,setStatus]=useState(player.getSnapshot),[state,setState]=useState(api.getSnapshot),[tick,setTick]=useState(0);
 useEffect(()=>{const timer=setInterval(()=>{setStatus(player.getSnapshot());setState(api.getSnapshot());setTick(v=>v+1);},100);return()=>clearInterval(timer);},[api,player]);
 void tick;
 const real=status.kind==='file',browser=status.kind==='browser';
 return <aside className="dev-panel audio-lab" aria-label="Laboratorio de presencia">
 <div className="dev-heading"><h2>{config.name} · Audio</h2><span className="v2-badge">PRUEBA 2.5D</span></div>
 <div className="audio-drop" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)player.load(f);}}>
 <input ref={input} type="file" accept=".wav,.mp3,.ogg,.m4a,audio/*" className="sr-only" aria-label="Archivo de audio" onChange={e=>{const file=e.target.files?.[0];if(file)player.load(file);e.target.value='';}} />
 <Button size="lg" onClick={()=>input.current?.click()}><Upload />CARGAR AUDIO {config.voiceName.toUpperCase()}</Button><p>Archivo local · WAV / MP3 / OGG / M4A<br />También puedes arrastrarlo aquí.</p>
 </div>
 <p className="audio-file">{status.fileName||'Ningún archivo cargado'}{status.loading?' · Comprobando formato…':''}</p>
 {status.error&&<p role="alert" className="audio-error">{status.error}</p>}
 <div className="audio-transport"><Button aria-label={status.playing?'Pausar audio':'Reproducir audio'} title={status.playing?'Pausar audio':'Reproducir audio'} variant="secondary" onClick={()=>status.playing?player.pause():void player.resume()}>{status.playing?<Pause />:<Play />}{status.playing?'Pausar':'Reproducir'}</Button><Button variant="outline" aria-label="Reiniciar audio" title="Reiniciar: detener y volver a cero" onClick={()=>player.stop()}><RotateCcw />Reiniciar</Button></div>
 <div className="audio-row"><div className="audio-label"><label id="audio-volume"><Volume2 className="inline size-3" /> Volumen</label><output>{Math.round(status.volume*100)}%</output></div><Slider aria-labelledby="audio-volume" min={0} max={1} step={0.01} value={[status.volume]} onValueChange={v=>player.setVolume(v[0]??0.8)} /></div>
 <div className="audio-source"><strong>{browser?'ENERGÍA SIMULADA APROXIMADA':real?'ANÁLISIS DE ARCHIVO REAL':'SIN AUDIO'}</strong><span>{state.state} · {status.time.toFixed(1)} / {status.duration.toFixed(1)} s</span></div>
 <div className="audio-label"><span>RMS real</span><output>{status.rms.toFixed(4)}</output></div><meter className="audio-meter" min={0} max={0.5} value={status.rms} aria-label="RMS real" />
 <div className="audio-bands">{(['level','bass','mids','treble'] as const).map((key,i)=><div key={key}><span>{['Nivel','Graves','Medios','Agudos'][i]}</span><meter min={0} max={1} value={state.audio[key]} aria-label={['Nivel','Graves','Medios','Agudos'][i]} /><output>{state.audio[key].toFixed(2)}</output></div>)}</div>
 <div className="audio-browser"><Button variant="outline" onClick={()=>player.speak()}><Volume2 />PROBAR VOZ DEL NAVEGADOR</Button><p className="v3-notice">Voz temporal de navegador — NO es {config.voiceName.toUpperCase()}</p><p>Solo voz española instalada localmente. Energía aproximada, sin análisis de su sonido.</p></div>
 <Button variant="outline" onClick={()=>{player.stop();api.rig.startDemo();}}>DEMO ENERGÍA · 12 s · SIN SONIDO</Button>
 <p className="v3-notice">{rigDemo(api) ? 'DEMO · ENERGÍA SIMULADA' : 'Producción · labios estáticos · sin lip sync'}</p>
 <div className="dev-label">Estados · detienen el audio</div><div className="state-grid">{LIGHT_STATES.map(s=><Button key={s} size="sm" variant={state.state===s?'secondary':'outline'} onClick={()=>{player.stop();api.setState(s);}}>{s}</Button>)}</div>
 <div className="v2-links"><Button asChild variant="ghost" size="sm"><Link to="/lina-v3-audio">Lina aprobada</Link></Button><Button variant="ghost" size="sm" onClick={onClean}>Vista limpia</Button></div>
 </aside>;
}
function rigDemo(api:V3Controller){return api.rig.getSnapshot().demoElapsed!==null;}
export function Presence({character,dev=false}:{character:Character;dev?:boolean}){
 const config=configs[character];const [api]=useState(createV3Controller),[player,setPlayer]=useState<AudioPlayer|null>(null),[ready,setReady]=useState(false),[clean,setClean]=useState(false);
 useEffect(()=>{const value=createAudioPlayer(api,config.name);api.speech.setMode('energy');setPlayer(value);
 const unsubscribe=presenceBridge.subscribe(character,message=>{api.rig.stopDemo();api.setState(message.state);api.pushAudio(message.audio??{});});
 if(import.meta.env.DEV){window.__presences??={};window.__presences[character]={player:value,api};}
 return()=>{unsubscribe();value.dispose();if(window.__presences?.[character]?.api===api)delete window.__presences[character];};},[api,character,config]);
 return <><div className="light-stage" data-scene-ready={ready?'true':undefined}>{player&&<Scene api={api} player={player} config={config} ready={()=>setReady(true)} />}</div>{dev&&!clean&&player&&<Panel api={api} player={player} config={config} onClean={()=>setClean(true)} />}</>;
}
export const presenceBridge=createPresenceBridge();
export default function Experience({dev=false,pair=false}:{dev?:boolean;pair?:boolean}){return pair&&dev?<div className="presence-pair">{(['bob','lina'] as const).map(character=><section key={character} data-character={character}><div className="portrait-stage"><Presence character={character} dev /></div></section>)}</div>:<Presence character="bob" dev={dev} />;}
declare global {interface Window {__presences?:Partial<Record<Character,{player:AudioPlayer;api:V3Controller}>>}}