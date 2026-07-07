// Terrängens PBR-material: fyra texturuppsättningar (gräs, skogsmark, berg,
// grus) blandas per fragment med en splat baserad på höjd, lutning, väg-,
// sjö- och gårdsavstånd – samma regler som prototypens vertexfärger.
// Årstider styrs med uniforms (uAutumn/uSnow) i stället för att färga om
// geometri. Texturer laddas från /textures/ (Poly Haven via `npm run setup`);
// saknas de används procedurella reservtexturer.
import * as THREE from 'three';
import { W, LAKE, WATER_Y, YARD, ROAD_Z, ROAD_W } from './config.js';
import { vnoise } from './utils.js';
import { makeFallbackSet, FALLBACK_DEFS } from './fallback-textures.js';

// Skogsbruset bakas till en textur så att markens skogspartier exakt matchar
// trädplaceringens gläntor (JS-flyttal ≠ GPU-flyttal för stora sin-argument).
function makeSplatNoise() {
  const N = 512, data = new Uint8Array(N * N * 4);
  for (let iz = 0; iz < N; iz++) {
    for (let ix = 0; ix < N; ix++) {
      const x = -W / 2 + (ix / (N - 1)) * W, z = -W / 2 + (iz / (N - 1)) * W;
      data[(iz * N + ix) * 4] = vnoise(x * 0.02 + 50, z * 0.02 + 50) * 255;
      data[(iz * N + ix) * 4 + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

const uniforms = {
  uSplatNoise: { value: makeSplatNoise() },
  uAutumn: { value: 0 },
  uSnow: { value: 0 }
};

const SETS = ['grass', 'forest', 'rock', 'gravel'];
const MAPS = [['D', 'diff'], ['N', 'nor'], ['A', 'arm']];
const loader = new THREE.TextureLoader();
for (const set of SETS) {
  const fb = makeFallbackSet(FALLBACK_DEFS[set]);
  for (const [suffix, map] of MAPS) {
    const key = 'u' + set[0].toUpperCase() + set.slice(1) + suffix;
    uniforms[key] = { value: fb[map] };
    loader.load('/textures/' + set + '_' + map + '.jpg', tex => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.anisotropy = 4;
      if (map === 'diff') tex.colorSpace = THREE.SRGBColorSpace;
      uniforms[key].value = tex;
    }, undefined, () => { /* behåll reservtexturen */ });
  }
}

export function setSeasonUniforms(autumn, snow) {
  uniforms.uAutumn.value = autumn;
  uniforms.uSnow.value = snow;
}

const glslConsts = `
const float T_WATER_Y = float(${WATER_Y});
const vec2 T_LAKE = vec2(${LAKE.x.toFixed(1)}, ${LAKE.z.toFixed(1)});
const float T_LAKE_R = float(${LAKE.r.toFixed(1)});
const float T_YARD_R = float(${YARD.r.toFixed(1)});
const float T_ROAD_Z = float(${ROAD_Z.toFixed(1)});
const float T_ROAD_W = float(${ROAD_W.toFixed(1)});
const float T_W = float(${W.toFixed(1)});
`;

export const terrainMaterial = new THREE.MeshStandardMaterial({ roughness: 1.0, metalness: 0.0 });
terrainMaterial.onBeforeCompile = shader => {
  Object.assign(shader.uniforms, uniforms);

  // aSurfY är den riktiga markhöjden – kjolvertexarna är nedsänkta i position
  // men ska texturera som ytan de hänger under.
  shader.vertexShader = 'varying vec3 vWPos;\nvarying vec3 vWNorm;\nattribute float aSurfY;\n' + shader.vertexShader.replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
    vec4 tWp = modelMatrix * vec4(position, 1.0);
    vWPos = vec3(tWp.x, aSurfY + (tWp.y - position.y), tWp.z);
    vWNorm = normal;`
  );

  shader.fragmentShader = `
varying vec3 vWPos;
varying vec3 vWNorm;
uniform sampler2D uSplatNoise;
uniform float uAutumn, uSnow;
uniform sampler2D uGrassD, uGrassN, uGrassA;
uniform sampler2D uForestD, uForestN, uForestA;
uniform sampler2D uRockD, uRockN, uRockA;
uniform sampler2D uGravelD, uGravelN, uGravelA;
${glslConsts}
` + shader.fragmentShader
    .replace('#include <map_fragment>', `
    vec2 tWuv = vWPos.xz;
    float tHgt = vWPos.y;
    float tSlope = 1.0 - clamp(normalize(vWNorm).y, 0.0, 1.0);
    float tForestNoise = texture2D(uSplatNoise, (tWuv + T_W * 0.5) / T_W).r;
    float tDLake = distance(tWuv, T_LAKE);
    float tDYard = length(tWuv);

    // Splatvikter – samma regler som prototypens markfärger
    float tWRoad = 1.0 - smoothstep(T_ROAD_W * 0.4, T_ROAD_W * 0.62, abs(vWPos.z - T_ROAD_Z));
    float tWSand = (1.0 - smoothstep(T_WATER_Y + 0.1, T_WATER_Y + 0.9, tHgt))
                 * (1.0 - smoothstep(T_LAKE_R + 30.0, T_LAKE_R + 38.0, tDLake));
    float tWRock = clamp(smoothstep(0.22, 0.42, tSlope) + smoothstep(9.0, 10.5, tHgt), 0.0, 1.0);
    float tWForest = smoothstep(0.30, 0.42, tForestNoise) * smoothstep(T_YARD_R * 0.8, T_YARD_R + 2.0, tDYard);

    float tWG = (1.0 - tWForest) * (1.0 - tWRock);
    float tWF = tWForest * (1.0 - tWRock);
    float tWR = tWRock;
    tWG *= 1.0 - tWSand; tWF *= 1.0 - tWSand; tWR *= 1.0 - tWSand;
    float tWGr = tWSand;
    tWG *= 1.0 - tWRoad; tWF *= 1.0 - tWRoad; tWR *= 1.0 - tWRoad; tWGr = tWGr * (1.0 - tWRoad) + tWRoad;

    vec3 tAlb = texture2D(uGrassD,  tWuv / 5.0).rgb * tWG
              + texture2D(uForestD, tWuv / 5.5).rgb * tWF
              + texture2D(uRockD,   tWuv / 8.0).rgb * tWR
              + texture2D(uGravelD, tWuv / 4.0).rgb * tWGr;
    vec3 tArm = texture2D(uGrassA,  tWuv / 5.0).rgb * tWG
              + texture2D(uForestA, tWuv / 5.5).rgb * tWF
              + texture2D(uRockA,   tWuv / 8.0).rgb * tWR
              + texture2D(uGravelA, tWuv / 4.0).rgb * tWGr;
    vec3 tNor = (texture2D(uGrassN,  tWuv / 5.0).rgb * 2.0 - 1.0) * tWG
              + (texture2D(uForestN, tWuv / 5.5).rgb * 2.0 - 1.0) * tWF
              + (texture2D(uRockN,   tWuv / 8.0).rgb * 2.0 - 1.0) * tWR
              + (texture2D(uGravelN, tWuv / 4.0).rgb * 2.0 - 1.0) * tWGr;

    // Mörkare sjöbotten
    tAlb = mix(tAlb * vec3(0.5, 0.47, 0.42), tAlb, smoothstep(T_WATER_Y - 0.8, T_WATER_Y + 0.3, tHgt));
    // Höst: markerna gulnar (mest gräs och skogsmark)
    tAlb = mix(tAlb, vec3(0.62, 0.50, 0.22), 0.22 * uAutumn * (tWG + tWF));
    // Vinter: snö ovanför vattenlinjen, frost nedanför
    float tSnowMask = uSnow * smoothstep(T_WATER_Y + 0.15, T_WATER_Y + 0.7, tHgt);
    tAlb = mix(tAlb, vec3(0.80, 0.82, 0.88), 0.30 * uSnow * (1.0 - smoothstep(T_WATER_Y + 0.15, T_WATER_Y + 0.7, tHgt)));
    tAlb = mix(tAlb, vec3(0.93, 0.94, 0.97), 0.85 * tSnowMask);
    tNor = mix(tNor, vec3(0.0, 0.0, 1.0), 0.75 * tSnowMask);

    float tRough = clamp(mix(tArm.g, 0.72, tSnowMask), 0.05, 1.0);
    float tAO = mix(mix(1.0, tArm.r, 0.9), 1.0, tSnowMask);

    diffuseColor.rgb *= tAlb;`)
    .replace('#include <roughnessmap_fragment>', `
    float roughnessFactor = roughness * tRough;`)
    .replace('#include <normal_fragment_maps>', `
    {
      // Tangentlös normalmappning (derivat), jfr three:s getTangentFrame
      vec3 tq0 = dFdx(-vViewPosition);
      vec3 tq1 = dFdy(-vViewPosition);
      vec2 tst0 = dFdx(tWuv / 5.0);
      vec2 tst1 = dFdy(tWuv / 5.0);
      vec3 tq0p = cross(tq1, normal);
      vec3 tq1p = cross(normal, tq0);
      vec3 tT = tq0p * tst0.x + tq1p * tst1.x;
      vec3 tB = tq0p * tst0.y + tq1p * tst1.y;
      float tDet = max(dot(tT, tT), dot(tB, tB));
      if (tDet > 0.0) {
        float tScale = inversesqrt(tDet);
        normal = normalize(mat3(tT * tScale, tB * tScale, normal) * normalize(tNor));
      }
    }`)
    .replace('#include <aomap_fragment>', `
    reflectedLight.indirectDiffuse *= tAO;`);
};
terrainMaterial.customProgramCacheKey = () => 'traneras-terrain';
