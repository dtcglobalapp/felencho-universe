import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';

// Offline, producer-approved memory shared by Bob and Lina.
// This is not model fine-tuning. No raw transcripts or third-party conversation
// histories are saved. Nothing is posted to a cloud provider.
const directory=join(homedir(),'Documents','FelenchoMundial');
const filename=join(directory,'memorias-aprobadas.json');
type Memory={id:string;fact:string;createdAt:string;source:'explicit-producer'};
type FileShape={schema:1;memories:Memory[]};
const normalize=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const taboo=/\b(salud|diagn[oó]stic|medicamento|embaraz|sexual|contrase[nñ]a|password|clave|cuenta bancaria|tarjeta|direcci[oó]n|telefono|tel[eé]fono|seguro social|social security|documento de identidad|paciente|invitad[oa]|menor|ni[nñ]o|enfermedad|terapia|tratamiento|prueba de sangre|historia cl[ií]nica|ice case)\b/i;
let mutation:Promise<unknown>=Promise.resolve();
async function readAll():Promise<Memory[]>{
 try{
  const parsed=JSON.parse(await readFile(filename,'utf8')) as FileShape;
  if(parsed?.schema!==1||!Array.isArray(parsed.memories))return [];
  return parsed.memories.filter(item=>typeof item?.fact==='string'&&item.fact.length<600&&item.source==='explicit-producer').slice(-100);
 }catch{return [];}
}
export function explicitStudioFact(text:string):string|null{
 const source=text.trim();
 const match=source.match(/^(?:bob\s+y\s+lina[,.:]?\s*)?(?:recuerden|recordad|guarden en memoria|anoten en memoria|recuerda|guarda en memoria)\s+(?:esto\s*[:;,]?\s*|que\s+)?(.+)$/i);
 if(!match)return null;
 const fact=match[1].trim().replace(/[.!?]+$/,'').slice(0,450);
 if(fact.length<12||taboo.test(fact))return null;
 return fact;
}
export async function approveStudioFact(text:string):Promise<{saved:boolean;reason:string}>{
 const fact=explicitStudioFact(text);
 if(!fact)return {saved:false,reason:'Sin memoria aprobada: requiere orden expresa del productor y no acepta información sensible.'};
 const operation=async()=>{
  const list=await readAll();
  if(list.some(item=>normalize(item.fact)===normalize(fact)))return {saved:false,reason:'Ese conocimiento ya está guardado en La Bestia.'};
  const next=[...list,{id:randomUUID(),fact,createdAt:new Date().toISOString(),source:'explicit-producer' as const}].slice(-100);
  await mkdir(directory,{recursive:true,mode:0o700});
  const temp=filename+'.'+randomUUID()+'.tmp';
  await writeFile(temp,JSON.stringify({schema:1,memories:next},null,2),{mode:0o600});
  await rename(temp,filename);
  return {saved:true,reason:'Recuerdo confirmado por Felencho y guardado solo en La Bestia.'};
 };
 const promise=mutation.then(operation,operation);
 mutation=promise.catch(()=>{});
 return promise;
}
export async function recallStudioFacts(question:string):Promise<string>{
 const list=await readAll();
 if(!list.length)return '';
 const stop=new Set(['para','como','que','los','las','con','por','una','uno','sobre','este','esta','entre','felencho','lina','bob','recuerda','recuerden','respuesta']);
 const terms=[...new Set(normalize(question).match(/[a-z0-9]{4,}/g)||[])].filter(t=>!stop.has(t));
 if(!terms.length)return '';
 const ranked=list.map(item=>({item,score:terms.filter(t=>normalize(item.fact).includes(t)).length}))
  .filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3);
 return ranked.length?'MEMORIA LOCAL EXPLICITAMENTE APROBADA POR FELENCHO (no prueba cientifica ni fuente externa):\n'+
   ranked.map(x=>'- '+x.item.fact).join('\n'):'';
}
export async function studioMemoryCount(){return (await readAll()).length;}
