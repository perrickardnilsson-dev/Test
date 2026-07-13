// Touchstyrningens tillstånd – medvetet utan imports så att player.js kan
// läsa det utan importcykler (touch.js, som bygger knapparna, importerar
// spelsystemen). move: analog joystickvektor (-1..1), lookDX/DY: ackumulerade
// bläddringsdeltan som konsumeras av updatePlayer, jump: konsumeras per frame.
export const touch = {
  active: typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches,
  move: { x: 0, z: 0 },
  run: false,
  lookDX: 0,
  lookDY: 0,
  jump: false
};
