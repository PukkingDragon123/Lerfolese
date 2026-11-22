// THE GRANDMASTER'S PIECES (story / bosses). PESSOKRATOR, the Grandmaster of Olympus, plays an endless game of chess
// with mortal lives on a board of sixty-four stars; every act boss is one of his BLACK pieces, re-imagined as a figure of
// Greek myth, and each fights with its chess move (all deterministic: the golden apple's forecast shows it exactly):
//   black_pawn     the Black Phalanx (Act I): hoplite pawns that advance a rank every turn (a double step first) and
//                  PROMOTE to champions on the 8th rank; they capture diagonally and lock shields for each other
//   black_knight   Hippolochos (Act II): a centaur cavalier who never moves straight: L-LEAPS whose second blow jumps
//                  your Block, FORKS (two blows that knock your next draws away), wheels out of reach, then charges
//   oracle_bishop  the Hierophant of Delphi (Act II): DIAGONAL rays that petrify the 1st / 3rd / 5th card of your next
//                  hand, crossed beams, a sacrament; a Lens turns his light back on him (stunned)
//   rook_titan     Pyrgos the Walking Bastion (Act III): battlements that KEEP their Block, rolls back down the file and
//                  CHARGES straight for 7 per square, ballista volleys; at half strength it CASTLES (two pawn guards)
//   black_queen    Ophira, the Black Queen (the finale): a gorgon sorceress who moves as every piece: rook, bishop,
//                  knight, the gorgon's gaze, the Queen's Gambit; at half strength she unbinds her serpents
//   pessokrator    the Grandmaster himself (the finale): from his throne he DEVELOPS pieces onto the board, calls CHECK,
//                  and next turn delivers CHECKMATE unless you break it (deal the shown damage to him, or take a piece)
// Bosses are guardians (tier stats) with `chess` set: their floor scaling is fixed, so every act's piece is tuned by
// its own sheet (tools/sim.mjs, guardian tier). Presentation hooks (all optional): fx.promote, fx.forked, fx.chessMove,
// fx.check, fx.checkBroken.
const A = (dmg, hits = 1, extra = {}) => ({ kind: 'attack', dmg, hits, icon: 'sword', ...extra });
const piecesOf = (B, e) => B.enemies.filter((x) => x.alive && x.minionOf === e.uid);
const others = (B, e) => B.alive().filter((x) => x !== e && x.def.pawn);

// shared moves ---------------------------------------------------------------------------------------------------------
/** blows of `it` (dmg, hits); the blows after the first PIERCE Block when it.leap (the knight jumps your guard) */
async function blows(B, e, it, { leap = false } = {}) {
  for (let h = 0; h < (it.dmg ? it.hits || 1 : 0); h++) { if (B.over || !e.alive) return; await B.blow(e, B.attackValue(e, it.dmg), h, it, { pierce: leap && h > 0 }); }
}
async function statuses(B, it) { for (const [k, n] of Object.entries(it.status || {})) if (!B.over) B.addSt(B.player, k, n); }
async function forkDraws(B, e, n) { const out = []; for (let k = 0; k < n && B.draw.length; k++) { const c = B.draw.pop(); B.discard.push(c); out.push(c); } if (out.length) await B.fx.forked?.(e, out); }
async function spawnPieces(B, e, ids) { for (const id of ids) { const m = B.spawnEnemy(id, { minionOf: e.uid }); B.pickIntent(m); await B.fx.enemySpawn?.(m); } }

export const CHESS = {
  // ================================================================ ACT I: THE BLACK PHALANX
  black_pawn: {
    name: 'Black Pawn', title: 'Hoplite of the Second Rank', hp: [36, 38], model: 'black_pawn', scale: 1.05, guardian: true, boss: true, chess: 'pawn', pawn: true, loot: { gold: [22, 28] },
    weakness: 'A pawn PROMOTES when it reaches the 8th rank (its 5th move): kill them first. Falling weight crushes the shields ×1.25; a wave (spread) hits the whole phalanx.',
    resist: [{ tag: 'fall', mul: 1.25, text: 'Crushed from above ×1.25' }, { tag: 'spinning', mul: 0.8, text: 'The locked shields turn a spin ×0.8' }],
    barks: { start: ['*ebony shields lock with one crack*', 'ONE RANK. ONE SPEAR. ONE MOVE.', '*the phalanx steps forward, two squares at once*'], hurt: ['*clang*', 'Hold the line!'], die: ['*the pawn tips over on its square*', 'Taken...'], special: ['*the line advances*', 'The eighth rank is near.'] },
    ai(e, B) {
      if (e.promoted) { const k = e.turn % 2; return k ? A(6, 2, { label: "Champion's Twin Spears" }) : A(15, 1, { label: "Champion's Charge", icon: 'skull' }); }
      const next = 4 + e.turn; // a double step on its first move, then one rank a turn
      if (next >= 8) return { kind: 'special', id: 'promote', custom: true, icon: 'up', label: 'PROMOTION on the 8th rank!' };
      const rot = (e.turn + (e.slot || 0)) % 3; const r = ` · rank ${next}/8`;
      if (rot === 0) return { ...A(6, 1, { label: 'Spear Thrust' + r }), id: 'advance', custom: true, rank: next };
      if (rot === 1) { const n = others(B, e).length; return { kind: 'block', id: 'lock', custom: true, icon: 'shield', label: `Lock Shields (+${6 + 6 * n})` + r, block: 6 + 6 * n, rank: next }; }
      return { ...A(9, 1, { label: 'Diagonal Capture' + r }), id: 'capture', custom: true, rank: next };
    },
    async act(B, e, it) {
      if (it.id === 'promote') { e.rank = 8; e.promoted = true; const add = Math.round(e.maxHp * 0.5); e.maxHp += add; e.hp = Math.min(e.maxHp, e.hp + add); B.addSt(e, 'strength', 2); await B.fx.promote?.(e); await B.fx.bark?.(e, 'PROMOTED. A CHAMPION OF THE BLACK.'); B.learn(e, 'promote'); return; }
      e.rank = it.rank; await B.fx.chessMove?.(e, 'advance');
      if (it.kind === 'block') { e.block += it.block; await B.fx.enemyBlock?.(e, it.block); return; }
      await blows(B, e, it);
    },
  },
  // ================================================================ ACT II (one of the two minor pieces)
  black_knight: {
    name: 'Hippolochos', title: 'The Black Knight, Who Never Rides Straight', hp: [154, 160], model: 'black_knight', scale: 1.25, guardian: true, boss: true, chess: 'knight', loot: { items: ['talaria', 'pendulum'], gold: [40, 50] },
    weakness: 'He moves in an L: the 2nd blow of a leap JUMPS your Block (shown). A Boulder still stops his straight charge (stunned, 15). Gravity drags the rider down ×1.5.',
    resist: [{ tag: 'fall', mul: 1.5, text: 'Gravity drags the rider down ×1.5' }, { tag: 'spinning', mul: 0.75, text: 'He leaps clear of a spin ×0.75' }],
    barks: { start: ['Two squares forward. One aside. You never see me coming, pawn.', '*the ebony horse-crest tosses; a hoof strikes sparks*', 'The Grandmaster sends his favourite piece. Be flattered.'], hurt: ['*the horse screams*', 'A lucky square.'], die: ['*the knight topples off its square*', 'Taken... by a PAWN...'], special: ['*he wheels, sideways*', 'FORK.'] },
    ai(e) {
      const t = e.turn % 4, k = Math.floor(e.turn / 4);
      if (t === 0) return { ...A(8, 2, { label: 'L-LEAP: the 2nd blow jumps your Block' }), id: 'lleap', custom: true };
      if (t === 1) return { ...A(6, 2, { label: 'FORK: 2 blows, knocks your next draw away' }), id: 'fork', custom: true, fork: 1 };
      if (t === 2) return { kind: 'buff', id: 'nimble', icon: 'up', label: 'Wheel Away: your next strike misses', evade: 1, str: 2 };
      return A(20 + k * 5, 1, { id: 'charge', charge: true, label: 'CAVALRY CHARGE (a Boulder stops it)', icon: 'skull' });
    },
    async act(B, e, it) { await B.fx.chessMove?.(e, 'leap'); await blows(B, e, it, { leap: it.id === 'lleap' }); if (it.fork && !B.over) await forkDraws(B, e, it.fork); },
  },
  oracle_bishop: {
    name: 'The Hierophant', title: 'Bishop of Delphi, Who Walks Only Diagonals', hp: [160, 166], model: 'oracle_bishop', scale: 1.2, guardian: true, boss: true, chess: 'bishop', reflectable: true, loot: { items: ['prism', 'owl'], gold: [40, 50] },
    weakness: 'His rays run DIAGONALLY: they petrify the 1st, 3rd and 5th card of your next hand. A Lens turns his ray back on him (stunned, 10). His own light burns him ×1.5.',
    resist: [{ tag: 'light', mul: 1.5, text: 'A Lens turns his own light on him ×1.5' }, { tag: 'hot', mul: 0.75, text: 'Incense smoke dulls Heat ×0.75' }],
    barks: { start: ['The oracle has seen this game. You lose on move forty.', '*the tripod smokes; the mitre splits like a seed*', 'I never move straight, child. Neither does fate.'], hurt: ['A diagonal I did not foresee.', '*the incense gutters*'], die: ['*the bishop topples, rolling to the corner of the board*', 'The oracle... was... wrong...'], special: ['*light pours along the diagonal*', 'Behold.'] },
    ai(e) {
      const t = e.turn % 4, k = Math.floor(e.turn / 4);
      if (t === 0) return { kind: 'debuff', id: 'ray', custom: true, icon: 'eye', label: 'DIAGONAL RAY: turns your 1st, 3rd, 5th cards to stone', dmg: 11, status: { diagonal: 1 } };
      if (t === 1) return { kind: 'block', id: 'sacrament', custom: true, icon: 'shield', label: 'Sacrament of Delphi: Block 16, heals 14', block: 16, heal: 14 };
      if (t === 2) return { kind: 'debuff', id: 'cross', custom: true, icon: 'eye', label: 'CROSSED BEAMS: 2 rays + Weak 2', dmg: 8, hits: 2, status: { weak: 2 } };
      return A(26 + k * 5, 1, { label: 'REVELATION', icon: 'skull' });
    },
    async act(B, e, it) {
      await B.fx.chessMove?.(e, 'beam');
      if (it.id === 'sacrament') { e.block += it.block; await B.fx.enemyBlock?.(e, it.block); const h = Math.min(it.heal, e.maxHp - e.hp); if (h > 0) { e.hp += h; await B.fx.heal?.(e, h); } return; }
      await blows(B, e, it); await statuses(B, it);
    },
  },
  // ================================================================ ACT III: THE ROOK
  rook_titan: {
    name: 'Pyrgos', title: 'The Walking Bastion', hp: [232, 238], model: 'rook_titan', scale: 1.45, guardian: true, boss: true, chess: 'rook', keepBlock: true, loot: { items: ['aegis', 'lever'], gold: [45, 55] },
    weakness: 'Its battlements KEEP their Block. It charges in straight lines: 7 per square rolled back (shown); a Boulder stops it (stunned, 15). Sound shakes the stones ×1.5; hard Stone cracks its Block ×2.',
    resist: [{ tag: 'sound', mul: 1.5, text: "Amphion's music shakes its stones ×1.5" }, { tag: 'heavy', mul: 1.25, text: 'Mass batters the gate ×1.25' }, { tag: 'hot', mul: 0.75, text: 'Cold stone shrugs off Heat ×0.75' }],
    barks: { start: ['*the bastion grinds forward one whole file*', 'I AM THE CORNER OF THE BOARD. NOTHING PASSES.', '*ballistae creak on the battlements*'], hurt: ['*masonry cracks*', '*a merlon tumbles*'], die: ['*the tower falls in a long avalanche of stone*', 'THE... CORNER... FALLS...'], special: ['*it backs down the file*', 'CASTLING.'] },
    ai(e) {
      if (!e.castled && e.hp <= e.maxHp / 2) return { kind: 'special', id: 'castle', custom: true, icon: 'up', label: 'CASTLING: two pawns take the walls (Block 20)', block: 20 };
      const t = e.turn % 4, d = 3 + Math.floor(e.turn / 4);
      if (t === 0) return { kind: 'block', id: 'battlements', icon: 'shield', label: 'Raise the Battlements: Block 24 (it stays)', block: 24 };
      if (t === 1) return { kind: 'block', id: 'rollback', icon: 'up', label: `Rolls back ${d} squares down the file`, block: 10 };
      if (t === 2) return A(9 * d, 1, { id: 'charge', charge: true, label: `STRAIGHT CHARGE: ${d} squares x 9`, icon: 'skull' });
      return A(7, 4, { label: 'Ballista Volley' });
    },
    async act(B, e, it) { e.castled = true; e.block += it.block; await B.fx.chessMove?.(e, 'castle'); await spawnPieces(B, e, ['pawn_guard', 'pawn_guard']); await B.fx.bark?.(e, 'CASTLING.'); B.learn(e, 'castle'); },
    sweep: true,
  },
  pawn_guard: {
    name: 'Pawn of the Walls', title: 'Castled In', hp: [28, 30], model: 'black_pawn', scale: 0.95, minion: true, guardian: true, pawn: true,
    barks: { start: [], hurt: ['*clang*'], die: ['*it tips over*'], special: [] },
    ai(e) { return e.turn % 2 ? { kind: 'block', id: 'wall', icon: 'shield', label: 'Shield the Tower', block: 8 } : A(6, 1, { label: 'Spear from the Wall' }); },
  },
  // ================================================================ THE FINALE: THE QUEEN, THEN THE KING
  black_queen: {
    name: 'Ophira', title: 'The Black Queen, Gorgon of the Last Rank', hp: [140, 144], model: 'black_queen', scale: 1.25, guardian: true, boss: true, chess: 'queen', reflectable: true, loot: { items: ['gorgon_scale', 'golden_apple'], gold: [55, 65] },
    weakness: 'She moves as EVERY piece in turn: rook, bishop, knight, gorgon, gambit (shown). A Lens turns her ray and her gaze back on her (stunned, 10). Light stings her serpents ×1.25.',
    resist: [{ tag: 'light', mul: 1.25, text: 'Light stings the serpents ×1.25' }, { tag: 'hot', mul: 0.8, text: 'Cold-blooded serpents shrug off Heat ×0.8' }],
    barks: { start: ['A pawn. On MY rank. How very... brave.', '*a hundred serpents rise from her crown*', 'I move however I please, little one. That is what a queen IS.'], hurt: ['Hsss! You dare?', '*the serpents shriek*'], die: ['*the queen turns to black glass, and shatters*', 'My king... forgive...'], special: ['*her eyes kindle*', 'Look at me.'] },
    ai(e) {
      if (!e.unbound && e.hp <= e.maxHp / 2) return { kind: 'buff', id: 'unbind', custom: true, icon: 'up', label: 'UNBIND THE SERPENTS: +4 Strength, Block 20', str: 4, block: 20 };
      const t = e.turn % 5, k = Math.floor(e.turn / 5);
      if (t === 0) return { ...A(12, 1, { label: 'As the ROOK: walls (Block 16), then a straight strike' }), id: 'qrook', custom: true, block: 16 };
      if (t === 1) return { kind: 'debuff', id: 'ray', custom: true, icon: 'eye', label: 'As the BISHOP: diagonal ray (1st, 3rd, 5th cards to stone)', dmg: 8, status: { diagonal: 1 } };
      if (t === 2) return { ...A(7, 2, { label: 'As the KNIGHT: L-leap (the 2nd blow jumps Block)' }), id: 'lleap', custom: true };
      if (t === 3) return { kind: 'debuff', id: 'gaze', icon: 'eye', label: "Gorgon's Gaze: 2 cards to stone", dmg: 6, petrify: 2 };
      return A(26 + k * 6, 1, { label: "QUEEN'S GAMBIT", icon: 'skull' });
    },
    async act(B, e, it) {
      if (it.id === 'unbind') { e.unbound = true; B.addSt(e, 'strength', it.str); e.block += it.block; await B.fx.chessMove?.(e, 'unbind'); await B.fx.enemyBlock?.(e, it.block); await B.fx.bark?.(e, 'UNBOUND.'); return; }
      if (it.id === 'qrook') { e.block += it.block; await B.fx.enemyBlock?.(e, it.block); await B.fx.chessMove?.(e, 'charge'); await blows(B, e, it); return; }
      await B.fx.chessMove?.(e, it.id === 'lleap' ? 'leap' : 'beam'); await blows(B, e, it, { leap: it.id === 'lleap' }); await statuses(B, it);
    },
  },
  pessokrator: {
    name: 'Pessokrator', title: 'The Grandmaster of Olympus', hp: [138, 142], model: 'pessokrator', scale: 1.0, guardian: true, boss: true, chess: 'king', throne: true, sweep: true, loot: { gold: [80, 100] },
    weakness: 'He calls CHECK, then CHECKMATE next turn. Break it before time flows: deal the shown damage to HIM, or TAKE one of his pieces. Topple the King and every piece falls.',
    resist: [{ tag: 'prismatic', mul: 1.25, text: 'A prism splits the stars he is made of ×1.25' }],
    barks: { start: ['Ah. The pawn that would not stay in its box.', 'Every god on Olympus is a piece of mine, child. Shall we play?', 'White to move. You have been white since the first apple fell.'], hurt: ['An interesting move.', '*the stars in his robe flicker*'], die: ['*the King tips over, slowly, and rolls*', 'I... resign.'], special: ['CHECK.', '*he lifts a piece between two fingers*'] },
    ai(e, B) {
      const k = Math.floor(e.turn / 5); const pcs = piecesOf(B, e);
      if (!e.stood && e.hp <= e.maxHp / 2) return { kind: 'special', id: 'stand', custom: true, icon: 'up', label: 'THE GRANDMASTER STANDS: +3 Strength, Block 24, new pieces', str: 3, block: 24 };
      if (e.check) { const need = e.checkNeed; return { ...A(26 + k * 8, 1, { label: `CHECKMATE! Break it: deal ${need} to him or take a piece`, icon: 'skull' }), id: 'mate', custom: true, need }; }
      const t = e.turn % 4;
      if (t === 0) return pcs.length < 2 ? { kind: 'special', id: 'develop', custom: true, icon: 'up', label: `DEVELOPS ${pcs.some((p) => p.id === 'board_knight') ? 'a Bishop' : 'a Knight'} onto the board` } : { kind: 'buff', id: 'tempo', custom: true, icon: 'up', label: 'TEMPO: his pieces +1 Strength', str: 1 };
      if (t === 1) return A(5, 2, { label: 'Royal Decree' });
      if (t === 2) return { kind: 'debuff', id: 'check', custom: true, icon: 'skull', label: 'CHECK! Next turn he delivers CHECKMATE', dmg: 4 };
      return { kind: 'block', id: 'castle', icon: 'shield', label: 'Castles the King: Block 26', block: 26 };
    },
    async act(B, e, it) {
      const pcs = piecesOf(B, e);
      if (it.id === 'develop') { await B.fx.chessMove?.(e, 'develop'); await spawnPieces(B, e, [pcs.some((p) => p.id === 'board_knight') ? 'board_bishop' : 'board_knight']); return; }
      if (it.id === 'tempo') { for (const p of pcs) B.addSt(p, 'strength', it.str); await B.fx.chessMove?.(e, 'tempo'); return; }
      if (it.id === 'stand') { e.stood = true; B.addSt(e, 'strength', it.str); e.block += it.block; await B.fx.chessMove?.(e, 'stand'); await B.fx.enemyBlock?.(e, it.block); const miss = []; if (!pcs.some((p) => p.id === 'board_knight')) miss.push('board_knight'); if (!pcs.some((p) => p.id === 'board_bishop')) miss.push('board_bishop'); miss.push('board_pawn'); await spawnPieces(B, e, miss.slice(0, 3 - pcs.length)); return; }
      if (it.id === 'check') { await blows(B, e, it); await statuses(B, it); e.check = true; e.checkHp = e.hp; e.checkPieces = piecesOf(B, e).length; e.checkNeed = Math.round(e.maxHp * 0.08); await B.fx.check?.(e); return; }
      if (it.id === 'mate') {
        e.check = false; const broken = e.checkHp - e.hp >= it.need || piecesOf(B, e).length < e.checkPieces;
        if (broken) { B.addSt(e, 'vulnerable', 2); await B.fx.checkBroken?.(e); await B.fx.bark?.(e, 'Check... broken. Well played.'); B.learn(e, 'checkbreak'); return; }
        await B.fx.chessMove?.(e, 'mate'); await blows(B, e, it);
      }
    },
  },
  board_knight: {
    name: 'Ebony Knight', title: 'A Piece of the Grandmaster', hp: [30, 32], model: 'black_knight', scale: 0.72, minion: true, guardian: true, chess: 'knight',
    barks: { start: [], hurt: ['*the horse rears*'], die: ['*it tips off the board*'], special: [] },
    ai(e) { return e.turn % 2 ? { kind: 'block', id: 'rear', icon: 'shield', label: 'Rears Up', block: 10 } : { ...A(3, 2, { label: 'L-Leap (the 2nd blow jumps Block)' }), id: 'lleap', custom: true }; },
    async act(B, e, it) { await B.fx.chessMove?.(e, 'leap'); await blows(B, e, it, { leap: true }); },
  },
  board_bishop: {
    name: 'Ivory-Eyed Bishop', title: 'A Piece of the Grandmaster', hp: [28, 30], model: 'oracle_bishop', scale: 0.75, minion: true, guardian: true, chess: 'bishop', reflectable: true,
    barks: { start: [], hurt: ['*the mitre cracks*'], die: ['*it rolls into the corner*'], special: [] },
    ai(e) { return e.turn % 2 ? { kind: 'block', id: 'bless', custom: true, icon: 'shield', label: 'Shields the King: Block 12 to him', block: 12 } : { kind: 'debuff', id: 'ray', custom: true, icon: 'eye', label: 'Diagonal Ray (1st, 3rd, 5th cards to stone)', dmg: 3, status: { diagonal: 1 } }; },
    async act(B, e, it) { if (it.id === 'bless') { const k = B.enemies.find((x) => x.uid === e.minionOf && x.alive) || e; k.block += it.block; await B.fx.enemyBlock?.(k, it.block); return; } await B.fx.chessMove?.(e, 'beam'); await blows(B, e, it); await statuses(B, it); },
  },
  board_pawn: {
    name: 'Obsidian Pawn', title: 'A Piece of the Grandmaster', hp: [18, 20], model: 'black_pawn', scale: 0.8, minion: true, guardian: true, pawn: true,
    barks: { start: [], hurt: ['*clink*'], die: ['*it tips over*'], special: [] },
    ai(e) { if (e.promoted) return A(14, 1, { label: 'Promoted: Royal Lance', icon: 'skull' }); const next = 6 + e.turn; if (next >= 8) return { kind: 'special', id: 'promote', custom: true, icon: 'up', label: 'PROMOTION on the 8th rank!' }; return { ...A(6, 1, { label: `Diagonal Capture · rank ${next}/8` }), id: 'advance', custom: true, rank: next }; },
    async act(B, e, it) { if (it.id === 'promote') { e.promoted = true; e.maxHp += 30; e.hp += 30; B.addSt(e, 'strength', 2); await B.fx.promote?.(e); return; } e.rank = it.rank; await blows(B, e, it); },
  },
};
// the board pieces fall with their King (Battle.killEnemy reads `sweep`); a Rook's castled pawns fall with the tower
export const CHESS_IDS = Object.keys(CHESS);
/** the act bosses in story order (scenes/chesscine.js, models, the map's boss figurine) */
export const PIECES = { pawn: 'black_pawn', knight: 'black_knight', bishop: 'oracle_bishop', rook: 'rook_titan', queen: 'black_queen', king: 'pessokrator' };
