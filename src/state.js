// Centralt speltillstånd. Muteras av övriga moduler.
import { SEASONS, SEASON_DAYS } from './config.js';

export const S = {
  money: 100, day: 1, time: 7.0, hp: 100, hunger: 85, energy: 100,
  weather: 'Klart', tool: 0,
  inv: { 'potatisfrö': 6, 'morotsfrö': 4, 'pil': 12, 'trä': 10 },
  selSeed: 'potatisfrö', dead: false, started: false
};

export const seasonIdx = () => Math.floor((S.day - 1) / SEASON_DAYS) % 4;
export const seasonName = () => SEASONS[seasonIdx()];
export const isWinter = () => seasonIdx() === 3;

export function give(item, n) { S.inv[item] = (S.inv[item] || 0) + n; }
