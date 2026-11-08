// Hue-shifted material ramps for the card art. Index 0 is the tinted outline, 1 deep shadow, 2 shadow,
// 3 local colour, 4 light, 5 highlight, 6 glint. Shadows lean to violet/blue, lights to warm yellow.
import { ramp } from './kit.js';

export const K = {
  red: ramp('#2a0a22', '#5a1034', '#8c1934', '#c02a33', '#de4a36', '#f6874a', '#fff0c4'),
  leaf: ramp('#0f2420', '#1b4230', '#2a6a36', '#4a9238', '#82bc3e', '#c4e26a', '#f4ffc0'),
  stem: ramp('#1f0e14', '#3d1c1c', '#63301f', '#8c4c26', '#b87336', '#dda25a', '#f7d898'),
  gold: ramp('#2a1012', '#5a2a14', '#93561a', '#cc8c1e', '#f2c032', '#ffe878', '#fffde0'),
  stone: ramp('#15112a', '#2c2848', '#4a4566', '#6e687e', '#958a90', '#bfae9c', '#ece0c4'),
  moss: ramp('#10200f', '#1e3a1a', '#33582a', '#517a34', '#7a9e42', '#a8c45a', '#dcec96'),
  lichen: ramp('#2a1810', '#5a3418', '#946020', '#c89a34', '#e8c858', '#f8ea96', '#fffbd8'),
  water: ramp('#0a1030', '#122a62', '#1a4f96', '#2a80c4', '#48b0e0', '#8adcf2', '#e8fcff'),
  elec: ramp('#2e1020', '#6a2418', '#b4501a', '#e88a1c', '#ffc430', '#fff07a', '#ffffff'),
  iron: ramp('#0c0a14', '#1a1824', '#2a2836', '#3e3c4c', '#575668', '#7a7c8e', '#aab0c2'),
  rust: ramp('#1c0a0e', '#3e1610', '#6a2814', '#984018', '#c0602a', '#dc8a48', '#f4bc80'),
  brass: ramp('#26100e', '#4e2418', '#83481e', '#b8782a', '#dfaa42', '#f4d878', '#fff8d0'),
  bronze: ramp('#1e0c10', '#42201a', '#6e3a20', '#9a5a2a', '#c4843a', '#e4b25e', '#fae0a0'),
  steel: ramp('#10131e', '#222a3c', '#394560', '#57688a', '#8094ac', '#b4c8d4', '#f0fafa'),
  flame: ramp('#3a0a1c', '#7c1420', '#c4301a', '#ec6418', '#ff9e24', '#ffd650', '#fff8c8'),
  ice: ramp('#121e44', '#1e3c72', '#3270a8', '#58a4d0', '#90d2ea', '#d0f2fa', '#ffffff'),
  violet: ramp('#0c0618', '#1c0f3a', '#341c64', '#55308e', '#7e4cbc', '#b282e2', '#ecd2ff'),
  magenta: ramp('#1c0618', '#420c34', '#761654', '#ae2a78', '#de4c9c', '#f88cc6', '#ffd8f0'),
  cyan: ramp('#081a2c', '#0e3450', '#12607a', '#1a9aa8', '#3ad0d0', '#8cf4ec', '#e4fffc'),
  wood: ramp('#24100e', '#4a2016', '#763a1e', '#a35d2c', '#cc8442', '#ecb468', '#fde6a8'),
  oak: ramp('#1a0c0c', '#3a1c14', '#5c301c', '#7e4824', '#a0642e', '#c48848', '#e6b670'),
  ocean: ramp('#0b1236', '#132a66', '#1c4c98', '#2a78bc', '#46a6da', '#86d2ee', '#e6fbff'),
  land: ramp('#0e2018', '#1a3e22', '#2c6428', '#4c8c30', '#80b43c', '#bcd860', '#f0f8b0'),
  sand: ramp('#2a1a14', '#523422', '#80582e', '#a87e40', '#cca460', '#e8cc8a', '#fbf0c8'),
  snow: ramp('#1c1c40', '#3a3c74', '#6a70a8', '#9aa4cc', '#c8d2e8', '#eef4fa', '#ffffff'),
  rot: ramp('#160c10', '#30201a', '#4c3420', '#6c4e28', '#8e6c36', '#b29050', '#d8bc7c'),
  bile: ramp('#141c0c', '#28381a', '#3e5420', '#5c7428', '#829434', '#aab44a', '#d6dc84'),
  pumice: ramp('#22181e', '#463634', '#6a584e', '#907e6a', '#b4a488', '#d6cba8', '#f3ecd4'),
  slate: ramp('#0a1412', '#132620', '#1c382e', '#26483a', '#33584a', '#4a6e5c', '#6a8a76'),
  chalk: ramp('#3a4a44', '#6a7a70', '#9aa89c', '#c4ccc0', '#e2e8dc', '#f4f8f0', '#ffffff'),
  copper: ramp('#200c10', '#48181a', '#7a2c1e', '#ae4a26', '#d47436', '#f0a660', '#ffdca6'),
  verd: ramp('#0a1c22', '#103434', '#1a5048', '#287060', '#3e9278', '#6cb898', '#b0e0c4'),
  bone: ramp('#2a2026', '#4e4044', '#7a6a66', '#a89688', '#d0c0a8', '#ece0c6', '#fffaea'),
  paint_red: ramp('#2a0816', '#58102a', '#8c1a30', '#bc2c34', '#e04c3c', '#f88a5c', '#ffd2a8'),
  paint_blue: ramp('#0c1030', '#18245e', '#22408e', '#2e64b8', '#4c90d8', '#86c2ee', '#dcf4ff'),
  cream: ramp('#2a1a18', '#5a4030', '#8e7050', '#bca274', '#e0cc9c', '#f6e8c4', '#fffbec'),
  rope: ramp('#1a1010', '#3a2618', '#5e4024', '#866034', '#ac844c', '#d2ae72', '#f0d8a0'),
  night: ramp('#05040c', '#0b0818', '#130e26', '#1c1536', '#271e4a', '#352862', '#4a3a80'),
  ghost: ramp('#10123a', '#1e2a6a', '#2e4a9c', '#4c7ccc', '#7cb0ec', '#bce0ff', '#ffffff'),
};

// card kinds: enamel ramps (6) for frames and banners
export const ENAMEL = {
  matter: ramp('#22081a', '#4a1028', '#7c1c2e', '#ac3036', '#d4503e', '#ec8462', '#f8bc98'),
  law: ramp('#0a1230', '#14285a', '#1e4288', '#2c62b2', '#4a8cd2', '#86bae8', '#c8e4fa'),
  energy: ramp('#2a1208', '#58280c', '#8c4e12', '#bc7c1a', '#e2a82a', '#f4d062', '#fff0b0'),
  tool: ramp('#061c20', '#0d3638', '#165a54', '#228072', '#3aa88e', '#78d0b2', '#c4f0dc'),
  move: ramp('#0c1c12', '#18381c', '#285a26', '#3e8030', '#64a640', '#a2cc60', '#dcf0a4'),
  power: ramp('#0c0620', '#1c1040', '#321e68', '#4c3294', '#7052be', '#a488e0', '#dccaff'),
};
export const TRIM = {
  brass: ramp('#1c0c0c', '#46200f', '#7a4418', '#b07428', '#d8a440', '#f2d274', '#fff6cc'),
  gold: ramp('#200c08', '#5a2c0c', '#94580e', '#d0921a', '#f6c42e', '#ffe76c', '#fffbe0'),
};
export const PARCH = ramp('#3a2416', '#7a5634', '#b08c5c', '#d6b886', '#ead2a0', '#f6e6be', '#fff6dc');
export const INKC = '#1a0c14';
