#!/usr/bin/env node
// Isolated Mac lab; never kills unknown PIDs or processes started outside this panel.
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {connect} from 'node:net';
import {mkdirSync, existsSync, createWriteStream, writeFileSync, readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const home=homedir();
const realtimeRoot=join(home,'Documents','felencho-realtime-lab');
const realtimePython=join(home,'felencho-qwen3-tts-lab','.venv','bin','python');
const logs=join(home,'Library','Logs','FelenchoStudioLab');
mkdirSync(logs,{recursive:true});
const displayEpochFile=join(logs,'display-generation.json');
const publishDisplayEpoch=()=>{
 // Shared with the Next.js route; TVs poll this version without accessing port 7892.
 // Update only when the web service is started by Studio Control.
 const generation={generation:new Date().toISOString()+'-'+process.pid+'-'+Math.random().toString(36).slice(2,9)};
 writeFileSync(displayEpochFile,JSON.stringify(generation),{mode:0o600});
};
process.env.PATH='/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:'+process.env.PATH;
const services={
 livekit:{label:'LiveKit',port:7880,cmd:'livekit-server',args:['--dev'],cwd:root},
 web:{label:'Hologramas',port:3001,cmd:'npm',args:['run','dev','--','--hostname','127.0.0.1','--port','3001'],cwd:root,probe:'/hologram-local-lab/lina'},
 voices:{label:'Voces WebRTC',port:7890,cmd:'npm',args:['start'],cwd:join(home,'Documents','felencho-livekit-webrtc-lab','tools','livekit-local-lab','webrtc-two'),probe:'/token?role=A'},
 bridge:{label:'Puente Bob/Lina',port:7891,cmd:'node',args:[join(root,'tools','hologram-local-lab','wake-bridge.mjs')],cwd:root,probe:'/health'},
 whisper:{label:'Whisper mic (prueba)',port:null,cmd:'node',args:[join(root,'tools','hologram-local-lab','mic-whisper-wake.mjs'),'--device','0','--seconds','6','--bridge'],cwd:root},
 realtime:{label:'Realtime Lab · pruebas',port:3002,cmd:'npm',args:['run','dev','--','--hostname','127.0.0.1','--port','3002'],cwd:realtimeRoot,probe:'/studio-realtime-lab'},
 tts:{label:'Qwen3-TTS persistente · Ryan/Serena/candidatos',port:7894,cmd:realtimePython,args:[join(realtimeRoot,'tools','realtime-lab','persistent_tts.py')],cwd:realtimeRoot,probe:'/health'},
};
const owned=new Map();
const isBusy=p=>new Promise(done=>{
 const s=connect({host:'127.0.0.1',port:p});
 s.once('connect',()=>{s.destroy();done(true)});
 s.once('error',()=>done(false));
 s.setTimeout(1000,()=>{s.destroy();done(false)});
});
async function healthy(s) {
 if(!s.port)return false;
 if(!(await isBusy(s.port)))return false;
 if(!s.probe)return true;
 try{return (await fetch('http://127.0.0.1:'+s.port+s.probe,{signal:AbortSignal.timeout(1800)})).ok}
 catch{return false}
}
function recentLog(key){
  if(!services[key])return '';
  const path=join(logs,key+'.log');
  if(!existsSync(path))return 'Todavía no hay registro de arranque.';
  try{
    const data=readFileSync(path,'utf8').slice(-6000);
    return data.split('\\n').slice(-16).join('\\n').slice(-2400);
  }catch(e){return 'No se pudo leer el registro: '+e.message}
}
async function status(){
 const out={};
 for(const [key,s] of Object.entries(services)){
  const child=owned.get(key),busy=s.port?await isBusy(s.port):false;
  out[key]={label:s.label,port:s.port,owned:!!child,external:busy&&!child,healthy:s.port?await healthy(s):!!child};
  if(key==='tts'||key==='realtime')out[key].lastLog=recentLog(key);
  if(key==='tts'&&busy){try{const response=await fetch('http://127.0.0.1:7894/health',{signal:AbortSignal.timeout(900)});const info=await response.json();out[key].voices=Array.isArray(info.voices)?info.voices:[];}catch{out[key].voices=[];}}
 }
 return out;
}
async function start(key){
 const s=services[key];
 if(!s)throw Error('Servicio desconocido');
 if(owned.has(key))throw Error('Ya iniciado desde este panel');
 if(s.port&&await isBusy(s.port))throw Error('Puerto '+s.port+' ocupado: no se toca ese proceso');
 if(!existsSync(s.cwd))throw Error('Carpeta no encontrada: '+s.cwd);
 if(key==='web'&&!existsSync(join(root,'node_modules')))throw Error('Faltan node_modules en el repositorio');
 if(key==='realtime'&&!existsSync(join(realtimeRoot,'node_modules')))throw Error('Faltan node_modules en el laboratorio Realtime');
 if(key==='tts'&&!existsSync(realtimePython))throw Error('No existe el entorno Python del sintetizador: '+realtimePython);
 if(key==='tts'&&!existsSync(s.args[0]))throw Error('Falta persistent_tts.py en Realtime Lab');
 if(key==='whisper'){
  if(!(await healthy(services.bridge)))throw Error('Primero activa Puente Bob/Lina');
  if(!existsSync(join(home,'felencho-whisper-lab/models/ggml-small.bin')))throw Error('Modelo Whisper no disponible');
 }
 const log=createWriteStream(join(logs,key+'.log'),{flags:'a'});
 log.write('\nSTART '+new Date().toISOString()+'\n');
 const child=spawn(s.cmd,s.args,{cwd:s.cwd,env:process.env,detached:true,stdio:['ignore','pipe','pipe']});
 if(key==='web')publishDisplayEpoch();
 owned.set(key,child);
 child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});
 child.on('error',e=>log.write('ERROR '+e.message+'\n'));
 child.once('close',()=>{if(owned.get(key)===child)owned.delete(key);log.end('STOP '+new Date().toISOString()+'\n')});
 return 'Iniciando '+s.label+'. Comprueba el estado en unos segundos.';
}
async function stop(key){
 const child=owned.get(key);
 if(!child)throw Error('Proceso externo o apagado: este panel no puede detenerlo');
 try { process.kill(-child.pid,'SIGTERM'); } catch { child.kill('SIGTERM'); }
 return 'Apagado solicitado: '+services[key].label;
}
async function stopAll(){
 const notes=[];
 for(const key of ['whisper','tts','realtime','bridge','voices','web','livekit'])if(owned.has(key))notes.push(await stop(key));
 return notes.length?notes.join(' · '):'No hay procesos propios que detener';
}
const html="<!doctype html><html lang=\"es\"><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Felencho Mundial · Studio Lab</title>\n<style>body{font:16px system-ui;background:#0a111c;color:#eef5ff;max-width:900px;margin:25px auto;padding:15px}article{background:#1a2738;padding:15px;border-radius:12px;margin:12px 0;border:1px solid #33465f}.line{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}button{background:#2583b6;color:white;border:0;border-radius:7px;padding:10px 13px;margin:4px;cursor:pointer}button:disabled{opacity:.35}.secondary{background:#596a7d}.danger{background:#9c455a}.good{color:#56dda3}.warn{color:#f1c875}a{color:#8bcfff}#message{padding:14px;background:#293750}</style>\n<h1>🎙️ Felencho Mundial</h1><p>Studio Control · laboratorio local en La Bestia</p><button onclick=\"actionNow('all-start')\">Iniciar laboratorio</button><button class=\"danger\" onclick=\"actionNow('all-stop')\">Apagar servicios del panel</button><button class=\"secondary\" onclick=\"refresh()\">Actualizar</button>\n<div id=\"services\"></div><section style=\"background:#1a2738;border:1px solid #33465f;border-radius:12px;padding:15px;margin:12px 0\"><strong>Prueba silenciosa — sin micrófono</strong><p>Activa LISTENING durante 3,5 segundos en una sola pantalla. Abre Bob y Lina antes de probar.</p><button onclick=\"actionNow('test-wake','bob')\">Probar Bob</button><button onclick=\"actionNow('test-wake','lina')\">Probar Lina</button><p style=\"margin-top:10px\">Descanso individual — sin micrófono</p><button class=\"secondary\" onclick=\"actionNow('test-sleep','bob')\">Dormir Bob</button><button class=\"secondary\" onclick=\"actionNow('test-sleep','lina')\">Dormir Lina</button></section><p id=\"message\" role=\"status\">Solo controlamos procesos iniciados desde este panel.</p><p><a target=\"_blank\" href=\"http://localhost:3001/hologram-local-lab/bob\">Pantalla Bob</a> · <a target=\"_blank\" href=\"http://localhost:3001/hologram-local-lab/lina\">Pantalla Lina</a> · <a target=\"_blank\" href=\"http://127.0.0.1:7890\">Voces</a> · <a target=\"_blank\" href=\"http://localhost:3001/studio-conversation-lab\">Conversación en vivo (lab)</a> · <a target=\"_blank\" href=\"http://127.0.0.1:3002/studio-realtime-lab\">Realtime Lab · audición</a></p><footer>Whisper requiere activación manual del micrófono. Realtime Lab y TTS son experimentales; iniciar desde este panel para permitir su apagado centralizado. Registros: ~/Library/Logs/FelenchoStudioLab.</footer>\n<script>\nconst names=['livekit','web','voices','bridge','whisper','realtime','tts'];\nasync function refresh(){\n try {\n  const response=await fetch('/api/status',{cache:'no-store'}), services=await response.json();\n  const container=document.getElementById('services');container.replaceChildren();\n  for(const key of names){\n   const s=services[key],article=document.createElement('article');article.className='line';\n   const desc=document.createElement('div');const heading=document.createElement('strong');heading.textContent=s.label;desc.append(heading);\n   const state=document.createElement('p');state.className=s.healthy?'good':'warn';state.textContent=s.owned?(s.healthy?'Activo':'Iniciando / verificando'):s.external?(s.healthy?'Activo fuera del panel — no se puede detener aquí':'Puerto ocupado externamente'):'Detenido';\n   if(key==='tts'&&s.voices?.length)state.textContent+=' · Voces: '+s.voices.join(', ');desc.append(state);
   if((key==='tts'||key==='realtime')&&s.lastLog){
    const details=document.createElement('details');details.style.maxWidth='550px';
    const summary=document.createElement('summary');summary.textContent='Ver diagnóstico del servicio';
    const pre=document.createElement('pre');pre.style.whiteSpace='pre-wrap';pre.style.fontSize='11px';pre.style.overflowWrap='anywhere';pre.textContent=s.lastLog;
    details.append(summary,pre);desc.append(details);
   }\n   const actions=document.createElement('div');\n   for(const op of ['start','stop']){\n    const btn=document.createElement('button');btn.textContent=op==='start'?'Iniciar':'Detener';\n    if(op==='stop')btn.className='secondary';\n    btn.disabled=op==='start'?(s.owned||s.external):!s.owned;\n    btn.addEventListener('click',()=>actionNow(op,key));actions.append(btn);\n   }\n   article.append(desc,actions);container.append(article);\n  }\n }catch(error){document.getElementById('message').textContent='Error al consultar: '+error.message;}\n}\nasync function actionNow(op,key){\n if(op==='all-stop'&&!confirm('¿Apagar únicamente los servicios iniciados desde este panel?'))return;\n document.getElementById('message').textContent='Procesando...';\n try {\n  const response=await fetch('/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op,key})});\n  const data=await response.json();document.getElementById('message').textContent=data.message||data.error||'Sin respuesta';\n }catch(error){document.getElementById('message').textContent=error.message;}\n await refresh();\n}\nrefresh();setInterval(refresh,5000);\n</script></html>";
let stopping=false;
const server=createServer(async(req,res)=>{
 const url=new URL(req.url||'/', 'http://127.0.0.1:7892');
 const reply=(code,obj)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(obj))};
 if(req.method==='GET'&&url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);return}
 if(req.method==='GET'&&url.pathname==='/api/status'){reply(200,await status());return}
 if(req.method==='POST'&&url.pathname==='/api/action'){
  const origin=req.headers.origin;
  if(origin!=='http://127.0.0.1:7892'&&origin!=='http://localhost:7892'){reply(403,{error:'Origen bloqueado'});return}
  let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>2048){reply(413,{error:'Solicitud grande'});return}}
  try{
   const {op,key}=JSON.parse(raw);let message;
   if(op==='start')message=await start(key);
   else if(op==='stop')message=await stop(key);
   else if(op==='all-stop')message=await stopAll();
   else if(op==='test-sleep'){
    if(key!=='bob'&&key!=='lina')throw Error('Personaje no reconocido');
    if(!(await healthy(services.bridge)))throw Error('Puente Bob/Lina apagado');
    const response=await fetch('http://127.0.0.1:7891/wake',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({target:key,action:'SLEEP'}),
      signal:AbortSignal.timeout(2500)
    });
    if(!response.ok)throw Error('El puente rechazo SLEEP (HTTP '+response.status+')');
    const ack=await response.json();
    message=ack.listeners>0
      ?key.toUpperCase()+' enviado a SLEEP. Pulsa Probar '+(key==='bob'?'Bob':'Lina')+' para despertarlo.'
      :'No hay pantalla '+key.toUpperCase()+' conectada; abre localhost:3001 antes de probar.';
   }
   else if(op==='test-wake'){
    if(key!=='bob'&&key!=='lina')throw Error('Personaje no reconocido');
    if(!(await healthy(services.bridge)))throw Error('Puente Bob/Lina apagado. Inicia el laboratorio antes de probar.');
    const response=await fetch('http://127.0.0.1:7891/wake',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({target:key,action:'LISTENING'}),
      signal:AbortSignal.timeout(2500)
    });
    if(!response.ok)throw Error('El puente rechazo la prueba (HTTP '+response.status+')');
    const ack=await response.json();
    message=ack.listeners>0
      ?'Orden LISTENING enviada a '+key.toUpperCase()+' ('+ack.listeners+' pantalla conectada). Comprueba el cambio visual y regreso a IDLE.'
      :'Orden aceptada, pero '+key.toUpperCase()+' no tiene ninguna pantalla conectada al puente. Abre su pantalla localhost:3001 y actualiza.';
   }
   else if(op==='all-start'){
    const notes=[];
    for(const name of ['livekit','web','voices','bridge','tts','realtime'])try{notes.push(await start(name))}catch(e){notes.push(name+': '+e.message)}
    message=notes.join(' | ');
   }else throw Error('Acción desconocida');
   reply(200,{message});
  }catch(e){reply(400,{error:e.message})}
  return;
 }
 reply(404,{error:'No encontrado'});
});
async function shutdown(){
 if(stopping)return;stopping=true;await stopAll();server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),4000).unref();
}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
server.listen(7892,'127.0.0.1',()=>console.log('Studio Lab: http://127.0.0.1:7892'));
