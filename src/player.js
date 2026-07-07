// Spelaren: position, rörelse, hopp och kamerastyrning.
import { clamp } from './utils.js';
import { W, LAKE, WATER_Y } from './config.js';
import { S, isWinter } from './state.js';
import { camera } from './scene.js';
import { heightAt } from './terrain.js';

export const player = { x: 2, z: 8, y: 0, velY: 0, yaw: Math.PI, pitch: 0, onGround: true };
player.y = heightAt(player.x, player.z) + 1.7;

export const keys = {};

export function updatePlayer(dt) {
  const sp = (keys['ShiftLeft'] && S.energy > 5 ? 7.2 : 4.0);
  if (keys['ShiftLeft'] && (keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'])) S.energy = Math.max(0, S.energy - 2.5 * dt);
  let mx = 0, mz = 0;
  if (keys['KeyW']) mz -= 1; if (keys['KeyS']) mz += 1; if (keys['KeyA']) mx -= 1; if (keys['KeyD']) mx += 1;
  const l = Math.hypot(mx, mz);
  if (l > 0) {
    mx /= l; mz /= l;
    const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
    player.x += (mx * cos + mz * sin) * sp * dt;
    player.z += (mz * cos - mx * sin) * sp * dt;
  }
  player.x = clamp(player.x, -W / 2 + 3, W / 2 - 3);
  player.z = clamp(player.z, -W / 2 + 3, W / 2 - 3);
  let gy = heightAt(player.x, player.z);
  const inLake = Math.hypot(player.x - LAKE.x, player.z - LAKE.z) < LAKE.r + 15;
  if (inLake && gy < WATER_Y) {
    if (isWinter()) gy = WATER_Y + 0.03;          // gå på isen
    else gy = Math.max(gy, WATER_Y - 1.1);        // vada
  }
  if (keys['Space'] && player.onGround) { player.velY = 5.4; player.onGround = false; S.energy = Math.max(0, S.energy - 1.5); }
  player.velY -= 13 * dt;
  player.y += player.velY * dt;
  if (player.y <= gy + 1.7) { player.y = gy + 1.7; player.velY = 0; player.onGround = true; }
  camera.position.set(player.x, player.y, player.z);
  camera.rotation.set(0, 0, 0);
  camera.rotateY(player.yaw);
  camera.rotateX(player.pitch);
}
