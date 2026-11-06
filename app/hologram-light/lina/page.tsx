/** Isolated Three.js light engine preview; no TTS session or avatar service. */
export default function LinaLightPreview(){
  return <main style={{position:"fixed",inset:0,background:"#010510"}}>
    <iframe title="Lina — volumetric light hologram preview"
      src="/hologram-engine/engine.html?character=lina"
      style={{border:0,width:"100%",height:"100%"}} />
  </main>;
}
