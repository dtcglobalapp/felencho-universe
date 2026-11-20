import { createV2Controller } from '../v2/rig';
import { unit } from '../controller';
export const VISEMES = ['sil', 'AA', 'E', 'O', 'MBP'] as const;
export type Viseme = typeof VISEMES[number];
export const SPEECH_SECONDS = 12;
export const LIP_DEFAULT = 0.15;
export const LIP_MAX = 0.35;
export const PHRASE = 'Hola, soy Lina. Mi luz te acompaña. Bienvenido a Felencho.';
// Hand-authored visual score; these timings are NOT phonetic alignment to a voice.
const score: Viseme[] = ['sil','O','AA','sil','E','O','E','AA','sil','MBP','E','AA','O','MBP','AA','E','AA','sil','MBP','E','E','O','AA','sil','E','E','E','O','sil','sil'];
export const TIMELINE = score.map((viseme,i)=>({at:i*0.4, duration:0.4, viseme}));
export const SHAPES: Record<Viseme,{open:number;round:number;wide:number}> = {
  sil:{open:0,round:0,wide:0}, AA:{open:1,round:0,wide:0.15},
  E:{open:0.35,round:0,wide:1}, O:{open:0.7,round:1,wide:0}, MBP:{open:-0.18,round:0,wide:0.08},
};
export function speechAt(seconds:number){
 const time=Math.max(0,Math.min(SPEECH_SECONDS,Number.isFinite(seconds)?seconds:0));
 const index=Math.min(score.length-1,Math.floor(time/0.4));
 const viseme=time>=SPEECH_SECONDS?'sil':score[index]??'sil';
 const envelope=Math.sin(Math.PI*unit((time-index*0.4)/0.4));
 const level=viseme==='sil'?0:unit(0.25+envelope*0.65);
 return {viseme,index,level,shape:SHAPES[viseme]};
}
export function createV3Controller(){
 const base=createV2Controller();
 let elapsed=0,active=false,paused=false,mode:'lips'|'energy'='lips',amplitude=LIP_DEFAULT;
 let manual:Viseme|null=null;
 let current={...SHAPES.sil};
 const getSnapshot=()=>{const cue=manual?{viseme:manual,index:-1,level:0,shape:SHAPES[manual]}:speechAt(active?elapsed:SPEECH_SECONDS);return {elapsed,active,paused,mode,amplitude,viseme:cue.viseme,index:cue.index,level:cue.level,shape:{...current}};};
 const reset=()=>{elapsed=0;active=false;paused=false;manual=null;current={...SHAPES.sil};base.setState('IDLE');base.pushAudio({});};
 const speech={getSnapshot,
  start(){reset();base.rig.stopDemo();active=true;base.rig.setMotion(true);base.setState('SPEAKING');},
  stop:reset,
  pause(){if(!active)return;paused=true;base.rig.setMotion(false);},
  resume(){if(!active)return;paused=false;base.rig.setMotion(true);},
  setMode(value:'lips'|'energy'){mode=value==='energy'?'energy':'lips';},
  setAmplitude(value:number){amplitude=Number.isFinite(value)?Math.max(0,Math.min(LIP_MAX,value)):LIP_DEFAULT;},
  setViseme(value:Viseme){if(!VISEMES.includes(value))return;active=false;manual=value;current={...SHAPES[value]};},
 };
 const step=(delta:number)=>{
  const dt=Math.max(0,Number.isFinite(delta)?delta:0);
  if(active&&!paused&&base.rig.getSnapshot().moving){
   elapsed=Math.min(SPEECH_SECONDS,elapsed+dt);
   if(elapsed>=SPEECH_SECONDS){active=false;manual=null;current={...SHAPES.sil};base.setState('IDLE');base.pushAudio({});}
   else {const cue=speechAt(elapsed);const k=1-Math.exp(-dt*24);for(const key of ['open','round','wide'] as const)current[key]+=(cue.shape[key]-current[key])*k;
    base.setState('SPEAKING');base.pushAudio({level:cue.level,bass:cue.level*0.8,mids:cue.level,treble:cue.level*(0.4+0.4*Math.sin(elapsed*13)**2)});
   }
  }
  base.rig.step(dt);
 };
 return {...base,rig:{...base.rig,step},speech};
}
export type V3Controller=ReturnType<typeof createV3Controller>;
declare global {interface Window {FelenchoLightV3?:V3Controller;__linaV3?:{sim:(seconds:number)=>void;snapshot:()=>ReturnType<V3Controller['speech']['getSnapshot']>;freeze:(time?:number)=>void}}}