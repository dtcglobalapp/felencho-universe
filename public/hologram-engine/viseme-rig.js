// Own facial-rig adapter for Felencho Hologram Engine.
// Audio envelope alone is approximate. Accurate sync needs timed visemes.
const names = {
 A: ["viseme_aa", "viseme_a", "jawOpen"],
 E: ["viseme_E", "viseme_ee", "mouthSmileLeft", "mouthSmileRight"],
 I: ["viseme_I", "viseme_ih", "mouthSmileLeft", "mouthSmileRight"],
 O: ["viseme_O", "viseme_oh", "mouthFunnel"],
 U: ["viseme_U", "viseme_ou", "mouthPucker"],
 M: ["viseme_PP", "viseme_M", "mouthClose"],
 F: ["viseme_FF", "viseme_F", "mouthRollLower"],
 L: ["viseme_L", "tongueOut"],
 S: ["viseme_SS", "viseme_S", "mouthStretchLeft", "mouthStretchRight"]
};
const norm = value => String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
const controls = new Set(Object.values(names).flat().map(norm));
export function createVisemeRig(root) {
  const targets = [];
  const jawBones = [];
  root.traverse(node => {
    if (node.isMesh && node.morphTargetDictionary && node.morphTargetInfluences) {
      for (const [name,index] of Object.entries(node.morphTargetDictionary)) {
        if (controls.has(norm(name)) && Number.isInteger(index)) targets.push({node,index,key:norm(name)});
      }
    }
    if (node.isBone && /jaw|mandib/i.test(node.name)) jawBones.push({node,base:node.rotation.x});
  });
  const jawMorph = targets.some(t => t.key === "jawopen");
  const update = (viseme, weight, smooth = 0.28) => {
    const desired = new Set((names[viseme] || []).map(norm));
    const gain = Math.min(1,Math.max(0,Number(weight)||0));
    for (const {node,index,key} of targets) {
      const to = desired.has(key) ? gain : 0;
      node.morphTargetInfluences[index] += (to-node.morphTargetInfluences[index])*smooth;
    }
    if (!jawMorph) {
      const jawOpening = ["A","O","E","L"].includes(viseme) ? gain * .18 : 0;
      for (const {node,base} of jawBones)
        node.rotation.x += (base + jawOpening - node.rotation.x)*smooth;
    }
  };
  return { update, channels: targets.length, jawBones: jawBones.length, supported: targets.length > 0 || jawBones.length > 0 };
}
