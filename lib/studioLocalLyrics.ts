import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {homedir} from 'node:os';
const LOCAL_LYRICS_DIR=join(homedir(),'Documents','FelenchoMundial','letras-aprobadas');
export async function loadRelevantLyrics(question:string){
 try{
  const names=(await readdir(LOCAL_LYRICS_DIR)).filter(n=>n.endsWith('.txt'));
  const norm=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const q=norm(question);
  const matching=names.filter(n=>q.includes(norm(n.replace(/\.txt$/,'').replace(/-/g,' ')))).slice(0,2);
  if(!matching.length)return '';
  return (await Promise.all(matching.map(async n=>{
   const content=(await readFile(join(LOCAL_LYRICS_DIR,n),'utf8')).slice(0,9000);
   return 'LETRA ORIGINAL APROBADA: '+n.replace(/\.txt$/,'')+'\n'+content;
  }))).join('\n\n');
 }catch{return ''}
}
