import { NextRequest, NextResponse } from 'next/server';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,readFile,rm,access} from 'node:fs/promises';
import {homedir,tmpdir} from 'node:os';
import {join} from 'node:path';
export const runtime='nodejs';export const dynamic='force-dynamic';
function run(command:string,args:string[],timeout=30000):Promise<void>{
 return new Promise((resolve,reject)=>{
   const p=spawn(command,args,{stdio:'ignore'});let done=false;
   const finish=(error?:Error)=>{if(done)return;done=true;clearTimeout(timer);error?reject(error):resolve()};
   const timer=setTimeout(()=>{p.kill('SIGTERM');finish(new Error('Whisper: tiempo agotado'))},timeout);
   p.once('error',e=>finish(e));p.once('close',c=>finish(c===0?undefined:new Error(command+' fallo ('+c+')')));
 });
}
export async function POST(request:NextRequest){
 const host=request.headers.get('host')||'';
 if(process.env.NODE_ENV!=='development'||!['localhost:3001','127.0.0.1:3001'].includes(host))
  return NextResponse.json({error:'Solo laboratorio local'},{status:403});
 const length=Number(request.headers.get('content-length')||0);
 if(length>4_000_000)return NextResponse.json({error:'Audio demasiado largo'},{status:413});
 const model=join(homedir(),'felencho-whisper-lab/models/ggml-small.bin');
 try{await access(model)}catch{return NextResponse.json({error:'Modelo Whisper local no encontrado'},{status:503})}
 const form=await request.formData();
 const raw=form.get('audio');
 if(!(raw instanceof File)||raw.size>4_000_000||raw.size<100)return NextResponse.json({error:'Audio invalido'},{status:400});
 const folder=await mkdtemp(join(tmpdir(),'felencho-local-stt-'));
 try{
  const input=join(folder,'input.webm'),wav=join(folder,'mono.wav'),prefix=join(folder,'transcript');
  await writeFile(input,Buffer.from(await raw.arrayBuffer()));
  await run('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',input,'-ar','16000','-ac','1','-c:a','pcm_s16le',wav],12000);
  await run('whisper-cli',['-m',model,'-f',wav,'-l','es','-nt','-otxt','-of',prefix,'-np'],40000);
  const text=(await readFile(prefix+'.txt','utf8')).trim().slice(0,1200);
  return NextResponse.json({text},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'No se pudo transcribir'},{status:502})}
 finally{await rm(folder,{recursive:true,force:true})}
}
