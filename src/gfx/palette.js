// The game's palette: vintage-print tarot colours for cards/UI, warm golden-hour ramps for the world,
// and a violet-cyan "gravity glow" for everything touched by Sir Isaac's spirit.
export const INK = '#1a1220';
export const R = {
  ink: ['#0b0710', '#1a1220', '#2a1f33'],
  paper: ['#8a6a44', '#b8935a', '#cdb27a', '#e8d4a2', '#f3e6c4', '#fbf4de'],
  mustard: ['#6b3f12', '#a8671c', '#d99a2b', '#f2c14e', '#ffe08a'],
  red: ['#3a0f18', '#5a1a22', '#8f2a2e', '#c8443a', '#e8705a', '#f6b3a0'],
  sky: ['#1b2f4a', '#24496b', '#3f7fa8', '#6fb7d6', '#a8dcef', '#e3f6fb'],
  leaf: ['#1e3320', '#35562c', '#5f8a3a', '#9cb84a', '#cfe07a'],
  olive: ['#26301a', '#3d4a26', '#5d6b34', '#869448', '#b4be6e'],
  teal: ['#0f2b2c', '#163b3c', '#2d6e6a', '#4fa79a', '#8fd3c0', '#d0f0e4'],
  purple: ['#140d26', '#22183f', '#3e2b6b', '#6b4c9a', '#9b7cc8', '#cdb6f0'],
  wood: ['#2a160c', '#4a2a16', '#6e4024', '#8a5634', '#b07444', '#d39a62', '#ecc490'],
  oak: ['#3a2210', '#5e3a1c', '#86562a', '#a8713a', '#c99254', '#e3b97c'],
  skin: ['#5a3622', '#8a5634', '#c48a5a', '#e6b98a', '#f7dcb5'],
  marble: ['#4a4650', '#6e6a74', '#9a949a', '#c4bdb6', '#e2dcd0', '#f8f4ea'],
  stone: ['#211d24', '#38333b', '#544e57', '#736c74', '#989096', '#c2bab8', '#e2dcd6'],
  gold: ['#3a1f08', '#7a4a14', '#b8812f', '#e0a83a', '#ffd76a', '#fff6cf'],
  brass: ['#2e1a0a', '#5e3c16', '#93652a', '#c99a46', '#ecc874', '#fff0c0'],
  glow: ['#22183f', '#3e2b6b', '#6b4c9a', '#b48cff', '#8fe3ff', '#e8fbff'],
  fire: ['#3a0f18', '#8f2a2e', '#d8502a', '#f08a2a', '#f2c14e', '#fff3b0'],
  water: ['#0f2440', '#16406a', '#1f6a9a', '#3f9ac8', '#7cc6e8', '#d2f2fb'],
  snake: ['#0b1f17', '#173a28', '#2a5e3a', '#4a8a4c', '#7cb460', '#c2e08e'],
  fur: ['#1c0f08', '#2f1a0e', '#4a2c18', '#6a4426', '#8c5e34', '#b08048'],
  swamp: ['#0a1814', '#132c24', '#20463a', '#356a50', '#5a9a6a', '#9cc88a'],
  wine: ['#1e0614', '#3e0c26', '#661638', '#93244c', '#c0507a'],
  white: ['#5a5a6e', '#8a8aa0', '#b8b8c8', '#dcdce6', '#f4f4fa', '#ffffff'],
  night: ['#05040a', '#0c0a18', '#151229', '#211c3d', '#2f2853'],
  cream: ['#c9b48a', '#e2d2ab', '#f3e8cc', '#fff9e8'],
  bronze: ['#2a1608', '#53300f', '#83501c', '#b27a30', '#d9a654', '#f1d08a'],
  grass: ['#1a2a12', '#2c4419', '#45652a', '#6a8a36', '#93ad4a', '#c4d06a'],
  dirt: ['#2a1a10', '#46301c', '#664828', '#86643a', '#a8845a', '#c8a87a'],
};
export const C = {
  ink: '#1a1220', paper: '#f3e6c4', cream: '#fbf4de', mustard: '#f2c14e', red: '#c8443a', sky: '#6fb7d6', leaf: '#9cb84a',
  teal: '#4fa79a', purple: '#6b4c9a', gold: '#e0a83a', glowV: '#b48cff', glowC: '#8fe3ff', white: '#ffffff', blood: '#8f2a2e',
};
// lookup: hex -> next darker hex within whichever ramp contains it (for selective outlining)
const darker = new Map();
for (const k in R) { const r = R[k]; for (let i = 1; i < r.length; i++) if (!darker.has(r[i])) darker.set(r[i], r[i - 1]); }
export const darkerOf = (hex) => darker.get(hex) || INK;
