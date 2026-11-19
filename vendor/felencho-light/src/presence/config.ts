// Local URL strings: binaries are staged into public/studio-light/assets by prepare-assets.sh.
const bob = '/studio-light/assets/bob-v1-portrait.jpg';
const lina = '/studio-light/assets/lina-v2-portrait.jpg';
const linaSleep = '/studio-light/assets/lina-v2-sleep.webp';
import type { Character } from '@/bridge/FelenchoPresenceBridge';
export type PresenceConfig={character:Character;name:string;voiceName:string;portrait:string;closed:string;palette:{cyan:[number,number,number];violet:[number,number,number];gold:[number,number,number]};core:[number,number,number];coreUV:[number,number]};
export const configs:Record<Character,PresenceConfig>={
 bob:{character:'bob',name:'Bob',voiceName:'Dylan',portrait:bob,closed:bob,palette:{cyan:[0.15,0.55,1],violet:[1,0.7,0.23],gold:[0.9,0.63,0.25]},core:[0,-0.55,0.45],coreUV:[0.51,0.42]},
 lina:{character:'lina',name:'Lina',voiceName:'Serena',portrait:lina,closed:linaSleep,palette:{cyan:[0.2,0.8,1],violet:[0.65,0.2,0.9],gold:[0.9,0.63,0.25]},core:[0.35,-1.02,0.45],coreUV:[0.585,0.352]},
};