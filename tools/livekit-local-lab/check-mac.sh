#!/usr/bin/env bash
set -euo pipefail
echo "Comprobando LiveKit local y sin consultar LiveKit Cloud..."
if ! lsof -nP -iTCP:7880 -sTCP:LISTEN; then
  echo "ERROR: no hay LiveKit Server escuchando en puerto 7880." >&2
  exit 1
fi
node <<'NODE'
const http = require('node:http');
const crypto = require('node:crypto');
const b64 = x => Buffer.from(x).toString('base64url');
const now = Math.floor(Date.now()/1000);
const head = b64(JSON.stringify({alg:'HS256',typ:'JWT'}));
const payload = b64(JSON.stringify({
  iss:'devkey',sub:'felencho-lab-check',nbf:now-5,exp:now+300,
  video:{roomJoin:true,room:'felencho-local-test',canPublish:true,canSubscribe:true}
}));
const unsigned = head+'.'+payload;
const jwt = unsigned+'.'+crypto.createHmac('sha256','secret').update(unsigned).digest('base64url');
console.log('\nToken local creado (por seguridad no se imprime).');
const req = http.get('http://127.0.0.1:7880/',{timeout:3000},res=>{
  console.log('Respuesta HTTP del servidor local:',res.statusCode);
  res.resume();
  console.log('Servidor accesible en ws://127.0.0.1:7880');
  console.log('Sala de prueba: felencho-local-test');
  console.log('AUN NO hay agente Bob/Lina ni TTS/STT conectado.');
});
req.on('timeout',()=>req.destroy(Error('Timeout local')));
req.on('error',e=>{console.error('Fallo de red:',e.message);process.exitCode=1});
NODE
