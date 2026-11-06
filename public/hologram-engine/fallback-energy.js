/** Original WebGL light-volume fallback when the Three.js CDN fails.
 * No videos, GLBs, external libraries, dot silhouettes, or UI on the TVs.
 * This is a resilience fallback, not a substitute for visual approval.
 */
export function startFallbackEnergy(canvas, character){
  const gl=canvas.getContext("webgl",{alpha:false,antialias:true});
  if(!gl)throw Error("WebGL unavailable");
  const vertex="attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  const fragment=`
precision highp float;
uniform vec2 r;uniform float t;uniform float e;uniform float feminine;
float ellipse(vec2 p,vec2 radius){float a=length(p/radius);float b=length(p/(radius*radius));return a*(a-1.)/max(.0001,b);}
float stroke(float d,float k){return exp(-d*d*k);}
vec3 color(float u){return mix(mix(vec3(.035,.68,.97),vec3(.63,.27,1.),feminine),mix(vec3(1.,.71,.27),vec3(1.,.18,.73),feminine),clamp(u,0.,1.));}
void main(){
 vec2 p=(gl_FragCoord.xy-r*.5)/r.y*3.5;
 float head=ellipse(p-vec2(0.,.48),vec2(.40,.61));
 float neck=ellipse(p-vec2(0.,-.18),vec2(.17,.24));
 float body=ellipse(p-vec2(0.,-.98),vec2(.92,.68));
 float shape=min(head,min(neck,body));
 float shell=stroke(abs(shape),270.);
 float fill=1.-smoothstep(-.13,.12,shape);
 float scan=pow(.5+.5*sin(p.y*38.-t*3.),16.);
 float current=sin(p.x*17.+p.y*9.+t)*sin(p.y*11.-t*.8);
 vec3 c=vec3(.001,.003,.015)+color(.24+.25*sin(p.y*2.+t*.15))*(shell*.45+fill*(.075+.035*current+scan*.11));
 // Each arc is a volumetric field loop in a separate projected orientation.
 for(float j=0.;j<10.;j++){
  float angle=j*.57+t*(mod(j,2.)<1.?-.09:.07);
  vec2 q=vec2(cos(angle)*p.x-sin(angle)*p.y,sin(angle)*p.x+cos(angle)*p.y);
  float d=abs(length(vec2(q.x/(.67+j*.044),q.y/(1.28+j*.068)))-1.);
  float mask=smoothstep(-1.55,-.65,p.y)*(1.-smoothstep(.9,1.8,p.y));
  c+=color(mod(j,4.)*.29)*(stroke(d,620.)*.19+stroke(d,27.)*.06)*mask;
 }
 // Curved continuous magnetic hair currents, not dot outlines.
 for(float j=0.;j<30.;j++){
  float side=mod(j,2.)<1.?-1.:1.;
  float n=floor(j*.5);
  float x=side*(.33+n*.022)+side*.15*sin((1.24-p.y)*1.1)+.045*sin(p.y*6.+j*.8+t*.43);
  float d=abs(p.x-x);
  float mask=smoothstep(-1.6,-.7,p.y)*(1.-smoothstep(1.07,1.52,p.y));
  c+=color(mod(j,7.)/7.)*(stroke(d,2700.)*.105+stroke(d,45.)*.018)*mask;
 }
 for(float side=-1.;side<=1.;side+=2.){
  vec2 eye=p-vec2(side*.18,.56);
  float d=ellipse(eye,vec2(.13,.061));
  c+=vec3(.8,.94,1.)*(stroke(d,850.)*.57+stroke(length(eye),320.)*.34);
  c+=color(.56)*stroke(length(eye/vec2(.038,.046)),1.5)*.43;
 }
 float mouth=ellipse(p-vec2(0.,.13),vec2(.13,.018+e*.095));
 c+=color(.93)*(stroke(mouth,610.)*.57+stroke(mouth,42.)*.12);
 float core=abs(length((p-vec2(0.,-.87))/vec2(.56,.43))-1.);
 c+=color(.7)*(stroke(core,650.)*.16+stroke(core,45.)*.045);
 c=1.-exp(-c*(1.75+e*.45));
 gl_FragColor=vec4(pow(c,vec3(.88)),1.);
}`;
  const compile=(kind,source)=>{
    const shader=gl.createShader(kind);gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  const program=gl.createProgram();
  gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));
  gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const buffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,"a");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const resolution=gl.getUniformLocation(program,"r");
  const elapsed=gl.getUniformLocation(program,"t");
  const energy=gl.getUniformLocation(program,"e");
  gl.uniform1f(gl.getUniformLocation(program,"feminine"),character==="lina"?1:0);
  let stopped=false;
  let activity=0;
  const received=(event)=>{
    if(event.origin!==location.origin||event.source!==window.parent||event.data?.type!=="felencho-hologram-frame")return;
    const frame=event.data.frame;
    if(frame?.character===character&&typeof frame.level==="number"&&Number.isFinite(frame.level)){
      activity=frame.active?Math.max(0,Math.min(1,frame.level)):0;
    }
  };
  window.addEventListener("message",received);
  const draw=(now)=>{
    if(stopped)return;
    const w=Math.max(1,Math.floor(canvas.clientWidth*Math.min(2,devicePixelRatio||1)));
    const h=Math.max(1,Math.floor(canvas.clientHeight*Math.min(2,devicePixelRatio||1)));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
    activity*=.977;
    gl.uniform2f(resolution,w,h);gl.uniform1f(elapsed,now*.001);
    gl.uniform1f(energy,activity);
    gl.drawArrays(gl.TRIANGLES,0,6);
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
  return ()=>{stopped=true;window.removeEventListener("message",received);gl.deleteBuffer(buffer);gl.deleteProgram(program);};
}
