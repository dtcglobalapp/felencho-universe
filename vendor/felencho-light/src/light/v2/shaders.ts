// Original relief portrait and light shaders. The portrait is artwork, not a GLB.
export const deform = `
uniform float uTime;
uniform float uBass;
uniform float uMids;
uniform float uLevel;
uniform float uSleep;
uniform float uListening;
uniform float uThinking;
uniform float uSpeaking;
uniform float uWatching;
uniform float uYaw;
uniform float uBlink;
vec3 relief(vec3 p, vec2 uv) {
  float head = smoothstep(0.59, 0.7, uv.y);
  float hair = smoothstep(0.13,0.27,abs(uv.x-0.51)) * smoothstep(0.12,0.35,uv.y);
  float mouthSafe = 1.0 - exp(-dot((uv-vec2(0.515,0.70))*vec2(12.0,22.0),(uv-vec2(0.515,0.70))*vec2(12.0,22.0)));
  float wave = sin(uv.y*17.0+uTime*1.7+uv.x*9.0)*0.6+sin(uv.y*29.0-uTime*1.15+uv.x*18.0)*0.4;
  p.x += hair*wave*(0.035+uMids*0.03)*mouthSafe;
  p.z += hair*sin(uv.y*11.0+uTime*1.4+uv.x*13.0)*0.09;
  p.y += head*sin(uTime*1.65)*0.09;
  float breath = sin(uTime*2.0)*0.016+uBass*0.008;
  p.x *= 1.0+breath*(1.0-head);
  p.y += breath*(1.0-head)*0.9;
  p.x += uYaw*head*(uv.y-0.6)*1.2;
  p.z += head*(0.18-abs(uv.x-0.51)*0.3);
  return p;
}
`;
export const portraitVertex = `${deform}
varying vec2 vUv;
void main(){ vUv=uv; vec3 p=relief(position,uv); gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }
`;
export const portraitFragment = `
uniform sampler2D uPortrait;
uniform sampler2D uClosed;
uniform float uTime;
uniform float uBlink;
uniform float uSleep;
uniform float uLevel;
uniform float uSpeaking;
varying vec2 vUv;
void main(){
  vec4 base=texture2D(uPortrait,vUv);
  float eyeMask=smoothstep(0.755,0.771,vUv.y)*(1.0-smoothstep(0.798,0.811,vUv.y))*smoothstep(0.365,0.39,vUv.x)*(1.0-smoothstep(0.665,0.69,vUv.x));
  vec3 color=mix(base.rgb,texture2D(uClosed,vUv).rgb,uBlink*eyeMask);
  float fade=smoothstep(0.0,0.10,vUv.y);
  vec2 core=(vUv-vec2(0.585,0.352))*vec2(8.0,12.0);
  float pulse=exp(-dot(core,core)*3.0)*(0.10+uSpeaking*(0.25+0.25*sin(uTime*10.0))+uLevel*0.2);
  color+=vec3(0.1,0.8,1.0)*pulse;
  color*=1.0-uSleep*0.67;
  gl_FragColor=vec4(min(color,vec3(2.0)),fade*0.96);
}`;
export const anchorVertex = `${deform}
attribute vec2 aUv;
attribute vec3 aColor;
attribute float aSeed;
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec3 p=relief(position,aUv); p.z+=0.045;
  float hair=smoothstep(0.13,0.28,abs(aUv.x-0.51));
  p.x+=sin(uTime*1.5+aSeed*40.0)*hair*0.025;
  p.y-=uSleep*mod(uTime*0.22+aSeed,1.0)*1.4;
  vec3 ear=vec3(aUv.x<0.5?-0.78:0.7,1.53,0.32);
  p=mix(p,ear+vec3(sin(aSeed*80.0+uTime)*0.16,cos(aSeed*90.0+uTime)*0.25,0.1),uListening*0.28*hair);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
  gl_PointSize=1.0+aSeed*1.6;
  vColor=aColor;
  vAlpha=(0.15+hair*0.23)*(1.0-uSleep*0.55);
}`;
export const lightFragment = `varying vec3 vColor; varying float vAlpha;
void main(){ vec2 q=gl_PointCoord-0.5; float d=dot(q,q); if(d>0.25) discard; gl_FragColor=vec4(vColor,exp(-d*18.0)*vAlpha); }`;
export const flowVertex = `${deform}
uniform float uTreble;
attribute float aSeed;
attribute float aKind;
varying vec3 vColor;
varying float vAlpha;
void main(){
 vec3 p=position;
 float t=mod(aSeed+uTime*(0.06+uSpeaking*0.1),1.0);
 float a=aSeed*62.832+uTime*(0.7+uThinking*1.7);
 if(aKind<0.5){
   float r=1.9+sin(aSeed*40.0)*0.18;
   p=vec3(cos(a)*r,2.0+sin(a)*0.9,sin(a)*0.8-0.35);
   if(uThinking>0.01){ p=mix(p,vec3(sin(a)*t*1.5,1.7+t*1.5,0.45+cos(a)*t*0.6),uThinking); }
 }else{
   float r=0.15+t*1.75;
   p=vec3(cos(a)*r,-0.98+sin(a)*r*0.35,t*0.9);
   if(aSeed>0.8) p=vec3(sin(a)*t*0.32,0.30-t*1.3,0.3+t*0.4);
   p.y+=uSpeaking*sin(t*6.283)*0.3;
 }
 p.y-=uSleep*mod(uTime*0.3+aSeed,1.0)*4.0;
 gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
 gl_PointSize=2.0+aSeed*2.0+uTreble*1.6;
 vColor=mix(vec3(0.25,0.85,1.0),vec3(0.92,0.45,0.85),aSeed);
 vAlpha=(0.35+uSpeaking*0.4)*(1.0-uSleep*0.6);
}`;
export const hairVertex = `${deform}
attribute float aSeed;
varying vec3 vColor;
varying float vAlpha;
void main(){
 vec2 coord=vec2(position.x/4.1+0.5,position.y/7.29+0.5);
 vec3 p=relief(position,coord);
 p.x+=sin(uTime*1.3+position.y*3.4+aSeed*10.0)*0.055;
 p.z+=cos(uTime+position.y*2.0+aSeed*8.0)*0.10;
 gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
 vColor=mix(vec3(0.84,0.65,0.32),mix(vec3(0.2,0.7,1.0),vec3(0.78,0.2,0.6),aSeed),0.55);
 vAlpha=0.19*(1.0-uSleep*0.7);
}`;
export const hairFragment = `varying vec3 vColor; varying float vAlpha; void main(){ gl_FragColor=vec4(vColor,vAlpha); }`;