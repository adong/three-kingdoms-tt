/* Three Kingdoms TT: the checks. Pure logic, shared by the browser (window.game.soak(), window.game.moves()) and
   node (tools/check.js). An autopilot plays every stage, bonus round and general from a fresh start, on Easy and
   Normal, in 1 player (every hero) and 2 players; single-move checks test each move on its own; and prove() shows
   the check can fail (an idle player must not clear a stage; a soldier pushed off-screen must be caught).

   Every step of a run checks: no NaN; nobody but a soldier walking in or running home is off-screen; nobody walks
   in for more than 6.5 s; everyone stays on the road; the screen never stays locked with nothing left to fight;
   the camera never stalls. A run "finishes" when the stage is cleared; a run that needed a continue says so. */
(function () {
  'use strict';
  const Sim = () => window.TKSim, Brains = () => window.TKBrains;
  const LIMIT = 600; // seconds of game time per stage before we call it stuck

  function run(cfg) {
    const W = Sim().create({ stage: cfg.stage, mode: cfg.mode, hero: cfg.hero, heroes: cfg.heroes, difficulty: cfg.diff, seed: cfg.seed, continues: Infinity });
    const mems = W.heroes.map(() => ({ opts: { call: cfg.call, callEvery: cfg.mode === '2p' ? 4 : 14, kid: cfg.kid, horse: cfg.horse } }));
    const problems = [];
    const fail = (msg) => { if (problems.length < 5) problems.push(`t=${W.t.toFixed(1)} ${msg}`); };
    let lockedEmpty = 0, travelT = 0, sabotaged = false;
    const seen = { boss: false, buddy: 0, treats: 0, mounts: 0, saved: 0 };
    while (W.t < LIMIT && W.phase !== 'done') {
      if (W.phase === 'continue') Sim().continueGame(W);
      const inputs = W.heroes.map((h, i) => (cfg.idle ? {} : Brains().bot(W, h, mems[i])));
      Sim().step(W, inputs);
      for (const e of W.events) {
        if (e.type === 'boss') seen.boss = true;
        if (e.type === 'buddy') seen.buddy++;
        if (e.type === 'treat') seen.treats++;
        if (e.type === 'mount') seen.mounts++;
      }
      W.events.length = 0;
      if (cfg.sabotage && !sabotaged && W.t > 8 && W.enemies.length) {
        const e = W.enemies.find((o) => o.state !== 'enter' && !o.ko);
        if (e) { sabotaged = true; e.state = 'idle'; e.x = W.cam.x + W.halfW + 5; e.ai.cool = 999; e.def = Object.assign({}, e.def, { speed: 0 }); e.vx = 0; }
      }
      // ---- invariants
      const L = Sim().viewL(W) - 0.02, R = Sim().viewR(W) + 0.02;
      for (const e of W.enemies) {
        if (![e.x, e.y, e.z, e.hp].every(Number.isFinite)) fail(`NaN on ${e.type}`);
        if (e.state === 'enter') {
          if (W.t - e.born > 6.5) fail(`${e.type} still walking in after 6.5 s`);
        } else if (e.state !== 'runoff' && (e.x < L || e.x > R)) fail(`${e.type} off-screen at x=${e.x.toFixed(2)} (view ${L.toFixed(1)}..${R.toFixed(1)}) state=${e.state}`);
        if (e.z < W.zMin - 0.01 || e.z > W.zMax + 0.01) fail(`${e.type} off the road z=${e.z.toFixed(2)}`);
        if (e.y < -0.01 || e.y > 8) fail(`${e.type} y=${e.y.toFixed(2)}`);
        if (e.ko && ['idle', 'walk', 'windup', 'attack', 'recover'].includes(e.state)) fail(`${e.type} is beaten but still fighting (${e.state})`);
      }
      for (const h of W.heroes) {
        if (![h.x, h.y, h.z, h.hp].every(Number.isFinite)) fail(`NaN on ${h.who}`);
        if (h.hp > h.maxHp || h.orbs < 0 || h.orbs > W.diff.maxOrbs) fail(`${h.who} hearts ${h.hp}/${h.maxHp} orbs ${h.orbs}`);
        if (h.out || ['enter', 'celebrate', 'out'].includes(h.state)) continue;
        if (W.phase === 'play' && (h.x < L || h.x > R)) fail(`${h.who} off-screen x=${h.x.toFixed(2)} state=${h.state}`);
        if (h.z < W.zMin - 0.01 || h.z > W.zMax + 0.01) fail(`${h.who} off the road`);
      }
      for (const it of W.items) if (it.z < W.zMin - 0.01 || it.z > W.zMax + 0.01 || !Number.isFinite(it.x)) fail(`item ${it.kind} off the road`);
      if (!W.bonus && W.phase === 'play' && W.secState === 'fight' && !W.enemies.length && !W.pending.length) lockedEmpty += Sim().DT; else lockedEmpty = 0;
      if (lockedEmpty > 5) { fail('screen locked with nothing to fight for 5 s'); lockedEmpty = -1e9; }
      if (W.phase === 'play' && W.secState === 'travel') travelT += Sim().DT; else travelT = 0;
      if (travelT > 40) { fail('camera stalled for 40 s on the way to the next stop'); travelT = -1e9; }
      if (problems.length >= 5) break;
    }
    const S = W.S;
    const cleared = W.phase === 'done';
    return {
      stage: S.id, cleared, time: W.t, problems, stats: W.stats, boss: S.bonus ? true : seen.boss, seen,
      continues: W.stats.continues, coins: W.heroes.reduce((a, h) => a + h.coins, 0),
      ok: cleared && !problems.length && (S.bonus || seen.boss),
    };
  }

  // 1 player with every hero, 2 players, the companion, team-ups, and a sloppy "kid" autopilot.
  const SETUPS = [
    { name: '1P Teddy easy', mode: '1p', hero: 'teddy', diff: 'easy' },
    { name: '1P Tommy easy +buddy', mode: '1p', hero: 'tommy', diff: 'easy', call: true },
    { name: '1P Zoom normal', mode: '1p', hero: 'zoom', diff: 'normal' },
    { name: '1P Luna normal +buddy', mode: '1p', hero: 'luna', diff: 'normal', call: true },
    { name: '1P Bolt easy +horse', mode: '1p', hero: 'bolt', diff: 'easy', horse: true },
    { name: '1P Bruno normal', mode: '1p', hero: 'bruno', diff: 'normal' },
    { name: '1P Teddy normal', mode: '1p', hero: 'teddy', diff: 'normal' },
    { name: '2P easy +horses', mode: '2p', diff: 'easy', horse: true },
    { name: '2P normal +team-up', mode: '2p', diff: 'normal', call: true, heroes: ['luna', 'bruno'] },
    { name: '1P Tommy easy, kid', mode: '1p', hero: 'tommy', diff: 'easy', kid: true },
    { name: '1P Teddy normal, kid', mode: '1p', hero: 'teddy', diff: 'normal', kid: true },
  ];

  // Every stage x every set-up, plus `seeds` extra random seeds each. log(line) prints as it goes.
  function soak(o = {}) {
    const stages = window.TK_STAGES;
    const setups = o.setups ? SETUPS.filter((s) => o.setups.some((n) => s.name.includes(n))) : SETUPS;
    const rows = [];
    let bad = 0, total = 0, needCont = 0;
    const log = o.log || (() => {});
    for (let si = 0; si < stages.length; si++) {
      if (o.stage != null && si !== o.stage) continue;
      for (const s of setups) {
        const seeds = [1 + si * 101];
        for (let k = 0; k < (o.seeds || 0); k++) seeds.push(1000 + si * 7919 + k * 31);
        for (const seed of seeds) {
          const r = run(Object.assign({ stage: si, seed }, s));
          total++;
          if (!r.ok) bad++;
          if (r.continues) needCont++;
          rows.push(Object.assign({ setup: s.name, seed }, r));
          if (seed === seeds[0] || !r.ok || o.verbose) {
            const notes = [];
            if (s.call && s.mode === '1p') notes.push(`buddy x${r.seen.buddy}, treats ${r.seen.treats}, saves ${r.stats.saves}`);
            if (s.call && s.mode === '2p') notes.push(`team-ups ${r.stats.teamups}`);
            notes.push(`magic ${r.stats.specials}, rescue ${r.stats.rescues}, ouch ${r.stats.ouch}, coins ${r.coins}, rides ${r.stats.rides}` + (s.horse ? `, horses called ${r.stats.horseCalls}` : ''));
            log(pad(r.stage + (seed !== seeds[0] ? ` #${seed}` : ''), 14) + pad(s.name, 26) + pad(r.ok ? 'CLEAR' : 'FAIL', 7) +
              pad(r.time.toFixed(0) + 's', 7) + pad(r.stats.kos, 5) + pad(r.stats.deaths, 4) + pad(r.continues, 4) + notes.join(', '));
          }
          for (const p of r.problems) log('    ! ' + p);
          if (!r.cleared && !r.problems.length) log('    ! did not clear within ' + LIMIT + ' s');
        }
      }
    }
    return { total, bad, needCont, rows };
  }
  const pad = (s, n) => String(s).padEnd(n);

  // The check must be able to fail: an idle player must not clear a stage, and a soldier pushed off-screen must be
  // caught.
  function prove() {
    const idle = run({ stage: 0, mode: '1p', hero: 'teddy', diff: 'normal', seed: 5, idle: true });
    const sab = run({ stage: 0, mode: '1p', hero: 'teddy', diff: 'easy', seed: 5, sabotage: true });
    return {
      idleCleared: idle.cleared, idleDeaths: idle.stats.deaths,
      sabotageCaught: sab.problems.some((p) => p.includes('off-screen')), sabotageProblem: sab.problems[0] || '',
      ok: !idle.cleared && sab.problems.some((p) => p.includes('off-screen')),
    };
  }

  // ---------------------------------------------------------------- the moves, one at a time

  function moves() {
    const S = Sim();
    const results = [];
    const ok = (name, cond, info = '') => results.push([name, !!cond, info]);
    const fresh = (o = {}) => {
      const W = S.create(Object.assign({ stage: 0, mode: '1p', hero: 'teddy', difficulty: 'normal', seed: 7 }, o));
      for (let i = 0; i < 90; i++) S.step(W, W.heroes.map(() => ({})));
      W.pending = []; W.waveIdx = 99; W.secState = 'fight'; W.enemies = []; W.items = []; W.crates = [];
      W.heroes.forEach((h, i) => { h.x = W.cam.x - 2 + i * 0.01; h.z = i ? 1.0 : 0; h.state = 'idle'; h.face = 1; });
      return W;
    };
    const foe = (W, type, dx, dz = 0) => {
      const e = S.spawnEnemy(W, type, 1);
      e.x = W.heroes[0].x + dx; e.z = W.heroes[0].z + dz; e.state = 'idle'; e.ai.cool = 999; e.face = -1;
      return e;
    };
    const step = (W, inp, n = 1) => { for (let i = 0; i < n; i++) S.step(W, W.heroes.map((_, k) => (typeof inp === 'function' ? inp(i, k) : k === 0 ? inp : {}))); };
    const count = (W, type) => W.events.filter((e) => e.type === type).length;

    // Teddy: spear jab, straight, sweep; the third knocks down
    let W = fresh(), e = foe(W, 'straw', 1.2);
    for (let k = 0; k < 3; k++) { step(W, { attack: true }); step(W, {}, 14); }
    step(W, {}, 30);
    let names = W.events.filter((x) => x.type === 'swing').map((x) => x.name);
    ok("Teddy's combo is jab, straight, sweep and it knocks down", names.join() === 'jab,straight,sweep' && ['down', 'lying', 'getup', 'dizzy', 'runoff'].includes(e.state), `${names.join()} ${e.state}`);
    // each hero's own combo
    for (const who of ['tommy', 'zoom', 'luna', 'bolt', 'bruno']) {
      W = fresh({ hero: who }); foe(W, 'straw', 1.2).hp = 999;
      for (let k = 0; k < 3; k++) { step(W, { attack: true }); step(W, {}, 16); }
      names = W.events.filter((x) => x.type === 'swing').map((x) => x.name);
      ok(`${who}'s combo is ${W.R.HEROES[who].combo.join(', ')}`, names.join() === W.R.HEROES[who].combo.join(), names.join());
    }
    // Luna's spin hits both sides
    W = fresh({ hero: 'luna' });
    const behind = foe(W, 'straw', -1.0); const ahead = foe(W, 'straw', 1.0);
    behind.hp = ahead.hp = 999;
    for (let k = 0; k < 3; k++) { step(W, { attack: true }); step(W, {}, 14); }
    ok("Luna's spin hits behind her too", behind.hp < 999 && ahead.hp < 999, `${behind.hp} ${ahead.hp}`);

    // walk into a soldier: grab; bop, bop, toss; the tossed one bowls over another
    W = fresh(); e = foe(W, 'straw', 0.8); const other = foe(W, 'bot', 4.0);
    step(W, { mx: 1 }, 20);
    const grabbed = W.heroes[0].state === 'grab';
    for (let k = 0; k < 3; k++) { step(W, { attack: true }); step(W, {}, 16); }
    step(W, {}, 60);
    ok('walk in = grab, then bop bop toss', grabbed && count(W, 'toss') > 0, `grab ${grabbed}`);
    ok('a tossed soldier bowls over another (STRIKE!)', W.events.some((x) => x.type === 'hit' && x.word === 'STRIKE!') && other.hp < other.maxHp);

    // jump kick, dash attack
    W = fresh(); e = foe(W, 'bot', 1.6);
    step(W, { jump: true, mx: 1 }); step(W, { mx: 1 }, 8); step(W, { attack: true, mx: 1 }); step(W, { mx: 1 }, 40);
    ok('jump kick knocks down', W.events.some((x) => x.type === 'knock' && x.kind === 'enemy'), `enemy ${e.state}`);
    W = fresh(); e = foe(W, 'straw', 3.0);
    step(W, { mx: 1, dash: 1 }); step(W, { mx: 1 }, 10); step(W, { mx: 1, attack: true }); step(W, { mx: 1 }, 30);
    ok('dash + attack = dash attack', W.events.some((x) => x.type === 'swing' && x.name === 'dashHit') && e.hp < e.maxHp, `enemy ${e.state}`);

    // beaten soldiers drop coins, which fly into your pocket; they run off or pop, nobody stays
    W = fresh(); e = foe(W, 'straw', 1.2); e.hp = 1;
    step(W, { attack: true }); step(W, {}, 60 * 6);
    ok('a beaten soldier drops coins that fly to you, then he leaves', W.heroes[0].coins >= 2 && !W.enemies.length && W.stats.kos === 1, `coins ${W.heroes[0].coins}, left ${W.enemies.length}`);

    // a bonk costs one heart
    W = fresh(); e = foe(W, 'bot', 1.0); e.state = 'windup'; e.st = 9; e.ai.cool = 0;
    step(W, {}, 40);
    ok('a bonk costs exactly one heart', W.heroes[0].hp === W.heroes[0].maxHp - 1, `hearts ${W.heroes[0].hp}`);

    // chests: weapon upgrade, magic orb
    W = fresh(); W.crates.push({ id: 999, x: W.heroes[0].x + 1.2, z: 0, drop: 'up', look: 'chest' });
    step(W, { attack: true }); step(W, {}, 50); step(W, { mx: 1 }, 30);
    ok('bonk a chest open, walk over ⚔️: weapon level 2', W.heroes[0].wlv === 2 && count(W, 'upgrade') === 1, `lv ${W.heroes[0].wlv}`);
    W = fresh(); W.heroes[0].orbs = 0; S.spawnItem(W, 'orb', W.heroes[0].x + 0.5, 0, false);
    step(W, { mx: 1 }, 20);
    ok('🔮 gives one more magic', W.heroes[0].orbs === 1);

    // food
    W = fresh(); W.heroes[0].hp = 1; S.spawnItem(W, 'bao', W.heroes[0].x + 0.4, 0, false);
    step(W, { mx: 1 }, 15);
    ok('包子 bao bun heals 2 hearts', W.heroes[0].hp === 3, `hearts ${W.heroes[0].hp}`);
    W = fresh(); W.heroes[0].hp = 1; S.spawnItem(W, 'peach', W.heroes[0].x + 0.4, 0, false);
    step(W, { mx: 1 }, 15);
    ok('寿桃 longevity peach heals every heart', W.heroes[0].hp === W.heroes[0].maxHp, `hearts ${W.heroes[0].hp}`);

    // magic: each hero's screen attack knocks down a crowd; costs one orb
    for (const who of ['teddy', 'tommy', 'zoom', 'luna', 'bolt', 'bruno']) {
      W = fresh({ hero: who });
      const h = W.heroes[0];
      h.x = W.cam.x - 3;
      const crowd = who === 'teddy' ? [foe(W, 'straw', 2.0), foe(W, 'turban', 2.6, -0.8), foe(W, 'bot', 1.2, 0.6)]
        : who === 'luna' ? [foe(W, 'straw', 2.5), foe(W, 'turban', -1.2), foe(W, 'bot', 0.5, -1.4)]
        : [foe(W, 'straw', 2.5), foe(W, 'turban', 4.5, -1.2), foe(W, 'bot', 6, 1.0)];
      const orbs = h.orbs;
      step(W, { special: true }); step(W, {}, 80);
      ok(`${who}'s magic (${W.R.HEROES[who].specialName}) knocks down the crowd for one 🔮`, crowd.every((x) => x.hp < x.maxHp && x.state !== 'idle') && h.orbs === orbs - 1, crowd.map((x) => x.state).join() + ` orbs ${h.orbs}`);
    }
    // no orbs: the rescue spin costs a heart, never the last
    W = fresh(); W.heroes[0].orbs = 0; W.heroes[0].hp = 1;
    const ring = [foe(W, 'straw', 1.2), foe(W, 'straw', -1.2)];
    step(W, { special: true }); step(W, {}, 50);
    ok('rescue spin with no 🔮: knocks back all around, never takes the last heart', W.heroes[0].hp === 1 && ring.every((x) => x.state !== 'idle'), `hp ${W.heroes[0].hp}`);

    // swing + jump pressed a few frames apart (as fingers do), mid-swing or while bonked: still the rescue spin
    W = fresh(); W.heroes[0].orbs = 3;
    const r1 = [foe(W, 'straw', 1.2), foe(W, 'straw', -1.2)];
    step(W, { attack: true }); step(W, {}, 4); step(W, { rescue: true }); step(W, {}, 6);
    const spun = W.heroes[0].state === 'special' && W.heroes[0].special === 'rescue';
    step(W, {}, 50);
    ok('F, then G a moment later (mid-swing): the rescue spin, and it knocks back all around', spun && r1.every((x) => x.state !== 'idle') && W.heroes[0].orbs === 3, `spun ${spun}, ${r1.map((x) => x.state).join()}`);
    W = fresh(); W.heroes[0].state = 'hurt'; W.heroes[0].st = 0; W.heroes[0].stun = 0.38;
    step(W, { rescue: true }); step(W, {}, 1);
    ok('the rescue spin works while being bonked too', W.heroes[0].state === 'special' && W.heroes[0].special === 'rescue', `state ${W.heroes[0].state}`);
    // horses: walk on to ride, gallop into soldiers, a bump knocks you off but keeps your heart
    W = fresh(); S.spawnItem(W, 'horse', W.heroes[0].x + 0.6, 0, false);
    step(W, { mx: 1 }, 10);
    const rode = W.heroes[0].horse;
    e = foe(W, 'straw', 2.5); e.hp = 999;
    step(W, { mx: 1 }, 40);
    ok('walk onto a horse to ride; galloping into a soldier knocks him down', rode && W.events.some((x) => x.type === 'hit' && x.word === 'CLIP-CLOP!'), `rode ${rode}`);
    W.enemies = [];
    const hp0 = W.heroes[0].hp;
    e = foe(W, 'bot', 1.0); e.state = 'windup'; e.st = 9; e.ai.cool = 0; e.face = -1;
    W.heroes[0].inv = 0;
    step(W, {}, 40);
    ok('a bump knocks you off the horse but you keep your heart', !W.heroes[0].horse && W.heroes[0].hp === hp0, `horse ${W.heroes[0].horse}, hp ${hp0}->${W.heroes[0].hp}`);
    W = fresh(); S.spawnItem(W, 'horse', W.heroes[0].x + 0.6, 0, false);
    step(W, { mx: 1 }, 10); step(W, { jump: true }); step(W, {}, 120);
    const off = !W.heroes[0].horse && W.items.some((i) => i.kind === 'horse');
    step(W, { mx: -1 }, 40); step(W, { mx: 1 }, 60);
    ok('jump (G) hops off and you stay off; walk away and back to climb on again', off && W.heroes[0].horse, `off ${off}, back on ${W.heroes[0].horse}`);
    // on a horse, swing next to a soldier: scoop him up, the gallop bumps him, he bowls over others, swing to fling
    W = fresh(); S.spawnItem(W, 'horse', W.heroes[0].x + 0.6, 0, false);
    step(W, { mx: 1 }, 10);
    e = foe(W, 'straw', 1.0); e.hp = e.maxHp = 999;
    step(W, { attack: true }); step(W, {}, 2);
    const scooped = W.heroes[0].drag === e && e.state === 'held';
    const other2 = foe(W, 'bot', 4.5, 0.35); other2.hp = 999;
    step(W, { mx: 1 }, 90);
    const bumps = W.stats.bumps || 0, hp1 = e.hp;
    step(W, { attack: true }); step(W, {}, 30);
    ok('on a horse, swing next to a soldier: scoop him up and every bump of the gallop hurts him', scooped && bumps >= 3 && hp1 < 999 - 15, `scooped ${scooped}, bumps ${bumps}, hp ${hp1}`);
    ok('the soldier you drag bowls over others, and swinging again flings him', other2.hp < 999 && W.events.some((x) => x.type === 'toss') && !W.heroes[0].drag && e.state !== 'held', `other ${other2.hp}, state ${e.state}`);
    W = fresh(); S.spawnItem(W, 'horse', W.heroes[0].x + 0.6, 0, false);
    step(W, { mx: 1 }, 10);
    e = foe(W, 'straw', 1.0);
    step(W, { attack: true }); step(W, { mx: 1 }, 60 * 3);
    ok('a dragged soldier is beaten after a few bumps (he never stays dangling)', (e.ko || e.gone) && !W.heroes[0].drag, `state ${e.state}, hp ${Math.round(e.hp)}`);
    W = fresh(); S.spawnItem(W, 'horse', W.heroes[0].x + 0.6, 0, false);
    step(W, { mx: 1 }, 10);
    e = foe(W, 'straw', 1.0); e.hp = 999;
    step(W, { attack: true }); step(W, {}, 2); step(W, { jump: true }); step(W, {}, 10);
    ok('hop off while dragging: you let go and he lands on his feet', !W.heroes[0].drag && e.state !== 'held' && e.y === 0, `state ${e.state}, y ${e.y}`);
    // your brother rides too
    W = fresh(); S.spawnItem(W, 'horse', W.heroes[0].x + 0.6, 0, false);
    step(W, { mx: 1 }, 10); step(W, { call: true }); step(W, {}, 240);
    ok('call your brother while riding: he rides in and stays on his horse', W.buddy && W.buddy.horse && count(W, 'buddyHop') === 0 && W.stats.treats >= 1, `buddy ${W.buddy && W.buddy.state}, horse ${W.buddy && W.buddy.horse}`);
    W = fresh(); step(W, { call: true }); step(W, {}, 200);
    const onFoot = W.buddy && !W.buddy.horse;
    S.spawnItem(W, 'horse', W.heroes[0].x + 0.6, W.heroes[0].z, false); W.heroes[0].face = 1;
    step(W, { mx: 1 }, 10); step(W, {}, 30);
    ok('get on a horse while he is here: he gets on his too', onFoot && W.heroes[0].horse && W.buddy && W.buddy.horse && count(W, 'buddyMount') === 1, `onFoot ${onFoot}, hero ${W.heroes[0].horse}, buddy ${W.buddy && W.buddy.horse}`);
    // R calls a horse: it gallops in from behind, you're on it; then a little wait before the next call
    W = fresh();
    step(W, { horse: true }); step(W, {}, 30);
    const coming = W.items.some((i) => i.kind === 'horse' && i.coming);
    step(W, { horse: true });
    const twice = W.stats.horseCalls;
    step(W, {}, 60 * 3);
    ok('R calls a horse that gallops to you, and you ride it', coming && W.heroes[0].horse && count(W, 'horseCall') === 1, `coming ${coming}, riding ${W.heroes[0].horse}`);
    ok('one horse at a time: pressing again while it comes does nothing', twice === 1, `calls ${twice}`);
    W.heroes[0].horse = false;
    step(W, { horse: true });
    const waited = W.stats.horseCalls === 1;
    step(W, {}, Math.ceil(60 * W.diff.horseCd)); step(W, { horse: true }); step(W, {}, 2);
    ok(`then a wait before the next call (${window.TK_RULES.DIFF.easy.horseCd} s easy, ${window.TK_RULES.DIFF.normal.horseCd} s normal)`, waited && W.stats.horseCalls === 2, `calls ${W.stats.horseCalls}`);

    // the companion: arrives, treat heals, blocks EVERY hit while he's here, leaves after ~10 s
    W = fresh(); W.heroes[0].hp = 2;
    step(W, { call: true }); step(W, {}, 200);
    const healed = W.heroes[0].hp > 2;
    const hpB = W.heroes[0].hp;
    for (let k = 0; k < 3; k++) {
      e = foe(W, 'bot', 1.0); e.state = 'windup'; e.st = 9; e.ai.cool = 0;
      step(W, {}, 60);
      W.enemies = [];
    }
    ok('companion: treat heals, and he blocks every hit while he is here', healed && W.heroes[0].hp === hpB && count(W, 'saved') >= 2, `healed ${healed}, hp ${hpB}->${W.heroes[0].hp}, saves ${count(W, 'saved')}`);
    W.enemies = [];
    step(W, {}, 60 * 11);
    ok('companion leaves after his visit', !W.buddy);
    step(W, { call: true }); step(W, {}, 2); step(W, { call: true }); step(W, {}, 300);
    ok('calling again (as often as you like) gives another treat each time', W.stats.treats >= 3, `treats ${W.stats.treats}`);
    W = fresh({ hero: 'luna' }); step(W, { call: true }); step(W, {}, 5);
    ok("a friend's companion is Tommy; Tommy's is Teddy", W.buddy && W.buddy.who === 'tommy' && S.buddyFor('tommy') === 'teddy');

    // team-up (2P): every regular soldier on screen is bonked
    W = fresh({ mode: '2p' });
    W.heroes[1].x = W.heroes[0].x; W.heroes[1].state = 'idle';
    const gang = [foe(W, 'straw', 3), foe(W, 'bot', 5), foe(W, 'turban', -1)];
    step(W, (i, k) => (i === 0 && k === 1 ? { call: true } : {}), 1); step(W, {}, 200);
    ok('2P team-up bonks the whole screen, then cools down', gang.every((x) => x.ko || x.gone) && W.teamCd > 0, gang.map((x) => x.state).join());

    // lives, then CONTINUE?
    W = fresh();
    for (let k = 0; k < 3; k++) { const h = W.heroes[0]; h.inv = 0; h.state = 'idle'; h.hp = 1; S.hurtHero(W, h, { dir: -1 }); step(W, {}, 200); }
    const cont = W.phase === 'continue';
    S.continueGame(W); step(W, {}, 120);
    ok('3 lives, then CONTINUE? brings you back', cont && W.phase === 'play' && W.heroes[0].lives === 3 && W.continues === 1, `phase ${W.phase}, continues ${W.continues}`);

    // easy has more hearts, fewer and slower soldiers
    const E = window.TK_RULES.DIFF.easy, N = window.TK_RULES.DIFF.normal;
    ok('easy: more hearts, fewer and slower soldiers', E.hearts > N.hearts && E.maxActive < N.maxActive && E.enemySpeed < N.enemySpeed && E.keep < N.keep);

    // the bonus round: jars full of coins, an incense stick that burns down
    W = S.create({ stage: window.TK_STAGES.findIndex((s) => s.bonus), mode: '1p', hero: 'tommy', difficulty: 'easy', seed: 3 });
    const jars = W.crates.length;
    let t = 0;
    while (W.phase !== 'done' && t < 60 * 60) { S.step(W, [{}]); t++; }
    ok('bonus round ends when the incense burns down, even if you do nothing', W.phase === 'done' && jars >= 12 && W.heroes[0].coins === 0, `jars ${jars}, phase ${W.phase}`);
    return results;
  }

  window.TKCheck = { run, soak, prove, moves, SETUPS };
})();
