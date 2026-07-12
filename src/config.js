// Spelets konstanter. Spelvärden tagna rakt ur prototypen (facit);
// världens layout (trogen den verkliga platsen) bor i worlddata.js.
export { W, LAKE, WATER_Y, YARD, ROAD_W } from './worlddata.js';
export const DAY_REAL = 480; // sek per speldygn
export const SEASONS = ['Vår', 'Sommar', 'Höst', 'Vinter'];
export const SEASON_DAYS = 4;

export const TOOLS = [
  { name: 'Yxa', ico: '🪓' }, { name: 'Korp', ico: '⛏️' }, { name: 'Jordhacka', ico: '🌱' },
  { name: 'Vattenkanna', ico: '💧' }, { name: 'Pilbåge', ico: '🏹' }, { name: 'Fiskespö', ico: '🎣' }, { name: 'Hammare', ico: '🔨' }
];

export const FOOD = { 'potatis': 10, 'morot': 8, 'ägg': 12, 'abborre': 8, 'gädda': 10, 'rökt fisk': 22, 'rökt kött': 30 };

export const SELL = { 'potatis': 8, 'morot': 6, 'korn': 10, 'ägg': 5, 'ull': 25, 'kött': 30, 'rökt kött': 45, 'abborre': 12, 'gädda': 25, 'rökt fisk': 20, 'skinn': 20, 'trä': 2, 'sten': 3 };

export const BUY = [
  { item: 'potatisfrö', price: 4 }, { item: 'morotsfrö', price: 3 }, { item: 'kornfrö', price: 5 },
  { item: 'pil', price: 2 }, { item: 'höna', price: 60, live: 1 }, { item: 'får', price: 140, live: 1 }
];

export const SEED2CROP = {
  'potatisfrö': { crop: 'potatis', days: 1.5, seasons: [0, 1], col: 0x3f7a35 },
  'morotsfrö': { crop: 'morot', days: 1.0, seasons: [0, 1, 2], col: 0x4c8a3c },
  'kornfrö': { crop: 'korn', days: 2.0, seasons: [1, 2], col: 0xb8a84c }
};

export const BUILDS = [
  { id: 'staket', name: 'Staket', cost: { 'trä': 2 } },
  { id: 'honshus', name: 'Hönshus', cost: { 'trä': 20 } },
  { id: 'forrad', name: 'Förråd', cost: { 'trä': 30, 'sten': 10 } },
  { id: 'vaxthus', name: 'Växthus', cost: { 'trä': 20, 'sten': 10 } },
  { id: 'rokeri', name: 'Rökeri', cost: { 'sten': 15, 'trä': 5 } }
];
