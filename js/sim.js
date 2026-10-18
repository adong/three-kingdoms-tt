/* Three Kingdoms TT: the engine. Plain state, stepped at a fixed 60 steps a second, with no Three.js and no DOM, so
   the same code runs the browser game, window.game.soak() and the headless check (node tools/check.js).
   The renderer (js/game.js) only reads this state and the `events` list it fills.

   Everyone on the road is a "fighter": the heroes (kind 'hero'), the companion (kind 'buddy') and the army
   (kind 'enemy'). Each one is a little state machine (idle, walk, run, attack, jump, grab, held, hurt, down, lying,
   getup, dizzy, flag, runoff...). The army's and the companion's brains are in js/brains.js.
   Nobody gets hurt for real: a bonked hero loses a heart, a beaten soldier sits dizzy, drops his coins and runs
   off home or pops into stars. */
(function () {
  'use strict';

  const DT = 1 / 60;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const ev = (W, type, o) => W.events.push(Object.assign({ type, t: W.t }, o));
  const brains = () => window.TKBrains;
  // the companion is the other brother: Tommy for everyone, Teddy when Tommy is the one playing (the kit's roster)
  const buddyFor = (id) => (window.Kit && window.Kit.roster ? window.Kit.roster.buddyFor(id) : id === 'tommy' ? 'teddy' : 'tommy');

  // ---------------------------------------------------------------- the world

  // opts: stage, mode ('1p' | '2p' | 'demo'), hero (1 player), heroes ([p1, p2] for 2 players), difficulty
  // ('easy' | 'normal'), seed, halfW (half the visible width), lives / continues (overrides, for tests).
  function create(opts = {}) {
    const R = window.TK_RULES;
    const stages = window.TK_STAGES;
    const si = clamp(opts.stage | 0, 0, stages.length - 1);
    const S = stages[si];
    const diff = Object.assign({}, R.DIFF[opts.difficulty] || R.DIFF.normal);
    if (opts.lives) diff.lives = opts.lives;
    const halfW = opts.halfW || R.WORLD.VIEW_HALF;
    const W = {
      R, S, si, diff, difficulty: R.DIFF[opts.difficulty] ? opts.difficulty : 'normal', mode: opts.mode || '1p',
      t: 0, halfW, zMin: R.WORLD.Z_MIN, zMax: R.WORLD.Z_MAX,
      rand: mulberry32(opts.seed != null ? opts.seed : (Math.random() * 1e9) | 0),
      heroes: [], enemies: [], items: [], shots: [], crates: [], events: [],
      cam: { x: halfW }, lockX: halfW, sec: 0, secState: S.bonus ? 'bonus' : 'travel', go: false, goFrom: 0,
      waveIdx: 0, waveT: 0, pending: [],
      phase: 'intro', phaseT: 0, boss: null, bossDown: false,
      buddy: null, buddyT: 0, treatN: 0, teamCd: 0,
      bonus: S.bonus ? { t: S.time, total: 0, perfect: false } : null,
      continues: opts.continues != null ? opts.continues : diff.continues,
      nextId: 1,
      stats: { kos: 0, hits: 0, specials: 0, rescues: 0, treats: 0, saves: 0, deaths: 0, continues: 0, teamups: 0, calls: 0, time: 0, ouch: 0, coins: 0, chests: 0, rides: 0, horseCalls: 0 },
    };
    let who;
    if (W.mode === '2p' || W.mode === 'demo') {
      const hs = opts.heroes || ['teddy', 'tommy'];
      who = [R.HEROES[hs[0]] ? hs[0] : 'teddy', R.HEROES[hs[1]] ? hs[1] : 'tommy'];
    } else who = [R.HEROES[opts.hero] ? opts.hero : 'teddy'];
    who.forEach((w, i) => W.heroes.push(makeHero(W, w, i)));
    // items and chests are placed now, so you can see them as you walk up
    S.sections.forEach((sec) => {
      const cx = secX(W, sec);
      (sec.items || []).forEach((it) => spawnItem(W, it.kind, cx + it.x, it.z != null ? it.z : 0, false));
      (sec.chests || []).forEach((c) => addCrate(W, cx + c.x, c.z != null ? c.z : -2.1, c.drop || 'coins', 'chest'));
    });
    if (S.bonus) setupJars(W);
    return W;
  }

  function makeHero(W, who, slot) {
    return {
      id: W.nextId++, kind: 'hero', who, slot, def: W.R.HEROES[who],
      x: W.cam.x - W.halfW - 0.8 - slot * 1.1, y: 0, z: W.mode === '1p' ? -0.4 : slot ? 0.3 : -1.1,
      vx: 0, vy: 0, vz: 0, face: 1, r: 0.4, scale: 1,
      hp: W.diff.hearts, maxHp: W.diff.hearts, lives: W.diff.lives, score: 0, coins: 0,
      orbs: W.diff.orbs, orbFill: 0, wlv: 1, horse: false, horseCd: 0, tramp: {}, scrolls: [],
      state: 'enter', st: 0, move: null, combo: 0, comboT: 9, queued: false,
      grab: null, bops: 0, bopT: -1, contact: 0,
      inv: 0, freeze: 0, flash: 0, shield: false, out: false, ko: false, stun: 0,
    };
  }

  function addCrate(W, x, z, drop, look) {
    const c = { id: W.nextId++, x, z: clamp(z, W.zMin, W.zMax), drop, look };
    W.crates.push(c);
    return c;
  }

  // The bonus round: rows of jars across one screen. Most hold coins; a few hold gold or a peach.
  function setupJars(W) {
    const span = Math.min(W.halfW - 1.4, 5.4);
    const rows = [-2.2, -0.95, 0.3];
    const cols = 6;
    rows.forEach((z, r) => {
      for (let i = 0; i < cols; i++) {
        const x = W.cam.x - span + 1.2 + ((span * 2 - 1.2) * i) / (cols - 1) + (r % 2 ? 0.35 : 0);
        const roll = W.rand();
        addCrate(W, x, z, roll < 0.12 ? 'ingot' : roll < 0.18 ? 'peach' : 'coins', 'jar');
      }
    });
    W.bonus.total = W.crates.length;
  }

  // Where a section stops the screen (the middle of the screen, in metres along the road).
  function secX(W, sec) {
    const lo = W.halfW, hi = Math.max(lo, W.S.length - W.halfW);
    if (sec.at === 'start') return lo;
    if (sec.at === 'end') return hi;
    return clamp(sec.at, lo, hi);
  }

  const viewL = (W) => W.cam.x - W.halfW + W.R.WORLD.EDGE;
  const viewR = (W) => W.cam.x + W.halfW - W.R.WORLD.EDGE;
  const activeHero = (h) => !h.out && h.state !== 'out';
  const standing = (h) => activeHero(h) && !h.ko && !['down', 'lying', 'dizzy', 'drop', 'enter'].includes(h.state);

  // ---------------------------------------------------------------- the main step

  // inputs: one per hero: { mx, mz (-1..1), attack, jump, special, call, horse (presses this step), dash (±1 on a double tap) }
  function step(W, inputs = []) {
    W.t += DT;
    W.phaseT += DT;
    if (W.phase === 'play' || W.phase === 'team') W.stats.time += DT;
    W.teamCd = Math.max(0, W.teamCd - DT);
    const noInput = {};

    if (W.phase === 'intro' && W.phaseT > 1.3) setPhase(W, 'play');
    if (W.phase === 'team') return stepTeam(W, inputs);

    // calling the brother (1P) or the team-up (2P)
    for (let i = 0; i < W.heroes.length; i++) if (inputs[i] && inputs[i].call) callBrother(W, i);
    // calling a horse
    for (let i = 0; i < W.heroes.length; i++) if (inputs[i] && inputs[i].horse) callHorse(W, i);

    W.heroes.forEach((h, i) => updateHero(W, h, W.phase === 'play' ? inputs[i] || noInput : noInput));
    if (W.buddy) updateBuddy(W, W.buddy);
    if (W.phase === 'play' || W.phase === 'clear') {
      brains().tokens(W);
      for (const e of W.enemies) updateEnemy(W, e);
      separate(W);
      W.enemies = W.enemies.filter((e) => !e.gone);
      updateShots(W);
    }
    updateItems(W);
    if (W.phase === 'play') {
      if (W.bonus) stepBonus(W);
      else {
        updateSections(W);
        updateCam(W);
      }
    }
    if (W.phase === 'clear') stepClear(W);
    if (W.phase === 'celebrate') stepCelebrate(W);
    if (W.events.length > 400) W.events.splice(0, W.events.length - 400);
  }

  function setPhase(W, p) {
    W.phase = p;
    W.phaseT = 0;
    ev(W, 'phase', { phase: p });
  }

  // ---------------------------------------------------------------- sections, waves, camera

  function updateSections(W) {
    const sec = W.S.sections[W.sec];
    if (!sec) return;
    if (W.secState === 'travel') {
      W.lockX = secX(W, sec);
      if (W.cam.x >= W.lockX - 0.02) {
        W.cam.x = W.lockX;
        W.secState = 'fight';
        W.go = false;
        W.waveIdx = 0;
        W.waveT = 99;
        W.pending = [];
        ev(W, 'section', { n: W.sec, boss: !!sec.boss });
        if (sec.tip) ev(W, 'tip', { tip: sec.tip });
      }
      return;
    }
    if (W.secState !== 'fight') return;
    const waves = sec.waves || [];
    const alive = W.enemies.filter((e) => !e.ko).length + W.pending.length;
    W.waveT += DT;
    const wave = waves[W.waveIdx];
    if (wave) {
      const first = W.waveIdx === 0;
      const when = wave.when != null ? wave.when : 1;
      const delay = wave.delay != null ? wave.delay : first ? 0.3 : 1.0;
      if (alive <= (first ? 99 : when) && W.waveT >= delay) {
        queueWave(W, wave);
        W.waveIdx++;
        W.waveT = 0;
      }
    }
    // pending soldiers walk in as soon as there's room
    const max = W.diff.maxActive + (sec.boss ? 1 : 0);
    while (W.pending.length && W.enemies.filter((e) => !e.ko).length < max) {
      const p = W.pending.shift();
      spawnEnemy(W, p.type, p.side);
    }
    if (W.waveIdx >= waves.length && !W.pending.length && !W.enemies.length) {
      if (sec.boss) {
        if (W.phase === 'play') stageClear(W);
      } else {
        W.sec++;
        W.secState = 'travel';
        W.go = true;
        W.goFrom = W.cam.x;
        ev(W, 'go');
      }
    }
  }

  function queueWave(W, wave) {
    const list = (wave.enemies || []).slice();
    // easy mode leaves a few of the army at home (never a boss)
    if (W.diff.keep < 1) {
      const keep = Math.max(1, Math.ceil(list.length * W.diff.keep));
      for (let i = list.length - 1; i >= 0 && list.length > keep; i--) if (!W.R.BOSSES[list[i]]) list.splice(i, 1);
    }
    const from = wave.from || 'right';
    list.forEach((type, i) => {
      const side = from === 'left' ? -1 : from === 'both' ? (i % 2 ? -1 : 1) : 1;
      W.pending.push({ type, side });
    });
  }

  function updateCam(W) {
    const hs = W.heroes.filter((h) => activeHero(h) && h.state !== 'drop');
    const lo = W.halfW, hi = Math.max(lo, W.S.length - W.halfW);
    if (hs.length && W.secState === 'travel') {
      let minX = Infinity, maxX = -Infinity;
      for (const h of hs) { minX = Math.min(minX, h.x); maxX = Math.max(maxX, h.x); }
      let target = Math.max(W.cam.x, maxX - W.halfW * 0.1);
      target = Math.min(target, minX + W.halfW - 1.4, W.lockX);
      if (target > W.cam.x) W.cam.x = Math.min(target, W.cam.x + 7 * DT);
    }
    W.cam.x = clamp(W.cam.x, lo, hi);
    if (W.go && W.cam.x > W.goFrom + 3) W.go = false;
  }

  // The bonus round: an incense stick burns down; smash every jar first for a PERFECT bonus.
  function stepBonus(W) {
    const B = W.bonus;
    B.t = Math.max(0, B.t - DT);
    const jars = W.crates.filter((c) => c.look === 'jar').length;
    if (!jars && !B.perfect) {
      B.perfect = true;
      const h = W.heroes.find(activeHero) || W.heroes[0];
      for (let i = 0; i < 4; i++) spawnItem(W, 'ingot', h.x + (W.rand() - 0.5) * 2, h.z, true);
      ev(W, 'perfect', { x: h.x, z: h.z });
    }
    if (B.t <= 0 || (B.perfect && !W.items.some(isCoin))) {
      ev(W, 'timeUp', { perfect: B.perfect });
      // coins still in the air go straight into pockets
      for (const it of W.items) if (isCoin(it)) collectCoin(W, W.heroes.find(activeHero) || W.heroes[0], it);
      stageClear(W);
    }
  }

  // ---------------------------------------------------------------- spawning

  function spawnEnemy(W, type, side) {
    const R = W.R;
    const boss = !!R.BOSSES[type];
    const def = R.BOSSES[type] || R.ENEMIES[type] || R.ENEMIES.straw;
    const scale = def.scale || 1;
    const hp = Math.round(def.hp * (boss ? W.diff.bossHp : W.diff.enemyHp));
    const z = W.zMin + 0.3 + W.rand() * (W.zMax - W.zMin - 0.6);
    const e = {
      id: W.nextId++, kind: 'enemy', type, def, boss, scale, r: 0.38 * scale,
      x: W.cam.x + side * (W.halfW + 1.0 + W.rand() * 1.2), y: 0, z, vx: 0, vy: 0, vz: 0, face: -side,
      hp, maxHp: hp, state: 'enter', st: 0, stun: 0, freeze: 0, flash: 0, barT: 0,
      look: def.looks ? Math.floor(W.rand() * def.looks.length) : 0,
      enterX: W.cam.x + side * (W.halfW - 1.3 - W.rand() * 2.2), born: W.t,
      ai: { side, cool: 0.4 + W.rand() * 0.8, zoff: (W.rand() - 0.5) * 1.6, spread: W.rand(), token: false, think: 0 },
    };
    W.enemies.push(e);
    if (boss) {
      W.boss = e;
      e.ai.cool = 1.5;
      ev(W, 'boss', { id: e.id, etype: type, name: def.name, title: def.title });
    }
    return e;
  }

  function spawnItem(W, kind, x, z, pop) {
    const it = { id: W.nextId++, kind, x, z: clamp(z, W.zMin, W.zMax), y: pop ? 0.5 : 0, vy: pop ? 4.5 + W.rand() * 1.5 : 0, vx: pop ? (W.rand() - 0.5) * 2.2 : 0, t: 0, popped: !!pop };
    W.items.push(it);
    return it;
  }

  const isCoin = (it) => !!window.TK_RULES.COINS[it.kind];

  function popCoins(W, x, z, n) {
    for (let i = 0; i < n; i++) spawnItem(W, 'coin', x, z + (W.rand() - 0.5) * 0.4, true);
  }

  // ---------------------------------------------------------------- the heroes (and the companion's body)

  function updateHero(W, h, inp) {
    if (h.out) {
      // 2 players: a hero who's out of lives taps attack to jump back in (uses a continue)
      if (inp.attack && W.mode === '2p' && W.phase === 'play' && W.continues > 0 && W.heroes.some((o) => o !== h && activeHero(o))) {
        W.continues--;
        W.stats.continues++;
        h.out = false;
        h.lives = W.diff.lives;
        respawn(W, h);
        ev(W, 'join', { who: h.who });
      }
      return;
    }
    if (h.freeze > 0) {
      // presses during the little hit-pause aren't lost: they wait for the next step
      h.freeze -= DT;
      for (const k of ['attack', 'jump', 'special', 'rescue']) if (inp[k]) (h.buf = h.buf || {})[k] = true;
      return;
    }
    if (h.buf) { inp = Object.assign({}, inp, h.buf); h.buf = null; }
    if (h.hopWait > 0) {
      if (inp.attack || inp.rescue) {
        h.hopWait = 0;
        inp = Object.assign({}, inp, { rescue: true, attack: false, jump: false });
      } else {
        h.hopWait -= DT;
        if (h.hopWait <= 0) {
          h.hopWait = 0;
          if (h.horse && ['idle', 'walk', 'run', 'land'].includes(h.state)) dismount(W, h, true);
        }
      }
    }
    h.st += DT;
    h.inv = Math.max(0, h.inv - DT);
    h.flash = Math.max(0, h.flash - DT);
    h.horseCd = Math.max(0, (h.horseCd || 0) - DT);
    h.comboT += DT;
    h.shield = W.mode === '1p' && buddyGuards(W);
    fighterBody(W, h, inp);
    if (h.drag) dragStep(W, h);
    if (h.kind === 'hero') {
      clampToView(W, h);
      pickups(W, h);
    }
  }

  // Movement and moves shared by the heroes and the companion. inp is the controller (or the AI) for this step.
  function fighterBody(W, h, inp) {
    const D = h.def;
    // the rescue spin (swing + jump together) works mid-swing, while holding someone, or while being bonked:
    // that's when you need it
    if (h.kind === 'hero' && inp.scroll && h.scrolls && h.scrolls.length && RESCUE_FROM.includes(h.state)) {
      if (h.grab) { const g = h.grab; g.heldBy = null; g.state = 'hurt'; g.st = 0; g.stun = 0.3; h.grab = null; }
      startScroll(W, h);
    } else if (h.kind === 'hero' && (inp.rescue || (inp.attack && inp.jump)) && RESCUE_FROM.includes(h.state)) {
      if (h.grab) { const g = h.grab; g.heldBy = null; g.state = 'hurt'; g.st = 0; g.stun = 0.3; h.grab = null; }
      startSpecial(W, h, true);
    }
    switch (h.state) {
      case 'enter': {
        // walking in from the left at the start of a stage
        const to = W.cam.x - W.halfW + 2.2 + h.slot * 1.1;
        h.vx = D.speed;
        h.vz = 0;
        h.face = 1;
        if (h.x >= to) { h.state = 'idle'; h.st = 0; h.vx = 0; }
        break;
      }
      case 'idle': case 'walk': case 'run': case 'land':
        ground(W, h, inp);
        break;
      case 'attack': attackStep(W, h, inp); break;
      case 'jump': jumpStep(W, h, inp); break;
      case 'grab': grabStep(W, h, inp); break;
      case 'toss':
        h.vx = 0; h.vz = 0;
        if (h.st > W.R.MOVES.toss.len) idle(h);
        break;
      case 'special': specialStep(W, h); break;
      case 'hurt':
        h.vx *= 0.85; h.vz = 0;
        if (h.st >= h.stun) idle(h);
        break;
      case 'down': fall(W, h); break;
      case 'lying':
        h.vx = 0;
        if (h.ko && h.st > 0.45) { h.state = 'dizzy'; h.st = 0; }
        else if (!h.ko && h.st > 0.75) { h.state = 'getup'; h.st = 0; }
        break;
      case 'getup':
        if (h.st > 0.35) { idle(h); h.inv = Math.max(h.inv, 1.0); }
        break;
      case 'dizzy':
        if (h.st > 1.6) loseLife(W, h);
        break;
      case 'drop':
        h.vy -= W.R.WORLD.GRAVITY * 0.6 * DT;
        h.y += h.vy * DT;
        h.vx = h.vz = 0;
        if (h.y <= 0) { h.y = 0; h.vy = 0; idle(h); ev(W, 'land', { x: h.x, z: h.z, big: true }); }
        break;
      case 'celebrate': break;
    }
    if (h.state !== 'grab' && h.state !== 'drop' && h.state !== 'down') {
      h.x += h.vx * DT;
      h.z = clamp(h.z + h.vz * DT, W.zMin, W.zMax);
    }
  }

  // jump is there because people often press G a hair before F: then you spin in the air and drop to the ground
  const RESCUE_FROM = ['idle', 'walk', 'run', 'land', 'attack', 'hurt', 'grab', 'toss', 'jump'];
  const randomScroll = (W) => W.R.SCROLL_ORDER[Math.floor(W.rand() * W.R.SCROLL_ORDER.length)];

  function idle(h) {
    h.state = 'idle';
    h.st = 0;
    h.vx = h.vz = 0;
    h.move = null;
  }

  function ground(W, h, inp) {
    const D = h.def;
    const H = W.R.HORSE;
    if (h.kind === 'hero' && inp.special) return startSpecial(W, h, false);
    if (inp.jump) {
      // on a horse, G waits a split second before hopping off: if F comes too, it's the horse stomp instead
      if (h.horse) { if (!(h.hopWait > 0)) h.hopWait = W.R.HORSE.hopWait; return; }
      return startJump(W, h, inp);
    }
    if (inp.attack) {
      if (h.horse) {
        if (h.drag) return fling(W, h);
        const D = W.R.MOVES.drag;
        const e = h.kind === 'hero' && W.enemies.find((o) => grabbable(o) && (o.x - h.x) * h.face > 0.2 && (o.x - h.x) * h.face < D.reach + o.r && Math.abs(o.z - h.z) < D.depth);
        if (e) return startDrag(W, h, e);
        return startMove(W, h, 'ride', W.R.MOVES.ride);
      }
      if (h.state === 'run') return startMove(W, h, 'dashHit', W.R.MOVES.dashHit);
      return comboAttack(W, h);
    }
    if (inp.dash && !h.horse) {
      h.state = 'run';
      h.st = 0;
      h.face = inp.dash;
      ev(W, 'dash', { who: h.who, x: h.x, z: h.z });
    }
    const mx = inp.mx || 0, mz = inp.mz || 0;
    if (h.state === 'run') {
      if (sign(mx) !== h.face) h.state = 'walk';
      else {
        h.vx = h.face * D.run;
        h.vz = mz * D.speedZ;
        return;
      }
    }
    const fast = h.horse ? H.speed : 1, fastZ = h.horse ? H.speedZ : 1;
    h.vx = mx * D.speed * fast;
    h.vz = mz * D.speedZ * fastZ;
    if (mx) h.face = sign(mx);
    const moving = Math.abs(mx) > 0.05 || Math.abs(mz) > 0.05;
    if (h.state === 'land' && h.st < 0.1) return;
    h.state = moving ? 'walk' : 'idle';
    if (h.horse) { trample(W, h); return; }
    // walk into a soldier to grab him
    if (h.kind === 'hero' && Math.abs(mx) > 0.3) {
      const e = W.enemies.find((e) => grabbable(e) && (e.x - h.x) * h.face > 0.1 && Math.abs(e.x - h.x) < 0.95 && Math.abs(e.z - h.z) < 0.42);
      if (e) {
        h.contact += DT;
        if (h.contact > (e.state === 'hurt' ? 0.02 : 0.14)) startGrab(W, h, e);
      } else h.contact = 0;
    } else h.contact = 0;
  }

  // On a horse at a gallop you bowl over anyone in front of you (each one only every so often).
  function trample(W, h) {
    if (Math.abs(h.vx) < W.R.HORSE.trampleSpeed) return;
    const T = W.R.MOVES.trample;
    for (const e of W.enemies) {
      if (!hittable(W, e) || (h.tramp[e.id] || -9) > W.t - 0.8) continue;
      const dx = (e.x - h.x) * h.face;
      if (dx < 0 || dx > 1.15 + e.r * 0.5 || Math.abs(e.z - h.z) > 0.5) continue;
      h.tramp[e.id] = W.t;
      damageEnemy(W, e, T.dmg * W.R.WEAPON_LEVEL.dmg[h.wlv - 1], { knock: true, dir: h.face, word: T.word, big: true, by: h });
    }
  }

  function mount(W, h, it) {
    it.gone = true;
    h.horse = true;
    h.contact = 0;
    W.stats.rides++;
    ev(W, 'mount', { who: h.who, x: it.x, z: it.z });
    if (h.kind === 'hero') buddyRides(W, h);
  }

  // When you ride, your brother rides too: he keeps (or whistles up) his little white horse for the rest of his visit.
  function buddyRides(W, h) {
    const b = W.buddy;
    if (W.mode !== '1p' || !b || !h.horse || b.horse || ['bye', 'leave', 'celebrate'].includes(b.state)) return;
    b.horse = true;
    if (b.state !== 'bEnter') ev(W, 'buddyMount', { who: b.who, x: b.x, z: b.z });
  }

  // Off the horse: hop off (it waits for you), or get knocked off (it trots home). A horse you hopped off waits
  // until you've stepped away from it before you can climb back on, so you don't land straight back in the saddle.
  function dismount(W, h, hop) {
    if (h.drag) dropDrag(W, h);
    h.horse = false;
    if (hop) {
      const it = spawnItem(W, 'horse', h.x, h.z, false);
      it.face = h.face;
      it.left = h.id;
      h.state = 'jump';
      h.st = 0;
      h.vy = 5;
      h.y = W.R.HORSE.height * 0.6;
      h.vx = -h.face * 2.0;
      h.vz = 0;
      h.move = null;
      h.kicked = true;
      ev(W, 'dismount', { who: h.who, x: h.x, z: h.z });
    } else ev(W, 'horseOff', { who: h.who, x: h.x, z: h.z, face: h.face });
  }

  // R (or O) calls a horse: it gallops in from behind and you hop on when it reaches you. One at a time, and after
  // a call there's a little wait (a few seconds on easy) before the next.
  function callHorse(W, slot) {
    const h = W.heroes[slot];
    if (!h || W.phase !== 'play' || !standing(h) || h.horse || h.horseCd > 0) return false;
    if (W.items.some((it) => it.kind === 'horse' && it.coming && it.owner === h.id)) return false;
    const it = spawnItem(W, 'horse', W.cam.x - W.halfW - 1.2, h.z, false);
    it.coming = true;
    it.owner = h.id;
    it.face = 1;
    h.horseCd = W.diff.horseCd;
    W.stats.horseCalls++;
    ev(W, 'horseCall', { who: h.who, x: h.x, z: h.z });
    return true;
  }

  // On a horse, swing right next to a soldier to scoop him up by the collar: he dangles beside the horse kicking
  // his legs, every bump of the gallop costs him (BUMP!), and he bowls over anyone he's swung into. Swing again (or
  // after a few seconds) to fling him away. Silly, not rough: he lands dizzy like everyone else.
  function startDrag(W, h, e) {
    h.drag = e;
    h.dragT = 0;
    h.dragBump = 0;
    e.state = 'held';
    e.st = 0;
    e.heldBy = h;
    e.face = -h.face;
    e.hitIds = new Set([e.id]);
    ev(W, 'scoop', { who: h.who, x: e.x, y: 1.6, z: e.z });
  }

  function dragStep(W, h) {
    const e = h.drag;
    if (!e || e.gone || e.state !== 'held' || e.heldBy !== h || !h.horse || !standing(h)) return dropDrag(W, h);
    const D = W.R.MOVES.drag;
    const moving = Math.hypot(h.vx, h.vz) > 1;
    h.dragT += DT;
    e.x = clamp(h.x + h.face * 0.85, viewL(W), viewR(W));
    e.z = clamp(h.z + 0.35, W.zMin, W.zMax);
    e.y = 0.3 + (moving ? Math.abs(Math.sin(W.t * 12)) * 0.18 : 0);
    if (moving) {
      h.dragBump += DT;
      if (h.dragBump >= D.every) {
        h.dragBump = 0;
        e.hp -= D.dmg * W.R.WEAPON_LEVEL.dmg[(h.wlv || 1) - 1];
        e.flash = 0.15;
        e.barT = 2.2;
        h.score += 10;
        W.stats.hits++;
        W.stats.bumps = (W.stats.bumps || 0) + 1;
        ev(W, 'hit', { x: e.x, y: e.y + 1.0, z: e.z, word: D.word, big: false, by: h.who });
        if (e.hp <= 0) return fling(W, h);
      }
      // swung into another soldier: STRIKE!
      for (const o of W.enemies) {
        if (o === e || e.hitIds.has(o.id) || !hittable(W, o)) continue;
        if (Math.abs(o.x - e.x) < 0.8 && Math.abs(o.z - e.z) < 0.6) {
          e.hitIds.add(o.id);
          damageEnemy(W, o, D.hitOthers, { knock: !o.boss, dir: h.face, word: 'STRIKE!', big: true, by: h });
        }
      }
    }
    if (h.dragT > D.max) fling(W, h);
  }

  // Let go with a big swing: he flies off and bowls over anyone he lands on (like a toss).
  function fling(W, h) {
    const e = h.drag;
    const D = W.R.MOVES.drag;
    h.drag = null;
    if (!e || e.gone || e.heldBy !== h) return;
    e.heldBy = null;
    e.hp -= D.fling;
    e.flash = 0.2;
    e.barT = 2;
    e.x = clamp(h.x + h.face * 1.0, viewL(W), viewR(W));
    e.y = 0.9;
    e.state = 'down';
    e.st = 0;
    e.thrown = true;
    e.thrownBy = h;
    e.hitIds = new Set([e.id]);
    e.vx = h.face * D.speed;
    e.vy = 4.6;
    h.score += 30;
    W.stats.hits++;
    if (e.hp <= 0) { e.hp = 0; beaten(W, e, h.face); }
    ev(W, 'toss', { who: h.who, x: e.x, y: 1.4, z: e.z, dir: h.face, word: 'WHEE!' });
  }

  // Dropped (you got bumped, hopped off, or the stage ended): he lands on his feet, a bit dizzy.
  function dropDrag(W, h) {
    const e = h.drag;
    h.drag = null;
    if (!e || e.gone || e.heldBy !== h) return;
    e.heldBy = null;
    e.state = 'hurt';
    e.st = 0;
    e.stun = 0.4;
    e.y = 0;
    e.vx = e.vz = 0;
  }

  // Step down for magic or a team-up: the horse waits right behind you.
  function parkHorse(W, h) {
    if (h.drag) dropDrag(W, h);
    h.horse = false;
    const it = spawnItem(W, 'horse', clamp(h.x - h.face * 0.7, viewL(W), viewR(W)), h.z, false);
    it.face = h.face;
    ev(W, 'park', { who: h.who, x: it.x, z: it.z });
  }

  function comboAttack(W, h) {
    const C = h.def.combo;
    if (h.comboT > 0.5) h.combo = 0;
    const name = C[h.combo % C.length];
    h.combo = (h.combo + 1) % C.length;
    startMove(W, h, name, W.R.MOVES[name]);
  }

  function startMove(W, h, name, def) {
    h.state = 'attack';
    h.st = 0;
    h.move = { name, def, hit: new Set(), connected: false };
    h.queued = false;
    h.vx = h.vz = 0;
    ev(W, 'swing', { who: h.who, id: h.id, name, big: !!def.big });
  }

  function attackStep(W, h, inp) {
    const m = h.move.def;
    if (inp.attack && h.st >= (m.next != null ? m.next : m.len * 0.5)) h.queued = true;
    if (m.lunge && h.st < m.until) h.vx = h.face * m.lunge * (h.move.name === 'dashHit' ? Math.max(0, 1 - h.st / m.len) : 1);
    else if (h.horse) { h.vx = (inp.mx || 0) * h.def.speed * 1.2; h.vz = (inp.mz || 0) * h.def.speedZ; }
    else h.vx *= 0.75;
    if (!h.horse) h.vz = 0;
    if (h.st >= m.at && h.st <= m.until) hitbox(W, h, m);
    if (h.st >= m.len) {
      idle(h);
      h.comboT = 0;
      if (h.queued) {
        h.queued = false;
        if (h.horse) startMove(W, h, 'ride', W.R.MOVES.ride);
        else comboAttack(W, h);
      }
    }
  }

  // Hit everyone in front of a fighter with move m (a poke, a swing, a kick). Weapon upgrades reach a bit further.
  function hitbox(W, h, m) {
    let any = false;
    const WL = W.R.WEAPON_LEVEL;
    const lv = h.kind === 'hero' ? h.wlv - 1 : 0;
    const reach = m.reach + (h.move.name !== 'jumpKick' ? WL.reach[lv] : 0);
    for (const e of W.enemies) {
      if (h.move.hit.has(e.id) || !hittable(W, e)) continue;
      let dx = (e.x - h.x) * h.face;
      if (m.both) dx = Math.abs(dx);
      if (dx < -0.35 || dx > reach + e.r * 0.6) continue;
      if (Math.abs(e.z - h.z) > m.depth + (e.boss ? 0.3 : 0)) continue;
      if (e.y - h.y > 1.2 || h.y - e.y > 1.4 * e.scale + (h.horse ? 1 : 0)) continue;
      h.move.hit.add(e.id);
      any = true;
      let dmg = m.dmg * WL.dmg[lv];
      if (h.kind === 'buddy') dmg *= W.R.BUDDY.power;
      damageEnemy(W, e, dmg, {
        knock: !!m.knock, dir: sign(e.x - h.x) || h.face, stun: m.stun || 0.35, push: m.push || 0.4, word: m.word, big: m.big || m.knock,
        by: h, lv: lv + 1,
      });
    }
    if (h.kind === 'hero') {
      for (const c of W.crates) {
        if (c.gone || h.move.hit.has(c.id)) continue;
        let dx = (c.x - h.x) * h.face;
        if (m.both) dx = Math.abs(dx);
        if (dx < -0.3 || dx > reach + 0.3 || Math.abs(c.z - h.z) > m.depth + 0.35) continue;
        h.move.hit.add(c.id);
        openCrate(W, c, h);
        any = true;
      }
      W.crates = W.crates.filter((c) => !c.gone);
    }
    if (any && !h.move.connected) {
      h.move.connected = true;
      h.freeze = m.big ? 0.07 : 0.045;
    }
    return any;
  }

  // A treasure chest or a jar: bonk it and out pops whatever's inside.
  function openCrate(W, c, h) {
    c.gone = true;
    W.stats.chests++;
    ev(W, 'crate', { x: c.x, z: c.z, drop: c.drop, look: c.look, by: h && h.who });
    const R = W.R;
    if (c.drop === 'coins') popCoins(W, c.x, c.z + 0.2, c.look === 'jar' ? 3 + Math.floor(W.rand() * 3) : R.CHEST.coins);
    else if (c.drop === 'ingot') { spawnItem(W, 'ingot', c.x, c.z + 0.3, true); popCoins(W, c.x, c.z + 0.2, 2); }
    else if (c.drop.startsWith('scroll')) {
      const it = spawnItem(W, 'scroll', c.x, c.z + 0.35, true);
      it.scroll = c.drop.split(':')[1] || randomScroll(W);
    } else spawnItem(W, c.drop, c.x, c.z + 0.35, true);
  }

  function startJump(W, h, inp) {
    const D = h.def;
    const running = h.state === 'run';
    h.state = 'jump';
    h.st = 0;
    h.vy = D.jump;
    h.y = 0.01;
    h.move = null;
    h.kicked = false;
    if (inp.mx) h.face = sign(inp.mx);
    h.vx = running ? h.face * D.run * 0.85 : (inp.mx || 0) * D.speed;
    h.vz = (inp.mz || 0) * D.speedZ * 0.8;
    ev(W, 'jump', { who: h.who, x: h.x, z: h.z });
  }

  function jumpStep(W, h, inp) {
    if (inp.attack && !h.kicked) {
      h.kicked = true;
      h.move = { name: 'jumpKick', def: W.R.MOVES.jumpKick, hit: new Set(), connected: false, at: h.st };
      ev(W, 'swing', { who: h.who, id: h.id, name: 'jumpKick' });
    }
    if (h.move) {
      const was = h.move.connected;
      hitbox(W, h, h.move.def);
      if (!was && h.move.connected) h.freeze = 0.04;
    }
    h.vy -= W.R.WORLD.GRAVITY * DT;
    h.y += h.vy * DT;
    if (h.y <= 0) {
      h.y = 0;
      h.vy = 0;
      h.state = 'land';
      h.st = 0;
      h.vx = h.vz = 0;
      h.move = null;
      ev(W, 'land', { x: h.x, z: h.z });
    }
  }

  // ---------------------------------------------------------------- grab and toss

  function grabbable(e) {
    return !e.boss && ['idle', 'walk', 'hurt', 'windup', 'recover'].includes(e.state) && e.y < 0.1;
  }

  function startGrab(W, h, e) {
    h.state = 'grab';
    h.st = 0;
    h.grab = e;
    h.bops = 0;
    h.bopT = -1;
    h.queued = false;
    h.vx = h.vz = 0;
    h.contact = 0;
    e.state = 'held';
    e.st = 0;
    e.heldBy = h;
    e.face = -h.face;
    ev(W, 'grab', { who: h.who, x: e.x, y: 1.3, z: e.z });
  }

  function grabStep(W, h, inp) {
    const e = h.grab;
    if (!e || e.state !== 'held' || e.gone) {
      h.grab = null;
      return idle(h);
    }
    e.x = h.x + h.face * 0.72;
    e.z = h.z + 0.03;
    e.y = 0;
    if (h.bopT >= 0) {
      h.bopT += DT;
      if (inp.attack) h.queued = (inp.mx || 0) * h.face < -0.3 ? 'back' : 'bop';
      if (inp.jump) h.queued = 'back';
      if (h.bopT >= W.R.MOVES.bop.at && !h.bopHit) {
        h.bopHit = true;
        const m = W.R.MOVES.bop;
        e.hp -= m.dmg * W.R.WEAPON_LEVEL.dmg[(h.wlv || 1) - 1] * (h.kind === 'buddy' ? W.R.BUDDY.power : 1);
        e.flash = 0.15;
        e.barT = 2;
        h.score += 10;
        W.stats.hits++;
        ev(W, 'hit', { x: e.x, y: 1.3 * e.scale, z: e.z, word: m.word, by: h.who });
        h.freeze = e.freeze = 0.05;
        if (e.hp <= 0) return toss(W, h, h.face);
      }
      if (h.bopT >= W.R.MOVES.bop.len) h.bopT = -1;
      return;
    }
    const away = (inp.mx || 0) * h.face < -0.3;
    const q = h.queued;
    h.queued = false;
    if (inp.jump || (inp.attack && away) || q === 'back') return toss(W, h, -h.face);
    if (inp.attack || q === 'bop') {
      if (h.bops >= 2) return toss(W, h, h.face);
      h.bops++;
      h.bopT = 0;
      h.bopHit = false;
      ev(W, 'swing', { who: h.who, id: h.id, name: 'bop' });
      return;
    }
    if (h.st > 2.0) {
      // he wriggles free
      h.grab = null;
      e.heldBy = null;
      e.state = 'hurt';
      e.st = 0;
      e.stun = 0.25;
      e.vx = h.face * 2.5;
      idle(h);
    }
  }

  function toss(W, h, dir) {
    const e = h.grab;
    const T = W.R.MOVES.toss;
    h.grab = null;
    e.heldBy = null;
    h.face = dir;
    h.state = 'toss';
    h.st = 0;
    h.bopT = -1;
    e.hp -= T.dmg;
    e.flash = 0.2;
    e.barT = 2;
    e.x = h.x + dir * 0.45;
    e.y = 0.9;
    e.state = 'down';
    e.st = 0;
    e.thrown = true;
    e.thrownBy = h;
    e.hitIds = new Set([e.id]);
    e.vx = dir * T.speed;
    e.vy = 4.6;
    h.score += 30;
    W.stats.hits++;
    if (e.hp <= 0) { e.hp = 0; beaten(W, e, dir); }
    ev(W, 'toss', { who: h.who, x: e.x, y: 1.4, z: e.z, dir, word: T.word });
  }

  // ---------------------------------------------------------------- magic

  // Magic costs one 🔮. With none left (or attack + jump together) it's the rescue spin: a ring that knocks back
  // everyone close, for one heart (never the last one).
  function startSpecial(W, h, rescue) {
    // on a horse the rescue move is the horse's own: it rears up and stomps, and you stay in the saddle.
    // Magic (with a 🔮) still has you step down for a moment; the horse waits right behind you.
    const rear = h.horse && (rescue || h.orbs < 1);
    if (rear) { if (h.drag) fling(W, h); } else if (h.horse) parkHorse(W, h);
    let kind = h.def.special;
    if (rescue || h.orbs < 1) {
      kind = rear ? 'rear' : 'rescue';
      h.hp = Math.max(1, h.hp - 1);
      W.stats.rescues++;
    } else {
      h.orbs--;
      W.stats.specials++;
    }
    h.state = 'special';
    h.st = 0;
    h.vx = h.vz = 0;
    h.special = kind;
    h.specDone = false;
    h.inv = Math.max(h.inv, W.R.SPECIALS[kind].len + 0.35);
    h.move = null;
    if (kind === 'dunk') {
      h.vy = 7.6;
      h.y = 0.01;
      h.vx = h.face * 1.4;
    } else h.vy = Math.min(h.vy || 0, 0); // started in the air (a jump): stop rising and drop while it happens
    ev(W, 'special', { who: h.who, id: h.id, kind, x: h.x, z: h.z, name: kind === 'rescue' ? 'RESCUE SPIN!' : kind === 'rear' ? 'HORSE STOMP!' : h.def.specialName });
  }

  function specialStep(W, h) {
    const P = W.R.SPECIALS[h.special];
    const fire = !h.specDone && h.st >= P.at;
    if (fire) h.specDone = true;
    if (h.special !== 'dunk' && h.y > 0) {
      h.vy -= W.R.WORLD.GRAVITY * DT;
      h.y = Math.max(0, h.y + h.vy * DT);
      if (h.y === 0) { h.vy = 0; ev(W, 'land', { x: h.x, z: h.z }); }
    }
    switch (h.special) {
      case 'dunk':
        if (h.y > 0 || h.vy > 0) {
          h.vy -= W.R.WORLD.GRAVITY * DT;
          h.y = Math.max(0, h.y + h.vy * DT);
          if (h.st > P.at) h.vx *= 0.9;
        }
        if (fire) {
          const x = h.x + h.face * P.ahead;
          ringBlast(W, h, { x, z: h.z, max: P.radius, speed: 14, dmg: P.dmg, zScale: P.radius / P.depth, kind: 'dunk' });
          ev(W, 'dunk', { who: h.who, x, z: h.z, fromY: h.y + 2.2 });
        }
        if (h.st >= P.len && h.y <= 0) { h.y = 0; idle(h); }
        return;
      case 'wind':
        if (fire) {
          for (const dir of [1, -1]) sweepShot(W, h, { dir, speed: P.speed, w: P.width, zHalf: 9, dmg: P.dmg, style: 'wind' });
          ev(W, 'gale', { who: h.who, x: h.x, z: h.z });
        }
        break;
      case 'thunder':
        if (fire) {
          const hits = [];
          for (const e of W.enemies) {
            if (!hittable(W, e) || e.x < viewL(W) - 0.5 || e.x > viewR(W) + 0.5) continue;
            hits.push({ x: e.x, z: e.z });
            damageEnemy(W, e, P.dmg, { knock: true, dir: sign(e.x - h.x) || 1, word: 'ZAP!', big: true, by: h, special: true });
          }
          ev(W, 'thunder', { who: h.who, x: h.x, z: h.z, hits });
        }
        break;
      case 'fire':
        if (fire) {
          ringBlast(W, h, { x: h.x, z: h.z, max: P.radius, speed: P.speed, dmg: P.dmg, zScale: P.zScale, kind: 'fire' });
          ev(W, 'fireSwirl', { who: h.who, x: h.x, z: h.z, max: P.radius });
        }
        break;
      case 'arrows':
        if (fire) {
          for (let i = 0; i < P.n; i++) {
            const z = W.zMin + 0.2 + ((W.zMax - W.zMin - 0.4) * i) / (P.n - 1);
            sweepShot(W, h, { dir: h.face, speed: P.speed, w: P.width, zHalf: 0.5, dmg: P.dmg, style: 'dart', z, x: h.x - h.face * i * 0.25 });
          }
          ev(W, 'volley', { who: h.who, x: h.x, z: h.z });
        }
        break;
      case 'crescent':
        if (fire) {
          sweepShot(W, h, { dir: h.face, speed: P.speed, w: P.width, zHalf: P.zHalf, dmg: P.dmg, style: 'crescent' });
          ev(W, 'crescent', { who: h.who, x: h.x, z: h.z });
        }
        break;
      case 'rescue':
        if (fire) {
          ringBlast(W, h, { x: h.x, z: h.z, max: P.radius, speed: P.speed, dmg: P.dmg, zScale: 1.6, kind: 'rescue' });
          ev(W, 'rescueSpin', { who: h.who, x: h.x, z: h.z, max: P.radius });
        }
        break;
      case 'rear':
        if (fire) {
          ringBlast(W, h, { x: h.x + h.face * 0.6, z: h.z, max: P.radius, speed: P.speed, dmg: P.dmg, zScale: 1.6, kind: 'rear' });
          ev(W, 'rearStomp', { who: h.who, x: h.x + h.face * 0.6, z: h.z, max: P.radius });
        }
        break;
      case 'scroll':
        if (fire) castScroll(W, h, h.scrollKind);
        break;
    }
    if (h.st >= P.len && h.y <= 0) idle(h);
  }

  // ---------------------------------------------------------------- magic scrolls

  // A scroll for your bag (up to SCROLL_MAX; a full bag turns it into coins). from: who brought it, if anyone.
  function giveScroll(W, h, kind, from) {
    if (h.scrolls.length < W.R.SCROLL_MAX) h.scrolls.push(kind);
    else popCoins(W, h.x, h.z, 5);
    const S = W.R.SCROLLS[kind];
    ev(W, 'scrollGet', { who: h.who, kind, name: S.name, icon: S.icon, from, x: h.x, z: h.z, full: h.scrolls.length >= W.R.SCROLL_MAX });
  }

  // E reads the next scroll: you hold it up high (safe while you do), then its magic hits the whole screen.
  // On a horse you stay in the saddle.
  function startScroll(W, h) {
    const kind = h.scrolls.shift();
    if (h.drag) fling(W, h);
    h.state = 'special';
    h.st = 0;
    h.vx = h.vz = 0;
    h.vy = Math.min(h.vy || 0, 0);
    h.special = 'scroll';
    h.scrollKind = kind;
    h.specDone = false;
    h.inv = Math.max(h.inv, W.R.SPECIALS.scroll.len + 0.6);
    h.move = null;
    W.stats.scrolls = (W.stats.scrolls || 0) + 1;
    const S = W.R.SCROLLS[kind];
    ev(W, 'scroll', { who: h.who, kind, name: S.name, icon: S.icon, x: h.x, z: h.z });
  }

  // Everyone in the window: soldiers that aren't beaten or still walking in from off-screen.
  const inWindow = (W, e) => !e.gone && !e.ko && e.state !== 'runoff' && e.x > viewL(W) - 0.6 && e.x < viewR(W) + 0.6 && !(e.state === 'enter' && (e.x < viewL(W) || e.x > viewR(W)));

  function castScroll(W, h, kind) {
    const S = W.R.SCROLLS[kind];
    const zc = (W.zMin + W.zMax) / 2;
    if (kind === 'dragon') {
      // a dragon flies in from the left edge and out the right, bonking everyone on the way
      const s = sweepShot(W, h, { dir: 1, speed: S.speed, w: 1.4, zHalf: 9, dmg: S.dmg, style: 'dragon', x: W.cam.x - W.halfW - 1.2, z: zc });
      s.boss = S.boss;
      s.life = (W.halfW * 2 + 3) / S.speed + 0.5;
    } else if (kind === 'thunder') {
      const ids = W.enemies.filter((e) => inWindow(W, e)).map((e) => e.id);
      W.shots.push({ id: W.nextId++, kind: 'strikes', team: 'kids', owner: h, ids, left: S.strikes, t: S.every, every: S.every, S, x: h.x, z: h.z });
    } else if (kind === 'ice') {
      const hits = [];
      for (const e of W.enemies) {
        if (!inWindow(W, e) || e.state === 'enter') continue;
        e.frozen = e.boss ? S.bossTime : S.time;
        if (e.heldBy) { e.heldBy.grab = null; e.heldBy.drag = null; e.heldBy = null; e.state = 'idle'; e.y = 0; }
        hits.push({ x: e.x, z: e.z });
      }
      ev(W, 'freeze', { hits });
    } else if (kind === 'wind') {
      W.shots.push({ id: W.nextId++, kind: 'whirl', team: 'kids', owner: h, x: W.cam.x, z: zc, t: 0, S, hit: new Set() });
      ev(W, 'whirl', { x: W.cam.x, z: zc, dur: S.pull });
    } else if (kind === 'gold') {
      for (const o of W.heroes) {
        if (!activeHero(o)) continue;
        o.hp = o.maxHp;
        o.orbs = Math.min(W.diff.maxOrbs, o.orbs + S.orbs);
      }
      for (let i = 0; i < S.coins; i++) {
        const it = spawnItem(W, i % 5 === 4 ? 'ingot' : 'coin', W.cam.x - W.halfW + 1 + W.rand() * (W.halfW * 2 - 2), W.zMin + W.rand() * (W.zMax - W.zMin), true);
        it.y = 4 + W.rand() * 3;
        it.vy = 0;
        it.vx = 0;
      }
      const hits = [];
      for (const e of W.enemies) {
        if (!inWindow(W, e) || e.state === 'enter') continue;
        if (!['idle', 'walk', 'windup', 'attack', 'recover', 'hurt', 'getup'].includes(e.state)) continue;
        if (e.heldBy) { e.heldBy.grab = null; e.heldBy.drag = null; e.heldBy = null; }
        popCoins(W, e.x, e.z, 2);
        e.state = 'hurt';
        e.st = 0;
        e.stun = e.boss ? S.stun * 0.5 : S.stun;
        e.vx = e.vz = 0;
        e.y = 0;
        hits.push({ x: e.x, z: e.z });
      }
      ev(W, 'treasure', { x: W.cam.x, hits });
    }
    ev(W, 'scrollCast', { who: h.who, kind });
  }

  // Thunder: a strike on each soldier every `every` s; the last one knocks them down.
  function strikesStep(W, s) {
    s.t += DT;
    if (s.t < s.every) return;
    s.t = 0;
    s.left--;
    const S = s.S, last = s.left <= 0;
    const hits = [];
    for (const id of s.ids) {
      const e = W.enemies.find((o) => o.id === id);
      if (!e || !hittable(W, e)) continue;
      hits.push({ x: e.x, z: e.z });
      const dmg = e.boss ? (e.maxHp * S.boss) / S.strikes : S.dmg;
      damageEnemy(W, e, dmg, { knock: last, dir: sign(e.x - s.x) || 1, word: 'ZAP!', big: true, by: s.owner, special: last, stun: 0.5 });
    }
    ev(W, 'thunderStrike', { hits, last });
    if (last) s.gone = true;
  }

  // Whirlwind: everyone is pulled into a big tornado in the middle, spun up, then dropped with a bump.
  function whirlStep(W, s) {
    s.t += DT;
    const S = s.S;
    for (const e of W.enemies) {
      if (!inWindow(W, e) || e.state === 'enter' || ['down', 'lying', 'dizzy', 'flag'].includes(e.state)) continue;
      if (s.t < S.pull) {
        if (e.heldBy) { e.heldBy.grab = null; e.heldBy.drag = null; e.heldBy = null; e.y = 0; }
        const dx = s.x - e.x, dz = s.z - e.z, d = Math.hypot(dx, dz);
        const sp = Math.min(d, S.pullSpeed * (e.boss ? 0.5 : 1) * DT);
        if (d > 0.3) { e.x += (dx / d) * sp; e.z = clamp(e.z + (dz / d) * sp, W.zMin, W.zMax); }
        e.state = 'hurt';
        e.st = 0;
        e.stun = 0.3;
        e.vx = e.vz = 0;
        s.hit.add(e.id);
      }
    }
    if (s.t >= S.pull && !s.blasted) {
      s.blasted = true;
      for (const e of W.enemies) {
        if (!s.hit.has(e.id) || !hittable(W, e)) continue;
        damageEnemy(W, e, e.boss ? e.maxHp * S.boss : S.dmg, { knock: true, dir: sign(e.x - s.x) || (W.rand() < 0.5 ? 1 : -1), word: 'WHIRL!', big: true, by: s.owner, special: true });
      }
      ev(W, 'whirlBlast', { x: s.x, z: s.z });
    }
    if (s.t > S.pull + 0.4) s.gone = true;
  }

  // A shockwave ring that spreads out from (x, z) and knocks down the other team.
  function ringBlast(W, owner, o) {
    W.shots.push({
      id: W.nextId++, kind: 'ring', team: owner.kind === 'enemy' ? 'army' : 'kids', owner,
      x: o.x, z: o.z, y: 0, r: 0, max: o.max, speed: o.speed, dmg: o.dmg, zScale: o.zScale || 1.6,
      knock: o.knock !== false, stunOnly: !!o.stunOnly, hit: new Set(), style: o.kind,
    });
  }

  // Magic that rolls across the screen (a whirlwind, a crescent wave, a foam dart) and bonks everyone it passes.
  function sweepShot(W, owner, o) {
    const s = {
      id: W.nextId++, kind: 'sweep', team: 'kids', owner, style: o.style,
      x: o.x != null ? o.x : owner.x, y: 1.0, z: o.z != null ? o.z : owner.z, vx: o.dir * o.speed, w: o.w, zHalf: o.zHalf,
      dmg: o.dmg, hit: new Set(), t: 0,
    };
    W.shots.push(s);
    return s;
  }

  // ---------------------------------------------------------------- calling the brother / team-up

  // Is the companion here to guard you? (He blocks every hit while he's on the road.)
  function buddyGuards(W) {
    const b = W.buddy;
    return !!b && W.phase === 'play' && !['bye', 'leave', 'celebrate'].includes(b.state);
  }

  function callBrother(W, slot) {
    if (W.phase !== 'play') return false;
    if (W.mode === '2p') return teamUp(W);
    if (W.mode !== '1p') return false;
    const h = W.heroes[0];
    if (!activeHero(h)) return false;
    W.stats.calls++;
    const B = W.R.BUDDY;
    W.buddyT = B.visit;
    if (!W.buddy) {
      const who = buddyFor(h.who);
      W.buddy = {
        id: W.nextId++, kind: 'buddy', who, slot: 1, def: W.R.HEROES[who],
        x: W.cam.x - W.halfW - 0.6, y: 0, z: clamp(h.z + 0.6, W.zMin, W.zMax), vx: 0, vy: 0, vz: 0, face: 1, r: 0.35, scale: 1,
        hp: 1, maxHp: 1, state: 'bEnter', st: 0, move: null, combo: 0, comboT: 9, queued: false, wlv: 1, horse: !!h.horse, tramp: {},
        grab: null, bops: 0, bopT: -1, contact: 0, inv: 99, freeze: 0, flash: 0, wantTreat: 1, wantGift: 1, score: 0,
      };
      ev(W, 'buddy', { who, x: W.buddy.x, z: W.buddy.z });
    } else {
      W.buddy.wantTreat++;
      if (W.buddy.state === 'bye' || W.buddy.state === 'leave') { W.buddy.state = 'bGive'; W.buddy.st = 0; }
      ev(W, 'buddyAgain', { who: W.buddy.who });
      buddyRides(W, h);
    }
    return true;
  }

  function updateBuddy(W, b) {
    const h = W.heroes[0];
    if (b.freeze > 0) { b.freeze -= DT; return; }
    b.st += DT;
    b.comboT += DT;
    const B = W.R.BUDDY;
    const run = (tx, tz, sp) => {
      const dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz);
      if (d < 0.15) { b.vx = b.vz = 0; return true; }
      b.vx = (dx / d) * sp;
      b.vz = (dz / d) * sp * 0.8;
      if (Math.abs(dx) > 0.05) b.face = sign(dx);
      b.x += b.vx * DT;
      b.z = clamp(b.z + b.vz * DT, W.zMin, W.zMax);
      return false;
    };
    if (W.phase === 'celebrate') return;
    if (W.phase !== 'play' && W.phase !== 'clear') return;
    // he does what you do: on his little white horse while you ride, on foot while you walk (he gallops in and
    // waves goodbye however he likes)
    if (!['bEnter', 'bye', 'leave'].includes(b.state) && h && activeHero(h) && b.horse !== !!h.horse) {
      b.horse = !!h.horse;
      ev(W, b.horse ? 'buddyMount' : 'buddyHop', { who: b.who, x: b.x, z: b.z });
    }
    switch (b.state) {
      case 'bEnter': {
        // he gallops in on a little horse, then hops off
        const tx = Math.max(viewL(W) + 1, h.x - 1.6);
        if (run(tx, h.z + (h.z > W.zMin + 1 ? -0.7 : 0.7), b.def.run * 1.3) || b.st > 2.5) { b.state = 'hello'; b.st = 0; b.face = 1; if (!b.horse) ev(W, 'buddyHop', { who: b.who, x: b.x, z: b.z }); }
        break;
      }
      case 'hello':
        // says hi with his signature move: Teddy shadow-boxes, Tommy does his Y. It bonks anyone close.
        b.vx = b.vz = 0;
        if (b.st > 0.35 && !b.helloDone) {
          b.helloDone = true;
          ringBlast(W, b, { x: b.x, z: b.z, max: B.helloRadius, speed: 9, dmg: 4, zScale: 1.6, knock: false, stunOnly: true, kind: 'hello' });
          ev(W, 'hello', { who: b.who, x: b.x, z: b.z });
        }
        if (b.st > 1.0) { b.state = 'bGive'; b.st = 0; }
        break;
      case 'bGive': {
        if (!activeHero(h)) { b.state = 'fight'; b.st = 0; break; }
        if (b.wantTreat <= 0) { b.state = 'fight'; b.st = 0; break; }
        const tx = h.x - h.face * 0.95;
        if (run(clamp(tx, viewL(W), viewR(W)), h.z, b.def.run) || b.st > 2.2) {
          b.face = sign(h.x - b.x) || 1;
          b.state = 'giving';
          b.st = 0;
        }
        break;
      }
      case 'giving':
        b.vx = b.vz = 0;
        if (b.st > 0.35 && !b.gave && b.wantTreat > 0) {
          b.gave = true;
          b.wantTreat--;
          const T = W.R.TREATS[W.treatN++ % W.R.TREATS.length];
          let heal = 0;
          if (activeHero(h)) { heal = Math.min(h.maxHp, h.hp + B.treatHeal) - h.hp; h.hp += heal; }
          W.stats.treats++;
          ev(W, 'treat', { who: b.who, to: h.who, icon: T.icon, name: T.name, x: b.x, z: b.z, tx: h.x, tz: h.z, heal });
        }
        // and a freebie, once per visit: a scroll, a 🔮, a weapon upgrade or a bag of coins
        if (b.st > 0.55 && b.wantGift > 0 && activeHero(h)) {
          b.wantGift--;
          giveGift(W, b, h);
        }
        if (b.st > 0.75) {
          b.gave = false;
          b.state = b.wantTreat > 0 ? 'bGive' : 'fight';
          b.st = 0;
        }
        break;
      case 'fight': case 'idle': case 'walk': case 'run': case 'attack': case 'land': case 'jump': {
        if (b.state === 'fight') b.state = 'idle';
        W.buddyT -= DT;
        if (W.buddyT <= 0 || W.phase === 'clear') {
          if (b.state === 'attack' || b.state === 'jump') { fighterBody(W, b, {}); break; }
          b.state = 'bye';
          b.st = 0;
          ev(W, 'bye', { who: b.who });
          break;
        }
        if (b.wantTreat > 0 && b.state !== 'attack') { b.state = 'bGive'; b.st = 0; break; }
        fighterBody(W, b, brains().buddy(W, b));
        b.x = clamp(b.x, viewL(W), viewR(W));
        break;
      }
      case 'bye':
        b.vx = b.vz = 0;
        if (b.st > 1.0) { b.state = 'leave'; b.st = 0; }
        break;
      case 'leave':
        run(W.cam.x - W.halfW - 2, b.z, b.def.run);
        if (b.x < W.cam.x - W.halfW - 1.2 || b.st > 3) {
          W.buddy = null;
          ev(W, 'buddyGone', { who: b.who });
        }
        break;
      default:
        fighterBody(W, b, {});
        if (!['grab', 'toss', 'hurt', 'attack', 'jump', 'land'].includes(b.state)) b.state = 'idle';
    }
  }

  function giveGift(W, b, h) {
    const gifts = W.R.BUDDY.gifts;
    const kind = gifts[(W.giftN || 0) % gifts.length];
    W.giftN = (W.giftN || 0) + 1;
    W.stats.gifts = (W.stats.gifts || 0) + 1;
    if (kind === 'scroll') return giveScroll(W, h, randomScroll(W), b.who);
    let k = kind;
    if (k === 'orb' && h.orbs >= W.diff.maxOrbs) k = 'coins';
    if (k === 'up' && h.wlv >= W.R.WEAPON_LEVEL.max) k = 'coins';
    if (k === 'orb') h.orbs++;
    else if (k === 'up') h.wlv++;
    else popCoins(W, h.x, h.z, 8);
    ev(W, 'gift', { who: b.who, to: h.who, kind: k, x: b.x, z: b.z, tx: h.x, tz: h.z, lv: h.wlv });
  }

  function teamUp(W) {
    if (W.teamCd > 0) return false;
    const hs = W.heroes.filter(standing);
    if (hs.length < 2) return false;
    W.teamCd = W.diff.teamCd;
    W.stats.teamups++;
    for (const h of hs) {
      if (h.grab) { h.grab.state = 'hurt'; h.grab.st = 0; h.grab.stun = 0.2; h.grab.heldBy = null; h.grab = null; }
      if (h.horse) parkHorse(W, h);
      h.state = 'team';
      h.st = 0;
      h.vx = h.vz = 0;
      h.vy = h.who === 'teddy' ? 7.6 : 0;
      h.inv = 3;
    }
    setPhase(W, 'team');
    ev(W, 'teamup', { who: hs.map((h) => h.who) });
    return true;
  }

  function stepTeam(W) {
    for (const h of W.heroes) {
      if (h.state !== 'team') continue;
      h.st += DT;
      if (h.vy || h.y > 0) {
        h.vy -= W.R.WORLD.GRAVITY * DT;
        h.y = Math.max(0, h.y + h.vy * DT);
        if (h.y === 0) h.vy = 0;
      }
    }
    if (W.phaseT >= 0.85 && !W.teamBlasted) {
      W.teamBlasted = true;
      ev(W, 'blast', { x: W.cam.x });
      for (const e of W.enemies) {
        if (e.ko || (e.state === 'enter' && Math.abs(e.x - W.cam.x) > W.halfW)) continue;
        if (e.heldBy) { e.heldBy.grab = null; e.heldBy = null; }
        e.x = clamp(e.x, viewL(W), viewR(W));
        const dmg = e.boss ? e.maxHp * 0.18 : 999;
        damageEnemy(W, e, dmg, { knock: true, dir: sign(e.x - W.cam.x) || 1, word: 'KA-BOOM!', big: true, by: W.heroes[0], special: true });
      }
      for (const c of W.crates.slice()) if (c.x > viewL(W) && c.x < viewR(W)) openCrate(W, c, W.heroes[0]);
      W.crates = W.crates.filter((c) => !c.gone);
    }
    if (W.phaseT >= 1.6) {
      W.teamBlasted = false;
      for (const h of W.heroes) if (h.state === 'team') { h.y = 0; idle(h); }
      setPhase(W, 'play');
    }
  }

  // ---------------------------------------------------------------- getting bonked

  function hittable(W, e) {
    if (e.gone || e.ko) return false;
    if (['down', 'lying', 'getup', 'dizzy', 'flag', 'held', 'runoff'].includes(e.state)) return false;
    if (e.state === 'enter' && (e.x < viewL(W) || e.x > viewR(W))) return false;
    return true;
  }

  function damageEnemy(W, e, dmg, o) {
    if (e.gone || e.ko) return;
    if (e.frozen > 0) dmg *= W.R.SCROLLS.ice.mult;
    e.hp -= dmg;
    e.flash = 0.15;
    e.barT = 2.2;
    W.stats.hits++;
    const by = o.by;
    if (by && by.score != null) by.score += 10;
    ev(W, 'hit', { x: e.x, y: e.y + 1.25 * e.scale, z: e.z, word: o.word || 'POW!', big: !!o.big, by: by && by.who, boss: e.boss, lv: o.lv || 1 });
    if (e.heldBy) {
      const g = e.heldBy;
      g.grab = null;
      e.heldBy = null;
      if (g.state === 'grab') idle(g);
    }
    const dir = o.dir || 1;
    if (e.hp <= 0) {
      e.hp = 0;
      knockDown(W, e, dir, true);
      return;
    }
    if (e.boss) {
      // generals shrug off small hits; a big hit makes them stagger (not again for a moment), magic knocks them down
      if (o.special) knockDown(W, e, dir, false);
      else if (o.knock && W.t > (e.armorT || 0)) {
        e.armorT = W.t + 1.6;
        e.state = 'hurt';
        e.st = 0;
        e.stun = 0.45;
        e.vx = dir * 2.5;
        e.y = 0;
      }
      return;
    }
    if (o.knock) knockDown(W, e, dir, false);
    else {
      e.state = 'hurt';
      e.st = 0;
      e.stun = (o.stun || 0.35) * (o.stunOnly ? 1.4 : 1);
      e.vx = dir * (o.push || 0.4) * 2.2;
      e.vz = 0;
      e.face = -dir;
    }
  }

  // Beaten: coins (and sometimes food) pop out right away; he'll sit dizzy, then run off home or pop into stars.
  function beaten(W, e, dir) {
    if (e.paid) return;
    e.paid = true;
    e.ko = true;
    const n = Math.round((e.def.coins || 2) * (e.boss ? 1 : 1));
    popCoins(W, e.x, e.z, Math.min(n, 8));
    if (e.boss) for (let i = 0; i < Math.floor(n / 5); i++) spawnItem(W, 'ingot', e.x, e.z, true);
    if (!e.boss && W.phase === 'play' && W.rand() < (e.def.drop || 0)) {
      const kinds = ['bao', 'bao', 'drumstick', 'peach'];
      spawnItem(W, kinds[Math.floor(W.rand() * kinds.length)], e.x, e.z, true);
    }
    ev(W, 'ko', { x: e.x, y: 1.4 * e.scale, z: e.z, etype: e.type, boss: e.boss, dir });
  }

  function knockDown(W, f, dir, ko) {
    if (f.drag) dropDrag(W, f);
    if (f.grab) {
      const g = f.grab;
      g.heldBy = null;
      g.state = 'hurt';
      g.st = 0;
      g.stun = 0.25;
      f.grab = null;
    }
    f.state = 'down';
    f.st = 0;
    f.vy = ko ? 5.2 : 4.2;
    f.vx = dir * (ko ? 3.8 : 3.0) * (f.boss ? 0.5 : 1);
    f.vz = 0;
    f.y = Math.max(f.y, 0.02);
    f.face = -dir;
    f.move = null;
    if (f.kind === 'enemy') {
      f.x = clamp(f.x, viewL(W), viewR(W));
      if (f.frozen > 0) { f.frozen = 0; ev(W, 'shatter', { x: f.x, z: f.z }); }
      if (ko) {
        beaten(W, f, dir);
        if (f.boss && !W.bossDown) {
          W.bossDown = true;
          ev(W, 'bossKO', { x: f.x, z: f.z, name: f.def.name });
          stageClear(W);
        }
      }
    } else f.ko = !!(ko || f.ko);
    ev(W, 'knock', { x: f.x, z: f.z, kind: f.kind, who: f.who || f.type, ko: f.ko });
  }

  // Flying through the air after a knock-down or a toss. A tossed soldier bowls over anyone he hits.
  function fall(W, f) {
    f.vy -= W.R.WORLD.GRAVITY * DT;
    f.y += f.vy * DT;
    f.x += f.vx * DT;
    // the screen edges are walls: bounce off them so nobody ends up off-screen
    const L = viewL(W), Rr = viewR(W);
    if (f.x < L && f.vx < 0) { f.x = L; f.vx = -f.vx * 0.4; }
    if (f.x > Rr && f.vx > 0) { f.x = Rr; f.vx = -f.vx * 0.4; }
    if (f.thrown) {
      for (const o of W.enemies) {
        if (f.hitIds.has(o.id) || !hittable(W, o)) continue;
        if (Math.abs(o.x - f.x) < 0.85 && Math.abs(o.z - f.z) < 0.6) {
          f.hitIds.add(o.id);
          damageEnemy(W, o, W.R.MOVES.toss.hitOthers, { knock: !o.boss, dir: sign(f.vx) || 1, word: 'STRIKE!', big: true, by: f.thrownBy });
        }
      }
      for (const c of W.crates) {
        if (!c.gone && Math.abs(c.x - f.x) < 0.8 && Math.abs(c.z - f.z) < 0.6) openCrate(W, c, f.thrownBy);
      }
      W.crates = W.crates.filter((c) => !c.gone);
    }
    if (f.y <= 0) {
      f.y = 0;
      f.vy = 0;
      f.vx = 0;
      f.thrown = false;
      f.state = 'lying';
      f.st = 0;
      ev(W, 'land', { x: f.x, z: f.z, big: true, kind: f.kind });
    }
  }

  // Every bonk costs one heart. Your brother blocks every hit while he's here; a horse takes the bump for you.
  function hurtHero(W, h, o = {}) {
    if (h.kind !== 'hero' || !activeHero(h) || h.inv > 0 || h.ko) return false;
    if (['down', 'lying', 'getup', 'dizzy', 'special', 'enter', 'drop', 'celebrate', 'team'].includes(h.state)) return false;
    if (W.phase !== 'play') return false;
    const dir = o.dir || -h.face;
    const a = o.by;
    if (W.mode === '1p' && buddyGuards(W)) {
      h.inv = 0.8;
      W.stats.saves++;
      ev(W, 'saved', { x: h.x, y: 1.5, z: h.z, who: h.who, buddy: W.buddy.who });
      // the attacker gets a little bonk back (not one who's already beaten: his pea was still in the air)
      if (a && a.kind === 'enemy' && !a.boss && !a.ko && !a.gone && ['idle', 'walk', 'windup', 'attack', 'recover'].includes(a.state)) {
        a.state = 'hurt';
        a.st = 0;
        a.stun = 0.6;
        a.vx = -dir * 3;
      }
      return false;
    }
    if (h.grab) {
      const g = h.grab;
      g.heldBy = null;
      g.state = 'hurt';
      g.st = 0;
      g.stun = 0.2;
      h.grab = null;
    }
    if (h.horse) {
      // knocked off the horse: it trots home, and you keep your heart
      dismount(W, h, false);
      ev(W, 'ouch', { x: h.x, y: 1.5, z: h.z, who: h.who, word: 'WHOA!', big: true, horse: true });
      knockDown(W, h, dir, false);
      h.inv = W.diff.mercy;
      return true;
    }
    h.hp -= 1;
    h.flash = 0.25;
    W.stats.ouch++;
    ev(W, 'ouch', { x: h.x, y: 1.5, z: h.z, who: h.who, word: o.word || 'OOF!', big: !!o.knock });
    if (h.hp <= 0) {
      h.hp = 0;
      knockDown(W, h, dir, true);
      W.stats.deaths++;
      return true;
    }
    if (o.knock) knockDown(W, h, dir, false);
    else {
      h.state = 'hurt';
      h.st = 0;
      h.stun = 0.38;
      h.vx = dir * 1.6;
      h.move = null;
    }
    h.inv = W.diff.mercy;
    return true;
  }

  function loseLife(W, h) {
    h.lives--;
    h.ko = false;
    h.wlv = Math.max(1, h.wlv - 1);
    if (h.lives > 0) {
      respawn(W, h);
      return;
    }
    h.out = true;
    h.state = 'out';
    ev(W, 'out', { who: h.who });
    if (!W.heroes.some(activeHero)) {
      if (W.buddy) W.buddy = null;
      setPhase(W, 'continue');
    }
  }

  function respawn(W, h) {
    h.hp = h.maxHp;
    h.ko = false;
    h.horse = false;
    h.orbs = Math.max(h.orbs, W.diff.orbs);
    h.state = 'drop';
    h.st = 0;
    h.x = clamp(W.cam.x - W.halfW * 0.45 + h.slot * 1.2, viewL(W) + 1, viewR(W) - 1);
    h.z = clamp((W.zMin + W.zMax) / 2 + (h.slot ? 0.6 : -0.4), W.zMin, W.zMax);
    h.y = 6;
    h.vy = 0;
    h.vx = h.vz = 0;
    h.inv = 2.6;
    h.face = 1;
    ev(W, 'respawn', { who: h.who, x: h.x, z: h.z });
  }

  // After "CONTINUE?": everybody back in with full lives. Returns false when there are no continues left.
  function continueGame(W) {
    if (W.phase !== 'continue' || W.continues <= 0) return false;
    W.continues--;
    W.stats.continues++;
    for (const h of W.heroes) {
      h.out = false;
      h.lives = W.diff.lives;
      respawn(W, h);
    }
    setPhase(W, 'play');
    return true;
  }

  // ---------------------------------------------------------------- pick-ups

  function pickups(W, h) {
    if (!['idle', 'walk', 'run', 'land', 'attack'].includes(h.state) || h.y > 0.1) return;
    const R = W.R;
    for (const it of W.items) {
      if (it.gone || it.y > 0.3 || (it.popped && it.t < 0.3) || isCoin(it)) continue;
      if (Math.abs(it.x - h.x) > (it.kind === 'horse' ? 0.95 : 0.75) || Math.abs(it.z - h.z) > 0.55) continue;
      const food = R.FOOD[it.kind];
      if (food) {
        if (h.state === 'attack') continue;
        it.gone = true;
        const heal = Math.min(h.maxHp, h.hp + food.heal) - h.hp;
        h.hp += heal;
        h.score += 50;
        ev(W, 'eat', { who: h.who, kind: it.kind, x: it.x, z: it.z, heal });
      } else if (it.kind === 'horse') {
        if (!h.horse && h.state !== 'attack' && !h.grab && it.left !== h.id) mount(W, h, it);
      } else if (it.kind === 'up') {
        it.gone = true;
        if (h.wlv < R.WEAPON_LEVEL.max) h.wlv++;
        else popCoins(W, h.x, h.z, 5);
        h.score += 100;
        ev(W, 'upgrade', { who: h.who, lv: h.wlv, x: it.x, z: it.z, weapon: h.def.weapon });
      } else if (it.kind === 'orb') {
        it.gone = true;
        h.orbs = Math.min(W.diff.maxOrbs, h.orbs + 1);
        h.score += 100;
        ev(W, 'orb', { who: h.who, orbs: h.orbs, x: it.x, z: it.z });
      } else if (it.kind === 'scroll') {
        it.gone = true;
        h.score += 100;
        giveScroll(W, h, it.scroll || randomScroll(W), null);
      }
    }
    W.items = W.items.filter((i) => !i.gone);
  }

  function collectCoin(W, h, it) {
    if (it.gone) return;
    it.gone = true;
    const v = W.R.COINS[it.kind].value;
    h.coins += v;
    h.score += 10 * v;
    W.stats.coins += v;
    ev(W, 'coin', { who: h.who, kind: it.kind, value: v, x: it.x, y: it.y, z: it.z });
  }

  function updateItems(W) {
    for (const it of W.items) {
      it.t += DT;
      if (it.y > 0 || it.vy > 0) {
        it.vy -= W.R.WORLD.GRAVITY * DT;
        it.y += it.vy * DT;
        it.x += it.vx * DT;
        if (it.y <= 0) { it.y = 0; it.vy = 0; it.vx = 0; }
      }
      // something that pops out of a chest or a soldier always lands on-screen
      if (it.popped) it.x = clamp(it.x, viewL(W), viewR(W));
      // a called horse gallops to whoever called it (and stops if he's already riding or gone)
      if (it.coming) {
        const h = W.heroes.find((o) => o.id === it.owner);
        if (!h || !activeHero(h) || h.horse || W.phase !== 'play') { it.coming = false; it.x = clamp(it.x, viewL(W), viewR(W)); continue; }
        const dx = h.x - it.x, dz = h.z - it.z, d = Math.hypot(dx, dz);
        if (d < 0.5) { it.coming = false; continue; }
        const sp = Math.min(d, W.R.HORSE.callSpeed * DT);
        it.x += (dx / d) * sp;
        it.z = clamp(it.z + (dz / d) * sp, W.zMin, W.zMax);
        if (Math.abs(dx) > 0.05) it.face = sign(dx);
        continue;
      }
      // a horse you hopped off is yours to climb on again once you've stepped away from it
      if (it.left) {
        const o = W.heroes.find((x) => x.id === it.left);
        if (!o || !activeHero(o) || Math.abs(o.x - it.x) > 1.4 || Math.abs(o.z - it.z) > 0.8) it.left = null;
      }
      // coins fly into the nearest hero's pocket by themselves
      if (isCoin(it) && it.t > 0.55 && W.phase !== 'celebrate' && W.phase !== 'done') {
        let h = null, bd = Infinity;
        for (const o of W.heroes) {
          if (!activeHero(o)) continue;
          const d = Math.abs(o.x - it.x) + Math.abs(o.z - it.z);
          if (d < bd) { bd = d; h = o; }
        }
        if (!h) continue;
        const dx = h.x - it.x, dy = 1.0 - it.y, dz = h.z - it.z;
        const d = Math.hypot(dx, dy, dz);
        if (d < 0.45) { collectCoin(W, h, it); continue; }
        const sp = Math.min(d / DT, 9 + it.t * 6) * DT;
        it.x += (dx / d) * sp;
        it.y += (dy / d) * sp;
        it.z = clamp(it.z + (dz / d) * sp, W.zMin, W.zMax);
        it.vy = 0;
        it.vx = 0;
      }
    }
    W.items = W.items.filter((i) => !i.gone);
  }

  // ---------------------------------------------------------------- the army

  function updateEnemy(W, e) {
    if (e.freeze > 0) { e.freeze -= DT; return; }
    if (e.frozen > 0) {
      e.frozen -= DT;
      if (e.frozen <= 0) { e.frozen = 0; ev(W, 'thaw', { id: e.id, x: e.x, z: e.z }); }
      else if (['idle', 'walk', 'windup', 'attack', 'recover'].includes(e.state)) {
        e.state = 'idle';
        e.vx = e.vz = 0;
        e.y = 0;
        e.flash = Math.max(0, e.flash - DT);
        e.barT = Math.max(0, e.barT - DT);
        return;
      }
    }
    e.st += DT;
    e.flash = Math.max(0, e.flash - DT);
    e.barT = Math.max(0, e.barT - DT);
    if (W.phase === 'clear' && !e.ko && !['down', 'lying', 'runoff'].includes(e.state)) {
      // the general is beaten: everyone else gives up too
      e.ko = true;
      e.paid = true;
      e.state = 'dizzy';
      e.st = 0.6;
    }
    // a beaten soldier never fights on: whatever he was doing, he sits down dizzy
    if (e.ko && ['idle', 'walk', 'windup', 'attack', 'recover', 'hurt', 'getup', 'enter', 'held'].includes(e.state)) {
      if (e.heldBy) { e.heldBy.grab = null; e.heldBy = null; }
      e.state = 'dizzy';
      e.st = 0;
      e.y = 0;
      e.vx = e.vz = 0;
    }
    switch (e.state) {
      case 'enter': {
        const dx = e.enterX - e.x;
        const sp = e.def.speed * W.diff.enemySpeed * 1.25;
        e.face = sign(dx) || e.face;
        e.vx = sign(dx) * sp;
        e.vz = 0;
        if (Math.abs(dx) < 0.1 || W.t - e.born > 6) {
          e.state = 'idle';
          e.st = 0;
          e.vx = 0;
          if (e.x < viewL(W)) e.x = viewL(W);
          if (e.x > viewR(W)) e.x = viewR(W);
        }
        break;
      }
      case 'idle': case 'walk': case 'windup': case 'attack': case 'recover':
        brains().enemy(W, e);
        break;
      case 'hurt':
        e.vx *= 0.85;
        e.vz = 0;
        if (e.st >= e.stun) { e.state = 'idle'; e.st = 0; e.ai.cool = Math.max(e.ai.cool, 0.3); }
        break;
      case 'held':
        e.vx = e.vz = 0;
        if (!e.heldBy || (e.heldBy.grab !== e && e.heldBy.drag !== e)) { e.heldBy = null; e.state = 'hurt'; e.st = 0; e.stun = 0.2; e.y = 0; }
        break;
      case 'down': fall(W, e); break;
      case 'lying':
        e.vx = e.vz = 0;
        if (e.ko && e.st > 0.5) { e.state = 'dizzy'; e.st = 0; }
        else if (!e.ko && e.st > 0.85) { e.state = 'getup'; e.st = 0; }
        break;
      case 'getup':
        if (e.st > 0.4) { e.state = 'idle'; e.st = 0; e.ai.cool = Math.max(e.ai.cool, 0.6); }
        break;
      case 'dizzy':
        // sitting with stars going round; then a general waves a white flag, a soldier runs home or goes POOF
        if (e.st > 1.2) {
          if (e.boss) { e.state = 'flag'; e.st = 0; ev(W, 'flag', { id: e.id, x: e.x, z: e.z }); }
          else if (W.rand() < 0.5) runOff(W, e);
          else poof(W, e);
        }
        break;
      case 'flag':
        if (e.st > 1.1) runOff(W, e);
        break;
      case 'runoff': {
        e.vx = e.ai.home * 6.5;
        e.vz = 0;
        e.face = e.ai.home;
        if (Math.abs(e.x - W.cam.x) > W.halfW + 1.6 || e.st > 4) gone(W, e);
        break;
      }
    }
    if (e.state !== 'down' && e.state !== 'held') {
      e.x += e.vx * DT;
      e.z = clamp(e.z + e.vz * DT, W.zMin, W.zMax);
    }
    if (e.state !== 'enter' && e.state !== 'runoff' && !e.gone) e.x = clamp(e.x, viewL(W), viewR(W));
  }

  function runOff(W, e) {
    e.state = 'runoff';
    e.st = 0;
    e.ai.home = e.x > W.cam.x ? 1 : -1;
    ev(W, 'runoff', { id: e.id, x: e.x, z: e.z, boss: e.boss });
  }

  function poof(W, e) {
    ev(W, 'poof', { id: e.id, x: e.x, z: e.z, scale: e.scale, boss: e.boss });
    gone(W, e);
  }

  function gone(W, e) {
    if (e.gone) return;
    e.gone = true;
    W.stats.kos++;
    const near = W.heroes.reduce((a, h) => (!a || Math.abs(h.x - e.x) < Math.abs(a.x - e.x) ? h : a), null);
    if (near) {
      near.score += e.def.score || 100;
      if (activeHero(near) && W.phase === 'play') {
        near.orbFill += W.diff.orbPerKo;
        if (near.orbFill >= 1) {
          near.orbFill -= 1;
          if (near.orbs < W.diff.maxOrbs) { near.orbs++; ev(W, 'orbFull', { who: near.who, orbs: near.orbs, x: near.x, z: near.z }); }
        }
      }
    }
    if (e.boss) W.boss = null;
  }

  // Keep the army from standing inside each other (and gently out of the heroes).
  function separate(W) {
    const E = W.enemies;
    for (let i = 0; i < E.length; i++) {
      const a = E[i];
      if (!movable(a)) continue;
      for (let j = i + 1; j < E.length; j++) {
        const b = E[j];
        if (!movable(b)) continue;
        const dx = b.x - a.x, dz = (b.z - a.z) * 1.6;
        const min = (a.r + b.r) * 1.25;
        const d2 = dx * dx + dz * dz;
        if (d2 > min * min || d2 < 1e-6) continue;
        const d = Math.sqrt(d2), push = (min - d) * 0.25;
        const nx = dx / d, nz = dz / d / 1.6;
        a.x -= nx * push; a.z -= nz * push;
        b.x += nx * push; b.z += nz * push;
      }
      for (const h of W.heroes) {
        if (!standing(h) || h.y > 0.3) continue;
        const dx = a.x - h.x, dz = a.z - h.z;
        if (Math.abs(dx) < 0.55 && Math.abs(dz) < 0.32) a.x += (sign(dx) || -h.face) * (0.55 - Math.abs(dx)) * 0.3;
      }
    }
    for (const a of E) {
      if (!movable(a)) continue;
      a.z = clamp(a.z, W.zMin, W.zMax);
      a.x = clamp(a.x, viewL(W), viewR(W));
    }
  }
  const movable = (e) => !e.gone && ['idle', 'walk', 'windup', 'recover', 'hurt', 'getup'].includes(e.state);

  // ---------------------------------------------------------------- flying things

  // Something thrown by the army (a foam pea, a paper lantern, a scroll, a thunderbolt) at a target point.
  function throwShot(W, e, kind, tx, tz) {
    const S = W.R.SHOTS[kind];
    const y = S.up ? 1.4 * e.scale : 1.1;
    const dx = tx - e.x;
    const dir = sign(dx) || e.face;
    const s = {
      id: W.nextId++, kind, team: 'army', owner: e, emoji: S.emoji, x: e.x + dir * 0.6 * e.scale, y, z: e.z,
      vx: dir * S.speed, vy: S.up, vz: 0, g: 0, r: S.r, knock: !!S.knock, life: S.life, t: 0,
      wobble: !!S.wobble, hit: new Set(),
    };
    if (S.up) {
      // aim the arc at the target: pick gravity so it comes down there
      const dist = Math.max(1.5, Math.abs(dx));
      const tFlight = dist / S.speed;
      s.g = (2 * (S.up * tFlight + y - 0.9)) / (tFlight * tFlight);
    }
    s.vz = ((tz - e.z) / Math.max(0.4, Math.abs(dx) / S.speed)) * 0.9;
    W.shots.push(s);
    ev(W, 'throw', { kind, x: s.x, z: s.z, id: s.id });
    return s;
  }

  function updateShots(W) {
    for (const s of W.shots) {
      s.t = (s.t || 0) + DT;
      if (s.kind === 'ring') { ringStep(W, s); continue; }
      if (s.kind === 'sweep') { sweepStep(W, s); continue; }
      if (s.kind === 'strikes') { strikesStep(W, s); continue; }
      if (s.kind === 'whirl') { whirlStep(W, s); continue; }
      s.vy -= (s.g || 0) * DT;
      s.x += s.vx * DT;
      s.y += s.vy * DT;
      s.z = clamp(s.z + s.vz * DT, W.zMin - 0.3, W.zMax + 0.3);
      if (s.wobble) s.y = 1.3 + Math.sin(s.t * 9) * 0.25;
      if (s.y <= 0.25 && s.vy < 0) { s.gone = true; ev(W, 'splat', { kind: s.kind, x: s.x, z: s.z }); continue; }
      for (const h of W.heroes) {
        if (s.gone || s.hit.has(h.id) || !standing(h)) continue;
        if (Math.abs(h.x - s.x) < s.r + 0.3 && Math.abs(h.z - s.z) < 0.5 && s.y > h.y - 0.2 && s.y < h.y + 2.1 + (h.horse ? 0.8 : 0)) {
          s.hit.add(h.id);
          if (hurtHero(W, h, { knock: s.knock, dir: sign(s.vx), by: s.owner, word: 'BONK!' }) || h.inv > 0) {
            s.gone = true;
            ev(W, 'splat', { kind: s.kind, x: s.x, y: s.y, z: s.z, hit: true });
          }
        }
      }
      if (s.t > s.life || s.x < W.cam.x - W.halfW - 2.5 || s.x > W.cam.x + W.halfW + 2.5) s.gone = true;
    }
    W.shots = W.shots.filter((s) => !s.gone);
  }

  function sweepStep(W, s) {
    s.x += s.vx * DT;
    for (const e of W.enemies) {
      if (s.hit.has(e.id) || !hittable(W, e)) continue;
      if (Math.abs(e.x - s.x) > s.w + e.r || Math.abs(e.z - s.z) > s.zHalf) continue;
      s.hit.add(e.id);
      const word = s.style === 'wind' ? 'WHOOSH!' : s.style === 'dart' ? 'THWIP!' : s.style === 'dragon' ? 'ROAR!' : 'SHING!';
      damageEnemy(W, e, e.boss && s.boss ? e.maxHp * s.boss : s.dmg, { knock: true, dir: sign(s.vx) || 1, word, big: true, by: s.owner, special: true });
    }
    for (const c of W.crates) {
      if (!c.gone && Math.abs(c.x - s.x) < s.w + 0.3 && Math.abs(c.z - s.z) < s.zHalf) openCrate(W, c, s.owner);
    }
    W.crates = W.crates.filter((c) => !c.gone);
    if (s.t > (s.life || 3) || s.x < W.cam.x - W.halfW - 1.5 || s.x > W.cam.x + W.halfW + 1.5) s.gone = true;
  }

  function ringStep(W, s) {
    s.r += s.speed * DT;
    if (s.team === 'kids') {
      for (const e of W.enemies) {
        if (s.hit.has(e.id) || !hittable(W, e)) continue;
        const d = Math.hypot(e.x - s.x, (e.z - s.z) * s.zScale);
        if (d > s.r + e.r) continue;
        s.hit.add(e.id);
        let dmg = s.dmg;
        if (s.owner && s.owner.kind === 'buddy') dmg *= W.R.BUDDY.power;
        const word = { dunk: 'BOING!', fire: 'FWOOSH!', rescue: 'WHIRL!', rear: 'THUD!', hello: 'HI!' }[s.style] || 'POW!';
        damageEnemy(W, e, dmg, { knock: s.knock, dir: sign(e.x - s.x) || 1, word, big: s.knock, by: s.owner, special: s.knock && s.style !== 'rescue', stun: 0.6, stunOnly: s.stunOnly });
      }
      if (s.style !== 'hello') {
        for (const c of W.crates) if (!c.gone && Math.hypot(c.x - s.x, (c.z - s.z) * s.zScale) < s.r) openCrate(W, c, s.owner);
        W.crates = W.crates.filter((c) => !c.gone);
      }
    } else {
      for (const h of W.heroes) {
        if (s.hit.has(h.id) || !standing(h)) continue;
        const d = Math.hypot(h.x - s.x, (h.z - s.z) * s.zScale);
        if (d > s.r + 0.3 || d < s.r - 0.7) continue;
        if (h.y > 0.35) continue; // jumped over it!
        s.hit.add(h.id);
        hurtHero(W, h, { knock: true, dir: sign(h.x - s.x) || 1, by: s.owner, word: 'THUD!' });
      }
    }
    if (s.r >= s.max) s.gone = true;
  }

  // ---------------------------------------------------------------- stage clear and the celebration

  function stageClear(W) {
    if (W.phase === 'clear' || W.phase === 'celebrate' || W.phase === 'done') return;
    setPhase(W, 'clear');
    W.pending = [];
    for (const h of W.heroes) {
      if (h.grab) { h.grab.heldBy = null; h.grab = null; if (h.state === 'grab') idle(h); }
      if (h.drag) dropDrag(W, h);
      if (h.ko) { h.ko = false; h.hp = Math.max(1, h.hp); if (h.state === 'dizzy') { h.state = 'getup'; h.st = 0; } }
    }
    ev(W, 'clear', { bonus: !!W.bonus });
  }

  function stepClear(W) {
    // wait for the general and the army to run off home, and the coins to land in pockets, then celebrate
    const coinsLeft = W.items.some(isCoin);
    if ((!W.enemies.length && !coinsLeft && W.phaseT > 1.2) || W.phaseT > 7) {
      for (const it of W.items) if (isCoin(it)) collectCoin(W, W.heroes.find(activeHero) || W.heroes[0], it);
      W.enemies = [];
      W.shots = [];
      W.items = [];
      W.crates = [];
      setPhase(W, 'celebrate');
      const cx = W.cam.x;
      W.heroes.forEach((h) => {
        if (h.out || h.state === 'out') { h.out = false; h.lives = Math.max(1, h.lives); h.state = 'idle'; h.y = 0; }
        h.ko = false;
        h.grab = null;
        h.horse = false;
        h.state = 'celebrate';
        h.st = 0;
        h.y = 0;
        h.vy = h.vx = h.vz = 0;
      });
      if (W.mode === '1p') {
        // the other brother runs in for the high five
        const me = W.heroes[0];
        const who = buddyFor(me.who);
        if (!W.buddy) {
          W.buddy = {
            id: W.nextId++, kind: 'buddy', who, slot: 1, def: W.R.HEROES[who], x: cx - W.halfW - 1, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
            face: 1, r: 0.35, scale: 1, hp: 1, maxHp: 1, st: 0, inv: 99, freeze: 0, flash: 0, score: 0, wlv: 1,
          };
        }
        W.buddy.state = 'celebrate';
        W.buddy.horse = false;
        W.buddy.st = 0;
        W.buddy.y = 0;
      }
      const pair = celebrants(W);
      // Teddy stands on the left when he's there (the high five is his right hand and Tommy's left)
      if (pair[1] && pair[1].who === 'teddy') pair.reverse();
      pair.forEach((f, i) => {
        f.cside = i === 0 ? -1 : 1;
        f.cx = cx + f.cside * 1.05;
        f.cz = 0.2;
        f.fromX = f.x;
        f.fromZ = f.z;
      });
      ev(W, 'celebrate', {});
    }
  }

  // Everyone on stage for the celebration: both heroes (in 1 player, one of them is the companion).
  function celebrants(W) {
    const list = W.heroes.slice();
    if (W.mode === '1p' && W.buddy) list.push(W.buddy);
    return list;
  }

  // The celebration's timeline (the renderer poses them from phaseT):
  // 0-1.1 walk to the middle, 1.1-3.3 signature moves, 3.3-3.9 step in, 3.9 HIGH FIVE!, then cheer.
  const CELEB = { walk: 1.1, moves: 3.3, five: 3.9, done: 6.2 };

  function stepCelebrate(W) {
    const t = W.phaseT;
    for (const f of celebrants(W)) {
      if (f.cx == null) continue;
      if (t < CELEB.walk) {
        const u = Math.min(1, t / (CELEB.walk * 0.85));
        f.x = f.fromX + (f.cx - f.fromX) * u;
        f.z = f.fromZ + (f.cz - f.fromZ) * u;
      } else if (t > CELEB.moves && t < CELEB.five) {
        const u = (t - CELEB.moves) / (CELEB.five - CELEB.moves);
        f.x = f.cx - f.cside * 0.32 * u;
      }
      f.st = t;
    }
    if (t >= CELEB.five && !W.fived) {
      W.fived = true;
      ev(W, 'highfive', { x: W.cam.x, z: 0.2 });
    }
    if (t >= CELEB.done) setPhase(W, 'done');
  }

  function clampToView(W, h) {
    if (h.state === 'enter' || h.state === 'celebrate') return;
    h.x = clamp(h.x, viewL(W), viewR(W));
  }

  window.TKSim = {
    DT, create, step, secX, spawnEnemy, spawnItem, callBrother, callHorse, teamUp, continueGame, celebrants, CELEB, buddyFor,
    // used by js/brains.js and the checks
    hurtHero, throwShot, ringBlast, startMove, hittable, standing, activeHero, viewL, viewR, ev, knockDown, damageEnemy,
    isCoin, clamp, sign,
  };
})();
