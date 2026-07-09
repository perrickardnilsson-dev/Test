// Vind: gemensam tid/styrka-uniform och en shaderinjektion som får
// trädkronor och vass att gunga. Styrkan sätts av vädret (weather.js).
import { lerp } from './utils.js';

export const windUniforms = { uWindT: { value: 0 }, uWindS: { value: 0.5 } };
let targetStrength = 0.5;

export function setWindStrength(s) { targetStrength = s; }

export function updateWind(dt) {
  windUniforms.uWindT.value += dt * 1.5;
  windUniforms.uWindS.value = lerp(windUniforms.uWindS.value, targetStrength, 0.02);
}

const applied = new WeakSet();

// yBase: lokal höjd där gunget börjar, k: amplitud per meter ovanför yBase.
export function applyWindSway(mat, yBase = 1.2, k = 0.045) {
  if (applied.has(mat)) return mat;
  applied.add(mat);
  mat.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, windUniforms);
    shader.vertexShader = 'uniform float uWindT;\nuniform float uWindS;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      {
        #ifdef USE_INSTANCING
          vec3 wiPos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        #else
          vec3 wiPos = vec3(0.0);
        #endif
        float wSway = sin(uWindT + wiPos.x * 0.21 + wiPos.z * 0.17)
                    + 0.4 * sin(uWindT * 2.3 + wiPos.z * 0.31 + wiPos.x * 0.09);
        float wAmp = uWindS * max(transformed.y - float(${yBase}), 0.0) * float(${k});
        transformed.x += wSway * wAmp;
        transformed.z += wSway * wAmp * 0.6;
      }`
    );
  };
  mat.customProgramCacheKey = () => 'wind-sway-' + yBase + '-' + k;
  return mat;
}
