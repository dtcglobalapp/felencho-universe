/**
 * Felencho Hologram Engine - original procedural holographic material treatment.
 * Preserves source GLB mesh, skeletal deformation, textures and morph targets.
 * Works on THREE.MeshStandardMaterial. No borrowed Sylenia code or resources.
 */
export function applyHologramMaterials(THREE, root, character) {
  const color = new THREE.Color(character === "lina" ? "#b27aff" : "#3bd5ff");
  const alternate = new THREE.Color(character === "lina" ? "#ff65c3" : "#edbb63");
  const parameters = { time: 0, energy: 0, strength: 0.8 };
  const decorated = [];

  root.traverse((node) => {
    if (!node.isMesh || !node.material) return;
    const oldMaterials = Array.isArray(node.material) ? node.material : [node.material];
    const replacements = oldMaterials.map((source) => {
      // Keep the original material when the extension is unsupported.
      if (!source.isMeshStandardMaterial && !source.isMeshPhysicalMaterial) return source;
      const material = source.clone();
      material.transparent = true;
      material.opacity = Math.min(material.opacity, 0.96);
      material.depthWrite = true;
      material.side = THREE.FrontSide;
      material.emissive = color.clone().multiplyScalar(0.18);
      material.emissiveIntensity = 0.7;
      material.userData.hologram = true;
      material.onBeforeCompile = (shader) => {
        shader.uniforms.holoTime = { value: parameters.time };
        shader.uniforms.holoEnergy = { value: parameters.energy };
        shader.uniforms.holoStrength = { value: parameters.strength };
        shader.uniforms.holoColor = { value: color };
        shader.uniforms.holoAccent = { value: alternate };
        shader.vertexShader = shader.vertexShader.replace(
          "#include <common>",
          "#include <common>\nvarying vec3 vHoloNormal;\nvarying float vHoloHeight;"
        ).replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvHoloHeight = position.y;"
        ).replace(
          "#include <defaultnormal_vertex>",
          "#include <defaultnormal_vertex>\nvHoloNormal = normalize(transformedNormal);"
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <common>",
          `#include <common>
varying vec3 vHoloNormal;
varying float vHoloHeight;
uniform float holoTime;
uniform float holoEnergy;
uniform float holoStrength;
uniform vec3 holoColor;
uniform vec3 holoAccent;`
        ).replace(
          "#include <tonemapping_fragment>",
          `float facing = abs(dot(normalize(vHoloNormal), normalize(vViewPosition)));
float rim = pow(1.0 - clamp(facing, 0.0, 1.0), 2.4);
float scan = pow(0.5 + 0.5 * sin(vHoloHeight * 24.0 - holoTime * 3.0), 10.0);
float pulse = 0.72 + 0.28 * sin(holoTime * 1.3 + vHoloHeight * 2.0);
vec3 flare = mix(holoColor, holoAccent, 0.35 + 0.3 * sin(holoTime * 0.4));
vec3 overlay = flare * ((rim * 1.25 + scan * 0.32) * (pulse + holoEnergy * 1.1));
gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * 0.78 + overlay, 0.25 + 0.5 * holoStrength);
#include <tonemapping_fragment>`
        );
        material.userData.shader = shader;
      };
      material.customProgramCacheKey = () => "felencho-holo-v1";
      decorated.push(material);
      return material;
    });
    node.material = Array.isArray(node.material) ? replacements : replacements[0];
  });
  return {
    update(time, energy, strength = 0.8) {
      parameters.time = time;
      parameters.energy = Math.max(0, Math.min(1, energy));
      parameters.strength = Math.max(0, Math.min(1, strength));
      for (const material of decorated) {
        material.emissiveIntensity = 0.5 + parameters.energy * 0.8;
        const shader = material.userData.shader;
        if (!shader) continue;
        shader.uniforms.holoTime.value = time;
        shader.uniforms.holoEnergy.value = parameters.energy;
        shader.uniforms.holoStrength.value = parameters.strength;
      }
    },
    dispose() { decorated.forEach((material) => material.dispose()); },
    count: decorated.length,
  };
}
