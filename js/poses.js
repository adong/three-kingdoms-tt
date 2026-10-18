/* Three Kingdoms TT: poses, on top of the kit's Kit.people.pose (adapted from brawler-tt's).
   The kit already has Teddy's boxing (guard, jab, straight), his jump shot, Tommy's peace Y, run, walk, give and
   wave. Everything a beat-'em-up needs on top is here: weapon stances, combo swings, the flying kick, riding a
   horse, grab and toss, getting bonked, lying down, the dizzy sit, running home, the white flag and the generals'
   moves.
   Kit conventions: rotation.x swings a limb forward, rotation.z swings it out (negative for the left side),
   hips.rotation.x leans (negative = forward) and carries the legs with it. */
(function () {
  'use strict';
  const PI = Math.PI;
  const KIT = { guard: 1, jab: 1, straight: 1, jumpshot: 1, peace: 1, wave: 1, give: 1, boxing: 1, run: 1, walk: 1, jump: 1, jet: 1 };

  const base = () => ({
    ll: 0, rl: 0, llz: 0, rlz: 0, la: 0, ra: 0, laz: 0, raz: 0, lean: -0.12, twist: 0,
    head: 0, headZ: 0, bob: 0, rigY: 0.55, rigX: 0, rigZ: 0, fingers: false,
  });

  function drive(p, T, k) {
    const to = (o, prop, v) => { o[prop] += (v - o[prop]) * k; };
    to(p.legL.rotation, 'x', T.ll);
    to(p.legR.rotation, 'x', T.rl);
    to(p.legL.rotation, 'z', T.llz);
    to(p.legR.rotation, 'z', T.rlz);
    to(p.armL.rotation, 'x', T.la);
    to(p.armR.rotation, 'x', T.ra);
    to(p.armL.rotation, 'z', T.laz);
    to(p.armR.rotation, 'z', T.raz);
    to(p.hips.rotation, 'x', T.lean);
    to(p.hips.rotation, 'y', T.twist);
    to(p.head.rotation, 'x', T.head);
    to(p.head.rotation, 'z', T.headZ);
    to(p.hips.position, 'y', p.hipY + T.bob);
    to(p.rig.position, 'y', T.rigY);
    to(p.rig.rotation, 'x', T.rigX);
    to(p.rig.rotation, 'z', T.rigZ);
    if (p.fingers) for (const f of p.fingers) f.visible = T.fingers;
  }

  // A kit pose, easing the channels the kit doesn't touch back to rest (or to `extra`).
  function kit(p, ph, mode, k, extra) {
    window.Kit.people.pose(p, ph, mode, k);
    const T = Object.assign(base(), extra);
    const to = (o, prop, v) => { o[prop] += (v - o[prop]) * k; };
    to(p.legL.rotation, 'z', T.llz);
    to(p.legR.rotation, 'z', T.rlz);
    to(p.head.rotation, 'z', T.headZ);
    to(p.rig.position, 'y', T.rigY);
    to(p.rig.rotation, 'x', T.rigX);
    to(p.rig.rotation, 'z', T.rigZ);
  }

  // ---------------------------------------------------------------- stances

  // style: 'teddy' (peek-a-boo guard, spear ready), 'tommy' (feather fan up by his shoulder), 'twin' (Luna's two
  // swords), 'weapon' (everyone else's weapon), 'soldier', 'zombie', 'robot'.
  function stance(T, style, time) {
    const br = Math.sin(time * 4);
    switch (style) {
      case 'teddy':
        Object.assign(T, { ll: 0.45, rl: -0.25, la: 2.15, ra: 2.15, laz: 0.38, raz: -0.38, lean: -0.26, head: 0.15, bob: Math.abs(br) * 0.04 - 0.06, rigZ: Math.sin(time * 2.6) * 0.06 });
        break;
      case 'tommy':
        Object.assign(T, { ll: 0.35, rl: -0.22, la: 1.1, laz: 0.25, ra: 2.75, raz: -0.15, lean: -0.1, head: 0.05, bob: br * 0.02 - 0.02, twist: -0.15 });
        break;
      case 'weapon':
        Object.assign(T, { ll: 0.35, rl: -0.22, la: 1.0, laz: 0.2, ra: 2.5, raz: -0.25, lean: -0.12, bob: br * 0.02 - 0.02, twist: -0.2 });
        break;
      case 'zombie':
        Object.assign(T, { ll: 0.15, rl: -0.1, la: 1.5 + br * 0.08, ra: 1.38 - br * 0.08, laz: 0.05, raz: -0.05, lean: -0.05, head: 0.15 + br * 0.06, headZ: Math.sin(time * 1.3) * 0.15 });
        break;
      case 'robot':
        Object.assign(T, { ll: 0.3, rl: -0.2, la: 1.7, ra: 1.4, laz: 0.25, raz: -0.25, lean: -0.1, bob: Math.round(Math.sin(time * 6)) * 0.015 - 0.02, head: Math.sin(time * 1.7) > 0.8 ? 0.15 : 0 });
        break;
      case 'soldier':
        Object.assign(T, { ll: 0.3, rl: -0.2, la: 0.9, ra: 1.35 + br * 0.05, laz: 0.2, raz: -0.15, lean: -0.08, bob: br * 0.02 - 0.02, head: Math.sin(time * 1.3) * 0.08 });
        break;
      case 'twin':
        Object.assign(T, { ll: 0.4, rl: -0.25, la: 1.6, ra: 1.9, laz: 0.35, raz: -0.3, lean: -0.15, bob: br * 0.03 - 0.03 });
        break;
    }
  }

  // Sitting on a horse: legs astride the saddle (the renderer lifts the rider onto the horse).
  function rider(T) {
    Object.assign(T, { ll: 1.35, rl: 1.35, llz: -0.42, rlz: 0.42, rigY: 0.5, lean: -0.1 });
  }

  function walkLegs(T, time, speed) {
    const s = Math.sin(time * speed);
    T.ll = s * 0.55;
    T.rl = -s * 0.55;
    T.bob += Math.abs(Math.cos(time * speed)) * 0.05;
  }

  // Squat; leg angles allow for the lean (the hips carry the legs).
  function crouch(T, low) {
    const lean = -0.3;
    Object.assign(T, { rigY: low ? 0.25 : 0.35, ll: 0.95 - lean, rl: -0.7 - lean, llz: -0.2, rlz: 0.2, lean });
  }

  // Where we are in a move: { part: 'start' | 'active' | 'rec', u: 0..1 }
  function part(st, m) {
    if (st < m.at) return { part: 'start', u: st / Math.max(0.01, m.at) };
    if (st <= m.until) return { part: 'active', u: (st - m.at) / Math.max(0.01, m.until - m.at) };
    return { part: 'rec', u: Math.min(1, (st - m.until) / Math.max(0.01, m.len - m.until)) };
  }

  function styleOf(f) {
    if (f.kind === 'enemy') {
      const look = f.def.looks ? f.def.looks[0] : f.def.look;
      return look.head === 'robot' ? 'robot' : look.zombie ? 'zombie' : 'soldier';
    }
    if (f.who === 'teddy' || f.who === 'tommy') return f.who;
    if (f.who === 'luna') return 'twin';
    return 'weapon';
  }

  // ---------------------------------------------------------------- the brothers' moves

  function heroAttack(T, f, time) {
    const m = f.move.def;
    const ph = part(f.st, m);
    const hit = ph.part === 'active' || (ph.part === 'rec' && ph.u < 0.5);
    const style = styleOf(f);
    stance(T, style, time);
    switch (m.anim) {
      case 'jab': case 'straight':
        if (hit) return { kitMode: m.anim };
        return {};
      case 'hook':
        // a big swing round (spear sweep, spin, crescent)
        if (ph.part === 'start') Object.assign(T, { la: 2.0, ra: 2.0, laz: -0.3, raz: -0.9, twist: -0.65, lean: -0.15, ll: 0.5, rl: -0.3 });
        else if (hit) Object.assign(T, { la: 1.7, ra: 1.6, laz: 0.5, raz: 0.35, twist: 0.75, lean: -0.45, ll: 0.75, rl: -0.45, head: 0.2 });
        return {};
      case 'poke':
        if (ph.part === 'start') Object.assign(T, { ra: 2.5, raz: -0.3, twist: -0.3 });
        else if (hit) Object.assign(T, { ra: 1.55, raz: 0.05, la: 0.6, twist: 0.35, lean: -0.32, ll: 0.6, rl: -0.35 });
        return {};
      case 'poke2':
        if (ph.part === 'start') Object.assign(T, { ra: 3.1, raz: 0.1, lean: 0.05 });
        else if (hit) Object.assign(T, { ra: 1.35, raz: 0.05, la: 0.5, lean: -0.38, ll: 0.6, rl: -0.4, twist: 0.2 });
        return {};
      case 'swing': case 'wswing':
        // a big overhead swing, from behind the head down in front
        if (ph.part === 'start') Object.assign(T, { ra: 3.5, raz: -0.15, la: 2.4, laz: 0.2, lean: 0.18, head: -0.15, ll: 0.3, rl: -0.2 });
        else if (hit) Object.assign(T, { ra: 1.0, raz: 0.1, la: 0.9, lean: -0.55, ll: 0.85, rl: -0.5, twist: 0.3, head: 0.25 });
        else Object.assign(T, { ra: 0.8, la: 0.6, lean: -0.4, ll: 0.6, rl: -0.4 });
        return {};
      case 'wjab':
        if (ph.part === 'start') Object.assign(T, { ra: 2.8, raz: -0.4, twist: -0.3 });
        else if (hit) Object.assign(T, { ra: 1.45, raz: 0.1, twist: 0.4, lean: -0.3, ll: 0.6, rl: -0.35 });
        return {};
      case 'dash': {
        const s = Math.sin(time * 26);
        if (f.who === 'teddy') Object.assign(T, { la: 1.6, ra: 1.6, laz: 0.15, raz: -0.15 });
        else Object.assign(T, { ra: 1.5, la: 0.4 });
        Object.assign(T, { lean: -0.6, ll: 0.6 + s * 0.6, rl: 0.6 - s * 0.6, head: 0.3, rigY: 0.5 });
        return {};
      }
      case 'ride':
        // a big sweep from the saddle
        rider(T);
        if (ph.part === 'start') Object.assign(T, { ra: 2.6, raz: -0.9, la: 1.2, twist: -0.6 });
        else if (hit) Object.assign(T, { ra: 1.6, raz: 0.5, la: 0.8, twist: 0.7, lean: -0.3 });
        else Object.assign(T, { ra: 1.4, la: 0.8 });
        return {};
    }
    return {};
  }

  // ---------------------------------------------------------------- one fighter, any state

  // Poses a person from its fighter state. Returns hints for the renderer:
  // { hop (extra height), ball (show Teddy's 🏀 in his hands), flag (show the white flag), spin (tumble) }.
  function apply(p, f, time, dt, W) {
    const K = { fast: 1 - Math.exp(-32 * dt), med: 1 - Math.exp(-16 * dt), slow: 1 - Math.exp(-7 * dt) };
    const T = base();
    const style = styleOf(f);
    let k = K.med, kitMode = null, extra = null, out = {};
    const st = f.st || 0;

    if (f.horse && ['idle', 'walk', 'land', 'run', 'hurt'].includes(f.state)) {
      stance(T, style, time);
      rider(T);
      // holding a soldier by the collar beside the horse
      if (f.drag) Object.assign(T, { la: 0.95 + Math.sin(time * 12) * 0.1, laz: 0.15, twist: 0.25 });
      drive(p, T, k);
      return out;
    }
    switch (f.state) {
      case 'runoff':
        // running home, arms waving: "waaah!"
        walkLegs(T, time, 16);
        Object.assign(T, { la: 2.7 + Math.sin(time * 14) * 0.4, ra: 2.7 - Math.sin(time * 14) * 0.4, laz: -0.3, raz: 0.3, lean: -0.25, head: -0.2 });
        if (f.boss) out.flag = true;
        break;
      case 'idle': case 'land': case 'recover': case 'fight':
        stance(T, style, time);
        if (f.state === 'land') T.rigY = 0.45;
        if (f.state === 'recover' && f.boss) Object.assign(T, { lean: 0.1, head: -0.1, la: 0.6, ra: 0.6 });
        break;
      case 'walk': case 'enter': case 'bEnter': case 'bGive': case 'leave':
        if (f.kind !== 'enemy' && (f.state === 'bEnter' || f.state === 'bGive' || f.state === 'leave')) { kitMode = 'run'; break; }
        stance(T, style, time);
        walkLegs(T, time, style === 'zombie' ? 6 : 10);
        break;
      case 'run':
        kitMode = 'run';
        if (style === 'teddy') extra = {};
        break;
      case 'attack':
        if (f.kind === 'enemy') { out = enemyAttack(T, f, time); kitMode = out.kitMode || null; k = K.fast; break; }
        out = heroAttack(T, f, time);
        kitMode = out.kitMode || null;
        k = K.fast;
        break;
      case 'jump': case 'drop':
        if (f.move && f.move.name === 'jumpKick') {
          Object.assign(T, { ll: 1.55, rl: -0.35, la: 2.3, ra: 0.7, laz: 0.4, raz: 0.5, lean: 0.25, head: -0.1 });
          k = K.fast;
        } else Object.assign(T, { ll: 1.1, rl: 0.35, la: 2.4, ra: 2.2, laz: 0.3, raz: -0.3, lean: -0.08 });
        if (f.state === 'drop') Object.assign(T, { la: 2.9, ra: 2.9, laz: -0.4, raz: 0.4, ll: 0.3, rl: -0.2 });
        break;
      case 'grab':
        Object.assign(T, { ll: 0.4, rl: -0.3, la: 1.4, ra: 1.4, laz: 0.2, raz: -0.2, lean: -0.15 });
        if (f.bopT >= 0) {
          const u = f.bopT / 0.24;
          Object.assign(T, u < 0.35 ? { ra: 2.7, raz: -0.2 } : { ra: 1.5, raz: 0.05, lean: -0.3, twist: 0.2 });
          k = K.fast;
        }
        break;
      case 'toss':
        Object.assign(T, st < 0.12 ? { la: 1.2, ra: 1.2, lean: 0.1, rigY: 0.42, ll: 0.6, rl: -0.4 } : { la: 3.0, ra: 3.0, laz: -0.2, raz: 0.2, lean: 0.25, head: -0.25, ll: 0.3, rl: -0.4 });
        k = K.fast;
        break;
      case 'special': case 'team': {
        const who = f.who;
        if (f.state === 'special' && f.special === 'scroll') {
          // holding the magic scroll up high with both hands
          Object.assign(T, { la: 2.95, ra: 2.95, laz: -0.25, raz: 0.25, lean: 0.12, head: -0.35, ll: 0.3, rl: -0.2 });
          k = K.fast;
          break;
        }
        if (f.state === 'special' && f.special === 'rear') {
          // the horse rears up: hold on and cheer, then lean in for the stomp
          if (st < 0.42) Object.assign(T, { la: 2.8, ra: 2.9, laz: -0.3, raz: 0.3, lean: 0.25, head: -0.3 });
          else Object.assign(T, { la: 1.2, ra: 1.6, laz: 0.2, raz: -0.2, lean: -0.35, head: 0.2 });
          k = K.fast;
          break;
        }
        if (f.state === 'special' && f.special === 'rescue') {
          // the rescue spin: arms out, twirling round
          Object.assign(T, { la: 1.6, ra: 1.6, laz: 0.9, raz: -0.9, twist: st * 22, ll: 0.3, rl: -0.3, rigY: 0.5 });
          k = K.fast;
          break;
        }
        if (who !== 'teddy' && who !== 'tommy') {
          // the friends: wind up, then the weapon thrust high for the magic
          if (st < 0.25) Object.assign(T, { la: 0.5, ra: 0.6, laz: 0.4, raz: -0.4, lean: -0.25, rigY: 0.42, head: 0.2, ll: 0.7, rl: -0.4 });
          else Object.assign(T, { ra: 3.05, raz: -0.1, la: 2.5, laz: 0.5, lean: 0.12, head: -0.3, ll: 0.4, rl: -0.3, twist: who === 'luna' ? st * 14 : 0 });
          k = K.fast;
          break;
        }
        if (who === 'teddy') {
          const slamAt = 0.55;
          if (st < 0.12) Object.assign(T, { rigY: 0.36, ll: 0.6, rl: -0.2, la: 1.35, ra: 1.35, laz: 0.4, raz: -0.4, lean: -0.2, head: -0.1 });
          else if (st < slamAt) { kitMode = 'jumpshot'; out.ball = true; }
          else if (st < slamAt + 0.2) Object.assign(T, { la: 1.0, ra: 1.0, laz: 0.1, raz: -0.1, lean: -0.55, head: 0.35, ll: 0.9, rl: 0.5 });
          else stance(T, 'teddy', time);
          if (st < slamAt) out.ball = true;
        } else {
          if (st < 0.22) Object.assign(T, { la: 0.6, ra: 0.6, laz: 0.55, raz: -0.55, lean: -0.25, rigY: 0.45, head: 0.2 });
          else { kitMode = 'peace'; extra = { rigY: 0.55 }; }
        }
        k = K.fast;
        break;
      }
      case 'hurt':
        Object.assign(T, { lean: 0.42, head: -0.38, la: 0.5, ra: 0.3, laz: -0.8, raz: 0.8, ll: 0.35, rl: -0.4, rigZ: Math.sin(st * 40) * 0.07 });
        if (f.boss) Object.assign(T, { lean: 0.25, head: -0.25 });
        k = K.fast;
        break;
      case 'down':
        if (f.thrown) {
          // tumbling through the air
          Object.assign(T, { la: 2.8, ra: 2.6, laz: -0.6, raz: 0.6, ll: 0.6, rl: 0.2, head: -0.3 });
          drive(p, T, K.fast);
          p.rig.rotation.x = st * 11;
          p.rig.position.y = 0.55;
          return { spin: true };
        }
        Object.assign(T, { lean: 0.5, ll: 1.0, rl: 0.5, la: 2.7, ra: 2.6, laz: -0.5, raz: 0.5, head: -0.4, rigX: Math.min(1.2, st * 3) });
        k = K.fast;
        break;
      case 'lying':
        lying(T, st);
        k = st < 0.15 ? K.fast : K.med;
        break;
      case 'getup':
        stance(T, style, time);
        T.rigY = 0.42;
        k = K.med;
        break;
      case 'dizzy':
        dizzySit(T, time);
        k = K.slow;
        break;
      case 'flag':
        // back on his feet, waving a little white flag: "we give up!"
        Object.assign(T, {
          ll: 0.05, rl: -0.05, la: 0.25, laz: -0.15, ra: 2.85 + Math.sin(time * 9) * 0.18, raz: 0.25 + Math.sin(time * 9) * 0.2,
          lean: 0.05, head: -0.1, headZ: Math.sin(time * 4) * 0.15,
        });
        out.flag = true;
        k = K.med;
        break;
      case 'held':
        Object.assign(T, {
          la: 2.6 + Math.sin(time * 18) * 0.35, ra: 2.4 - Math.sin(time * 18) * 0.35, laz: -0.5, raz: 0.5,
          ll: 0.5 + Math.sin(time * 15) * 0.4, rl: 0.5 - Math.sin(time * 15) * 0.4, lean: 0.2, head: -0.2, rigY: 0.7,
        });
        k = K.fast;
        break;
      case 'windup':
        out = enemyWindup(T, f, time);
        k = K.fast;
        break;
      case 'hello': case 'bye': {
        const sig = f.state === 'hello' ? f.def.hello : f.def.bye;
        kitMode = sig;
        if (sig === 'jumpshot') {
          const u = Math.min(1, st / 0.9);
          out.hop = Math.max(0, Math.sin(u * PI)) * 0.8;
          out.ball = u < 0.55;
          if (u >= 0.55) { kitMode = null; Object.assign(T, { la: 2.55, ra: 2.55, laz: 0.1, raz: -0.1, head: -0.2 }); }
        }
        if (sig === 'peace') out.hop = Math.abs(Math.sin(st * 6)) * 0.12;
        k = K.fast;
        break;
      }
      case 'giving':
        kitMode = 'give';
        break;
      case 'out':
        break;
      default:
        stance(T, style, time);
    }

    if (kitMode && KIT[kitMode]) {
      const ph = kitMode === 'boxing' ? time * 7 : kitMode === 'run' ? time * 13 : time * 4;
      kit(p, ph, kitMode, k, extra);
      // the kit's peace, wave and give step in place; keep feet planted for moves
      if (['attack', 'special', 'team', 'hello', 'bye', 'giving'].includes(f.state) && kitMode !== 'run') {
        p.legL.rotation.x += (0.3 - p.legL.rotation.x) * k;
        p.legR.rotation.x += (-0.2 - p.legR.rotation.x) * k;
      }
    } else drive(p, T, k);
    // on a horse, whatever the arms do, the legs stay astride the saddle (hello, treats, magic from the saddle)
    if (f.horse && f.state !== 'celebrate') {
      const R = base();
      rider(R);
      p.legL.rotation.x += (R.ll - p.legL.rotation.x) * k;
      p.legR.rotation.x += (R.rl - p.legR.rotation.x) * k;
      p.legL.rotation.z += (R.llz - p.legL.rotation.z) * k;
      p.legR.rotation.z += (R.rlz - p.legR.rotation.z) * k;
      p.rig.position.y += (R.rigY - p.rig.position.y) * k;
    }
    return out;
  }

  // ---------------------------------------------------------------- the gang

  function enemyWindup(T, f, time) {
    const style = styleOf(f);
    stance(T, style, time);
    const shake = Math.sin(time * 40) * 0.08;
    if (f.boss) {
      switch (f.move) {
        case 'swipe': Object.assign(T, { ra: -0.7, raz: 0.5, la: 1.5, twist: -0.55, lean: 0.1, ll: 0.4, rl: -0.3 }); break;
        case 'stomp': Object.assign(T, { la: 3.0, ra: 3.0, laz: -0.4, raz: 0.4, rigY: 0.4, lean: 0.05, head: -0.2, ll: 0.6, rl: -0.4 }); break;
        case 'throw': Object.assign(T, { ra: -1.2 + shake, raz: 0.4, la: 1.4, twist: -0.6, lean: 0.15 }); break;
        case 'charge': Object.assign(T, { lean: -0.55, la: -0.4, ra: -0.4, ll: 0.9, rl: -0.6 + Math.sin(time * 18) * 0.5, head: 0.4, rigY: 0.45 }); break;
        case 'zap': Object.assign(T, { la: 1.6 + shake, ra: 1.6 - shake, laz: 0.25, raz: -0.25, lean: -0.05, twist: 0 }); break;
        case 'summon': Object.assign(T, { la: 2.9, ra: 2.9, laz: -0.5 + Math.sin(time * 14) * 0.3, raz: 0.5 - Math.sin(time * 14) * 0.3, head: -0.3 }); break;
        case 'swoop': Object.assign(T, { rigY: 0.38, la: -0.5, ra: -0.5, lean: -0.2, ll: 0.7, rl: -0.3 }); break;
      }
      return {};
    }
    switch (f.def.attack) {
      case 'hug': Object.assign(T, { la: 2.4 + shake, ra: 2.4 - shake, laz: -0.35, raz: 0.35, lean: 0.12, head: -0.2 }); break;
      case 'punch': case 'poke': Object.assign(T, { ra: -0.6 + shake, raz: 0.3, la: 1.7, twist: -0.45, lean: 0.05 }); break;
      case 'shoot': Object.assign(T, { ra: 2.9 + shake, raz: -0.2, la: 1.2, twist: -0.4, lean: 0.12, head: -0.1 }); break;
    }
    return {};
  }

  function enemyAttack(T, f, time) {
    const style = styleOf(f);
    stance(T, style, time);
    if (f.boss) {
      switch (f.move) {
        case 'swipe':
          if (f.st < 0.1) Object.assign(T, { ra: -0.5, raz: 0.4, twist: -0.5 });
          else Object.assign(T, { ra: 1.45, raz: -0.2, la: 0.6, twist: 0.7, lean: -0.35, ll: 0.7, rl: -0.4 });
          return {};
        case 'stomp':
          if (f.y > 0.05) Object.assign(T, { la: 3.0, ra: 3.0, laz: -0.3, raz: 0.3, ll: 0.9, rl: 0.9, lean: -0.1, head: -0.2 });
          return {};
        case 'charge': {
          const s = Math.sin(time * 22);
          Object.assign(T, { lean: -0.6, ll: 0.6 + s * 0.7, rl: 0.6 - s * 0.7, la: -0.6 - s * 0.5, ra: -0.6 + s * 0.5, head: 0.45, rigY: 0.5 });
          return {};
        }
        case 'throw': case 'zap':
          Object.assign(T, { ra: 1.7, raz: 0.05, la: f.move === 'zap' ? 1.7 : 0.6, twist: 0.45, lean: -0.3 });
          return {};
        case 'summon':
          Object.assign(T, { la: 3.0, ra: 3.0, laz: -0.3, raz: 0.3, head: -0.35 });
          return {};
        case 'swoop':
          return { kitMode: 'jet' };
      }
      return {};
    }
    switch (f.def.attack) {
      case 'hug': Object.assign(T, { la: 1.55, ra: 1.55, laz: 0.25, raz: -0.25, lean: -0.42, ll: 0.6, rl: -0.4, head: 0.2 }); break;
      case 'punch': case 'poke':
        if (f.st < 0.18) Object.assign(T, { ra: 1.62, raz: -0.05, la: 1.9, twist: 0.5, lean: -0.3, ll: 0.5, rl: -0.3 });
        break;
      case 'shoot': Object.assign(T, { ra: 1.4, raz: 0.05, la: 0.6, twist: 0.45, lean: -0.3 }); break;
    }
    return {};
  }

  // Flat on the back, arms flopped overhead, with a little bounce as they land.
  function lying(T, t) {
    const bounce = t < 0.2 ? Math.sin((t / 0.2) * PI) * 0.15 : 0;
    Object.assign(T, { rigX: PI / 2, rigY: 0.2 + bounce, lean: 0, ll: 0.3, rl: 0.12, llz: -0.15, rlz: 0.15, la: 2.9, ra: 2.6, laz: -0.4, raz: 0.4, head: 0 });
  }

  // Sitting on the ground, legs out, propped on the hands, head wobbling under circling stars.
  function dizzySit(T, time) {
    const lean = 0.15;
    Object.assign(T, {
      rigY: -0.18, lean, ll: 1.57 - lean, rl: 1.5 - lean, llz: -0.18, rlz: 0.18,
      la: -0.5 - lean, ra: -0.45 - lean, laz: -0.35, raz: 0.35,
      head: 0.1 + Math.sin(time * 2.1) * 0.18, headZ: Math.sin(time * 3) * 0.3, twist: Math.sin(time * 1.7) * 0.25, rigZ: Math.sin(time * 2.4) * 0.06,
    });
  }

  // ---------------------------------------------------------------- the stage-clear celebration

  // t: seconds into the celebration (see TKSim.CELEB). Returns { hop, ball, face: 'cam' | 'in' | 'walk', five, shot }.
  // Teddy boxes then shoots a 🏀, Tommy does his ✌️ Y, the friends wave; then a HIGH FIVE in the middle.
  function celebrate(p, f, t, time, dt) {
    const C = window.TKSim.CELEB;
    const K = 1 - Math.exp(-16 * dt);
    const T = base();
    if (t < C.walk) {
      kit(p, time * 13, 'run', K);
      return { face: 'walk' };
    }
    if (t < C.moves) {
      const u = t - C.walk;
      if (f.who === 'teddy') {
        if (u < 1.0) { kit(p, time * 7, 'boxing', K); return { face: 'cam' }; }
        const v = Math.min(1, (u - 1.0) / 1.1);
        const hop = Math.max(0, Math.sin(v * PI)) * 0.9;
        if (v < 0.55) { kit(p, 0, 'jumpshot', K); return { face: 'cam', hop, ball: true }; }
        Object.assign(T, { ll: 0.25, rl: 0.25, la: 2.55, ra: 2.55, laz: 0.1, raz: -0.1, head: -0.2 });
        drive(p, T, K);
        return { face: 'cam', hop, shot: v >= 0.55 };
      }
      if (f.who === 'tommy') {
        kit(p, time * 4, 'peace', K);
        p.legL.rotation.x += (0.15 - p.legL.rotation.x) * K;
        p.legR.rotation.x += (-0.1 - p.legR.rotation.x) * K;
        return { face: 'cam', hop: Math.abs(Math.sin(u * 6)) * 0.15 };
      }
      kit(p, time * 4, 'wave', K);
      return { face: 'cam', hop: Math.abs(Math.sin(u * 5)) * 0.12 };
    }
    if (t < C.five + 0.35) {
      // step in and HIGH FIVE: the one on the left with the right hand, the one on the right with the left
      const left = (f.cside || -1) < 0;
      Object.assign(T, { ll: 0.35, rl: -0.25, lean: -0.05, head: -0.25 });
      if (left) Object.assign(T, { ra: 2.75, raz: 0.15, la: 0.3 });
      else Object.assign(T, { la: 2.75, laz: -0.15, ra: 0.3 });
      drive(p, T, 1 - Math.exp(-22 * dt));
      return { face: 'in', five: true };
    }
    // cheering
    const u = t - C.five;
    if (f.who === 'tommy') {
      kit(p, time * 4, 'peace', K);
      return { face: 'cam', hop: Math.abs(Math.sin(u * 5)) * 0.35 };
    }
    Object.assign(T, { la: 2.9, ra: 2.9, laz: -0.35, raz: 0.35, ll: 0.3, rl: -0.2, head: -0.2 });
    drive(p, T, K);
    return { face: 'cam', hop: Math.abs(Math.sin(u * 5 + 1)) * 0.35 };
  }

  window.TKPoses = { apply, celebrate, drive, base, kit, stance, rider };
})();
