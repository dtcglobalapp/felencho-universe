import { unit, type AudioFrame } from '../controller';
export function measure(samples:Float32Array, spectrum:Float32Array, sampleRate:number, fftSize:number):{rms:number;bands:AudioFrame}{
 let energy=0;for(const value of samples)energy+=value*value;
 const rms=Math.sqrt(energy/Math.max(1,samples.length));
 const band=(low:number,high:number)=>{let sum=0,count=0;for(let i=Math.ceil(low*fftSize/sampleRate);i<spectrum.length&&i<=Math.floor(high*fftSize/sampleRate);i++){const db=spectrum[i]??-100;sum+=Number.isFinite(db)?10**(db/20):0;count++;}return unit(Math.sqrt(sum/Math.max(1,count))*3);};
 return {rms,bands:{level:unit(rms*5),bass:band(60,300),mids:band(300,3000),treble:band(3000,10000)}};
}
export function acceptedAudio(name:string){return /\.(wav|mp3|ogg|m4a)$/i.test(name);}