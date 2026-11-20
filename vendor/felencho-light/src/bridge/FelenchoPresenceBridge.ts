export const CHARACTERS=['bob','lina'] as const;
export const STATES=['IDLE','LISTENING','THINKING','SPEAKING','WATCHING','SLEEP'] as const;
export type Character=typeof CHARACTERS[number];
export type Message={character:Character;state:typeof STATES[number];audio?:{level:number;bass:number;mids:number;treble:number};timestamp?:number};
export function normalizePresence(input:unknown):Message|null {
 if(typeof input!=='object'||input===null)return null;
 const v=input as Record<string,unknown>;
 if(!CHARACTERS.some(c=>c===v['character'])||!STATES.some(s=>s===v['state']))return null;
 const result:Message={character:v['character'] as Character,state:v['state'] as Message['state']};
 if(v['timestamp']!==undefined){if(typeof v['timestamp']!=='number'||!Number.isFinite(v['timestamp'])||v['timestamp']<0)return null;result.timestamp=v['timestamp'];}
 if(v['audio']!==undefined){if(typeof v['audio']!=='object'||v['audio']===null)return null;const a=v['audio'] as Record<string,unknown>;const audio={level:0,bass:0,mids:0,treble:0};for(const key of ['level','bass','mids','treble'] as const){const value=a[key];if(value!==undefined&&(typeof value!=='number'||!Number.isFinite(value)))return null;audio[key]=typeof value==='number'?Math.max(0,Math.min(1,value)):0;}result.audio=audio;}
 return result;
}
export function createPresenceBridge(){
 const listeners=new Map<Character,Set<(message:Message)=>void>>();
 return {
  subscribe(character:Character,handler:(message:Message)=>void){let set=listeners.get(character);if(!set){set=new Set();listeners.set(character,set);}set.add(handler);return()=>{set?.delete(handler);};},
  receive(input:unknown){const message=normalizePresence(input);if(!message)return false;listeners.get(message.character)?.forEach(fn=>fn(message));return true;},
  attach(target:EventTarget,eventName='felencho-presence'){const handler=(event:Event)=>{if(event instanceof MessageEvent){try{this.receive(typeof event.data==='string'?JSON.parse(event.data):event.data);}catch{ /* Reject invalid JSON. */ }}else if(event instanceof CustomEvent)this.receive(event.detail);};target.addEventListener(eventName,handler);return()=>target.removeEventListener(eventName,handler);},
 };
}