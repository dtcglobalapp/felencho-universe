/**
 * Felencho Hologram Engine: original volumetric energy entities.
 * No GLB, texture/video, still photo, 2D point silhouette or third-party avatar.
 * The approved artwork guides palette/personality; it cannot yield exact facial
 * identity in 3D. A custom artistic fidelity pass is still required.
 *
 * Three.js is injected (not bundled here) so both screens share one renderer.
 */
export function buildEnergyEntity(THREE, character) {
  const lina = character === "lina";
  const blue = new THREE.Color(lina ? "#a865ff" : "#3bdcff");
  const warm = new THREE.Color(lina ? "#fb57db" : "#ffd26e");
  const white = new THREE.Color(lina ? "#e7d9ff" : "#c7f4ff");
  const root = new THREE.Group();
  const energyMeshes = [];
  const filaments = [];
  const glowSprites = [];

  const energyMaterial = (color, opacity = .4) => {
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uVoice: { value: 0 }, uColor: { value: color },
        uOpacity: { value: opacity }, uMotion: { value: 0 }
      },
      vertexShader: `
        varying vec3 vPos;
        varying vec3 vNormal;
        varying vec3 vView;
        uniform float uTime;
        uniform float uVoice;
        uniform float uMotion;
        void main(){
          vPos=position;
          vec3 p=position;
          float l=length(position);
          p += normal * (sin(position.y * 21.0 + uTime * 2.1 + position.x * 13.0)
              * .008 + sin(l * 16.0-uTime*1.7)*.006) * (1.0 + uVoice*.65);
          vNormal=normalize(normalMatrix*normal);
          vec4 mv=modelViewMatrix*vec4(p,1.0);
          vView=-mv.xyz;
          gl_Position=projectionMatrix*mv;
        }`,
      fragmentShader: `
        precision highp float;
        varying vec3 vPos;
        varying vec3 vNormal;
        varying vec3 vView;
        uniform float uTime;
        uniform float uVoice;
        uniform vec3 uColor;
        uniform float uOpacity;
        void main(){
          float rim=pow(1.0-abs(dot(normalize(vNormal),normalize(vView))),2.1);
          float scan=pow(.5+.5*sin(vPos.y*42.0-uTime*3.6),9.0);
          float electric=pow(.5+.5*sin((vPos.x+vPos.y*.5)*31.0+uTime*2.1),10.0);
          float pulse=.72+.28*sin(uTime*1.55)+uVoice*.6;
          float glow=(.2+rim*1.75+scan*.25+electric*.13)*pulse;
          vec3 col=uColor*(.5+glow*1.8);
          float alpha=clamp((.13+rim*.92+scan*.10)*uOpacity*(.8+uVoice*.3),0.0,.95);
          gl_FragColor=vec4(col,alpha);
        }`,
      transparent:true,
      depthWrite:false,
      blending:THREE.AdditiveBlending,
      side:THREE.DoubleSide
    });
    energyMeshes.push(m);
    return m;
  };
  const thinMaterial=(color,opacity=.72)=>new THREE.MeshBasicMaterial({
    color,transparent:true,opacity,depthWrite:false,
    blending:THREE.AdditiveBlending,side:THREE.DoubleSide
  });
  function strand(points,radius,color,opacity=.55,segments=76) {
    const curve = new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve,segments,radius,5,false),thinMaterial(color,opacity));
    root.add(mesh);filaments.push(mesh);return mesh;
  }
  function aura(x,y,z,sx,sy,sz,color,opacity) {
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,36,24),energyMaterial(color,opacity));
    mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);
    root.add(mesh);return mesh;
  }
  // Intrinsic glowing dimensional fields, not a human skin/face texture.
  aura(0,.74,0,.62,.83,.47,blue,.47);
  aura(0,.73,-.13,.79,1.06,.55,warm,.13);
  aura(0,-.23,.05,.23,.42,.26,white,.30);
  // A tapered sculptural light mantle.
  const torsoGeo=new THREE.LatheGeometry([
    new THREE.Vector2(0,-2.05),new THREE.Vector2(.48,-1.95),
    new THREE.Vector2(.85,-1.5),new THREE.Vector2(.92,-1.02),
    new THREE.Vector2(.7,-.66),new THREE.Vector2(.37,-.39),
    new THREE.Vector2(.21,-.24)
  ],64);
  const mantle=new THREE.Mesh(torsoGeo,energyMaterial(blue,.40));
  mantle.scale.z=.67;root.add(mantle);
  const inner=new THREE.Mesh(torsoGeo,energyMaterial(warm,.12));
  inner.scale.set(.85,.98,.5);root.add(inner);
  // Illuminated clavicle, shoulder and collar fields.
  for(const side of [-1,1]){
    strand([[0,-.33,.28],[side*.34,-.47,.32],[side*.75,-.72,.16],[side*.92,-1.15,-.03]],
      .013,white,.62);
    strand([[0,-.62,.28],[side*.38,-.83,.33],[side*.72,-1.08,.19],[side*.9,-1.54,-.01]],
      .008,warm,.66);
    for(let j=0;j<5;j++){
      const shift=j*.075;
      strand([[side*(.12+shift),-.37,.18],[side*(.22+shift),-.67,.44],[side*(.36+shift),-1.19,.34],[side*(.45+shift),-1.88,.05]],
        .004+j*.0009,j%2?warm:blue,.4,64);
    }
  }
  // Magnetic crown and animated light filaments. Bob's longer downward silver
  // currents suggest flowing ancestral hair and beard; Lina has longer lateral
  // aurora locks. Neither involves skin or a humanoid character model.
  for(let i=0;i<34;i++){
    const phi=(i/34)*Math.PI*2;
    const x=Math.cos(phi), z=Math.sin(phi);
    const length=lina ? 1.35+.4*(i%4)/3 : 1.4+.7*(i%5)/4;
    const f=lina ? 1.03 : .82;
    strand([
      [x*.27,1.49,z*.22],
      [x*.47,1.47,z*.39],
      [x*.69*f,1.12,z*.47],
      [x*(.72+(i%3)*.035),.47,z*.53],
      [x*(.62+(i%5)*.018),1.37-length,z*.48]
    ], i%6===0?.011:.0045,i%4===0?warm:i%5===0?white:blue,
      i%6===0?.9:.55,65);
  }
  if(!lina) {
    // Bob: a tapered cascading silver/gold jaw energy field, NOT a beard mesh.
    for(let i=0;i<23;i++){
      const x=(i-11)/11;
      const span=Math.sqrt(Math.max(0,1-x*x));
      strand([
        [x*.39,.53,.42],
        [x*.33,.32,.54],
        [x*.29,-.02,.48],
        [x*.23,-.35-span*.17,.36],
        [x*.13,-.72-span*.29,.16]
      ],i%6===0?.01:.005,i%4===0?warm:white,.4+(i%5)*.09,56);
    }
  } else {
    // Lina: elegant forward curls of electrical violet hair-light.
    for(const side of [-1,1]){
      for(let j=0;j<9;j++){
        const x=side*(.45+j*.024);
        strand([[x,1.30,.10],[x*1.21,.91,.36],[x*1.16,.38,.41],
          [x*.91,-.31,.48],[x*1.01,-.84-(j%3)*.12,.34]],
          .006,j%3===0?warm:j%4===0?white:blue,.6,68);
      }
    }
  }
  // Face identity is made of flowing light features — the eyes anchor gaze.
  const eyes=[];
  for(const x of [-.24,.24]){
    const eye=aura(x,.88,.445,.13,.067,.035,white,.97);
    eyes.push(eye);
    strand([[x-.12,.89,.485],[x-.045,.92,.5],[x+.06,.92,.5],[x+.13,.89,.485]],
      .012,blue,.97,20);
    // Vertical pupils of energy instead of painted photorealistic eyes.
    aura(x,.885,.493,.029,.054,.015,lina?warm:blue,.93);
    strand([[x-.13,1.065,.40],[x-.045,1.1,.43],[x+.055,1.095,.42],[x+.12,1.055,.40]],
      .006,white,.35,22);
  }
  // Facial expression from a luminous aperture. This is NOT anatomical lip sync.
  const aperture = new THREE.Group();
  aperture.position.set(0,.28,.52);
  root.add(aperture);
  const oval=new THREE.Mesh(new THREE.TorusGeometry(.115,.013,7,52),thinMaterial(warm,.96));
  oval.scale.set(1,.28,1);aperture.add(oval);
  const breathGlow=new THREE.Mesh(new THREE.CircleGeometry(.105,48),thinMaterial(blue,.18));
  breathGlow.scale.set(1,.22,1);breathGlow.position.z=-.018;aperture.add(breathGlow);
  const rays=[];
  for(let i=0;i<9;i++){
    const theta=i*Math.PI*2/9;
    const ray=new THREE.Mesh(new THREE.CylinderGeometry(.003,.012,.22,5),thinMaterial(i%2?blue:warm,.33));
    ray.position.set(Math.cos(theta)*.16,Math.sin(theta)*.11,-.04);
    ray.rotation.z=theta-Math.PI/2;aperture.add(ray);rays.push(ray);
  }
  // Nonuniform dimensional energy envelopes orbit the entire central being.
  const arcGroup=new THREE.Group();root.add(arcGroup);
  const arcs=[];
  for(let i=0;i<11;i++){
    const geo=new THREE.TorusGeometry(1.13+i*.06,.0045+(i%3)*.002,6,180,Math.PI*(1.15+(i%4)*.15));
    const arc=new THREE.Mesh(geo,thinMaterial(i%4===0?warm:i%5===0?white:blue,.3+(i%4)*.13));
    arc.rotation.set(i*.35,.62+i*.48,i*.32);
    arc.position.set(0,-.3+(i-5)*.17,0);
    arcGroup.add(arc);arcs.push(arc);
  }
  // The active face and body are surface volumes, not dot silhouettes.
  const update = (t,level=0,bass=0,mid=0,treble=0,viseme="REST",weight=0)=>{
    const energy=Math.max(0,Math.min(1,level));
    for(const material of energyMeshes){
      material.uniforms.uTime.value=t;
      material.uniforms.uVoice.value=energy;
    }
    const mouth=viseme==="REST"||viseme==="M"?.2:
      viseme==="A"?.92:viseme==="O"?.75:
      viseme==="E"||viseme==="I"?.46:viseme==="U"?.32:.4;
    const jaw=.15+mouth*Math.max(0,Math.min(1,weight));
    aperture.scale.set(1+energy*.12,.4+jaw*1.65,1);
    oval.scale.x=(viseme==="O"||viseme==="U"?.75:1);
    oval.scale.y=.4+jaw*1.55;
    breathGlow.scale.y=.4+jaw*1.55;
    breathGlow.material.opacity=.14+energy*.32;
    for(let i=0;i<rays.length;i++)rays[i].material.opacity=.16+energy*.38;
    for(let i=0;i<arcs.length;i++){
      arcs[i].rotation.y+=.0018*(i%2?-1:1)*(1+mid*4);
      arcs[i].rotation.z+=.001*(1+bass*4);
      arcs[i].material.opacity=.25+Math.min(.43,energy*.65)+(i%3)*.04;
    }
    for(let i=0;i<filaments.length;i++){
      filaments[i].material.opacity=.30+.22*Math.sin(t*.82+i*.45)**2+.25*energy;
    }
    for(const eye of eyes) eye.scale.y=(.06+energy*.006);
    root.rotation.y=Math.sin(t*.18)*.045;
    root.position.y=Math.sin(t*.58)*.055;
  };
  const dispose=()=>{
    const geometries=new Set(),materials=new Set();
    root.traverse(obj=>{
      if(obj.geometry)geometries.add(obj.geometry);
      if(obj.material){
        for(const m of (Array.isArray(obj.material)?obj.material:[obj.material]))materials.add(m);
      }
    });
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
  };
  return { root,update,dispose,kind:"procedural-light-volume" };
}
