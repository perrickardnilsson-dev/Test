// Post-processing: EffectComposer med MSAA, diskret bloom, vinjett och
// färgtoning per årstid. SSAO och kaskadskuggor (CSM) är medvetet bortvalda
// tills inställningsmenyn med grafiknivåer i etapp 6 – prestandakravet är
// 60 fps på en vanlig laptop.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { renderer, scene, camera } from './scene.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uAutumn: { value: 0 },
    uWinter: { value: 0 },
    uVignette: { value: 0.32 }
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uAutumn, uWinter, uVignette;
    varying vec2 vUv;
    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      col.rgb *= mix(vec3(1.0), vec3(1.08, 1.00, 0.86), uAutumn); // varm höstton
      col.rgb *= mix(vec3(1.0), vec3(0.94, 0.99, 1.08), uWinter); // kall vinterton
      float d = distance(vUv, vec2(0.5));
      col.rgb *= 1.0 - uVignette * smoothstep(0.42, 0.88, d);
      gl_FragColor = col;
    }`
};

// Sky-shaderns solskiva har HDR-värden i tusenklassen – kläms innan bloomen
// så solen ger en diskret glöd i stället för att blåsa ut halva bilden.
const ClampShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      gl_FragColor = vec4(min(col.rgb, vec3(3.0)), col.a);
    }`
};

const target = new THREE.WebGLRenderTarget(innerWidth, innerHeight, {
  samples: 4,
  type: THREE.HalfFloatType
});
export const composer = new EffectComposer(renderer, target);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new ShaderPass(ClampShader));

// Hög tröskel: bara riktigt HDR-ljusa källor (solskivan, solglitter) bloomar,
// inte dagshimlen eller den ljusa horisonten.
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.2, 0.3, 2.0);
composer.addPass(bloom);

const grade = new ShaderPass(GradeShader);
composer.addPass(grade);
composer.addPass(new OutputPass());

addEventListener('resize', () => composer.setSize(innerWidth, innerHeight));

export function setSeasonGrade(si) {
  grade.uniforms.uAutumn.value = si === 2 ? 1 : 0;
  grade.uniforms.uWinter.value = si === 3 ? 1 : 0;
}
