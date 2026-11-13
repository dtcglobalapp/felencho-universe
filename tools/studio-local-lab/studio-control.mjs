#!/usr/bin/env node
// Isolated Mac lab; never kills unknown PIDs or processes started outside this panel.
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {connect} from 'node:net';
import {mkdirSync, existsSync, createWriteStream} from 'node:fs';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const home=homedir();
const logs=join(home,'Library','Logs','FelenchoStudioLab');
mkdirSync(logs,{recursive:true});
process.env.PATH='/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:'+process.env.PATH;
const services={
 livekit:{label:'LiveKit',port:7880,cmd:'livekit-server',args:['--dev'],cwd:root},
 web:{label:'Hologramas',port:3001,cmd:'npm',args:['run','dev','--','--hostname','127.0.0.1','--port','3001'],cwd:root,probe:'/hologram-local-lab/lina'},
 voices:{label:'Voces WebRTC',port:7890,cmd:'npm',args:['start'],cwd:join(home,'Documents','felencho-livekit-webrtc-lab','tools','livekit-local-lab','webrtc-two'),probe:'/token?role=A'},
 bridge:{label:'Puente Bob/Lina',port:7891,cmd:'node',args:[join(root,'tools','hologram-local-lab','wake-bridge.mjs')],cwd:root,probe:'/health'},
 whisper:{label:'Whisper mic (prueba)',port:null,cmd:'node',args:[join(root,'tools','hologram-local-lab','mic-whisper-wake.mjs'),'--device','0','--seconds','6','--bridge'],cwd:root},
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
async function status(){
 const out={};
 for(const [key,s] of Object.entries(services)){
  const child=owned.get(key),busy=s.port?await isBusy(s.port):false;
  out[key]={label:s.label,port:s.port,owned:!!child,external:busy&&!child,healthy:s.port?await healthy(s):!!child};
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
 if(key==='whisper'){
  if(!(await healthy(services.bridge)))throw Error('Primero activa Puente Bob/Lina');
  if(!existsSync(join(home,'felencho-whisper-lab/models/ggml-small.bin')))throw Error('Modelo Whisper no disponible');
 }
 const log=createWriteStream(join(logs,key+'.log'),{flags:'a'});
 log.write('\nSTART '+new Date().toISOString()+'\n');
 const child=spawn(s.cmd,s.args,{cwd:s.cwd,env:process.env,detached:true,stdio:['ignore','pipe','pipe']});
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
 for(const key of ['whisper','bridge','voices','web','livekit'])if(owned.has(key))notes.push(await stop(key));
 return notes.length?notes.join(' · '):'No hay procesos propios que detener';
}
const html= [
'<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
'<title>Felencho Mundial · Studio Lab</title><style>',
'body{font:16px -apple-system,BlinkMacSystemFont,system-ui,sans-serif;background:#0a111c;color:#eef5ff;max-width:900px;margin:25px auto;padding:15px}',
'h1{margin:0}p{color:#a9b7c7}article{background:#1a2738;padding:15px;border-radius:12px;margin:12px 0;border:1px solid #33465f}',
'.line{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}',
'button{background:#2583b6;color:white;border:0;border-radius:7px;padding:10px 13px;margin:4px;cursor:pointer}button:disabled{opacity:.35;cursor:default}',
'.secondary{background:#596a7d}.danger{background:#9c455a}.good{color:#56dda3}.warn{color:#f1c875}small{color:#b4c3d5}',
'a{color:#8bcfff}#message{padding:14px;border-radius:10px;background:#293750}footer{color:#9daec1;font-size:13px}</style>',
'<h1>🎙️ Felencho Mundial</h1><p>Studio Control · laboratorio local en La Bestia</p>',
'<button onclick="actionNow(\'all-start\')">Iniciar laboratorio</button><button class="danger" onclick="actionNow(\'all-stop\')">Apagar servicios del panel</button>',
'<button class="secondary" onclick="refresh()">Actualizar</button><div id="services"></div><div id="message">Solo controlamos los procesos iniciados desde este panel.</div>',
'<p><a target="_blank" href="http://127.0.0.1:3001/hologram-local-lab/bob">Pantalla Bob</a> · <a target="_blank" href="http://127.0.0.1:3001/hologram-local-lab/lina">Pantalla Lina</a> · <a target="_blank" href="http://127.0.0.1:7890">Voces</a></p>',
'<footer>Whisper es una prueba por segmentos, no conversación autónoma. Registros en ~/Library/Logs/FelenchoStudioLab. No se modifican imágenes ni producción.</footer>',
'<script>',
'async function refresh(){try{const r=await fetch("/api/status"),d=await r.json();',
'document.getElementById("services").innerHTML=Object.entries(d).map(([key,s])=>{',
'const label=s.owned?"Iniciado desde aquí":s.external?"Puerto ocupado externamente":"Detenido";',
'const state=s.healthy?"Preparado":s.owned?"Arrancando / comprobando":label;',
'return "<article class=line><div><strong>"+s.label+"</strong> <small>"+(s.port?" · "+s.port:" · micrófono")+"</small><p class="+(s.healthy?"good":"warn")+">"+state+"</p></div><div><button "+(s.owned||s.external?"disabled":"")+" onclick=\\"actionNow(\\'start\\',\\'"+key+"\\')\\">Iniciar</button><button class=secondary "+(!s.owned?"disabled":"")+" onclick=\\"actionNow(\\'stop\\',\\'"+key+"\\')\\">Detener</button></div></article>";}).join("");',
'}catch(e){document.getElementById("message").textContent=e.message}}',
'async function actionNow(op,key){if(op==="all-stop"&&!confirm("¿Apagar solo los servicios iniciados desde el panel?"))return;',
'try{const r=await fetch("/api/action",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({op,key})});',
'const d=await r.json();document.getElementById("message").textContent=d.message||d.error;}catch(e){document.getElementById("message").textContent=e.message}refresh()}',
'refresh();setInterval(refresh,5000);</script></html>'
].join('\n');
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
   else if(op==='all-start'){
    const notes=[];
    for(const name of ['livekit','web','voices','bridge'])try{notes.push(await start(name))}catch(e){notes.push(name+': '+e.message)}
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
