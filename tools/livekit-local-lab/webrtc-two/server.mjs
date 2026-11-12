import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHmac, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const host = '127.0.0.1', port = 7881;
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
  const file=u.pathname==='/'?'index.html':u.pathname==='/client.js'?'dist/client.js':null;
  if (!file) return send(404,'Not found');
  try {return send(200,await readFile(path.join(here,file)),types[path.extname(file)]);}
  catch{return send(404,'Build missing: run npm run build');}
});
server.listen(port,host,()=>console.log('Laboratorio de 2 participantes: http://127.0.0.1:'+port+' (solo localhost)'));
