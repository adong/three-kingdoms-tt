/* Three Kingdoms TT: the game shell (adapted from brawler-tt's). Three.js scene and camera, the heroes, horses and
   the straw-hat army as kit people, the HUD, menus, the storybook cards, the companion's visits and treats, the
   stage-clear celebration, the touch controls and the test hooks (window.game). The rules live in js/sim.js; this
   file only draws what the engine says and turns its events into effects and sounds. */
(function () {
  'use strict';
  const T = THREE, Kit = window.Kit, G = Kit.gfx;
  const Sim = window.TKSim, Brains = window.TKBrains, Input = window.TKInput, Poses = window.TKPoses;
  const Fx = window.TKFx, Sfx = window.TKSfx, Scenery = window.TKScenery, M = window.TKModels, Check = window.TKCheck;
  const R = window.TK_RULES, STAGES = window.TK_STAGES, TIPS = window.TK_TIPS, TITLE = window.TK_TITLE;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const PI = Math.PI;
  const tr = (s) => (Kit.lang ? Kit.lang.t(s) : s);

  document.title = `${TITLE.NAME} · Teddy & Tommy`;
  $('logo1').textContent = TITLE.LINE1;
  $('logo2').textContent = TITLE.LINE2;
  // The seal says 三国 in 中文 and TT in English: English mode shows no Chinese at all (Alan's rule).
  const sealText = () => (Kit.lang && Kit.lang.is('zh') ? TITLE.SEAL : 'TT');
  $('seal').textContent = sealText();
  if (Kit.lang) Kit.lang.onChange(() => { $('seal').textContent = sealText(); });
  $('tagline').textContent = TITLE.TAG;

  // ---------------------------------------------------------------- saved progress

  const SAVE_KEY = 'threeKingdomsTT.v1';
  let save = { cleared: [], diff: 'easy', hero: 'teddy', heroes: ['teddy', 'tommy'] };
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) { /* storage blocked */ }
  const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* storage blocked */ } };
  const anyCleared = () => save.cleared.some(Boolean);
  const unlocked = (i) => i === 0 || !!save.cleared[i - 1] || !!save.cleared[i];

  // ---------------------------------------------------------------- three.js

  const canvas = $('game');
  const renderer = new T.WebGLRenderer({ canvas, antialias: true });
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(32, 1, 0.1, 220);
  const hemi = new T.HemisphereLight('#ffffff', '#6a9a4a', 1.0);
  const sun = new T.DirectionalLight('#fff1d6', 1.0);
  sun.position.set(-4, 10, 8);
  scene.add(hemi, sun, sun.target);
  Fx.init(scene);
  Fx.setIcons(M.iconTexture);

  let vw = 0, vh = 0;
  function resize() {
    const w = window.innerWidth || 800, h = window.innerHeight || 600;
    if (w === vw && h === vh) return;
    vw = w; vh = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (W && !W.bonus) W.halfW = pickHalfW();
  }
  // How much road fits across the screen: a little less on a narrow (portrait) screen.
  const pickHalfW = () => {
    const a = (window.innerWidth || 800) / (window.innerHeight || 600);
    return a >= 1.5 ? 7 : a >= 1.2 ? 6.2 : a >= 0.9 ? 5.3 : 4.5;
  };

  // ---------------------------------------------------------------- views of the fighters

  const views = new Map();
  const itemViews = new Map(), crateViews = new Map(), shotViews = new Map();
  const runaways = [];
  let shadowTex = null, exclTex = null;
  const tmpA = new T.Vector3(), tmpB = new T.Vector3();

  function blobShadow(size) {
    if (!shadowTex) shadowTex = G.radialTexture(64, [[0, 'rgba(20,18,40,0.5)'], [0.6, 'rgba(20,18,40,0.3)'], [1, 'rgba(20,18,40,0)']]);
    const s = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    s.rotation.x = -PI / 2;
    s.scale.set(size, size * 0.6, 1);
    s.renderOrder = 1;
    scene.add(s);
    return s;
  }

  function exclTexture() {
    if (exclTex) return exclTex;
    const [c, g] = G.makeCanvas(64, 64);
    g.fillStyle = '#ffd400';
    g.beginPath(); g.arc(32, 32, 28, 0, PI * 2); g.fill();
    g.lineWidth = 5; g.strokeStyle = '#14121f'; g.stroke();
    g.fillStyle = '#14121f';
    g.font = `40px ${G.FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('!', 32, 35);
    return (exclTex = G.toTexture(c));
  }

  function spriteOf(icon, size) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: M.iconTexture(icon), transparent: true, depthWrite: false }));
    s.scale.set(size, size, 1);
    return s;
  }

  const buddyScale = (who) => (Kit.roster.get(who) && Kit.roster.get(who).buddyScale) || 0.85;

  function makeView(f) {
    const v = { id: f.id, kind: f.kind, angle: f.face > 0 ? -PI / 2 - 0.3 : PI / 2 + 0.3, mats: [] };
    v.p = f.kind === 'enemy' ? M.buildEnemy(f) : M.buildHero(f.who);
    v.scale = f.kind === 'buddy' ? buddyScale(f.who) : f.scale || 1;
    v.p.root.scale.setScalar(v.scale);
    scene.add(v.p.root);
    v.p.root.traverse((o) => { if (o.isMesh && o.material && o.material.emissive && !(o.material.emissiveIntensity > 0.2)) v.mats.push(o.material); });
    v.shadow = blobShadow(1.1 * v.scale);
    // dizzy stars
    v.dizzy = new T.Group();
    v.orbit = ['⭐', '💫', '⭐', '🐤'].map((e) => { const s = spriteOf(e, 0.38); v.dizzy.add(s); return s; });
    v.dizzy.visible = false;
    scene.add(v.dizzy);
    if (f.kind === 'enemy') {
      // the "!" before an attack, a little health bar, and the white flag
      v.excl = new T.Sprite(new T.SpriteMaterial({ map: exclTexture(), transparent: true, depthWrite: false, depthTest: false }));
      v.excl.scale.set(0.55, 0.55, 1);
      v.excl.renderOrder = 15;
      v.excl.visible = false;
      scene.add(v.excl);
      if (!f.boss) {
        // a little health bar: white outline, a light track, and a fill that goes green, yellow, red. All three are
        // "transparent" so they're drawn in renderOrder (Three.js draws solid things first, whatever their order,
        // which once put the dark track on top of the fill).
        v.bar = new T.Group();
        const layer = (w, h, color, order, opacity = 1) => {
          const me = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color, depthTest: false, depthWrite: false, transparent: true, opacity }));
          me.renderOrder = order;
          v.bar.add(me);
          return me;
        };
        layer(1.08, 0.22, '#ffffff', 14);
        layer(1.0, 0.14, '#6a5a72', 15, 0.9);
        const fill = layer(1.0, 0.14, '#7dff5a', 16);
        fill.geometry.translate(0.5, 0, 0);
        fill.position.x = -0.5;
        v.bar.rotation.x = -0.45; // tip it toward the camera
        v.barFill = fill;
        v.bar.visible = false;
        scene.add(v.bar);
      }
      const flag = new T.Group();
      const stick = new T.Mesh(new T.BoxGeometry(0.05, 1.0, 0.05), new T.MeshStandardMaterial({ color: '#8a5a32' }));
      stick.position.y = -0.4;
      const cloth = new T.Mesh(new T.PlaneGeometry(0.62, 0.44), new T.MeshStandardMaterial({ color: '#ffffff', side: T.DoubleSide, emissive: '#ffffff', emissiveIntensity: 0.35 }));
      cloth.geometry.translate(0.31, 0, 0);
      cloth.position.set(0, -0.68, 0.02);
      cloth.rotation.y = PI / 2;
      flag.add(stick, cloth);
      flag.position.set(0, -0.6, 0);
      flag.visible = false;
      v.p.armL.add(flag);
      v.flag = flag;
      v.cloth = cloth;
    } else {
      v.ball = spriteOf('🏀', 0.72);
      v.ball.visible = false;
      scene.add(v.ball);
      // the horse he rides (heroes), or rides in on (the companion)
      v.horse = M.makeHorse(f.kind === 'buddy' ? '#f2f2f2' : '#c8864a');
      v.horse.visible = false;
      v.horse.scale.setScalar(v.scale);
      scene.add(v.horse);
      if (f.kind === 'buddy' || (W && W.mode === '2p')) {
        const label = f.kind === 'buddy' ? R.HEROES[f.who].name : f.slot ? '2P' : '1P';
        v.tag = G.nameTag(label, f.kind === 'buddy' ? R.HEROES[f.who].tag : f.slot ? '#ffb02e' : '#8cc2ff');
        v.tag.scale.multiplyScalar(f.kind === 'buddy' ? 0.85 : 0.6);
        v.tag.material.depthTest = false;
        v.tag.renderOrder = 12;
        scene.add(v.tag);
      }
    }
    return v;
  }

  function dropView(v) {
    scene.remove(v.p.root, v.shadow, v.dizzy);
    for (const k of ['excl', 'bar', 'ball', 'tag', 'horse']) if (v[k]) scene.remove(v[k]);
  }

  function syncFighter(f, dt) {
    let v = views.get(f.id);
    if (!v) { v = makeView(f); views.set(f.id, v); }
    v.seen = true;
    const p = v.p;
    const visible = !(f.out || f.state === 'out');
    p.root.visible = visible;
    v.shadow.visible = visible;
    if (!visible) {
      v.dizzy.visible = false;
      for (const k of ['tag', 'ball', 'horse']) if (v[k]) v[k].visible = false;
      return;
    }
    if (p.setLevel) p.setLevel(f.wlv || 1);

    let hints;
    let target = f.face > 0 ? -PI / 2 - 0.3 : PI / 2 + 0.3;
    if (f.state === 'celebrate') {
      hints = Poses.celebrate(p, f, W.phaseT, clock, dt);
      if (hints.face === 'cam') target = PI;
      else if (hints.face === 'in') target = (f.cside || -1) < 0 ? -PI / 2 - 0.55 : PI / 2 + 0.55;
      else target = (f.cx || f.x) >= f.x ? -PI / 2 - 0.3 : PI / 2 + 0.3;
      if (hints.shot && !v.shotDone) {
        v.shotDone = true;
        Kit.people.handWorld(p, 1, tmpA);
        Fx.arc('🏀', tmpA.clone(), { x: f.x + 0.6, y: 6, z: f.z - 2 }, 0.8, 0.55, 0.5, () => {});
        sfx('whoosh', true);
      }
      if (hints.face === 'cam' && f.who === 'tommy' && Math.random() < dt * 3) Fx.floatUp(Math.random() < 0.5 ? '✌️' : '⭐', f.x + (Math.random() - 0.5), 2.4, f.z, 0.5);
    } else {
      v.shotDone = false;
      hints = Poses.apply(p, f, clock, dt, W);
    }
    // turn to face (quickly)
    let d = target - v.angle;
    while (d > PI) d -= PI * 2;
    while (d < -PI) d += PI * 2;
    v.angle += d * (1 - Math.exp(-18 * dt));
    p.root.rotation.y = v.angle;
    const hop = (hints && hints.hop) || 0;
    // riding: the horse under him, galloping with his speed
    const riding = f.kind !== 'enemy' && (f.horse || (f.kind === 'buddy' && f.state === 'bEnter')) && f.state !== 'celebrate';
    const lift = riding ? 0.5 * v.scale : 0;
    p.root.position.set(f.x, f.y + hop + lift, f.z);
    if (v.horse) {
      v.horse.visible = riding;
      if (riding) {
        v.horse.position.set(f.x, f.y, f.z);
        v.horse.rotation.y = v.angle;
        const sp = Math.hypot(f.vx || 0, f.vz || 0);
        v.gallop = (v.gallop || 0) + dt * (4 + sp * 2.2);
        M.animHorse(v.horse, v.gallop, sp);
        if (sp > 2 && Math.random() < dt * 4) Fx.dust(f.x - (f.face || 1) * 0.6, f.z, 1);
      }
    }
    if (p.cape) p.cape.rotation.x = 0.15 + Math.abs(f.vx || 0) * 0.08 + Math.sin(clock * 6) * 0.05;

    // hit flash, and blinking while invulnerable
    const flash = f.flash > 0.08;
    if (flash !== v.flashing) {
      v.flashing = flash;
      for (const mt of v.mats) { mt.emissive.set(flash ? '#ffffff' : '#000000'); mt.emissiveIntensity = flash ? (f.boss ? 0.3 : 0.5) : 1; }
    }
    if (f.kind === 'hero' && f.inv > 0 && !['special', 'team', 'celebrate', 'drop'].includes(f.state) && f.state !== 'getup') {
      p.root.visible = Math.floor(clock * 14) % 2 === 0;
    }
    const s = v.scale;
    v.shadow.position.set(f.x, 0.02, f.z);
    const sh = Math.max(0.35, 1 - (f.y + hop) / 4);
    v.shadow.scale.set((riding ? 1.6 : 1.1) * s * sh, 0.66 * s * sh, 1);

    // dizzy stars over the head
    const dizzy = f.state === 'dizzy' || (f.kind === 'enemy' && f.state === 'hurt' && f.stun >= 0.6);
    v.dizzy.visible = dizzy;
    if (dizzy) {
      p.head.getWorldPosition(tmpA);
      v.dizzy.position.set(tmpA.x, tmpA.y + 0.55 * s, tmpA.z);
      v.orbit.forEach((o, i) => { const a = clock * 3.2 + (i * PI) / 2; o.position.set(Math.cos(a) * 0.5 * s, Math.sin(a * 2) * 0.05, Math.sin(a) * 0.5 * s); });
    }
    if (f.kind === 'enemy') {
      v.excl.visible = f.state === 'windup';
      if (v.excl.visible) {
        v.excl.position.set(f.x, f.y + 2.45 * s + Math.abs(Math.sin(clock * 12)) * 0.12, f.z);
        const k = 0.5 + Math.min(1, f.st * 4) * 0.15;
        v.excl.scale.set(k, k, 1);
      }
      if (v.bar) {
        v.bar.visible = f.barT > 0 && !f.ko;
        if (v.bar.visible) {
          v.bar.position.set(f.x, f.y + 2.3 * s, f.z);
          const frac = Math.max(0.001, f.hp / f.maxHp);
          v.barFill.scale.x = frac;
          v.barFill.material.color.set(frac > 0.5 ? '#7dff5a' : frac > 0.25 ? '#ffd400' : '#ff5a5a');
        }
      }
      v.flag.visible = !!(hints && hints.flag);
      if (v.flag.visible) v.cloth.rotation.y = PI / 2 + Math.sin(clock * 12) * 0.5;
    } else {
      v.ball.visible = !!(hints && hints.ball);
      if (v.ball.visible) {
        p.root.updateMatrixWorld(true);
        Kit.people.handWorld(p, -1, tmpA);
        Kit.people.handWorld(p, 1, tmpB);
        v.ball.position.copy(tmpA).add(tmpB).multiplyScalar(0.5);
        v.ball.position.y += 0.15;
      }
      if (v.tag) {
        v.tag.visible = f.state !== 'celebrate';
        v.tag.position.set(f.x, f.y + hop + lift + 2.45 * s + 0.15, f.z);
      }
    }
  }

  // A horse trotting off on its own (knocked off it, or the companion hopped down).
  function addRunaway(x, z, dir, white) {
    const g = M.makeHorse(white ? '#f2f2f2' : '#c8864a');
    g.position.set(x, 0, z);
    g.rotation.y = dir > 0 ? -PI / 2 : PI / 2;
    if (white) g.scale.setScalar(0.8);
    scene.add(g);
    runaways.push({ g, dir, t: 0 });
  }

  function syncWorld(dt) {
    for (const v of views.values()) v.seen = false;
    for (const h of W.heroes) syncFighter(h, dt);
    if (W.buddy) syncFighter(W.buddy, dt);
    for (const e of W.enemies) syncFighter(e, dt);
    for (const [id, v] of views) if (!v.seen) { dropView(v); views.delete(id); }

    // pick-ups: food, coins, upgrades, magic orbs, horses
    const seenI = new Set();
    for (const it of W.items) {
      seenI.add(it.id);
      let v = itemViews.get(it.id);
      if (!v) {
        v = { g: new T.Group() };
        const food = R.FOOD[it.kind], coin = R.COINS[it.kind];
        if (it.kind === 'horse') {
          v.obj = M.makeHorse();
          v.obj.rotation.y = (it.face || 1) > 0 ? -PI / 2 : PI / 2;
          v.horse = true;
        } else {
          const icon = food ? food.icon : coin ? coin.icon : it.kind === 'up' ? '⚔️' : '🔮';
          v.obj = spriteOf(icon, coin ? (it.kind === 'ingot' ? 0.6 : 0.42) : 0.75);
          v.obj.position.y = coin ? 0.25 : 0.45;
          if (!coin) {
            const glow = new T.Sprite(new T.SpriteMaterial({ map: G.glowTexture(), color: it.kind === 'orb' ? '#d8a0ff' : '#fff3a0', transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.6 }));
            glow.scale.set(1.3, 1.1, 1);
            glow.position.y = 0.45;
            v.g.add(glow);
            v.glow = glow;
          }
        }
        v.g.add(v.obj);
        v.shadow = blobShadow(v.horse ? 1.8 : 0.6);
        scene.add(v.g);
        itemViews.set(it.id, v);
      }
      const coin = R.COINS[it.kind];
      v.g.position.set(it.x, it.y + (v.horse || coin ? 0 : Math.sin(clock * 3 + it.id) * 0.06), it.z);
      if (v.horse) {
        if (it.coming) {
          v.obj.rotation.y = (it.face || 1) > 0 ? -PI / 2 : PI / 2;
          v.gallop = (v.gallop || 0) + (1 / 60) * 22;
          M.animHorse(v.obj, v.gallop, 7);
          if (Math.random() < 0.25) Fx.dust(it.x - (it.face || 1) * 0.7, it.z, 1);
        } else M.animHorse(v.obj, clock * 2 + it.id, 0.15);
      }
      if (coin) v.obj.material.rotation = Math.sin(clock * 8 + it.id) * 0.4;
      v.shadow.position.set(it.x, 0.02, it.z);
      if (v.glow) v.glow.material.opacity = 0.4 + Math.sin(clock * 5) * 0.2;
    }
    for (const [id, v] of itemViews) if (!seenI.has(id)) { scene.remove(v.g, v.shadow); itemViews.delete(id); }

    // chests and jars
    const seenC = new Set();
    for (const c of W.crates) {
      seenC.add(c.id);
      if (!crateViews.has(c.id)) {
        const g = Scenery.crate(c.look);
        g.position.set(c.x, 0, c.z);
        g.rotation.y = (c.id % 5) * 0.12 - 0.24;
        scene.add(g);
        crateViews.set(c.id, g);
      }
    }
    for (const [id, g] of crateViews) if (!seenC.has(id)) { scene.remove(g); crateViews.delete(id); }

    // thrown things and rolling magic
    const seenS = new Set();
    for (const s of W.shots) {
      if (s.kind === 'ring') continue;
      seenS.add(s.id);
      let v = shotViews.get(s.id);
      if (!v) {
        if (s.kind === 'sweep') {
          const icon = s.style === 'wind' ? '🌪️' : s.style === 'dart' ? '🎯' : '🌙';
          v = spriteOf(icon, s.style === 'wind' ? 2.6 : s.style === 'dart' ? 0.7 : 2.2);
          if (s.style === 'crescent') v.material.color.set('#9affb0');
        } else v = spriteOf(s.emoji, s.kind === 'zap' ? 1.0 : 0.8);
        v.renderOrder = 6;
        scene.add(v);
        const col = { zap: '#5ef2ff', pea: '#7dff5a', lantern: '#ff6a3a', scroll: '#fff0b0', wind: '#bff4ff', dart: '#ffd400', crescent: '#7dff9a' }[s.style || s.kind] || '#ffffff';
        const glow = new T.Sprite(new T.SpriteMaterial({ map: G.glowTexture(), color: col, transparent: true, depthWrite: false, opacity: 0.85 }));
        glow.scale.set(1.6, 1.6, 1);
        glow.renderOrder = 5;
        glow.position.z = -0.01;
        v.add(glow);
        shotViews.set(s.id, v);
      }
      if (s.kind === 'sweep') {
        v.position.set(s.x, s.style === 'wind' ? 1.4 : s.style === 'dart' ? 1.1 : 1.3, s.z + (s.style === 'wind' ? 0 : 0.1));
        if (s.style === 'wind') { v.material.rotation = Math.sin(clock * 20) * 0.15; if (Math.random() < 0.5) Fx.dust(s.x, (W.zMin + W.zMax) / 2 + (Math.random() - 0.5) * 3, 1); }
        else if (s.style === 'dart') v.material.rotation = s.vx > 0 ? -PI / 4 : PI * 0.75;
        else v.material.rotation = s.vx > 0 ? 0 : PI;
      } else {
        v.position.set(s.x, s.y, s.z);
        if (s.kind !== 'zap' && s.kind !== 'scroll') v.material.rotation -= (s.vx > 0 ? 1 : -1) * 10 * (1 / 60);
        if (s.kind === 'scroll') v.material.rotation = Math.sin(clock * 8) * 0.3;
      }
    }
    for (const [id, v] of shotViews) if (!seenS.has(id)) { scene.remove(v); shotViews.delete(id); }

    // horses trotting home
    for (let i = runaways.length - 1; i >= 0; i--) {
      const r = runaways[i];
      r.t += dt;
      r.g.position.x += r.dir * 7 * dt;
      M.animHorse(r.g, r.t * 18, 6);
      if (r.t > 3) { scene.remove(r.g); runaways.splice(i, 1); }
    }
  }

  function clearWorldViews() {
    for (const v of views.values()) dropView(v);
    views.clear();
    for (const v of itemViews.values()) scene.remove(v.g, v.shadow);
    itemViews.clear();
    for (const g of crateViews.values()) scene.remove(g);
    crateViews.clear();
    for (const v of shotViews.values()) scene.remove(v);
    shotViews.clear();
    for (const r of runaways) scene.remove(r.g);
    runaways.length = 0;
    Fx.clear();
  }

  // ---------------------------------------------------------------- the stage

  let stageView = null;
  function buildStage() {
    if (stageView) scene.remove(stageView.group);
    let seed = (W.si + 1) * 9301;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    stageView = Scenery.build(W.S.theme, W.S.length, rnd);
    scene.add(stageView.group);
    scene.background = stageView.sky;
    const info = stageView.info;
    hemi.color.set(info.hemi[0]);
    hemi.groundColor.set(info.hemi[1]);
    hemi.intensity = info.hemi[2];
    sun.color.set(info.sun[0]);
    sun.intensity = info.sun[1];
    scene.fog = new T.Fog(info.fog, 40, 110);
  }

  // ---------------------------------------------------------------- camera

  let camX = 7, shake = 0, zoom = 1;
  function updateCamera(dt) {
    camX += (W.cam.x - camX) * (1 - Math.exp(-7 * dt));
    if (Math.abs(W.cam.x - camX) > 12) camX = W.cam.x;
    const celebrating = W.phase === 'celebrate' || W.phase === 'done';
    zoom += ((celebrating ? 0.62 : 1) - zoom) * (1 - Math.exp(-3 * dt));
    const vfov = (camera.fov * PI) / 180;
    const tanH = Math.tan(vfov / 2) * camera.aspect;
    const D = ((W.halfW + 0.35) / tanH) * zoom;
    const pitch = celebrating ? 0.3 : 0.5;
    const zc = (W.zMin + W.zMax) / 2;
    const lookY = celebrating ? 1.5 : 2.1;
    shake = Math.max(0, shake - dt * 2.5);
    const sx = (Math.random() - 0.5) * shake * 0.5, sy = (Math.random() - 0.5) * shake * 0.4;
    camera.position.set(camX + sx, lookY + D * Math.sin(pitch) + sy, zc + D * Math.cos(pitch));
    camera.lookAt(camX + sx * 0.5, lookY, zc - 0.35);
    sun.position.set(camX - 4, 10, 8);
    sun.target.position.set(camX, 0, 0);
  }

  // ---------------------------------------------------------------- portraits

  const faces = M.snapFaces(R.HERO_ORDER.map((id) => ({ id, build: () => M.buildHero(id, { weapon: false }), tall: id === 'tommy' || id === 'bruno' })));
  let bossFaces = {};
  function ensureBossFaces() {
    if (Object.keys(bossFaces).length) return;
    bossFaces = M.snapFaces(Object.entries(R.BOSSES).map(([id, def]) => ({ id, build: () => M.buildEnemy({ def, look: 0, scale: 1 }), tall: true })));
  }
  const heroName = (who) => R.HEROES[who].name;

  // ---------------------------------------------------------------- HUD

  const hud = $('hud');
  const cards = [$('pc0'), $('pc1')];
  let bossLag = 1;
  const last = {};
  const setText = (el, key, text) => { if (last[key] !== text) { last[key] = text; el.textContent = text; } };

  function setupHud() {
    const two = W.mode === '2p';
    W.heroes.forEach((h, i) => {
      const c = cards[i];
      c.classList.remove('hidden');
      c.querySelector('.face img').src = faces[h.who];
      c.querySelector('.face').style.background = `radial-gradient(circle at 50% 35%, #ffe2a0, ${R.HEROES[h.who].color})`;
      c.querySelector('.nm').textContent = heroName(h.who);
      c.querySelector('.who').textContent = two ? (i ? '2P' : '1P') : 'YOU';
      c.querySelector('.who').style.background = R.HEROES[h.who].color;
    });
    cards[1].classList.toggle('hidden', !two);
    const bud = $('budCard');
    bud.classList.toggle('hidden', two);
    if (!two) {
      const who = Sim.buddyFor(W.heroes[0].who);
      bud.classList.remove('teddy', 'tommy');
      bud.classList.add(who);
      bud.querySelector('img').src = faces[who];
      bud.querySelector('.bl2').textContent = heroName(who) + '!';
    }
    $('teamBtn').classList.toggle('hidden', !two);
    $('teamF0').src = faces[W.heroes[0].who];
    $('teamF1').src = faces[(W.heroes[1] || W.heroes[0]).who];
    $('stageChip').textContent = `${W.S.bonus ? '★' : stageNumber(W.si)} · ${W.S.name}`;
    $('bossbar').classList.add('hidden');
    $('incense').classList.toggle('hidden', !W.bonus);
    $('go').classList.add('hidden');
    $('tip').classList.remove('show');
    for (const k in last) delete last[k];
    bossLag = 1;
    W.heroes.forEach((h, i) => { document.querySelectorAll(`.c${i} .spc .se`).forEach((e) => { e.textContent = R.HEROES[h.who].specialIcon; }); });
    $('touch').classList.toggle('two', two);
  }

  // Stage numbers skip the bonus rounds (they're ★).
  function stageNumber(i) {
    let n = 0;
    for (let k = 0; k <= i; k++) if (!STAGES[k].bonus) n++;
    return n;
  }

  function updateHud(dt) {
    W.heroes.forEach((h, i) => {
      const c = cards[i];
      const hearts = h.out ? '' : '❤️'.repeat(Math.max(0, Math.ceil(h.hp))) + '🤍'.repeat(Math.max(0, h.maxHp - Math.ceil(h.hp)));
      const he = c.querySelector('.hearts');
      setText(he, 'hearts' + i, hearts);
      he.classList.toggle('crit', !h.out && h.hp <= 1);
      setText(c.querySelector('.lives'), 'lives' + i, h.out ? '' : `×${h.lives}`);
      setText(c.querySelector('.score'), 'score' + i, String(h.score));
      setText(c.querySelector('.coins'), 'coins' + i, `🪙 ${h.coins}`);
      setText(c.querySelector('.orbs'), 'orbs' + i, `🔮 ${h.orbs}`);
      setText(c.querySelector('.wlv'), 'wlv' + i, '⚔️' + '★'.repeat(h.wlv));
      const hc = c.querySelector('.horse');
      const calling = W.items.some((it) => it.kind === 'horse' && it.coming && it.owner === h.id);
      hc.classList.toggle('riding', !!h.horse);
      hc.classList.toggle('wait', !h.horse && (h.horseCd > 0 || calling));
      document.querySelectorAll(`.c${i} .hrs`).forEach((b) => b.classList.toggle('wait', !!h.horse || h.horseCd > 0 || calling));
      c.querySelector('.shield').classList.toggle('on', !!h.shield && !h.out);
      const out = c.querySelector('.out');
      out.classList.toggle('on', !!h.out && W.mode === '2p');
      if (h.out) setText(out, 'out' + i, W.continues > 0 ? (touchMode ? 'OUT · tap ⚔️' : `OUT · press ${i ? 'J' : 'F'}`) : 'OUT');
      document.querySelectorAll(`.c${i} .spc .orbn`).forEach((e) => { if (e.textContent !== String(h.orbs)) e.textContent = String(h.orbs); });
    });
    // the companion's card (1 player)
    if (W.mode === '1p') {
      const bud = $('budCard');
      const here = !!W.buddy && W.phase !== 'celebrate';
      bud.classList.toggle('here', here);
      bud.style.setProperty('--fill', here ? clamp(W.buddyT / R.BUDDY.visit, 0, 1).toFixed(3) : '0');
      setText(bud.querySelector('.bl1'), 'bl1', here ? 'TAP FOR A TREAT' : 'CALL');
      if (!here && !touchMode && !bud.querySelector('.bl1 kbd')) {
        bud.querySelector('.bl1').innerHTML = 'CALL <kbd>T</kbd>';
        last.bl1 = 'CALL';
      }
    } else {
      const tb = $('teamBtn');
      tb.classList.toggle('ready', W.teamCd <= 0);
      tb.style.setProperty('--fill', (1 - W.teamCd / W.diff.teamCd).toFixed(3));
    }
    // the incense stick (bonus rounds)
    if (W.bonus) {
      const u = clamp(W.bonus.t / W.S.time, 0, 1);
      $('incense').querySelector('b').style.transform = `scaleX(${u})`;
      $('incense').querySelector('i').style.left = `calc(${(u * 100).toFixed(1)}% - 4px)`;
      setText($('incenseN'), 'incense', String(Math.ceil(W.bonus.t)));
    }
    // the general's bar
    const b = W.boss;
    const bb = $('bossbar');
    if (b && !b.gone && W.phase !== 'celebrate') {
      if (bb.classList.contains('hidden')) {
        bb.classList.remove('hidden');
        ensureBossFaces();
        bb.querySelector('img').src = bossFaces[b.type] || '';
        bb.querySelector('.nm').textContent = b.def.name;
        bossLag = 1;
      }
      const frac = clamp(b.hp / b.maxHp, 0, 1);
      bossLag = bossLag > frac ? Math.max(frac, bossLag - dt * 0.5) : frac;
      bb.querySelector('.fill').style.transform = `scaleX(${frac})`;
      bb.querySelector('.lag').style.transform = `scaleX(${bossLag})`;
    } else if (!bb.classList.contains('hidden') && (!b || W.phase === 'celebrate')) bb.classList.add('hidden');
    $('go').classList.toggle('hidden', !(W.go && W.phase === 'play'));
    // banners, toasts and tips time out in game time
    if (bannerUntil && clock > bannerUntil) { $('banner').classList.remove('show'); $('bsub').classList.remove('show'); bannerUntil = 0; }
    if (tipUntil && clock > tipUntil) { $('tip').classList.remove('show'); tipUntil = 0; }
    for (let i = toasts.length - 1; i >= 0; i--) if (clock > toasts[i].until) { toasts[i].el.remove(); toasts.splice(i, 1); }
  }

  let bannerUntil = 0;
  function banner(text, cls, dur = 1.4, sub = '') {
    if (demo) return;
    const b = $('banner');
    b.className = 'banner';
    void b.offsetWidth;
    b.textContent = text;
    b.classList.add('show');
    if (cls) b.classList.add(cls);
    const s = $('bsub');
    s.textContent = sub;
    s.classList.toggle('show', !!sub);
    bannerUntil = clock + dur;
  }
  const toasts = [];
  // A toast; icon is an emoji or a drawn icon (BAO, INGOT), shown in front of the text.
  function toast(text, cls, icon) {
    if (demo) return;
    const el = document.createElement('div');
    el.className = 'toast' + (cls ? ' ' + cls : '');
    const url = icon && M.iconURL(icon);
    if (url) {
      const img = document.createElement('img');
      img.className = 'ic';
      img.src = url;
      img.alt = '';
      el.appendChild(img);
    }
    if (icon && !url) {
      const em = document.createElement('span');
      em.textContent = icon + ' ';
      el.appendChild(em);
    }
    el.appendChild(document.createTextNode(text));
    $('toasts').appendChild(el);
    toasts.push({ el, until: clock + 2.2 });
    while (toasts.length > 3) toasts.shift().el.remove();
  }
  let tipUntil = 0;
  function showTip(name) {
    if (demo) return;
    let key = name;
    if (W.mode === '2p' && TIPS[name + '2']) key = name + '2';
    const t = TIPS[key];
    if (!t) return;
    const el = $('tip');
    el.textContent = touchMode ? t.touch : t.keys;
    el.classList.add('show');
    tipUntil = clock + 5;
  }
  function hurtFace(who) {
    const i = W.heroes.findIndex((h) => h.who === who);
    if (i < 0) return;
    const f = cards[i].querySelector('.face');
    f.classList.remove('hurt');
    void f.offsetWidth;
    f.classList.add('hurt');
  }

  // ---------------------------------------------------------------- events from the engine

  const sfx = (name, ...a) => { if (!demo && Sfx[name]) Sfx[name](...a); };
  const ui = (name) => { if (Sfx[name]) Sfx[name](); };
  let slowUntil = 0, coinSoundT = 0;
  const heroOf = (who) => W.heroes.find((x) => x.who === who) || (W.buddy && W.buddy.who === who ? W.buddy : null);

  function handleEvents() {
    for (const e of W.events) {
      switch (e.type) {
        case 'hit': {
          Fx.pow(e.x, e.y, e.z, e.word, e.big);
          if (e.by === 'tommy') Fx.feathers(e.x, e.y - 0.2, e.z, e.big ? 5 : 2);
          if (e.lv >= 3) Fx.stars(e.x, e.y, e.z, 3);
          if (e.word === 'CLANG!' || e.word === 'CLIP-CLOP!') sfx(e.word === 'CLANG!' ? 'clang' : 'clop');
          else sfx('flomp', e.big);
          if (e.big) shake = Math.max(shake, 0.35);
          break;
        }
        case 'ouch':
          Fx.pow(e.x, e.y, e.z, e.word || 'OOF!', e.big);
          sfx('ouch');
          if (e.horse) toast('🐎 THE HORSE RAN HOME!');
          hurtFace(e.who);
          shake = Math.max(shake, e.big ? 0.6 : 0.3);
          break;
        case 'knock': if (e.kind === 'hero') sfx('down'); break;
        case 'land': Fx.dust(e.x, e.z, e.big ? 6 : 3, e.big); if (e.big) sfx('land'); break;
        case 'ko': sfx('ko'); break;
        case 'flag': sfx('flag'); break;
        case 'runoff': Fx.floatUp(e.boss ? '🏳️' : '💦', e.x, 2.4, e.z, 0.6); sfx('runoff'); break;
        case 'poof': Fx.poof(e.x, 1.0 * (e.scale || 1), e.z, e.scale || 1); Fx.stars(e.x, 1.2, e.z, 6); sfx('poof'); break;
        case 'grab': sfx('grab'); break;
        case 'scoop': Fx.pow(e.x, e.y, e.z, 'GOTCHA!', true); sfx('grab'); sfx('neigh'); break;
        case 'toss': Fx.pow(e.x, e.y, e.z, e.word, true); sfx('toss'); break;
        case 'swing': sfx('whoosh', e.big); break;
        case 'jump': sfx('jump'); break;
        case 'dash': Fx.dust(e.x, e.z, 4); sfx('dash'); break;
        case 'special':
          sfx('specialUp');
          toast(e.name, 'save', e.kind === 'rescue' ? '💫' : R.HEROES[e.who].specialIcon);
          break;
        case 'dunk': {
          const h = heroOf(e.who);
          const from = h ? { x: h.x, y: h.y + 2.3, z: h.z } : { x: e.x, y: 3, z: e.z };
          Fx.arc('🏀', from, { x: e.x, y: 0.3, z: e.z }, 0.12, 0.7, 0.1, () => {
            Fx.arc('🏀', { x: e.x, y: 0.3, z: e.z }, { x: e.x + 2, y: 0.3, z: e.z + 0.3 }, 0.7, 0.6, 2.2);
          });
          Fx.ring(e.x, e.z, R.SPECIALS.dunk.radius, 14, 'dunk', R.SPECIALS.dunk.radius / R.SPECIALS.dunk.depth);
          Fx.pow(e.x, 1.4, e.z, 'BOING!', true);
          Fx.floatUp('🐉', e.x, 2.6, e.z, 1.4);
          Fx.dust(e.x, e.z, 10, true);
          sfx('dunk');
          shake = Math.max(shake, 0.8);
          break;
        }
        case 'gale':
          Fx.ring(e.x, e.z, 2.4, 9, 'wind', 1.6);
          for (let i = 0; i < 6; i++) Fx.floatUp(i % 2 ? '✌️' : '🪶', e.x + (Math.random() - 0.5) * 2, 2.4, e.z, 0.5);
          sfx('peace');
          sfx('gale');
          break;
        case 'thunder':
          e.hits.forEach((p, i) => Fx.bolt(p.x, p.z, i * 0.06));
          Fx.bolt(e.x + 0.4, e.z - 0.6, 0);
          Fx.pow(e.x, 3.2, e.z, 'ZAP!', true);
          sfx('thunder');
          shake = Math.max(shake, 1);
          break;
        case 'fireSwirl':
          Fx.ring(e.x, e.z, e.max, R.SPECIALS.fire.speed, 'fire', R.SPECIALS.fire.zScale);
          Fx.pow(e.x, 3.0, e.z, 'FWOOSH!', true);
          sfx('fwoosh');
          shake = Math.max(shake, 0.6);
          break;
        case 'volley': Fx.pow(e.x + 0.6, 2.4, e.z, 'THWIP!', false); sfx('darts'); break;
        case 'crescent': Fx.pow(e.x + 0.8, 2.6, e.z, 'SHING!', true); sfx('shing'); break;
        case 'rescueSpin': Fx.ring(e.x, e.z, e.max, R.SPECIALS.rescue.speed, 'rescue', 1.6); sfx('fwoosh'); break;
        case 'hello':
          Fx.ring(e.x, e.z, R.BUDDY.helloRadius, 9, 'hello', 1.6);
          Fx.pow(e.x, 2.6, e.z, 'HI!', false);
          sfx('peace');
          break;
        case 'stomp':
          Fx.ring(e.x, e.z, 3.4, 6.5, 'stomp', 1.6);
          Fx.dust(e.x, e.z, 12, true);
          Fx.pow(e.x, 0.8, e.z, 'THUD!', true);
          sfx('stomp');
          shake = Math.max(shake, 1);
          break;
        case 'windup': if (e.boss) sfx('windup'); break;
        case 'eswing': {
          const k = e.kind;
          if (k === 'hug' && Math.random() < 0.4) sfx('zombie');
          else if (k === 'punch') sfx('beep');
          else if (k === 'shoot' || k === 'throw') sfx('throwIt');
          else if (k === 'zap') { sfx('zap'); if (e.etype === 'wizard') Fx.bolt(e.x, e.z, 0); }
          else if (k === 'summon') sfx('gong');
          else if (k === 'charge' || k === 'swoop') sfx(e.etype === 'lubu' ? 'neigh' : 'dash');
          break;
        }
        case 'splat':
          if (e.hit) Fx.pow(e.x, e.y || 1.2, e.z, 'BONK!', false);
          else Fx.dust(e.x, e.z, 3);
          sfx('splat');
          break;
        case 'bonkWall':
          Fx.pow(e.x, e.y, e.z, 'BONK!', true);
          sfx('clang');
          shake = Math.max(shake, 0.5);
          break;
        case 'angry': Fx.floatUp('💢', e.x, e.y, e.z, 0.9); break;
        case 'crate':
          if (e.look === 'jar') { Fx.pow(e.x, 1.0, e.z, 'CRACK!', false); Fx.poof(e.x, 0.6, e.z, 0.6); sfx('jar'); }
          else { Fx.poof(e.x, 0.6, e.z, 0.8); Fx.stars(e.x, 1.0, e.z, 5); sfx('crate'); }
          break;
        case 'coin':
          if (clock > coinSoundT) { coinSoundT = clock + 0.06; sfx('coin'); }
          if (e.kind === 'ingot') Fx.floatUp('✨', e.x, (e.y || 1) + 0.6, e.z, 0.5);
          break;
        case 'eat': {
          const food = R.FOOD[e.kind];
          Fx.floatUp(food.icon, e.x, 1.6, e.z, 0.8);
          Fx.floatUp('💖', e.x + 0.4, 2.0, e.z, 0.5);
          toast(`${tr(food.name)}! +${e.heal} ❤️`, 'food', food.icon);
          sfx('eat');
          break;
        }
        case 'upgrade':
          Fx.pow(e.x, 2.2, e.z, 'LEVEL UP!', true);
          toast(`WEAPON UP! ${'★'.repeat(e.lv)}`, 'save', '⚔️');
          sfx('level');
          break;
        case 'orb': Fx.floatUp('🔮', e.x, 2.0, e.z, 0.7); toast('+1 MAGIC! 🔮', 'save'); sfx('pickup'); break;
        case 'orbFull': { const h = heroOf(e.who); if (h) Fx.floatUp('🔮', h.x, 2.6, h.z, 0.6); toast('+1 MAGIC! 🔮', 'save'); sfx('pickup'); break; }
        case 'mount': sfx('neigh'); toast('GIDDY-UP! 🐎', 'save'); break;
        case 'dismount': sfx('jump'); break;
        case 'park': break;
        case 'horseOff': addRunaway(e.x, e.z, -(e.face || 1), false); sfx('neigh'); break;
        case 'horseCall': toast('HERE COMES A HORSE!', 'save', '🐎'); sfx('neigh'); sfx('clop'); break;
        case 'buddy':
          toast(`${heroName(e.who)} IS HERE! 🐎`, 'save');
          sfx('buddy');
          sfx('neigh');
          popBud();
          break;
        case 'buddyHop': addRunaway(e.x, e.z, -1, true); break;
        case 'buddyMount': toast(`${heroName(e.who)} RIDES TOO!`, 'save', '🐎'); sfx('neigh'); break;
        case 'buddyAgain': popBud(); sfx('click'); break;
        case 'treat': {
          const h = W.heroes[0];
          Fx.arc(e.icon, { x: e.x, y: 1.6, z: e.z }, { x: h.x, y: 1.6, z: h.z }, 0.5, 0.75, 1.1, () => { if (W) Fx.floatUp('💖', h.x, 2.2, h.z, 0.5); });
          toast(`${tr(e.name)} FROM ${heroName(e.who)}!`, 'food', e.icon);
          sfx('treat');
          break;
        }
        case 'saved':
          Fx.pow(e.x, e.y + 0.4, e.z, 'SAVED!', true);
          if (clock > (savedToastT || 0)) { savedToastT = clock + 1.2; toast(`${heroName(e.buddy)} SAVED YOU! 🛡️`, 'save'); }
          sfx('saved');
          break;
        case 'bye': toast(`BYE! ${e.who === 'teddy' ? '🏀' : '✌️'}`); break;
        case 'teamup':
          banner('TEAM-UP!', null, 1.3);
          sfx('teamup');
          break;
        case 'blast':
          Fx.ring(W.cam.x, (W.zMin + W.zMax) / 2, W.halfW * 1.5, 16, 'blast', 1.6);
          Fx.ring(W.cam.x, (W.zMin + W.zMax) / 2, W.halfW * 1.2, 12, 'peace', 1.6);
          Fx.confetti(W.cam.x, 4, -0.5, 40);
          sfx('blast');
          shake = Math.max(shake, 1.2);
          break;
        case 'boss': {
          const def = R.BOSSES[e.etype];
          banner(def.name, 'boss', 2.4, def.title + '!');
          sfx('bossIn');
          break;
        }
        case 'bossKO':
          slowUntil = clock + 1.1;
          banner('YOU WIN!', 'clear', 1.2);
          sfx('ko');
          shake = Math.max(shake, 1);
          break;
        case 'clear': sfx('fanfare'); break;
        case 'perfect':
          Fx.pow(e.x, 2.6, e.z, 'PERFECT!', true);
          Fx.confetti(e.x, 4, e.z, 30);
          banner('PERFECT!', 'clear', 1.4, 'Every jar smashed! Bonus gold!');
          sfx('fanfare');
          break;
        case 'timeUp': if (!e.perfect) banner("TIME'S UP!", 'small', 1.4); break;
        case 'celebrate': banner(W.bonus ? 'BONUS CLEAR!' : 'STAGE CLEAR!', 'clear', 2.4); sfx('tune'); break;
        case 'highfive':
          Fx.pow(e.x, 2.6, e.z + 0.3, 'HIGH FIVE!', true);
          Fx.stars(e.x, 2.6, e.z, 10);
          Fx.confetti(e.x, 5, e.z - 0.5, 60);
          sfx('clap');
          sfx('cheer');
          break;
        case 'tip': showTip(e.tip); break;
        case 'go': sfx('go'); break;
        case 'respawn': Fx.stars(e.x, 2, e.z, 4); break;
        case 'join': toast(`${heroName(e.who)} IS BACK! 💪`, 'save'); sfx('buddy'); break;
        case 'out': toast(`${heroName(e.who)} IS OUT!`); sfx('out'); break;
        case 'phase':
          if (e.phase === 'play' && !W.started) {
            W.started = true;
            banner(W.bonus ? 'SMASH THE JARS!' : 'FIGHT!', null, 1.0);
            sfx('gong');
            if (W.si === 0 && !W.bonus) showTip(W.mode === '2p' ? 'move' : 'move');
          }
          if (e.phase === 'continue') showContinue();
          if (e.phase === 'done') stageDone();
          break;
      }
    }
    W.events.length = 0;
  }
  let savedToastT = 0;

  function popBud() {
    const b = $('budCard');
    b.classList.remove('pop');
    void b.offsetWidth;
    b.classList.add('pop');
  }

  // ---------------------------------------------------------------- game flow

  let W = null;
  let demo = false;
  let screen = 'loading';
  let mode = '1p';
  let acc = 0, clock = 0;
  let held = false;
  let touchMode = false;
  const botMem = [{ opts: {} }, { opts: {} }];
  let autoplay = false;

  function startWorld(opts) {
    clearWorldViews();
    const S = STAGES[opts.stage | 0];
    W = Sim.create(Object.assign({ halfW: S && S.bonus ? 7 : pickHalfW() }, opts));
    demo = W.mode === 'demo';
    camX = W.cam.x;
    zoom = 1;
    shake = 0;
    acc = 0;
    botMem[0] = { opts: { call: true, callEvery: 6 } };
    botMem[1] = { opts: { call: true, callEvery: 9 } };
    buildStage();
    if (!demo) setupHud();
    Input.setTwoPlayer(W.mode === '2p');
    Input.clear();
  }

  function startStage(i) {
    hideScreens();
    startWorld({ stage: i, mode, hero: save.hero, heroes: save.heroes, difficulty: save.diff });
    screen = 'play';
    hud.classList.remove('hidden');
    showTouch();
    Input.setEnabled(true);
    banner(W.S.bonus ? 'BONUS!' : `STAGE ${stageNumber(i)}`, 'small', 1.6, W.S.name);
    sfx('ready');
    Kit.sound.music('play');
  }

  // The storybook card before each stage.
  let storyStage = 0;
  function showStory(i) {
    hideScreens();
    hud.classList.add('hidden');
    $('touch').classList.add('hidden');
    screen = 'story';
    storyStage = i;
    const S = STAGES[i];
    $('storyArt').textContent = S.art.join('');
    $('storyChap').textContent = S.bonus ? 'BONUS ROUND' : `STAGE ${stageNumber(i)}`;
    $('storyCn').textContent = S.cn;
    $('storyEn').textContent = S.name;
    $('storyText').textContent = S.story;
    $('storyBoss').textContent = S.bonus ? `⏳ ${S.time} SECONDS` : `BOSS: ${R.BOSSES[S.boss].name}`;
    $('story').classList.remove('hidden');
    Input.setEnabled(false);
    ui('tune');
    Kit.sound.music('title');
  }

  function startDemo() {
    const order = [0, 1, 2, 4, 5, 7];
    const i = order[Math.floor(Math.random() * order.length)];
    const pool = R.HERO_ORDER;
    const a = pool[Math.floor(Math.random() * pool.length)];
    let b = pool[Math.floor(Math.random() * pool.length)];
    if (b === a) b = a === 'tommy' ? 'teddy' : 'tommy';
    startWorld({ stage: i, mode: 'demo', heroes: [a, b], difficulty: 'easy', seed: (Math.random() * 1e9) | 0, continues: Infinity });
  }

  function hideScreens() {
    for (const id of ['title', 'pick', 'stagesScr', 'story', 'pause', 'cont', 'results']) $(id).classList.add('hidden');
  }

  function showTitle() {
    hideScreens();
    hud.classList.add('hidden');
    $('touch').classList.add('hidden');
    $('banner').classList.remove('show');
    $('bsub').classList.remove('show');
    screen = 'title';
    $('title').classList.remove('hidden');
    $('stagesBtn').classList.toggle('hidden', !anyCleared());
    markLevel();
    Input.setEnabled(false);
    if (!W || !demo) startDemo();
    Kit.sound.music('title');
  }

  function markLevel() {
    document.querySelectorAll('.lvl').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.level === save.diff)));
  }

  // Who's playing? Six heroes; in 2 players, player 1 picks first, then player 2.
  let pickSel = 0, pickStep = 0;
  function buildPickGrid() {
    const grid = $('pickGrid');
    grid.innerHTML = '';
    R.HERO_ORDER.forEach((id, i) => {
      const d = R.HEROES[id];
      const b = document.createElement('button');
      b.className = 'pick';
      b.dataset.hero = id;
      b.style.borderColor = d.tag;
      b.innerHTML = `<img alt="" src="${faces[id]}" style="background:radial-gradient(circle at 50% 35%, #ffe2a0, ${d.color})"><span class="pt"><span class="nm" data-no-lang>${d.name}</span>` +
        `<span class="ttl2"><span class="zhdeco" data-no-lang>${CN_TITLES[id]}</span><span class="en">${d.title}</span></span>` +
        `<span class="sp"><span>${d.blurb}</span><br><span>${d.specialIcon} </span><span>${d.specialName}</span></span></span>`;
      b.addEventListener('click', () => { gesture(); pickSel = i; choosePick(); });
      grid.appendChild(b);
    });
  }
  const CN_TITLES = { teddy: '龙枪小英雄', tommy: '小军师', zoom: '吼声猛将', luna: '月亮公主', bolt: '木牛机器人', bruno: '美髯熊将军' };

  function showPick() {
    hideScreens();
    screen = 'pick';
    pickStep = 0;
    pickSel = Math.max(0, R.HERO_ORDER.indexOf(mode === '2p' ? save.heroes[0] : save.hero));
    $('pick').classList.remove('hidden');
    markPick();
  }
  function markPick() {
    const two = mode === '2p';
    $('pickTitle').textContent = !two ? 'PICK YOUR HERO!' : pickStep === 0 ? 'PLAYER 1, PICK A HERO!' : 'PLAYER 2, PICK A HERO!';
    document.querySelectorAll('.pick').forEach((b, i) => {
      b.classList.toggle('sel', i === pickSel);
      let tag = b.querySelector('.tagp');
      const isP1 = two && pickStep === 1 && b.dataset.hero === save.heroes[0];
      if (isP1 && !tag) { tag = document.createElement('span'); tag.className = 'tagp'; tag.textContent = '1P'; b.appendChild(tag); }
      if (!isP1 && tag) tag.remove();
    });
  }
  function choosePick() {
    const id = R.HERO_ORDER[pickSel];
    ui('click');
    if (mode !== '2p') { save.hero = id; store(); return afterPick(); }
    if (pickStep === 0) {
      save.heroes = [id, save.heroes[1] === id ? (id === 'tommy' ? 'teddy' : 'tommy') : save.heroes[1]];
      pickStep = 1;
      pickSel = R.HERO_ORDER.indexOf(save.heroes[1]);
      return markPick();
    }
    if (id === save.heroes[0]) return;
    save.heroes[1] = id;
    store();
    afterPick();
  }

  function choose(m) {
    mode = m;
    showPick();
  }

  function afterPick() {
    if (anyCleared()) showStages();
    else showStory(0);
  }

  let stageSel = 0;
  function showStages() {
    hideScreens();
    screen = 'stages';
    $('stagesScr').classList.remove('hidden');
    ensureBossFaces();
    const grid = $('stageGrid');
    grid.innerHTML = '';
    stageSel = 0;
    STAGES.forEach((s, i) => {
      const b = document.createElement('button');
      const done = !!save.cleared[i], open = unlocked(i);
      b.className = 'stg' + (done ? ' done' : '') + (!open ? ' locked' : '') + (open && !done ? ' next' : '') + (s.bonus ? ' bonus' : '');
      b.innerHTML = `<span class="n">${s.bonus ? '★' : stageNumber(i)}</span>${done ? '<span class="ok">✅</span>' : !open ? '<span class="ok">🔒</span>' : ''}` +
        `<span class="e">${s.emoji}</span><span class="cn zhdeco" data-no-lang>${s.cn}</span><b>${s.name}</b><small>${s.bonus ? 'smash the jars!' : 'boss: ' + R.BOSSES[s.boss].name}</small>`;
      b.addEventListener('click', () => { if (open) { gesture(); showStory(i); } });
      grid.appendChild(b);
      if (open) stageSel = i;
    });
    focusStage();
  }
  function focusStage() {
    document.querySelectorAll('.stg').forEach((b, i) => b.classList.toggle('focus', i === stageSel));
  }

  function showTouch() {
    $('touch').classList.toggle('hidden', !touchMode || screen !== 'play');
  }

  function pause(on) {
    if (on && screen === 'play') {
      screen = 'pause';
      $('pause').classList.remove('hidden');
      Input.setEnabled(false);
      Kit.sound.music('pause');
    } else if (!on && screen === 'pause') {
      screen = 'play';
      $('pause').classList.add('hidden');
      Input.clear();
      Input.setEnabled(true);
      Kit.sound.music('play');
    }
  }

  let contLeft = 0;
  function showContinue() {
    if (demo) return;
    screen = 'cont';
    Input.setEnabled(false);
    $('cont').classList.remove('hidden');
    const can = W.continues > 0;
    contLeft = W.difficulty === 'easy' ? Infinity : 9.99;
    $('contN').textContent = can ? (contLeft === Infinity ? '💪' : '9') : '😢';
    $('contSub').textContent = !can ? 'No continues left, but you can try the stage again!' : W.continues === Infinity ? 'Have another go! (as many as you like on easy)' : `${W.continues} continue${W.continues > 1 ? 's' : ''} left`;
    $('cont').querySelector('.big').textContent = can ? 'CONTINUE?' : 'GAME OVER';
    $('contYes').textContent = can ? 'YES! ▶' : '↻ TRY AGAIN';
    Kit.sound.music('over');
  }

  function doContinue() {
    $('cont').classList.add('hidden');
    if (W.continues > 0 && Sim.continueGame(W)) {
      screen = 'play';
      Input.setEnabled(true);
      Kit.sound.music('play');
      banner('BACK IN!', 'small', 1.0);
    } else startStage(W.si);
  }

  function stageDone() {
    if (demo) return startDemo();
    save.cleared[W.si] = true;
    store();
    screen = 'results';
    Input.setEnabled(false);
    $('touch').classList.add('hidden');
    hud.classList.add('hidden');
    const lastStage = W.si === STAGES.length - 1;
    const fs = $('resFaces');
    fs.innerHTML = '';
    const who = W.mode === '2p' ? W.heroes.map((h) => h.who) : [W.heroes[0].who, Sim.buddyFor(W.heroes[0].who)];
    for (const id of who) {
      const img = document.createElement('img');
      img.src = faces[id];
      img.style.background = `radial-gradient(circle at 50% 35%, #ffe2a0, ${R.HEROES[id].color})`;
      fs.appendChild(img);
    }
    $('resTitle').textContent = lastStage ? 'YOU WON!' : W.bonus ? 'BONUS CLEAR!' : 'STAGE CLEAR!';
    $('resSub').textContent = lastStage ? 'The three kingdoms are friends again. Everyone goes home for bao buns! 🥟'
      : W.bonus ? `🏺 ${W.stats.chests} jars smashed!` : `${W.S.emoji} ${W.S.name}: the end of the chapter!`;
    const st = W.stats;
    const score = W.heroes.reduce((a, h) => a + h.score, 0);
    const coins = W.heroes.reduce((a, h) => a + h.coins, 0);
    const mm = Math.floor(st.time / 60), ss = Math.floor(st.time % 60);
    const rows = [['⭐ score', score], ['🪙 coins', coins]];
    if (!W.bonus) rows.push(['💫 soldiers sent home', st.kos], ['⏱️ time', `${mm}:${String(ss).padStart(2, '0')}`]);
    if (!W.bonus && W.mode === '1p') rows.push([`🥟 treats from ${heroName(Sim.buddyFor(W.heroes[0].who))}`, st.treats], ['🛡️ saves', st.saves]);
    else if (!W.bonus) rows.push(['🤜🤛 team-ups', st.teamups]);
    $('resStats').innerHTML = rows.map(([a, b]) => `<span>${a}</span><b>${b}</b>`).join('');
    $('nextBtn').textContent = lastStage ? '📖 ALL STAGES' : 'NEXT STAGE ▶';
    $('resStagesBtn').classList.toggle('hidden', lastStage);
    $('results').classList.remove('hidden');
    Kit.sound.music('title');
  }

  function nextStage() {
    if (W.si >= STAGES.length - 1) showStages();
    else showStory(W.si + 1);
  }

  // ---------------------------------------------------------------- the loop

  function stepSim() {
    const inputs = W.heroes.map((h, i) => {
      if (demo || autoplay) return Brains.bot(W, h, botMem[i]);
      return Input.read(i);
    });
    Sim.step(W, inputs);
  }

  function tick(dt) {
    clock += dt;
    resize();
    if (!W) return;
    const running = demo || screen === 'play';
    if (running) {
      const scale = clock < slowUntil ? 0.35 : 1;
      acc += dt * scale;
      let n = 0;
      while (acc >= Sim.DT && n < 12) { stepSim(); acc -= Sim.DT; n++; }
      if (n >= 12) acc = 0;
    }
    if (screen === 'cont' && contLeft !== Infinity && W.continues > 0) {
      contLeft -= dt;
      $('contN').textContent = String(Math.max(0, Math.ceil(contLeft - 1)));
      if (contLeft <= 0) { W.continues = 0; showContinue(); }
    }
    handleEvents();
    syncWorld(dt);
    Fx.update(dt);
    if (stageView) stageView.update(dt, camX, clock);
    updateCamera(dt);
    if (!demo && screen !== 'title') updateHud(dt);
  }

  let lastT = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - (lastT || now)) / 1000));
    lastT = now;
    if (!held) tick(dt);
    renderer.render(scene, camera);
  }

  // ---------------------------------------------------------------- buttons and keys

  let soundOn = false;
  function gesture() {
    if (!soundOn) { soundOn = true; Kit.sound.init(); Kit.sound.music(screen === 'play' ? 'play' : 'title'); }
  }
  function setMuteIcons() {
    document.querySelectorAll('.muteBtn').forEach((b) => { b.textContent = Kit.sound.isMuted() ? '🔇' : '🔊'; });
  }
  function toggleMute() { gesture(); Kit.sound.toggleMute(); setMuteIcons(); }

  const click = (id, fn) => $(id).addEventListener('click', (e) => { e.stopPropagation(); gesture(); ui('click'); fn(); });
  click('play1', () => choose('1p'));
  click('play2', () => choose('2p'));
  click('stagesBtn', () => { mode = mode || '1p'; showStages(); });
  click('pickBack', showTitle);
  click('stagesBack', showTitle);
  click('storyGo', () => startStage(storyStage));
  click('pauseBtn', () => pause(true));
  click('resumeBtn', () => pause(false));
  click('quitBtn', showTitle);
  click('contYes', doContinue);
  click('contNo', showTitle);
  click('nextBtn', nextStage);
  click('againBtn', () => startStage(W.si));
  click('resStagesBtn', showStages);
  click('menuBtn', showTitle);
  $('story').addEventListener('click', (e) => { if (screen === 'story' && e.target.closest('.card')) { gesture(); startStage(storyStage); } });
  document.querySelectorAll('.muteBtn').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); toggleMute(); }));
  document.querySelectorAll('.lvl').forEach((b) => b.addEventListener('click', () => { gesture(); save.diff = b.dataset.level; store(); markLevel(); ui('click'); }));
  const budPress = (e) => { e.preventDefault(); e.stopPropagation(); gesture(); if (screen === 'play') Input.press(0, 'call'); };
  $('budCard').addEventListener('pointerdown', budPress);
  $('teamBtn').addEventListener('pointerdown', budPress);

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    gesture();
    const k = e.code;
    if (k === 'KeyM') return toggleMute();
    if (screen === 'play') {
      if (k === 'KeyP' || k === 'Escape') pause(true);
      return;
    }
    if (screen === 'pause') {
      if (k === 'KeyP' || k === 'Escape' || k === 'Space') pause(false);
      else if (k === 'KeyQ') showTitle();
      return;
    }
    if (e.repeat) return;
    const go = k === 'Enter' || k === 'NumpadEnter' || k === 'KeyF' || k === 'KeyJ' || k === 'Space';
    if (screen === 'title') {
      if (go || k === 'Digit1') choose('1p');
      else if (k === 'Digit2') choose('2p');
      else if (k === 'KeyS' && anyCleared()) { mode = '1p'; showStages(); }
      else if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'KeyA' || k === 'KeyD') { save.diff = save.diff === 'easy' ? 'normal' : 'easy'; store(); markLevel(); ui('click'); }
    } else if (screen === 'pick') {
      const n = R.HERO_ORDER.length;
      if (k === 'Escape') { if (pickStep === 1) { pickStep = 0; markPick(); } else showTitle(); }
      else if (k === 'ArrowLeft' || k === 'KeyA') { pickSel = (pickSel + n - 1) % n; markPick(); ui('click'); }
      else if (k === 'ArrowRight' || k === 'KeyD') { pickSel = (pickSel + 1) % n; markPick(); ui('click'); }
      else if (k === 'ArrowUp' || k === 'KeyW') { pickSel = (pickSel + n - 3) % n; markPick(); ui('click'); }
      else if (k === 'ArrowDown' || k === 'KeyS') { pickSel = (pickSel + 3) % n; markPick(); ui('click'); }
      else if (go) choosePick();
    } else if (screen === 'stages') {
      if (k === 'Escape') showTitle();
      else if (k === 'ArrowLeft' || k === 'KeyA') { stageSel = Math.max(0, stageSel - 1); focusStage(); }
      else if (k === 'ArrowRight' || k === 'KeyD') { stageSel = Math.min(STAGES.length - 1, stageSel + 1); focusStage(); }
      else if (k === 'ArrowUp' || k === 'KeyW') { stageSel = Math.max(0, stageSel - 4); focusStage(); }
      else if (k === 'ArrowDown' || k === 'KeyS') { stageSel = Math.min(STAGES.length - 1, stageSel + 4); focusStage(); }
      else if (go && unlocked(stageSel)) showStory(stageSel);
    } else if (screen === 'story') {
      if (go) startStage(storyStage);
      else if (k === 'Escape') { if (anyCleared()) showStages(); else showTitle(); }
    } else if (screen === 'cont') {
      if (go) doContinue();
      else if (k === 'Escape') showTitle();
    } else if (screen === 'results') {
      if (k === 'Enter' || k === 'NumpadEnter') nextStage();
      else if (k === 'KeyR') startStage(W.si);
      else if (k === 'Escape') showTitle();
    }
  });

  window.addEventListener('pointerdown', (e) => {
    gesture();
    if (e.pointerType === 'touch' && !touchMode) { touchMode = true; document.body.classList.add('touch'); showTouch(); }
  }, true);
  if (window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches) { touchMode = true; document.body.classList.add('touch'); }
  if (/[?&]touch=1/.test(location.search)) { touchMode = true; document.body.classList.add('touch'); }
  Input.bindTouch($('touch'));
  buildPickGrid();

  const api = { autoPause: true };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (api.autoPause) pause(true); Kit.sound.suspend(); } else Kit.sound.resume();
  });

  // ---------------------------------------------------------------- test hooks: window.game

  Object.assign(api, {
    // advance the game by `seconds` right now and draw (for the throttled Browser pane)
    step(seconds = 1 / 60) {
      const n = Math.max(1, Math.round(seconds / (1 / 60)));
      for (let i = 0; i < n; i++) tick(1 / 60);
      renderer.render(scene, camera);
      return api.state();
    },
    hold(v = true) { held = !!v; return held; },
    // jump straight into a stage: { stage, mode: '1p' | '2p', hero, heroes, difficulty, story (show the card) }
    start(o = {}) {
      mode = o.mode || '1p';
      if (o.hero) save.hero = o.hero;
      if (o.heroes) save.heroes = o.heroes;
      if (o.difficulty) save.diff = o.difficulty;
      if (o.story) showStory(o.stage || 0);
      else startStage(o.stage || 0);
      return api.state();
    },
    // screens, for tests and screenshots: title, pick, pick2, stages, story, pause, results
    show(name, i = 0) {
      if (name === 'title') showTitle();
      else if (name === 'pick' || name === 'pick2') { mode = name === 'pick2' ? '2p' : '1p'; showPick(); }
      else if (name === 'stages') showStages();
      else if (name === 'story') showStory(i);
      else if (name === 'pause') pause(true);
      else if (name === 'results') { if (W) { W.phase = 'done'; stageDone(); } }
      else if (name === 'continue') { if (W) { W.phase = 'continue'; showContinue(); } }
      return screen;
    },
    state() {
      if (!W) return { screen };
      return {
        screen, phase: W.phase, stage: W.si, mode: W.mode, t: +W.t.toFixed(2), camX: +W.cam.x.toFixed(2), sec: W.sec, secState: W.secState, go: W.go,
        heroes: W.heroes.map((h) => ({ who: h.who, hearts: h.hp, lives: h.lives, orbs: h.orbs, wlv: h.wlv, coins: h.coins, horse: h.horse, state: h.state, x: +h.x.toFixed(2), z: +h.z.toFixed(2), shield: h.shield })),
        enemies: W.enemies.map((e) => ({ type: e.type, hp: Math.round(e.hp), state: e.state, x: +e.x.toFixed(2), z: +e.z.toFixed(2) })),
        buddy: W.buddy ? { who: W.buddy.who, state: W.buddy.state, t: +W.buddyT.toFixed(1) } : null, boss: W.boss ? W.boss.type : null,
        bonus: W.bonus ? +W.bonus.t.toFixed(1) : null, teamCd: +W.teamCd.toFixed(1), fx: Fx.count(),
      };
    },
    // The autopilot soak, headless (no drawing): every stage, bonus round and general on Easy and Normal.
    // soak({ seeds, stage, setups }) returns { total, bad, needCont, rows }; prove() shows the check can fail.
    soak(o = {}) { const r = Check.soak(o); return { total: r.total, bad: r.bad, needCont: r.needCont, failed: r.rows.filter((x) => !x.ok).map((x) => `${x.stage} ${x.setup}: ${x.problems[0] || 'not cleared'}`) }; },
    moves() { const r = Check.moves(); return { total: r.length, failed: r.filter((x) => !x[1]).map((x) => x[0] + ' (' + x[2] + ')') }; },
    prove() { return Check.prove(); },
    // the demo behind the title screen, on a chosen stage (for screenshots)
    demo(stage = 0, heroes = ['teddy', 'tommy'], seed = 11) {
      startWorld({ stage, mode: 'demo', heroes, difficulty: 'easy', seed, continues: Infinity });
      return api.state();
    },
    // let the autopilot play (in a real stage, through the real renderer)
    autoplay(v = true) { autoplay = !!v; return autoplay; },
    press(slot, act) { Input.press(slot, act); },
    call() { Input.press(0, 'call'); },
    // jump to a section of the stage (the last one is the boss)
    warp(sec) {
      if (!W || W.bonus) return;
      const s = Math.min(sec, W.S.sections.length - 1);
      W.enemies = []; W.pending = []; W.shots = [];
      W.sec = s; W.secState = 'travel';
      W.cam.x = Sim.secX(W, W.S.sections[s]) - 0.01;
      camX = W.cam.x;
      for (const h of W.heroes) { if (h.out) continue; h.x = W.cam.x - 2 + h.slot * 1.2; h.state = 'idle'; h.y = 0; }
      if (W.phase === 'intro') { W.phase = 'play'; W.started = true; }
      return api.state();
    },
    world: () => W,
    calm(v = true) { document.body.classList.toggle('calm', !!v); },
    // hide banners and toasts (for clean screenshots)
    quiet() { bannerUntil = 1e-6; tipUntil = 1e-6; for (const t of toasts) t.until = 0; if (W) updateHud(0); },
    renderer,
  });
  window.game = api;
  window.TKGame = { gesture };

  // English / 中文: page text translates itself (js/zh.js); comic bursts are drawn on canvases, so they're
  // repainted when the language changes.
  if (Kit.lang) Kit.lang.onChange(() => { Fx.repaint(); });

  // ---------------------------------------------------------------- go

  resize();
  setMuteIcons();
  $('loading').classList.add('hidden');
  showTitle();
  requestAnimationFrame(frame);
})();
