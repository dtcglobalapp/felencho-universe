import { BufferAttribute, BufferGeometry, PlaneGeometry } from 'three';
export function portraitRelief() { return new PlaneGeometry(4.1, 7.29, 100, 160); }
export function samplePortrait(image: CanvasImageSource) {
  const canvas=document.createElement('canvas'); canvas.width=216; canvas.height=384;
  const ctx=canvas.getContext('2d');
  const geo=new BufferGeometry(); if(!ctx) return geo;
  ctx.drawImage(image,0,0,216,384); const pixels=ctx.getImageData(0,0,216,384).data;
  const pos:number[]=[], uv:number[]=[], colors:number[]=[], seeds:number[]=[];
  for(let y=2;y<382;y+=2) for(let x=2;x<214;x+=2){
    const i=(y*216+x)*4; const r=(pixels[i]??0)/255,g=(pixels[i+1]??0)/255,b=(pixels[i+2]??0)/255;
    const brightness=Math.max(r,g,b); if(brightness<0.18) continue;
    const edge=Math.abs(brightness-Math.max((pixels[i+8]??0)/255,(pixels[i+9]??0)/255,(pixels[i+10]??0)/255));
    const u=x/216,v=1-y/384;
    const face=u>0.39&&u<0.67&&v>0.66&&v<0.86;
    if(face&&edge<0.08) continue;
    if(edge<0.035 && ((x+y)%6!==0)) continue;
    pos.push((u-.5)*4.1,(v-.5)*7.29,0.02+brightness*0.025); uv.push(u,v);
    colors.push(r*0.8+0.12,g*0.8+0.15,b*0.8+0.17); seeds.push(((x*73+y*17)%997)/997);
  }
  geo.setAttribute('position',new BufferAttribute(new Float32Array(pos),3));
  geo.setAttribute('aUv',new BufferAttribute(new Float32Array(uv),2));
  geo.setAttribute('aColor',new BufferAttribute(new Float32Array(colors),3));
  geo.setAttribute('aSeed',new BufferAttribute(new Float32Array(seeds),1)); return geo;
}
export function flowingParticles() {
  const geo=new BufferGeometry(),pos=new Float32Array(1400*3),seed=new Float32Array(1400),kind=new Float32Array(1400);
  for(let i=0;i<1400;i++){ seed[i]=i/1400; kind[i]=i%3===0?1:0; }
  geo.setAttribute('position',new BufferAttribute(pos,3));geo.setAttribute('aSeed',new BufferAttribute(seed,1));geo.setAttribute('aKind',new BufferAttribute(kind,1));return geo;
}
export function hairFilaments() {
  const pos:number[]=[], seeds:number[]=[];
  for(let strand=0;strand<100;strand++){
    const side=strand%2===0?-1:1, f=Math.floor(strand/2)/50;
    for(let j=0;j<75;j++) for(const t of [j/75,(j+1)/75]){
      const y=2.95-t*(5.1+f*0.55);
      // Independently curled locks, swept crown, variable length and depth.
      const x=side*(0.3+Math.sin(Math.min(1,t*3)*Math.PI/2)*(0.95+f*0.55)+Math.sin(t*13+f*8)*(0.05+t*0.16));
      pos.push(x,y,0.05+f*0.35+Math.sin(t*9+f*10)*0.13); seeds.push(f);
    }
  }
  const geo=new BufferGeometry();geo.setAttribute('position',new BufferAttribute(new Float32Array(pos),3));geo.setAttribute('aSeed',new BufferAttribute(new Float32Array(seeds),1));return geo;
}