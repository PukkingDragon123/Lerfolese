// Combination engine: any stack of cards -> a Move with three possible applications
// (drop on a foe = ATTACK, on Sir Isaac = SELF, on the ground = FIELD object).
import { BASICS, stat } from './data/cards.js';
import { hashString } from '../core/util.js';

// Named discoveries. exact: the stack must be exactly these cards. Otherwise "at least".
export const SPECIALS = [
  { key: 'apple+gravity', name: 'Falling Apple', exact: true, note: 'It fell. On my head. I have never been happier.' },
  { key: 'apple+gravity+mass', name: 'Unreasonably Heavy Apple', exact: true, note: 'An apple with the soul of an anvil.' },
  { key: 'apple+apple+gravity', name: 'Apple Shower', exact: true, note: 'Two apples, one law. Both hit.' },
  { key: 'apple+gravity+mass+mass', name: 'The Big Apple', exact: true, bonus: 1.25, note: 'Start spreading the news.' },
  { key: 'apple+heat', name: 'Baked Apple', exact: true, selfHealMul: 2, note: 'Cinnamon would help. The gods would not.' },
  { key: 'apple+water', name: 'Apple Bobbing', exact: true, note: 'A festive way to drown a monster.' },
  { key: 'apple+force', name: 'Apple, Briskly', exact: true, note: 'Same apple. More opinions.' },
  { key: 'apple+rotation', name: 'Curveball Apple', exact: true, note: 'It goes around corners. And morals.' },
  { key: 'apple+inertia', name: 'Rolling Apple', exact: true, note: 'It simply does not stop. A role model.' },
  { key: 'apple+spark', name: 'Fruit Battery', exact: true, selfCharged: 8, note: 'Two wires and a Granny Smith. Electricity!' },
  { key: 'apple+apple+apple', name: 'Fruit Salad', exact: true, selfHealMul: 1.5, note: 'Nutritious. Ballistic.' },
  { key: 'stone+gravity', name: 'Rockslide', exact: true, note: 'Geology, abbreviated.' },
  { key: 'stone+inertia', name: 'Rolling Stone', exact: true, note: 'Gathers no moss. Gathers many Satyrs.' },
  { key: 'rotation+stone', name: 'Sling Stone', exact: true, note: 'Ancient technology. Modern regret.' },
  { key: 'heat+stone', name: 'Lava Rock', exact: true, note: 'A rock having the worst day of its life.' },
  { key: 'gravity+heat+stone', name: 'Meteor', exact: true, bonus: 1.2, note: 'Ask the dinosaurs. You cannot. Exactly.' },
  { key: 'mass+stone', name: 'Boulder, Probably', exact: true, note: 'Heavier than a stone, lighter than a mountain. Science.' },
  { key: 'heat+water', name: 'Steam', exact: true, steam: true, note: 'Water, but in a hurry. Blinds everything.' },
  { key: 'gravity+water', name: 'Rain', exact: true, rain: true, note: 'Falling water. Very British.' },
  { key: 'rotation+water', name: 'Whirlpool', exact: true, note: 'Water going nowhere, violently.' },
  { key: 'spark+water', name: 'Electrified Puddle', exact: true, note: 'Do NOT try this in the bath.' },
  { key: 'gravity+spark', name: 'Stolen Thunder', exact: true, bonus: 1.3, note: 'Zeus will want this back. He can ask nicely.' },
  { key: 'rotation+spark', name: 'Ball Lightning', exact: true, note: 'Lightning that learned to roll.' },
  { key: 'gravity+heat', name: 'Firefall', exact: true, note: 'Embers, delivered by gravity.' },
  { key: 'gravity+mass+mass+mass', name: 'Black Hole', exact: true, allFoes: true, note: 'Mass so dense even the jokes cannot escape.' },
  { key: 'gravity+inertia+rotation', name: 'Orbit', exact: true, moon: true, note: 'Falling forever and always missing. Relatable.' },
  { key: 'force+force+force', name: 'Unstoppable Force', exact: true, bonus: 1.25, note: 'Nobody has ever stopped it. Nobody has tried.' },
  { key: 'mass+mass+mass', name: 'Immovable Object', exact: true, selfBlockMul: 2, note: 'Paradox pending.' },
  { key: 'force+mass', name: 'F = ma', exact: true, bonus: 1.2, note: 'The equation, as a punch.' },
  { key: 'heat+lens', name: "Archimedes' Heat Ray", exact: true, burnMul: 2, note: 'Old Syracuse trick. Ships hated it.' },
  { key: 'lens+spark', name: 'Death Ray', exact: true, bonus: 1.4, note: 'I have named it responsibly.' },
  { key: 'spring+stone', name: 'Bouncing Boulder', exact: true, note: 'Boing, but geological.' },
  { key: 'rotation+rotation', name: 'Dizzy Spell', exact: true, note: 'Spin them until they doubt Euclid.' },
  { key: 'inertia+inertia', name: 'Couch Potato', exact: true, selfBlock: 6, note: 'An object at rest, by choice.' },
  { key: 'apple+force+gravity+inertia+mass+rotation', name: 'PRINCIPIA', bonus: 2, note: 'All six laws of my heart. The universe flinched.' },
  { key: 'apple+apple+apple+apple+apple', name: 'Orchard', bonus: 1.5, note: 'You could open a shop. Or a war.' },
];

const PAIR_NOUN = {
  'apple+stone': 'Apple-Flavoured Rock', 'apple+water': 'Cider', 'spark+stone': 'Lodestone', 'stone+water': 'Mud',
  'apple+spark': 'Fruit Battery', 'spark+water': 'Shock Puddle', 'heat+water': 'Steam', 'heat+spark': 'Plasma Ball', 'heat+stone': 'Lava Rock',
};
const LAW_NOUN = { mass: 'Weight', force: 'Punch', gravity: 'Gravity Well', rotation: 'Spin', inertia: 'Momentum', lens: 'Glare', spring: 'Boing', heat: 'Fireball', spark: 'Spark' };
const ADJ_ORDER = ['mass', 'dark_matter', 'force', 'brute_force', 'rotation', 'torque', 'gravity', 'antigravity', 'heat', 'plasma', 'spark', 'water', 'lens', 'prism', 'spring', 'slinky', 'inertia', 'momentum'];
const INTENS = ['', '', 'Very ', 'Absurdly ', 'Cosmically ', 'Illegally '];
const SUFFIX = ['Deluxe', 'Supreme', 'Allegedly', 'Probably', '(Patent Pending)', 'of Mild Concern', 'Extra Crispy', 'with Sprinkles', 'Unabridged', 'Mk. II', 'Do Not Try At Home', 'Peer Reviewed'];

export function baseOf(id) { return BASICS[id]?.mutantOf || id; }

// flatten a list of hand cards (Basic or Move) into components
export function flatten(cards) {
  const out = [];
  for (const c of cards) {
    if (c.type === 'move') for (const k of c.comps) out.push({ id: k.id, up: k.up || c.up || 0 });
    else if (c.type !== 'power') out.push({ id: c.petrified ? 'stone' : c.id, up: c.petrified ? 0 : c.up || 0 });
  }
  return out;
}

export function recipeKey(comps) { return comps.map((c) => c.id).sort().join('+'); }

function countMap(comps) { const m = {}; for (const c of comps) m[c.id] = (m[c.id] || 0) + 1; return m; }

export function findSpecial(comps) {
  const key = recipeKey(comps); const cm = countMap(comps);
  let best = null;
  for (const s of SPECIALS) {
    if (s.exact) { if (s.key === key) return s; continue; }
    const need = countMap(s.key.split('+').map((id) => ({ id })));
    let ok = true; for (const k in need) if ((cm[k] || 0) < need[k]) { ok = false; break; }
    if (ok && (!best || s.key.length > best.key.length)) best = s;
  }
  return best;
}

export function moveName(comps, special) {
  if (special) return special.name;
  if (comps.length === 1) return BASICS[comps[0].id].name;
  const cm = countMap(comps);
  const matter = Object.keys(cm).filter((k) => BASICS[k].kind === 'matter');
  let noun; const used = new Set();
  if (matter.length === 1) {
    const n = cm[matter[0]]; noun = BASICS[matter[0]].noun + (n === 2 ? 's' : n >= 3 ? ' Barrage' : ''); used.add(matter[0]);
  } else if (matter.length === 2) {
    const k = matter.map(baseOf).sort().join('+'); noun = PAIR_NOUN[k] || `${BASICS[matter[0]].noun}-${BASICS[matter[1]].noun}`; matter.forEach((m) => used.add(m));
  } else if (matter.length >= 3) { noun = 'Kitchen Sink'; matter.forEach((m) => used.add(m)); }
  else {
    const en = Object.keys(cm).filter((k) => BASICS[k].kind === 'energy');
    if (en.length) { const k = en.map(baseOf).sort().join('+'); noun = PAIR_NOUN[k] || BASICS[en[0]].noun || LAW_NOUN[baseOf(en[0])]; en.forEach((e) => used.add(e)); }
    else {
      // dominant law becomes the noun
      const dom = Object.keys(cm).sort((a, b) => cm[b] - cm[a] || ADJ_ORDER.indexOf(a) - ADJ_ORDER.indexOf(b))[0];
      noun = BASICS[dom].noun || LAW_NOUN[baseOf(dom)] || BASICS[dom].name; used.add(dom);
      if (cm[dom] > 1) noun = (['', '', 'Double ', 'Triple ', 'Quadruple '][cm[dom]] ?? 'Infinite ') + noun;
    }
  }
  const adjs = [];
  for (const id of ADJ_ORDER) if (cm[id] && !used.has(id) && BASICS[id].adj) adjs.push((INTENS[cm[id]] ?? 'Unholy ') + BASICS[id].adj);
  for (const id in cm) if (!used.has(id) && !ADJ_ORDER.includes(id) && BASICS[id].adj) adjs.push(BASICS[id].adj);
  if (adjs.length <= 3) return [...adjs, noun].join(' ');
  const suffix = SUFFIX[hashString(recipeKey(comps)) % SUFFIX.length];
  return `${adjs.slice(0, 2).join(' ')} ${noun}, ${suffix}`;
}

// mods: { gravityDv, firstMove:{dm,dv}, leverForce, hornForce, thermo, firstLaw, momentum, charged, kindle, bonusMul }
export function computeMove(comps, mods = {}) {
  const cm = countMap(comps); const special = findSpecial(comps);
  const S = (c, k) => stat(c.id, c.up, k) || 0;
  let m = 0, baseV = 0, dv = 0, hits = 1, charge = 0, burn = 0, wet = 0, persist = 0, bounce = 0, venom = 0, disarm = 0, chill = 0, weakOnHit = 0, goldOnKill = 0, recoil = 0;
  let focus = 1, spread = false, prism = false, fall = false, hard = false, pierce = false, grow = false, bounceFalloff = 0;
  let hasMatter = false, lensCount = 0, forceCount = 0, gravityCount = 0;
  const self = { heal: 0, block: 0, cleanse: false, charged: 0, momentum: 0, thorns: 0, retain: false, kindle: 0, draw: 0 };
  for (const c of comps) {
    const d = BASICS[c.id]; if (!d) continue;
    if (d.kind === 'matter') { hasMatter = true; m += S(c, 'm'); baseV = Math.max(baseV, S(c, 'v')); if (d.spread) spread = true; if (d.hard) hard = true; }
    m += S(c, 'dm');
    let thisDv = S(c, 'dv');
    if (baseOf(c.id) === 'gravity') { gravityCount++; thisDv += mods.gravityDv || 0; if (mods.plumb) thisDv += comps.filter((x) => baseOf(x.id) === 'mass').length; }
    if (baseOf(c.id) === 'force') { forceCount++; if (mods.leverForce && forceCount === 1) thisDv *= 2; thisDv += mods.hornForce || 0; }
    dv += thisDv;
    hits += S(c, 'hits'); charge += S(c, 'charge'); burn += S(c, 'burn'); wet += S(c, 'wet'); persist += S(c, 'persist'); bounce += S(c, 'bounce');
    venom += S(c, 'venom'); disarm += S(c, 'disarm'); chill += S(c, 'chill'); weakOnHit += S(c, 'weakOnHit'); goldOnKill += S(c, 'goldOnKill'); recoil += S(c, 'recoil');
    if (d.focus) { focus *= S(c, 'focus'); lensCount++; }
    if (d.prism) prism = true; if (d.fall) fall = true; if (d.pierce) pierce = true; if (d.grow) grow = true; if (d.bounceFalloff) bounceFalloff = d.bounceFalloff;
    if (baseOf(c.id) === 'heat') burn += mods.thermo || 0;
    // self parts
    self.heal += S(c, 'heal'); self.block += S(c, 'block'); self.charged += S(c, 'charged'); self.momentum += S(c, 'momentum');
    self.thorns += S(c, 'thorns'); self.kindle += S(c, 'kindle'); self.draw += S(c, 'draw');
    if (d.cleanse) self.cleanse = true; if (d.retain) self.retain = true;
  }
  if (!hasMatter && m > 0) baseV = 2; // a thrown weight
  let fist = false;
  if (!hasMatter && m === 0 && forceCount > 0) { m = 1; fist = true; }
  if (mods.firstMove) { if (m > 0) m += mods.firstMove.dm; dv += mods.firstMove.dv; }
  let v = m > 0 ? baseV + dv : 0;
  if (mods.momentum && m > 0) v += mods.momentum;
  if (lensCount && !prism) spread = false; // a lens focuses a wave into a jet
  if (prism) { spread = true; focus = 1; }
  const bonus = (special?.bonus || 1) * (mods.bonusMul || 1);
  const perHit = Math.round(m * v * focus * bonus);
  const n = comps.length;
  const steam = !!special?.steam, moon = !!special?.moon, allFoes = !!special?.allFoes;
  if (special?.burnMul) burn *= special.burnMul;

  // lone-law effects on a foe
  const alone = n === 1 ? baseOf(comps[0].id) : null;
  const attack = {
    m, v, hits, perHit, focus, spread: spread || allFoes, fall, hard, pierce, charge: charge + (mods.charged || 0), burn: burn + (burn > 0 || perHit > 0 ? (mods.kindle || 0) : 0), wet, persist: persist ? persist + (mods.firstLaw || 0) : 0, grow,
    bounce, bounceFalloff, venom, disarm, chill, weakOnHit, goldOnKill, recoil, steam, fist,
    weak: 0, vulnerable: 0, dizzy: 0, valid: false,
  };
  if (alone === 'gravity' || (n === 1 && comps[0].id === 'antigravity')) attack.weak = 2;
  if (alone === 'rotation') attack.dizzy = 1;
  if (alone === 'lens') { if (comps[0].id === 'prism') { attack.vulnerable = 1; attack.spread = true; } else attack.vulnerable = 2; }
  if (steam) { attack.blind = 1; attack.spread = true; }
  attack.total = perHit * hits;
  attack.valid = perHit > 0 || attack.charge > 0 || attack.burn > 0 || attack.weak > 0 || attack.dizzy > 0 || attack.vulnerable > 0 || steam || attack.wet > 0 || attack.venom > 0;
  if (alone === 'inertia' || alone === 'spring') attack.valid = false;

  // self application: parts add up, bigger stacks are more efficient
  const stackMul = 1 + 0.25 * Math.max(0, n - 1);
  self.heal = Math.round(self.heal * stackMul * (special?.selfHealMul || 1));
  self.block = Math.round((self.block + (special?.selfBlock || 0)) * stackMul * (special?.selfBlockMul || 1));
  self.charged += special?.selfCharged || 0;
  self.moon = moon;
  self.valid = self.heal > 0 || self.block > 0 || self.charged > 0 || self.momentum > 0 || self.thorns > 0 || self.retain || self.kindle > 0 || self.draw > 0 || self.cleanse || moon;

  const field = fieldFor(comps, cm, special, { m, v, burn, charge, wet, persist, mods });
  const name = moveName(comps, special);
  return { comps, n, key: recipeKey(comps), name, special, attack, self, field, art: artSpec(comps, cm, special) };
}

const FIELD_INFO = {
  sapling: { name: 'Apple Sapling', turns: 0 }, boulder: { name: 'Boulder', turns: 0 }, puddle: { name: 'Puddle', turns: 3 }, coil: { name: 'Tesla Coil', turns: 3 },
  campfire: { name: 'Campfire', turns: 3 }, well: { name: 'Gravity Well', turns: 3 }, whirl: { name: 'Whirlwind', turns: 2 }, glass: { name: 'Burning Glass', turns: 3 },
  catapult: { name: 'Catapult', turns: 0 }, rain: { name: 'Rain Cloud', turns: 3 }, steam: { name: 'Steam Cloud', turns: 2 }, moon: { name: 'Little Moon', turns: 0 }, rolling: { name: 'Rolling Boulder', turns: 0 },
};
export { FIELD_INFO };

function fieldFor(comps, cm, special, p) {
  const has = (b) => comps.some((c) => baseOf(c.id) === b);
  const count = (b) => comps.filter((c) => baseOf(c.id) === b).length;
  let type = null;
  if (special?.moon) type = 'moon';
  else if (special?.steam) type = 'steam';
  else if (special?.rain) type = 'rain';
  else if (has('stone') && (has('inertia') || has('force'))) type = 'rolling';
  else if (has('apple')) type = 'sapling'; else if (has('stone')) type = 'boulder'; else if (has('water')) type = 'puddle';
  else if (has('spark')) type = 'coil'; else if (has('heat')) type = 'campfire'; else if (has('gravity')) type = 'well';
  else if (has('rotation')) type = 'whirl'; else if (has('lens')) type = 'glass'; else if (has('spring')) type = 'catapult';
  if (!type) return { valid: false };
  const info = FIELD_INFO[type];
  let turns = info.turns ? info.turns + 2 * count('inertia') + (p.mods.firstLaw || 0) : 0;
  const golden = comps.some((c) => c.id === 'golden_apple');
  const params = {
    turns, mass: p.m, v: p.v, burn: p.burn, charge: p.charge, wet: p.wet, golden,
    hot: has('heat') && type !== 'campfire' && type !== 'steam', electric: has('spark') && type !== 'coil', heavy: count('mass'), spin: count('rotation'), fall: count('gravity'), lens: count('lens'),
    guard: type === 'boulder' || type === 'rolling' ? 10 + 6 * count('mass') + (comps.find((c) => baseOf(c.id) === 'stone')?.up ? 4 : 0) : 0,
  };
  return { valid: true, type, name: info.name, params };
}

function artSpec(comps, cm, special) {
  const has = (b) => comps.some((c) => baseOf(c.id) === b);
  const matter = comps.find((c) => BASICS[c.id].kind === 'matter');
  return {
    core: matter ? matter.id : (comps.find((c) => BASICS[c.id].kind === 'energy')?.id || comps[0]?.id),
    falling: has('gravity'), heavy: comps.filter((c) => baseOf(c.id) === 'mass').length, fast: has('force'), spin: has('rotation'), rolling: has('inertia'),
    hot: has('heat'), electric: has('spark'), wet: has('water') && !(matter && baseOf(matter.id) === 'water'), focus: has('lens'), bouncy: has('spring'), special: special?.name,
  };
}

// short human-readable lines for previews/tooltips
export function describeAttack(a) {
  const out = [];
  if (a.perHit > 0) out.push(`${a.m} kg × ${a.v} m/s${a.focus > 1 ? ` × ${a.focus}` : ''} = ${a.perHit}${a.hits > 1 ? ` × ${a.hits} hits` : ''}`);
  if (a.spread) out.push('Hits ALL foes');
  if (a.fall) out.push('Falls from above (ignores Guard)');
  if (a.hard) out.push('Cracks Block (x2 vs Block)');
  if (a.pierce) out.push('Ignores Block');
  if (a.charge) out.push(`Zap ${a.charge} (x2 Wet, chains)`);
  if (a.burn) out.push(`Burn ${a.burn}`);
  if (a.wet) out.push(`Wet ${a.wet}`);
  if (a.venom) out.push(`Venom ${a.venom}`);
  if (a.persist) out.push(`Keeps going ${a.persist} turn${a.persist > 1 ? 's' : ''}${a.grow ? ' (speeds up!)' : ' (v-2 each)'}`);
  if (a.bounce) out.push(`Bounces to ${a.bounce} more`);
  if (a.weak || a.chill || a.weakOnHit) out.push(`Weak ${a.weak || a.chill || a.weakOnHit}`);
  if (a.vulnerable) out.push(`Vulnerable ${a.vulnerable}`);
  if (a.dizzy) out.push('Dizzy: may hit its friends');
  if (a.blind) out.push('Blind ALL foes');
  if (a.disarm) out.push(`-${a.disarm} Strength`);
  if (a.recoil) out.push(`You take ${a.recoil}`);
  return out;
}
export function describeSelf(s) {
  const out = [];
  if (s.block) out.push(`Block ${s.block}`); if (s.heal) out.push(`Heal ${s.heal}`); if (s.cleanse) out.push('Cleanse Burn/Wet/Venom');
  if (s.charged) out.push(`Next hit +${s.charged} zap`); if (s.momentum) out.push(`Next Move +${s.momentum} v`); if (s.thorns) out.push(`Thorns ${s.thorns}`);
  if (s.kindle) out.push(`Hits Burn +${s.kindle}`); if (s.draw) out.push(`Draw ${s.draw}`); if (s.retain) out.push('Keep hand & Block'); if (s.moon) out.push('Summon a little moon');
  return out;
}
