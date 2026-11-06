/** Isolated Three.js light engine preview; no avatar provider or microphone. */
export default function BobLightPreview(){
  return <main style={{position:"fixed",inset:0,background:"#010510"}}>
    <iframe title="Bob — volumetric light hologram preview"
      src="/hologram-engine/engine.html?character=bob"
      style={{border:0,width:"100%",height:"100%"}} />
  </main>;
}
