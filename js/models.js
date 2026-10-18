/* Three Kingdoms TT: models. The heroes in costume (built on the kit's people), their foam weapons (wood, then
   silver, then gold as you upgrade them), the straw-hat army and the cartoon generals, the toy horse, the drawn
   pick-ups with no emoji (a steamed bao bun, a gold ingot), and the portrait camera for menus.
   Kit conventions: a person faces -z; arms hang along -y from the shoulder, so a weapon hangs along -y from the
   hand and follows every pose. Flat things (fan, blades) lie in the arm's y-z plane so the side camera sees them. */
(function () {
  'use strict';
  const T = THREE, Kit = window.Kit, G = Kit.gfx;
  const R = window.TK_RULES;
  const PI = Math.PI;

  const m = (c, o) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.65 }, o));
  const add = (parent, geo, mat, x, y, z) => { const me = new T.Mesh(geo, mat); me.position.set(x, y, z); parent.add(me); return me; };
  const boxIn = (parent, w, h, d, mat, x, y, z) => add(parent, new T.BoxGeometry(w, h, d), mat, x, y, z);

  // ---------------------------------------------------------------- weapons

  // The colour of the business end for weapon level 1 (soft blue foam), 2 (silver) and 3 (glowing gold).
  const LEVEL = [
    { color: '#9fd8ff', emissive: '#000000', k: 0 },
    { color: '#e8edf4', emissive: '#6a7a9a', k: 0.25, metalness: 0.5 },
    { color: '#ffd23a', emissive: '#ffb000', k: 0.55, metalness: 0.4 },
  ];
  function tipMat() { return m(LEVEL[0].color, { roughness: 0.5 }); }
  function setLevel(w, lv) {
    const L = LEVEL[Math.max(0, Math.min(2, lv - 1))];
    for (const t of w.userData.tips || []) {
      t.material.color.set(L.color);
      t.material.emissive.set(L.emissive);
      t.material.emissiveIntensity = L.k;
      t.material.metalness = L.metalness || 0;
    }
  }

  function fanTexture() {
    const [c, g] = G.makeCanvas(128, 128);
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#c8cbd8';
    g.lineWidth = 3;
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * PI;
      g.beginPath();
      g.moveTo(64, 0);
      g.lineTo(64 + Math.cos(a) * 128, Math.sin(a) * 128);
      g.stroke();
    }
    return G.toTexture(c);
  }
  let fanTex = null;

  function makeWeapon(kind) {
    const g = new T.Group();
    const tips = [];
    const tip = () => { const t = tipMat(); tips.push({ material: t }); return t; };
    const wood = m('#b07a4a'), red = m('#e53935'), dark = m('#2a2430');
    const shaft = (y0, y1, r, mat) => { const s = add(g, new T.CylinderGeometry(r, r, Math.abs(y1 - y0), 8), mat, 0, (y0 + y1) / 2, 0); return s; };
    if (kind === 'spear' || kind === 'serpent') {
      // a long foam-tipped spear: the shaft runs back past the hand, the tip far ahead
      shaft(0.55, -1.6, 0.035, kind === 'serpent' ? m('#3a2a2a') : wood);
      add(g, new T.SphereGeometry(0.05, 8, 6), dark, 0, 0.57, 0);
      add(g, new T.CylinderGeometry(0.09, 0.04, 0.12, 8), red, 0, -1.55, 0);
      if (kind === 'spear') {
        const c = add(g, new T.ConeGeometry(0.1, 0.36, 8), tip(), 0, -1.8, 0);
        c.rotation.x = PI;
      } else {
        // the serpent spear's wiggly tip
        [[-1.68, 0.05], [-1.82, -0.05], [-1.96, 0.04]].forEach(([y, z], i) => {
          const b = add(g, new T.BoxGeometry(0.06, 0.18, 0.09), tip(), 0, y, z);
          b.rotation.x = i % 2 ? 0.5 : -0.5;
        });
      }
    } else if (kind === 'guandao') {
      shaft(0.5, -1.4, 0.04, m('#2f8a4a'));
      add(g, new T.SphereGeometry(0.06, 8, 6), m('#ffd23a'), 0, 0.52, 0);
      // the green-dragon crescent blade, flat in the arm's y-z plane
      const sh = new T.Shape();
      sh.moveTo(0, 0);
      sh.quadraticCurveTo(0.5, -0.3, 0.12, -0.9);
      sh.quadraticCurveTo(0.22, -0.4, -0.06, -0.05);
      const blade = add(g, new T.ShapeGeometry(sh), tip(), 0, -1.35, 0);
      blade.material.side = T.DoubleSide;
      blade.rotation.y = -PI / 2;
      add(g, new T.BoxGeometry(0.1, 0.12, 0.12), red, 0, -1.36, 0);
    } else if (kind === 'fan') {
      // Tommy's feather fan
      shaft(0.05, -0.3, 0.03, m('#8a5a32'));
      fanTex = fanTex || fanTexture();
      const disc = add(g, new T.CircleGeometry(0.42, 18, 0, PI), m('#ffffff', { map: fanTex, side: T.DoubleSide }), 0, -0.3, 0);
      disc.rotation.set(0, PI / 2, PI);
      const rim = add(g, new T.TorusGeometry(0.42, 0.025, 4, 18, PI), tip(), 0, -0.3, 0);
      rim.rotation.set(0, PI / 2, PI);
    } else if (kind === 'twin') {
      add(g, new T.BoxGeometry(0.06, 0.18, 0.06), m('#5a2a6a'), 0, -0.05, 0);
      add(g, new T.BoxGeometry(0.08, 0.05, 0.26), m('#ffd23a'), 0, -0.16, 0);
      add(g, new T.BoxGeometry(0.035, 0.72, 0.13), tip(), 0, -0.55, 0);
      const pt = add(g, new T.ConeGeometry(0.065, 0.14, 4), tips[tips.length - 1].material, 0, -0.98, 0);
      pt.rotation.x = PI;
    } else if (kind === 'hammer') {
      shaft(0.12, -0.8, 0.045, wood);
      boxIn(g, 0.34, 0.34, 0.56, m('#ff8a1f', { roughness: 0.9 }), 0, -0.88, 0);
      for (const z of [-0.29, 0.29]) boxIn(g, 0.37, 0.37, 0.05, tip(), 0, -0.88, z);
    }
    g.userData.tips = tips.map((t) => t);
    g.userData.tips = tips.map((t) => ({ material: t.material }));
    return g;
  }

  // ---------------------------------------------------------------- costumes

  function skirt(p, col, len = 0.5) {
    const s = boxIn(p.hips, 0.72, len, 0.46, m(col), 0, -len / 2 + 0.06, 0);
    s.geometry.translate(0, 0, 0);
    p.skirt = s;
  }
  function cape(p, col) {
    const c = new T.Mesh(new T.PlaneGeometry(0.75, 1.15), m(col, { side: T.DoubleSide }));
    c.geometry.translate(0, -0.55, 0);
    c.position.set(0, 0.62, 0.21);
    c.rotation.x = 0.12;
    p.hips.add(c);
    p.cape = c;
  }
  function armor(p, plate, pad) {
    boxIn(p.hips, 0.66, 0.36, 0.05, m(plate, { metalness: 0.35, roughness: 0.45 }), 0, 0.45, -0.2);
    for (const arm of [p.armL, p.armR]) boxIn(arm, 0.27, 0.11, 0.3, m(pad, { metalness: 0.35, roughness: 0.45 }), 0, -0.02, 0);
  }
  function beard(p, col, long) {
    const b = m(col);
    if (long) {
      boxIn(p.head, 0.36, 0.2, 0.08, b, 0, -0.16, -0.25);
      const tail = boxIn(p.head, 0.26, 0.5, 0.08, b, 0, -0.5, -0.24);
      tail.rotation.x = -0.15;
    } else {
      boxIn(p.head, 0.44, 0.22, 0.08, b, 0, -0.17, -0.25);
      for (const x of [-0.14, 0, 0.14]) { const s = boxIn(p.head, 0.08, 0.16, 0.06, b, x, -0.32, -0.24); s.rotation.z = x * 2; }
      boxIn(p.head, 0.14, 0.04, 0.03, b, -0.11, 0.13, -0.24).rotation.z = -0.35;
      boxIn(p.head, 0.14, 0.04, 0.03, b, 0.11, 0.13, -0.24).rotation.z = 0.35;
    }
  }
  function headband(p, col, tails) {
    boxIn(p.head, 0.54, 0.08, 0.5, m(col), 0, 0.16, 0);
    if (tails) for (const x of [-0.06, 0.06]) { const t = boxIn(p.head, 0.06, 0.32, 0.03, m(col), x, 0.02, 0.27); t.rotation.z = x * 3; t.rotation.x = 0.4; }
  }
  function scholarHat(p, col) {
    boxIn(p.head, 0.5, 0.18, 0.47, m(col), 0, 0.33, 0.01);
    boxIn(p.head, 0.4, 0.14, 0.18, m(col), 0, 0.46, 0.08);
    boxIn(p.head, 0.08, 0.06, 0.03, m('#ffd23a'), 0, 0.33, -0.23);
  }

  function addExtras(p, extras, look, def) {
    for (const x of extras || []) {
      switch (x) {
        // the heroes
        case 'zhaoyun': headband(p, '#e53935', true); armor(p, '#cfd8e6', '#9fb4cc'); cape(p, '#2f6fdc'); break;
        case 'zhuge': scholarHat(p, '#2a3a5a'); skirt(p, '#f4efe0', 0.55); boxIn(p.hips, 0.66, 0.08, 0.4, m('#3a5a8a'), 0, 0.08, 0); break;
        case 'zhangfei': beard(p, '#1a1410', false); headband(p, '#1a1a22', false); armor(p, '#4a4a5a', '#2a2a34'); cape(p, '#c0302a'); break;
        case 'shangxiang': {
          boxIn(p.head, 0.18, 0.08, 0.1, m('#ffd23a', { metalness: 0.4 }), 0, 0.36, 0.12);
          add(p.head, new T.SphereGeometry(0.07, 8, 6), m('#ff3d7f'), 0.1, 0.4, 0.1);
          skirt(p, '#c03a5a', 0.5);
          boxIn(p.hips, 0.66, 0.08, 0.4, m('#ffd23a'), 0, 0.08, 0);
          break;
        }
        case 'woodenox': {
          for (const s of [-1, 1]) {
            const h = add(p.head, new T.ConeGeometry(0.07, 0.34, 6), m('#f2e6c8'), s * 0.3, 0.3, 0);
            h.rotation.z = -s * 0.7;
          }
          armor(p, '#8a5a2a', '#6a4020');
          break;
        }
        case 'guanyu': beard(p, '#1a1410', true); scholarHat(p, '#2f8a4a'); skirt(p, '#2f8a4a', 0.5); cape(p, '#1f5a3a'); break;
        // the army and the generals
        case 'straw': {
          const hat = add(p.head, new T.ConeGeometry(0.52, 0.3, 14), m('#e8c870', { roughness: 0.95 }), 0, 0.42, 0);
          hat.userData.hat = true;
          add(p.head, new T.CylinderGeometry(0.27, 0.27, 0.06, 14), m('#a8322a'), 0, 0.31, 0);
          break;
        }
        case 'turban': {
          boxIn(p.head, 0.56, 0.13, 0.52, m('#ffd21a'), 0, 0.2, 0);
          boxIn(p.head, 0.12, 0.12, 0.08, m('#ffd21a'), 0, 0.2, 0.29);
          const t = boxIn(p.head, 0.08, 0.3, 0.03, m('#ffd21a'), 0.04, 0.05, 0.3);
          t.rotation.z = 0.3;
          break;
        }
        case 'helmet': {
          boxIn(p.head, 0.6, 0.18, 0.54, m('#8a6a3a', { metalness: 0.3 }), 0, 0.3, 0);
          const plume = add(p.head, new T.ConeGeometry(0.08, 0.34, 6), m('#e53935'), 0, 0.55, 0);
          plume.rotation.x = 0.3;
          break;
        }
        case 'beard': beard(p, '#1a1410', true); break;
        case 'robe': skirt(p, '#d8a420', 0.55); break;
        case 'feathers': {
          // Lü Bu's famous pheasant feathers, curving up and back from a gold crown
          boxIn(p.head, 0.56, 0.12, 0.5, m('#ffd23a', { metalness: 0.5, roughness: 0.3 }), 0, 0.3, 0);
          for (const s of [-1, 1]) {
            const f = new T.Group();
            f.position.set(s * 0.14, 0.36, -0.05);
            p.head.add(f);
            let parent = f;
            for (let i = 0; i < 5; i++) {
              const seg = new T.Group();
              seg.position.y = i ? 0.32 : 0;
              seg.rotation.x = i ? 0.2 : 0.15;
              seg.rotation.z = s * (i ? -0.06 : -0.12);
              parent.add(seg);
              boxIn(seg, 0.05, 0.34, 0.07, m(i % 2 ? '#3a2a1a' : '#d8862a'), 0, 0.17, 0);
              parent = seg;
            }
          }
          break;
        }
        case 'minister': boxIn(p.head, 0.5, 0.34, 0.46, m('#1a1a22'), 0, 0.4, 0.02); boxIn(p.head, 0.16, 0.1, 0.03, m('#2fb36a'), 0, 0.4, -0.22); break;
        case 'scholar': scholarHat(p, '#1a2a2a'); skirt(p, '#1f4a3a', 0.55); break;
        case 'cape': cape(p, (def && def.cape) || '#c0303a'); break;
      }
    }
  }

  // The look a hero wears: the kit roster's look (faces, hair, skin) with the costume's colours on top.
  function heroLook(who) {
    const entry = Kit.roster.get(who);
    const look = Object.assign({}, entry.look, R.HEROES[who].look);
    for (const k of Object.keys(look)) if (look[k] === null) delete look[k];
    return look;
  }

  // A hero in costume with a weapon in hand (Luna has one in each hand).
  function buildHero(who, o = {}) {
    const def = R.HEROES[who];
    const look = heroLook(who);
    const p = Kit.people.build(look);
    addExtras(p, [def.costume], look, def);
    p.weapons = [];
    if (o.weapon !== false) {
      const arms = def.weapon === 'twin' ? [p.armR, p.armL] : [p.armR];
      for (const arm of arms) {
        const w = makeWeapon(def.weapon);
        w.position.set(0, -0.66, 0);
        arm.add(w);
        p.weapons.push(w);
      }
    }
    p.level = 0;
    p.setLevel = (lv) => { if (p.level !== lv) { p.level = lv; p.weapons.forEach((w) => setLevel(w, lv)); } };
    p.setLevel(1);
    return p;
  }

  function enemyLook(f) {
    const def = f.def;
    return def.looks ? def.looks[f.look % def.looks.length] : def.look;
  }

  function buildEnemy(f) {
    const look = enemyLook(f);
    const p = Kit.people.build(look);
    addExtras(p, f.def.extras, look, f.def);
    // the army carries foam sticks; the clockwork soldiers have mallet fists
    if (f.def.attack === 'poke' || (f.boss && look.head !== 'robot')) {
      const stick = new T.Group();
      add(stick, new T.CylinderGeometry(0.04, 0.04, 1.1, 6), m('#a87a4a'), 0, -0.35, 0);
      add(stick, new T.SphereGeometry(0.1, 8, 6), m(f.boss ? '#ffd23a' : '#9fd8ff'), 0, -0.95, 0);
      stick.position.set(0, -0.66, 0);
      p.armR.add(stick);
    }
    p.root.scale.setScalar(f.scale || 1);
    return p;
  }

  // ---------------------------------------------------------------- the toy horse

  // Faces -z like the people. legs[] swing for the gallop; the saddle top is about 1.3 m up.
  function makeHorse(col = '#c8864a', mane = '#3a2414') {
    const g = new T.Group();
    const body = m(col), dark = m(mane), hoof = m('#2a2420');
    boxIn(g, 0.56, 0.56, 1.4, body, 0, 1.02, 0);
    const neck = boxIn(g, 0.3, 0.72, 0.36, body, 0, 1.42, -0.62);
    neck.rotation.x = -0.45;
    const head = new T.Group();
    head.position.set(0, 1.78, -0.88);
    g.add(head);
    boxIn(head, 0.3, 0.3, 0.6, body, 0, 0, -0.12);
    boxIn(head, 0.26, 0.2, 0.22, m('#f2e2c8'), 0, -0.04, -0.4);
    for (const s of [-1, 1]) {
      boxIn(head, 0.06, 0.16, 0.06, body, s * 0.1, 0.22, 0.08);
      boxIn(head, 0.05, 0.06, 0.03, m('#14121f'), s * 0.155, 0.06, -0.18);
    }
    const mn = boxIn(g, 0.1, 0.7, 0.3, dark, 0, 1.6, -0.5);
    mn.rotation.x = -0.45;
    const tail = boxIn(g, 0.12, 0.6, 0.12, dark, 0, 1.0, 0.75);
    tail.rotation.x = 0.5;
    // saddle and blanket
    boxIn(g, 0.62, 0.1, 0.6, m('#c0302a'), 0, 1.33, 0.05);
    boxIn(g, 0.6, 0.12, 0.42, m('#ffd23a'), 0, 1.4, 0.05);
    const legs = [];
    for (const [x, z] of [[-0.17, -0.5], [0.17, -0.5], [-0.17, 0.5], [0.17, 0.5]]) {
      const leg = new T.Group();
      leg.position.set(x, 0.8, z);
      g.add(leg);
      boxIn(leg, 0.14, 0.72, 0.16, body, 0, -0.36, 0);
      boxIn(leg, 0.16, 0.1, 0.18, hoof, 0, -0.75, 0);
      legs.push(leg);
    }
    g.userData.legs = legs;
    g.userData.tail = tail;
    g.userData.head = head;
    return g;
  }
  // gallop (speed > 0) or stand; phase in radians
  function animHorse(h, phase, speed) {
    const legs = h.userData.legs;
    const amp = Math.min(0.9, speed * 0.2);
    const off = [0, 0.6, 3.1, 3.7];
    legs.forEach((l, i) => { l.rotation.x = Math.sin(phase + off[i]) * amp; });
    h.userData.tail.rotation.x = 0.5 + Math.sin(phase * 0.5) * 0.15 + amp * 0.4;
    h.userData.head.rotation.x = Math.sin(phase) * 0.06 * (amp > 0.1 ? 1 : 0.3);
  }

  // ---------------------------------------------------------------- the scroll dragon

  // A long red-and-gold Chinese dragon made of segments, flying toward +x (left to right across the screen).
  function makeDragon() {
    const g = new T.Group();
    const red = m('#d8302a', { emissive: '#5a0a0a', emissiveIntensity: 0.35 });
    const gold = m('#ffd23a', { metalness: 0.4, roughness: 0.4, emissive: '#7a5a00', emissiveIntensity: 0.35 });
    const white = m('#fff8e8', { emissive: '#ffffff', emissiveIntensity: 0.3 }), dark = m('#14121f');
    const head = new T.Group();
    g.add(head);
    boxIn(head, 0.95, 0.62, 0.72, red, 0.25, 0.05, 0);          // skull
    boxIn(head, 0.75, 0.32, 0.62, red, 0.85, 0.12, 0);          // snout
    boxIn(head, 0.7, 0.16, 0.56, gold, 0.8, -0.22, 0);          // open jaw
    boxIn(head, 0.12, 0.1, 0.5, white, 1.12, -0.06, 0);         // teeth
    for (const s of [-1, 1]) {
      boxIn(head, 0.16, 0.16, 0.06, white, 0.45, 0.22, s * 0.37); // eyes
      boxIn(head, 0.08, 0.1, 0.07, dark, 0.49, 0.21, s * 0.4);
      const horn = add(head, new T.ConeGeometry(0.08, 0.6, 6), gold, -0.05, 0.5, s * 0.2);
      horn.rotation.z = 0.9;
      const wh = boxIn(head, 0.9, 0.04, 0.04, gold, 0.65, 0.0, s * 0.42); // whiskers
      wh.rotation.y = s * 0.3;
      wh.rotation.z = -0.2;
      wh.userData.whisker = s;
    }
    boxIn(head, 0.5, 0.18, 0.5, gold, -0.2, 0.42, 0);           // mane
    const segs = [];
    for (let i = 0; i < 16; i++) {
      const sg = new T.Group();
      const k = 1 - i / 22;
      boxIn(sg, 0.62, 0.52 * k, 0.52 * k, red, 0, 0, 0);
      boxIn(sg, 0.5, 0.12, 0.42 * k, gold, 0, -0.27 * k, 0);    // belly
      const fin = add(sg, new T.ConeGeometry(0.1 * k + 0.03, 0.3, 4), gold, 0, 0.32 * k + 0.08, 0);
      fin.rotation.z = 0.5;
      if (i === 4 || i === 11) for (const s of [-1, 1]) boxIn(sg, 0.12, 0.42, 0.12, gold, 0, -0.35, s * 0.25); // little legs
      g.add(sg);
      segs.push(sg);
    }
    const tail = new T.Group();
    add(tail, new T.ConeGeometry(0.3, 0.7, 4), gold, -0.3, 0, 0).rotation.z = Math.PI / 2;
    g.add(tail);
    segs.push(tail);
    g.userData = { head, segs };
    g.scale.setScalar(1.35);
    return g;
  }
  // Fly: the head at x, the body snaking behind it.
  function animDragon(d, x, y, z, t) {
    const { head, segs } = d.userData;
    const sc = d.scale.x;
    const wave = (i) => Math.sin(t * 6 - i * 0.55);
    head.position.set(0, wave(0) * 0.45, Math.cos(t * 3) * 0.3);
    head.rotation.z = Math.cos(t * 6) * 0.15;
    segs.forEach((s, i) => {
      s.position.set(-0.6 * (i + 1) - 0.1, wave(i + 1) * 0.5, Math.cos(t * 3 - (i + 1) * 0.35) * 0.45);
      s.rotation.z = Math.cos(t * 6 - (i + 1) * 0.55) * 0.35;
    });
    d.position.set(x, y, z);
    void sc;
  }

  // ---------------------------------------------------------------- drawn icons

  const iconCache = {};
  function drawIcon(key) {
    const [c, g] = G.makeCanvas(128, 128);
    if (key === 'BAO') {
      // a fluffy white steamed bun with pleats on top
      g.fillStyle = 'rgba(0,0,0,0.12)';
      g.beginPath(); g.ellipse(64, 104, 46, 12, 0, 0, PI * 2); g.fill();
      const gr = g.createRadialGradient(54, 50, 10, 64, 70, 60);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#efe4d0');
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(64, 74, 50, 36, 0, PI, 0); g.lineTo(114, 92); g.quadraticCurveTo(64, 112, 14, 92); g.closePath(); g.fill();
      g.strokeStyle = '#c8b898'; g.lineWidth = 4;
      g.beginPath(); g.ellipse(64, 74, 50, 36, 0, PI, 0); g.stroke();
      for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(64, 42); g.quadraticCurveTo(64 + i * 9, 52, 64 + i * 13, 66); g.stroke(); }
      g.fillStyle = '#e8d8b8'; g.beginPath(); g.arc(64, 42, 6, 0, PI * 2); g.fill();
      g.fillStyle = '#ff8aa0'; g.beginPath(); g.arc(64, 64, 5, 0, PI * 2); g.fill();
    } else if (key === 'INGOT') {
      // a gold ingot (元宝): a boat shape with a round hump
      const gold = g.createLinearGradient(0, 30, 0, 110);
      gold.addColorStop(0, '#fff2a0'); gold.addColorStop(0.5, '#ffc83a'); gold.addColorStop(1, '#c88a10');
      g.fillStyle = gold;
      g.strokeStyle = '#8a5a00'; g.lineWidth = 5;
      g.beginPath(); g.ellipse(64, 56, 22, 20, 0, 0, PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(8, 50); g.quadraticCurveTo(28, 64, 64, 64); g.quadraticCurveTo(100, 64, 120, 50); g.quadraticCurveTo(110, 104, 64, 106); g.quadraticCurveTo(18, 104, 8, 50); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(56, 48, 7, 5, -0.5, 0, PI * 2); g.fill();
    }
    return c;
  }
  function iconTexture(key) {
    if (key !== 'BAO' && key !== 'INGOT') return G.emojiTexture(key);
    return iconCache[key] || (iconCache[key] = G.toTexture(drawIcon(key)));
  }
  const urlCache = {};
  function iconURL(key) {
    if (key !== 'BAO' && key !== 'INGOT') return null;
    return urlCache[key] || (urlCache[key] = drawIcon(key).toDataURL('image/png'));
  }

  // ---------------------------------------------------------------- portraits

  // Faces for menus and the HUD: heroes in costume, the generals with their hats and feathers.
  function snapFaces(list) {
    const r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    r.setSize(152, 152, false);
    r.outputEncoding = T.sRGBEncoding;
    const sc = new T.Scene();
    sc.add(new T.HemisphereLight('#ffffff', '#8a6e58', 0.9));
    const key = new T.DirectionalLight('#fff4e0', 1.1);
    key.position.set(-1.5, 3, -3);
    sc.add(key);
    const cam = new T.PerspectiveCamera(30, 1, 0.1, 30);
    const out = {};
    try {
      for (const it of list) {
        const p = it.build();
        const s = p.root.scale.x;
        Kit.people.pose(p, 0, it.pose || 'idle', 1);
        p.hips.rotation.x = 0;
        sc.add(p.root);
        const up = it.tall ? 0.18 : 0;
        cam.position.set(0.8 * s, (1.95 + up) * s, -(2.7 + up * 2) * s);
        cam.lookAt(0, (1.66 + up) * s, 0);
        r.render(sc, cam);
        out[it.id] = r.domElement.toDataURL('image/png');
        sc.remove(p.root);
      }
    } finally {
      r.dispose();
      r.forceContextLoss();
    }
    return out;
  }

  window.TKModels = { buildHero, buildEnemy, enemyLook, makeWeapon, setLevel, makeHorse, animHorse, makeDragon, animDragon, iconTexture, iconURL, snapFaces, addExtras };
})();
