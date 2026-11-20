import type { V3Controller } from '../light/v3/speech';
import { acceptedAudio, measure } from '../light/v3-audio/analysis';
export const TEMP_PHRASE='Hola Felencho, soy Lina. Bienvenido a Felencho Mundial.';
export function createAudioPlayer(api:V3Controller, name:string){
 const audio=new Audio();audio.preload='auto';audio.volume=0.8;
 let context:AudioContext|null=null,source:MediaElementAudioSourceNode|null=null,analyser:AnalyserNode|null=null,url:string|null=null;
 let samples=new Float32Array(2048),spectrum=new Float32Array(1024),rms=0,error='',fileName='',voice=false,voicePaused=false,voiceTime=0,disposed=false,loading=false;
 let generation=0,utterance:SpeechSynthesisUtterance|null=null;
 const zero=()=>{rms=0;api.pushAudio({});api.setState('IDLE');};
 const stopVoice=()=>{generation++;if(voice&&'speechSynthesis' in window)window.speechSynthesis.cancel();voice=false;voicePaused=false;utterance=null;};
 const fail=(message:string)=>{audio.pause();stopVoice();error=message;loading=false;zero();};
 audio.onended=zero;audio.onpause=()=>{if(!voice)zero();};
 audio.onerror=()=>fail('Formato no compatible o archivo ilegible. Prueba WAV PCM o MP3.');
 audio.onloadedmetadata=()=>{loading=false;};
 const graph=async()=>{
  if(!context){context=new AudioContext({latencyHint:'interactive'});source=context.createMediaElementSource(audio);analyser=context.createAnalyser();analyser.fftSize=2048;analyser.smoothingTimeConstant=0.55;source.connect(analyser);analyser.connect(context.destination);samples=new Float32Array(analyser.fftSize);spectrum=new Float32Array(analyser.frequencyBinCount);}
  if(context.state==='suspended')await context.resume();
 };
 const player={
  element:audio,
  getSnapshot:()=>({fileName,error,loading,playing:voice?!voicePaused:!audio.paused,kind:voice?'browser':fileName?'file':'none',rms,time:voice?voiceTime:audio.currentTime,duration:Number.isFinite(audio.duration)?audio.duration:0,volume:audio.volume,context:context?.state??'sin iniciar'}),
  load(file:File){stopVoice();audio.pause();api.speech.stop();zero();error='';loading=false;
   if(url){URL.revokeObjectURL(url);url=null;}audio.removeAttribute('src');audio.load();fileName='';
   if(!acceptedAudio(file.name)){fail('Formato no compatible. Elige WAV, MP3, OGG o M4A.');return;}
   fileName=file.name;loading=true;url=URL.createObjectURL(file);audio.src=url;audio.load();
  },
  async play(){stopVoice();api.rig.stopDemo();api.speech.stop();error='';if(!url){fail('Carga primero un archivo de audio.');return;}try{await graph();if(disposed)return;await audio.play();api.rig.setMotion(true);api.setState('SPEAKING');}catch{fail('No se pudo reproducir. Comprueba el formato y vuelve a pulsar reproducir.');}},
  pause(){if(voice){window.speechSynthesis.pause();voicePaused=true;zero();}else audio.pause();},
  async resume(){if(voice){window.speechSynthesis.resume();voicePaused=false;api.setState('SPEAKING');}else await player.play();},
  stop(){audio.pause();audio.currentTime=0;stopVoice();api.rig.stopDemo();api.speech.stop();zero();},
  setVolume(value:number){audio.volume=Math.max(0,Math.min(1,Number.isFinite(value)?value:0.8));if(utterance)utterance.volume=audio.volume;},
  speak(){player.stop();error='';if(!('speechSynthesis' in window)){fail('Este navegador no dispone de voz temporal. Carga un archivo.');return;}
   if(window.speechSynthesis.speaking){fail('Otra voz temporal está hablando. Espera a que termine.');return;}
   const voices=window.speechSynthesis.getVoices().filter(v=>v.localService&&v.lang.toLowerCase().startsWith('es'));
   if(!voices.length){fail('No hay una voz española local disponible. Instala una voz española del sistema o carga un archivo.');return;}
   const ticket=++generation;utterance=new SpeechSynthesisUtterance(`Hola Felencho, soy ${name}. Bienvenido a Felencho Mundial.`);utterance.lang=voices[0]?.lang??'es-ES';utterance.voice=voices[0]??null;utterance.volume=audio.volume;utterance.rate=0.95;voiceTime=0;voice=true;voicePaused=false;
   utterance.onstart=()=>{if(ticket!==generation)return;api.rig.setMotion(true);api.setState('SPEAKING');};
   utterance.onend=()=>{if(ticket!==generation)return;voice=false;utterance=null;zero();};
   utterance.onerror=()=>{if(ticket!==generation)return;fail('La voz temporal no pudo reproducirse. Carga un archivo local.');};
   window.speechSynthesis.speak(utterance);
  },
  step(delta:number){if(disposed)return;
   if(voice&&!voicePaused){voiceTime+=delta;rms=0;const level=0.25+Math.sin(voiceTime*9)**2*0.65;api.setState('SPEAKING');api.pushAudio({level,bass:level*0.6,mids:level,treble:Math.sin(voiceTime*17)**2*0.6});}
   else if(!audio.paused&&!audio.ended&&analyser){analyser.getFloatTimeDomainData(samples);analyser.getFloatFrequencyData(spectrum);const result=measure(samples,spectrum,context?.sampleRate??48000,analyser.fftSize);rms=result.rms;api.pushAudio(result.bands);api.setState('SPEAKING');}
  },
  dispose(){disposed=true;audio.pause();audio.onended=null;audio.onpause=null;audio.onerror=null;audio.onloadedmetadata=null;audio.removeAttribute('src');audio.load();stopVoice();source?.disconnect();analyser?.disconnect();if(context)void context.close();if(url)URL.revokeObjectURL(url);zero();},
 };
 return player;
}
export type AudioPlayer=ReturnType<typeof createAudioPlayer>;