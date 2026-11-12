import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHmac, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
const here = path.dirname(fileURLToPath(import.meta.url));
const host = '127.0.0.1', port = 7890;
const sample = path.join(os.homedir(), 'felencho-qwen3-tts-lab/output/lina-es/audio_000.wav');
const b64 = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
function token(role) {
  const now = Math.floor(Date.now()/1000);
  const header = b64({alg:'HS256',typ:'JWT'});
  const payload = b64({iss:'devkey',sub:role.toLowerCase()+'-'+randomUUID(),name:'Prueba '+role,iat:now,nbf:now-5,exp:now+3600,
    video:{roomJoin:true,room:'felencho-local-test',canPublish:true,canSubscribe:true}});
  const unsigned = header+'.'+payload;
  return unsigned+'.'+createHmac('sha256','secret').update(unsigned).digest('base64url');
}
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const server = http.createServer(async (req,res)=>{
  const u = new URL(req.url, 'http://localhost');
  const send = (code, body, type='text/plain; charset=utf-8') => {
    res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);
  };
  if (req.method!=='GET') return send(405,'Method not allowed');
  if (u.pathname==='/token') {
    const role=u.searchParams.get('role');
    if (!['A','B'].includes(role)) return send(400,'role must be A or B');
    return send(200,JSON.stringify({token:token(role),url:'ws://127.0.0.1:7880',room:'felencho-local-test'}),'application/json');
  }
  if (u.pathname==='/serena.wav') {
    try {
      const wav = await readFile(sample);
      if (wav.subarray(0,4).toString() !== 'RIFF') return send(422,'La muestra no parece WAV RIFF');
      return send(200,wav,'audio/wav');
    } catch(e) {return send(404,'No se encontró el WAV local de Serena en ~/felencho-qwen3-tts-lab/output/lina-es/audio_000.wav');}
  }
  const file=u.pathname==='/'?'index.html':u.pathname==='/client.js'?'dist/client.js':null;
  if (!file) return send(404,'Not found');
  try {return send(200,await readFile(path.join(here,file)),types[path.extname(file)]);}
  catch{return send(404,'Build missing: run npm run build');}
});
server.on('error',e=>{console.error('No se pudo abrir el puerto 7890:',e.message);process.exitCode=1;});
server.listen(port,host,()=>console.log('Laboratorio local: http://127.0.0.1:'+port+' (solo localhost; sala LiveKit en 7880)'));
