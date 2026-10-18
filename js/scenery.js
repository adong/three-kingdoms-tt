/* Three Kingdoms TT: the storybook places, built from boxes and canvas-painted textures (no image files).
   TKScenery.build(theme, length, rand) returns { group, sky, info, update(dt, camX, t) }.
   The road you walk on is z -2.7 (far) to 1.3 (near); scenery sits behind it (z < -3) and a little in front.
   Themes: peach (the peach garden), village (Yellow Turbans), gate (Tiger Gate), courtyard (the jar bonus),
   bridge (Changban), cliffs (the boats at Red Cliffs), lanterns (the lantern-night bonus), city (the empty city). */
(function () {
  'use strict';
  const T = THREE;
  const G = () => window.Kit.gfx;
  const PI = Math.PI;

  const mats = {};
  const mat = (color, o) => {
    const key = color + JSON.stringify(o || {});
    return mats[key] || (mats[key] = new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0 }, o)));
  };
  const glow = (color, k = 0.7) => mat(color, { emissive: color, emissiveIntensity: k });

  // a box sitting on y (its bottom), centred on x, z
  function box(parent, w, h, d, m, x, y, z, ry) {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), typeof m === 'string' ? mat(m) : m);
    mesh.position.set(x, y + h / 2, z);
    if (ry) mesh.rotation.y = ry;
    parent.add(mesh);
    return mesh;
  }
  function cyl(parent, r1, r2, h, m, x, y, z, seg = 12) {
    const mesh = new T.Mesh(new T.CylinderGeometry(r1, r2, h, seg), typeof m === 'string' ? mat(m) : m);
    mesh.position.set(x, y + h / 2, z);
    parent.add(mesh);
    return mesh;
  }
  function canvasTex(w, h, draw, rx, ry) {
    const [c, g] = G().makeCanvas(w, h);
    draw(g, w, h);
    const t = G().toTexture(c, !!rx);
    if (rx) t.repeat.set(rx, ry || 1);
    return t;
  }
  function plane(parent, w, h, m, x, y, z, rx) {
    const mesh = new T.Mesh(new T.PlaneGeometry(w, h), m);
    mesh.position.set(x, y, z);
    if (rx) mesh.rotation.x = rx;
    parent.add(mesh);
    return mesh;
  }
  // the ground: a long flat strip (a painted ground reads best unlit)
  function floor(parent, L, z0, z1, tex, color, y = 0) {
    const m = new T.MeshStandardMaterial({ color: color || '#ffffff', map: tex || null, roughness: 0.95 });
    const w = L + 60;
    if (tex) tex.repeat.set(w / 4, (z1 - z0) / 4);
    const mesh = plane(parent, w, z1 - z0, m, L / 2, y, (z0 + z1) / 2, -PI / 2);
    return mesh;
  }
  function skyTexture(stops) {
    return canvasTex(8, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      stops.forEach(([o, c]) => gr.addColorStop(o, c));
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    });
  }
  const CJK = '"PingFang SC", "Hiragino Sans GB", "Songti SC", "STKaiti", "Microsoft YaHei", "Noto Sans CJK SC", serif';
  // A board with Chinese characters on it (decoration in both languages, like a real old sign).
  function plaque(parent, text, w, h, bg, fg, x, y, z, vertical) {
    const tex = canvasTex(vertical ? 128 : 512, vertical ? 512 : 128, (g, cw, ch) => {
      g.fillStyle = bg;
      g.fillRect(0, 0, cw, ch);
      g.lineWidth = 10;
      g.strokeStyle = '#d8a43a';
      g.strokeRect(6, 6, cw - 12, ch - 12);
      g.fillStyle = fg;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const n = [...text].length;
      if (vertical) {
        g.font = `900 ${Math.min(96, (ch - 40) / n)}px ${CJK}`;
        [...text].forEach((c, i) => g.fillText(c, cw / 2, 30 + ((ch - 60) * (i + 0.5)) / n));
      } else {
        g.font = `900 ${Math.min(90, (cw - 60) / n)}px ${CJK}`;
        g.fillText(text, cw / 2, ch / 2 + 4);
      }
    });
    return plane(parent, w, h, new T.MeshStandardMaterial({ map: tex, roughness: 0.8 }), x, y, z);
  }
  function emojiSprite(parent, e, size, x, y, z) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: G().emojiTexture(e), transparent: true }));
    s.scale.set(size, size, 1);
    s.position.set(x, y, z);
    parent.add(s);
    return s;
  }
  function cloud(parent, x, y, z, s, col = '#ffffff') {
    const g = new T.Group();
    const m = mat(col, { roughness: 1, emissive: col, emissiveIntensity: 0.35 });
    [[0, 0, 1.6, 0.6], [1.1, -0.15, 1.2, 0.45], [-1.1, -0.2, 1.1, 0.4]].forEach(([dx, dy, w, h]) => box(g, w * 1.6, h, 0.8, m, dx, dy, 0));
    g.position.set(x, y, z);
    g.scale.setScalar(s);
    parent.add(g);
    return g;
  }
  // misty layered mountains, like an old ink painting
  function mountains(parent, L, rnd, cols) {
    cols.forEach((c, layer) => {
      const m = mat(c, { roughness: 1, emissive: c, emissiveIntensity: 0.25 });
      for (let x = -40; x < L + 50; x += 14 + rnd() * 12) {
        const h = 9 + rnd() * 9 - layer * 2.5;
        const cone = new T.Mesh(new T.ConeGeometry(6 + rnd() * 5, h, 5), m);
        cone.position.set(x, h / 2 - 1, -40 + layer * 7 - rnd() * 3);
        cone.rotation.y = rnd() * PI;
        parent.add(cone);
      }
    });
  }
  // an upturned Chinese roof: a wide flat top with corners that curl up
  function roof(parent, w, d, x, y, z, col, trim) {
    const g = new T.Group();
    g.position.set(x, y, z);
    box(g, w, 0.18, d, col, 0, 0, 0);
    box(g, w * 0.8, 0.35, d * 0.7, col, 0, 0.18, 0);
    box(g, w * 0.5, 0.18, d * 0.5, col, 0, 0.53, 0);
    box(g, w * 0.55, 0.12, 0.14, trim || '#d8a43a', 0, 0.7, 0);
    for (const s of [-1, 1]) {
      const c = box(g, 0.7, 0.14, d + 0.1, col, s * (w / 2 + 0.15), 0.05, 0);
      c.rotation.z = s * 0.45;
    }
    parent.add(g);
    return g;
  }
  function pavilion(parent, x, z, s, colPost, colRoof) {
    const g = new T.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    box(g, 4.2, 0.35, 2.6, '#c8b8a0', 0, 0, 0);
    for (const px of [-1.7, 1.7]) for (const pz of [-1, 1]) cyl(g, 0.13, 0.13, 2.6, colPost, px, 0.35, pz, 8);
    box(g, 4.0, 0.25, 0.12, colPost, 0, 2.6, -1.0);
    box(g, 4.0, 0.25, 0.12, colPost, 0, 2.6, 1.0);
    roof(g, 5.0, 3.2, 0, 2.85, 0, colRoof);
    parent.add(g);
    return g;
  }
  function blossomTree(parent, x, z, h, petal, rnd) {
    const trunk = box(parent, 0.3, h * 0.5, 0.3, '#6a4a3a', x, 0, z);
    trunk.rotation.z = (rnd() - 0.5) * 0.2;
    const leaf = mat(petal, { roughness: 1, emissive: petal, emissiveIntensity: 0.15 });
    for (let i = 0; i < 5; i++) {
      const b = box(parent, h * (0.3 + rnd() * 0.2), h * 0.22, h * 0.3, leaf, x + (rnd() - 0.5) * h * 0.45, h * (0.45 + rnd() * 0.3), z + (rnd() - 0.5) * 0.6);
      b.rotation.y = rnd();
    }
  }
  function pine(parent, x, z, h) {
    box(parent, 0.3, h * 0.35, 0.3, '#5a3a2a', x, 0, z);
    for (let i = 0; i < 3; i++) {
      const c = new T.Mesh(new T.ConeGeometry(h * (0.38 - i * 0.08), h * 0.35, 6), mat('#2f7a4a'));
      c.position.set(x, h * (0.42 + i * 0.2), z);
      parent.add(c);
    }
  }
  function lantern(parent, x, y, z, s = 1) {
    const g = new T.Group();
    g.position.set(x, y, z);
    g.scale.setScalar(s);
    const body = new T.Mesh(new T.SphereGeometry(0.35, 12, 10), glow('#ff3a2a', 0.8));
    body.scale.y = 0.85;
    g.add(body);
    for (const yy of [-0.3, 0.3]) { const r = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 0.08, 10), mat('#d8a43a')); r.position.y = yy; g.add(r); }
    const tassel = new T.Mesh(new T.BoxGeometry(0.05, 0.35, 0.05), mat('#ffd400'));
    tassel.position.y = -0.5;
    g.add(tassel);
    parent.add(g);
    g.userData.bob = Math.random() * 6;
    return g;
  }
  function flag(parent, x, z, h, col, text, rnd) {
    box(parent, 0.1, h, 0.1, '#5a3a2a', x, 0, z);
    const tex = canvasTex(128, 192, (g) => {
      g.fillStyle = col;
      g.fillRect(0, 0, 128, 192);
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(64, 90, 46, 0, PI * 2);
      g.fill();
      g.fillStyle = '#14121f';
      g.font = `900 64px ${CJK}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(text, 64, 94);
      g.fillStyle = '#14121f';
      for (let i = 0; i < 6; i++) g.fillRect(i * 22, 178, 12, 14);
    });
    const f = plane(parent, 0.9, 1.35, new T.MeshStandardMaterial({ map: tex, side: T.DoubleSide, roughness: 0.9 }), x + 0.5, h - 0.75, z);
    f.userData.flap = rnd() * 6;
    return f;
  }
  function stoneTex(base, line, size = 32) {
    return canvasTex(128, 128, (c) => {
      c.fillStyle = base; c.fillRect(0, 0, 128, 128);
      c.strokeStyle = line; c.lineWidth = 3;
      for (let y = 0; y < 128; y += size) for (let x = (y / size) % 2 ? size / 2 : 0; x < 128 + size; x += size) c.strokeRect(x - size / 2 + 2, y + 2, size - 4, size - 4);
    }, 1);
  }
  function dirtTex(base, dots) {
    return canvasTex(128, 128, (c) => {
      c.fillStyle = base; c.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 90; i++) { c.fillStyle = dots[i % dots.length]; c.fillRect(Math.random() * 128, Math.random() * 128, 3 + Math.random() * 4, 2 + Math.random() * 3); }
    }, 1);
  }
  function plankTex(base, line) {
    return canvasTex(128, 128, (c) => {
      c.fillStyle = base; c.fillRect(0, 0, 128, 128);
      c.strokeStyle = line; c.lineWidth = 3;
      for (let x = 0; x <= 128; x += 21) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 128); c.stroke(); }
      c.fillStyle = line;
      for (let i = 0; i < 12; i++) c.fillRect(Math.floor(Math.random() * 6) * 21 + 8, Math.random() * 128, 4, 4);
    }, 1);
  }
  // a long wall with tiles on top and red posts: the far edge of a courtyard or a town
  function wall(parent, L, z, h, col, roofCol) {
    box(parent, L + 60, h, 0.5, col, L / 2, 0, z);
    box(parent, L + 60, 0.3, 0.9, roofCol, L / 2, h, z);
    for (let x = -20; x < L + 30; x += 3) box(parent, 0.25, h, 0.15, '#a8322a', x, 0, z + 0.3);
  }

  // ---------------------------------------------------------------- the places

  const THEMES = {};

  // The peach garden: blossoms, a pavilion, a little fence; a sunny spring day.
  THEMES.peach = (g, L, rnd) => {
    floor(g, L, -40, 12, dirtTex('#8fd46a', ['#7cc65a', '#a6e07a', '#ffc0d8']));
    const p = floor(g, L, -3.0, 1.7, dirtTex('#e8d2a0', ['#d8c08a', '#f2deb0', '#ffc8dc']));
    p.position.y = 0.01;
    mountains(g, L, rnd, ['#9ec8b8', '#b8dccb']);
    for (let x = -12; x < L + 12; x += 1.4) box(g, 0.12, 0.8, 0.1, '#a87a4a', x, 0, -3.45);
    box(g, L + 26, 0.1, 0.08, '#a87a4a', L / 2, 0.55, -3.42);
    for (let x = -8; x < L + 12; x += 3.5 + rnd() * 3) blossomTree(g, x, -4.8 - rnd() * 6, 3.2 + rnd() * 2, rnd() < 0.6 ? '#ffb0cc' : '#ff8ab0', rnd);
    pavilion(g, L * 0.3, -7.5, 1, '#c0392b', '#2f6a4a');
    pavilion(g, L * 0.78, -8, 1.1, '#c0392b', '#2f6a4a');
    // the three friends' table under the trees: three cups
    box(g, 1.6, 0.7, 0.9, '#8a5a32', L * 0.3, 0.35, -7.5);
    for (let i = -1; i <= 1; i++) cyl(g, 0.08, 0.06, 0.14, '#f2f2f2', L * 0.3 + i * 0.4, 1.05, -7.5, 8);
    for (let x = -6; x < L + 10; x += 2 + rnd() * 3) emojiSprite(g, rnd() < 0.5 ? '🌸' : '🌷', 0.45, x, 0.22, 2.2 + rnd() * 0.8);
    for (let i = 0; i < 8; i++) cloud(g, -10 + rnd() * (L + 20), 10 + rnd() * 4, -30 - rnd() * 8, 1 + rnd());
    const petals = [];
    for (let i = 0; i < 26; i++) petals.push(emojiSprite(g, '🌸', 0.22, rnd() * L, 1 + rnd() * 5, -2 - rnd() * 4));
    return {
      sky: [[0, '#7cc8ff'], [0.7, '#cfeaff'], [1, '#fff0f6']], hemi: ['#ffffff', '#7aa060', 1.0], sun: ['#fff1d6', 1.0], fog: '#e8f2ff',
      update(dt, camX, t) {
        petals.forEach((s, i) => {
          s.position.y -= dt * 0.5;
          s.position.x += Math.sin(t + i) * dt * 0.6;
          if (s.position.y < 0.2) { s.position.y = 5 + (i % 3); s.position.x = camX - 8 + ((i * 7.3) % 16); }
        });
      },
    };
  };

  // A village with thatched huts and yellow banners (the Yellow Turbans).
  THEMES.village = (g, L, rnd) => {
    floor(g, L, -40, 12, dirtTex('#c8b070', ['#b89e5c', '#d8c080', '#a08a50']));
    const p = floor(g, L, -3.0, 1.7, dirtTex('#d8b884', ['#c8a674', '#e6c894', '#b8966a']));
    p.position.y = 0.01;
    mountains(g, L, rnd, ['#b8b08a', '#cfc8a0']);
    for (let x = -6; x < L + 10; x += 7 + rnd() * 4) {
      const z = -5.5 - rnd() * 3;
      box(g, 3.2, 2.0, 2.4, '#d8c8a8', x, 0, z);
      box(g, 0.8, 1.3, 0.05, '#6a4a3a', x, 0, z + 1.21);
      const r = new T.Mesh(new T.ConeGeometry(2.6, 1.6, 4), mat('#c8a050'));
      r.position.set(x, 2.8, z);
      r.rotation.y = PI / 4;
      r.scale.set(1.25, 1, 1);
      g.add(r);
    }
    for (let x = 2; x < L + 10; x += 9 + rnd() * 5) flag(g, x, -3.6, 3.4, '#f2c21a', '黄', rnd);
    for (let x = -4; x < L + 10; x += 6 + rnd() * 6) {
      // haystacks and baskets
      const hs = new T.Mesh(new T.ConeGeometry(0.7, 1.1, 8), mat('#e0c060'));
      hs.position.set(x, 0.55, -3.9 - rnd() * 0.6);
      g.add(hs);
    }
    for (let i = 0; i < 6; i++) cloud(g, -10 + rnd() * (L + 20), 10 + rnd() * 3, -30 - rnd() * 8, 1 + rnd(), '#fff8e0');
    return { sky: [[0, '#f0c070'], [0.6, '#ffe0a0'], [1, '#fff4d8']], hemi: ['#fff4e0', '#8a7a4a', 1.0], sun: ['#ffe8c0', 1.05], fog: '#fff0d0' };
  };

  // The Tiger Gate: a huge fortress wall with a gate tower and a stone road.
  THEMES.gate = (g, L, rnd) => {
    floor(g, L, -40, 12, dirtTex('#a8a088', ['#989078', '#b8b098']));
    const p = floor(g, L, -3.0, 1.7, stoneTex('#b8b0a0', '#9a9284'));
    p.position.y = 0.01;
    mountains(g, L, rnd, ['#8a9aa8', '#a8b4c0']);
    const wallTex = stoneTex('#8a8478', '#6e6a60', 42);
    wallTex.repeat.set((L + 60) / 4, 2);
    const wm = new T.MeshStandardMaterial({ map: wallTex, roughness: 0.95 });
    box(g, L + 60, 6, 1.6, wm, L / 2, 0, -7);
    for (let x = -20; x < L + 30; x += 1.6) box(g, 0.8, 0.7, 1.6, '#7a7468', x, 6, -7);
    // the gate tower near the end
    const gx = L - 7;
    box(g, 6, 0.4, 2.6, '#6a5a4a', gx, 6, -7);
    for (const px of [-2.5, -0.8, 0.8, 2.5]) cyl(g, 0.16, 0.16, 2.2, '#b0302a', gx + px, 6.4, -6.2, 8);
    roof(g, 7.4, 3.4, gx, 8.6, -7, '#3a3a4a');
    box(g, 3.2, 4.2, 0.2, '#3a2a1a', gx, 0, -6.15);
    plaque(g, '虎牢关', 3.0, 0.9, '#2a2a5a', '#ffd400', gx, 5.2, -6.0);
    for (let x = 4; x < L; x += 12) plaque(g, '虎', 0.9, 0.9, '#b0302a', '#ffffff', x, 4.4, -6.15);
    for (let x = 2; x < L + 10; x += 8 + rnd() * 4) flag(g, x, -3.7, 3.6, rnd() < 0.5 ? '#c0302a' : '#2a4a9a', rnd() < 0.5 ? '汉' : '吕', rnd);
    for (let i = 0; i < 6; i++) cloud(g, -10 + rnd() * (L + 20), 12 + rnd() * 3, -30 - rnd() * 8, 1 + rnd());
    return { sky: [[0, '#6aa8e8'], [0.7, '#b8d8f4'], [1, '#e8f2fa']], hemi: ['#ffffff', '#8a8070', 1.0], sun: ['#fff1d6', 1.0], fog: '#dce8f4' };
  };

  // The jar bonus: a courtyard with red walls, a pavilion, plum trees and a big incense burner.
  THEMES.courtyard = (g, L, rnd) => {
    floor(g, L, -40, 12, stoneTex('#c8bca8', '#aaa08c', 40));
    wall(g, L, -4.2, 2.6, '#c0392b', '#3a4a5a');
    pavilion(g, L / 2, -9, 1.2, '#c0392b', '#2a3a5a');
    for (let x = -6; x < L + 10; x += 5) blossomTree(g, x, -5.6, 3.6, '#ff8ab0', rnd);
    cyl(g, 0.7, 0.5, 0.9, '#8a6a3a', L / 2 + 5, 0, -3.6, 8);
    for (let i = 0; i < 3; i++) box(g, 0.04, 0.9, 0.04, '#c0392b', L / 2 + 4.8 + i * 0.2, 0.9, -3.6);
    mountains(g, L, rnd, ['#9ec8b8']);
    return { sky: [[0, '#7cc8ff'], [0.7, '#cfeaff'], [1, '#fff6ea']], hemi: ['#ffffff', '#9a8a70', 1.0], sun: ['#fff1d6', 1.0], fog: '#eef4ff' };
  };

  // Changban: a wooden bridge over a wide river, hills behind.
  THEMES.bridge = (g, L, rnd) => {
    const water = canvasTex(128, 128, (c) => {
      c.fillStyle = '#4aa8d8'; c.fillRect(0, 0, 128, 128);
      c.strokeStyle = '#8ad4f4'; c.lineWidth = 3;
      for (let i = 0; i < 10; i++) { c.beginPath(); const y = Math.random() * 128, x = Math.random() * 128; c.moveTo(x, y); c.quadraticCurveTo(x + 10, y - 5, x + 20, y); c.stroke(); }
    }, 1);
    const w = floor(g, L, -40, 14, water, null, -0.9);
    const p = floor(g, L, -3.1, 1.8, plankTex('#b08050', '#80583a'));
    p.position.y = 0.01;
    box(g, L + 60, 0.5, 4.9, '#8a5a32', L / 2, -0.5, -0.65);
    for (const z of [-3.15, 1.85]) {
      box(g, L + 60, 0.12, 0.12, '#7a4a2a', L / 2, 0.75, z);
      for (let x = -20; x < L + 30; x += 1.5) box(g, 0.14, 0.85, 0.14, '#7a4a2a', x, 0, z);
    }
    for (let x = -10; x < L + 20; x += 9) { box(g, 0.6, 2.2, 0.6, '#6a4a3a', x, -2.4, -3.3); box(g, 0.6, 2.2, 0.6, '#6a4a3a', x, -2.4, 2.0); }
    // the far bank: grass, pines, and the mountains behind
    floor(g, L, -40, -9.5, dirtTex('#7cc65a', ['#6ab84a', '#8ed46a']), null, 0.02);
    box(g, L + 60, 0.95, 0.4, '#8a6a4a', L / 2, -0.9, -9.5);
    mountains(g, L, rnd, ['#6a9a7a', '#8ab89a', '#a8d0b4']);
    for (let x = -10; x < L + 20; x += 5 + rnd() * 6) pine(g, x, -11 - rnd() * 4, 3 + rnd() * 2);
    for (let i = 0; i < 7; i++) cloud(g, -10 + rnd() * (L + 20), 11 + rnd() * 4, -30 - rnd() * 8, 1 + rnd());
    return {
      sky: [[0, '#5ab0f0'], [0.7, '#bfe2ff'], [1, '#e8f6ff']], hemi: ['#ffffff', '#4a7a8a', 1.0], sun: ['#fff1d6', 1.0], fog: '#d8ecfa',
      update(dt, camX, t) { water.offset.x = t * 0.05; w.position.y = -0.9 + Math.sin(t * 1.5) * 0.03; },
    };
  };

  // The Red Cliffs: a deck of boats chained together, red cliffs, an orange evening sky and (cartoon) flames far away.
  THEMES.cliffs = (g, L, rnd) => {
    const water = canvasTex(128, 128, (c) => {
      c.fillStyle = '#3a6a9a'; c.fillRect(0, 0, 128, 128);
      c.strokeStyle = '#ffb070'; c.lineWidth = 2;
      for (let i = 0; i < 10; i++) { c.beginPath(); const y = Math.random() * 128, x = Math.random() * 128; c.moveTo(x, y); c.quadraticCurveTo(x + 10, y - 4, x + 20, y); c.stroke(); }
    }, 1);
    floor(g, L, -40, 14, water, null, -0.9);
    const p = floor(g, L, -3.1, 1.8, plankTex('#a8743e', '#784e2a'));
    p.position.y = 0.01;
    box(g, L + 60, 0.7, 4.9, '#7a4a2a', L / 2, -0.7, -0.65);
    // masts and sails, and the chains between boats
    for (let x = 4; x < L + 10; x += 12) {
      box(g, 0.22, 7, 0.22, '#6a4020', x, 0, -4.4);
      const sail = plane(g, 2.4, 2.8, mat('#f2e2c0', { side: T.DoubleSide }), x + 0.1, 5.2, -4.25);
      sail.userData.flap = x;
      box(g, 2.6, 0.12, 0.12, '#6a4020', x, 6.6, -4.3);
      box(g, 2.6, 0.12, 0.12, '#6a4020', x, 3.7, -4.3);
    }
    for (let x = 10; x < L; x += 12) for (let i = 0; i < 5; i++) box(g, 0.25, 0.08, 0.12, '#4a4a52', x - 0.5 + i * 0.25, 0.75, 1.9);
    // the red cliffs across the river
    for (let x = -30; x < L + 40; x += 6 + rnd() * 5) box(g, 6 + rnd() * 5, 6 + rnd() * 8, 4, rnd() < 0.5 ? '#c0482a' : '#a83a22', x, -1, -26 - rnd() * 4);
    const flames = [];
    for (let x = -10; x < L + 20; x += 8 + rnd() * 6) {
      const z = -18 - rnd() * 4;
      box(g, 4, 1.2, 1.5, '#5a3a22', x, -0.6, z);
      box(g, 0.15, 3, 0.15, '#5a3a22', x, 0.5, z);
      flames.push(emojiSprite(g, '🔥', 1.4, x + (rnd() - 0.5) * 2, 1.6, z + 0.8));
    }
    for (let x = -4; x < L + 10; x += 9) lantern(g, x, 3.1, -3.5, 0.8);
    return {
      sky: [[0, '#ff8a4a'], [0.55, '#ffc070'], [1, '#ffe6b0']], hemi: ['#fff0d8', '#a05a3a', 1.0], sun: ['#ffd0a0', 1.1], fog: '#ffd8a8',
      update(dt, camX, t) {
        water.offset.x = t * 0.08;
        flames.forEach((f, i) => { const s = 1.3 + Math.sin(t * 9 + i) * 0.12; f.scale.set(s, s, 1); });
      },
    };
  };

  // The lantern-night bonus: a courtyard under strings of glowing lanterns.
  THEMES.lanterns = (g, L, rnd) => {
    floor(g, L, -40, 12, stoneTex('#8a7a8a', '#6a5a6a', 40));
    wall(g, L, -4.2, 2.6, '#a8322a', '#2a2a3a');
    for (let x = -10; x < L + 20; x += 6) box(g, 0.2, 5.5, 0.2, '#5a2a2a', x, 0, -3.6);
    for (let x = -10; x < L + 20; x += 1.5) lantern(g, x, 4.8 - Math.abs(Math.sin(((x + 10) / 6) * PI)) * 0.7, -3.6, 0.7);
    pavilion(g, L / 2, -9, 1.2, '#c0392b', '#2a2a3a');
    for (let i = 0; i < 30; i++) emojiSprite(g, '✨', 0.25, rnd() * L, 6 + rnd() * 6, -20 - rnd() * 10);
    const moon = emojiSprite(g, '🌕', 3, L * 0.7, 11, -30);
    moon.material.depthWrite = false;
    return { sky: [[0, '#141a3a'], [0.6, '#2a2a5a'], [1, '#4a3a6a']], hemi: ['#d8d0ff', '#5a3a4a', 0.9], sun: ['#ffd8a8', 0.9], fog: '#2a2a4a' };
  };

  // The empty city: a city wall with the gates wide open and a music pavilion on top, lanterns at dusk.
  THEMES.city = (g, L, rnd) => {
    floor(g, L, -40, 12, dirtTex('#b0a898', ['#a09888', '#c0b8a8']));
    const p = floor(g, L, -3.0, 1.7, stoneTex('#c8bca8', '#a89c88'));
    p.position.y = 0.01;
    mountains(g, L, rnd, ['#7a6a8a', '#9a8aa8']);
    const wallTex = stoneTex('#9a8a7a', '#7a6a5a', 42);
    wallTex.repeat.set((L + 60) / 4, 2);
    box(g, L + 60, 5, 1.6, new T.MeshStandardMaterial({ map: wallTex, roughness: 0.95 }), L / 2, 0, -7);
    for (let x = -20; x < L + 30; x += 1.6) box(g, 0.8, 0.6, 1.6, '#8a7a6a', x, 5, -7);
    for (let x = 8; x < L + 10; x += 22) {
      // an open gate (dark doorway, doors swung open) and a pavilion on the wall with music notes
      box(g, 3, 3.6, 0.2, '#1a1410', x, 0, -6.15);
      box(g, 0.2, 3.4, 1.4, '#8a3a2a', x - 1.7, 0, -5.5);
      box(g, 0.2, 3.4, 1.4, '#8a3a2a', x + 1.7, 0, -5.5);
      for (const px of [-1.6, 1.6]) cyl(g, 0.14, 0.14, 2.0, '#b0302a', x + px, 5.6, -6.6, 8);
      roof(g, 4.8, 2.6, x, 7.6, -7, '#2a2a3a');
      plaque(g, '西城', 1.8, 0.7, '#2a2a5a', '#ffd400', x, 4.3, -6.1);
      emojiSprite(g, '🎶', 0.9, x, 6.6, -6.4);
    }
    for (let x = 3; x < L + 10; x += 7) lantern(g, x, 3.8, -3.6, 0.8);
    for (let x = 3; x < L + 10; x += 7) box(g, 0.08, 1.2, 0.08, '#3a2a2a', x, 4.1, -3.6);
    for (let x = -4; x < L + 10; x += 6 + rnd() * 4) {
      // sweepers' brooms leaning on the wall: everyone went home
      const b = box(g, 0.08, 1.6, 0.08, '#a87a4a', x, 0, -5.9);
      b.rotation.z = 0.3;
    }
    for (let i = 0; i < 5; i++) cloud(g, -10 + rnd() * (L + 20), 12 + rnd() * 3, -30 - rnd() * 8, 1 + rnd(), '#ffd8e8');
    return { sky: [[0, '#6a5aa8'], [0.55, '#e88aa0'], [1, '#ffd0a0']], hemi: ['#fff0f0', '#6a5a7a', 1.0], sun: ['#ffd8b0', 1.0], fog: '#e8c0c8' };
  };

  // ---------------------------------------------------------------- building a stage

  function build(theme, L, rand) {
    const rnd = rand || Math.random;
    const g = new T.Group();
    const info = (THEMES[theme] || THEMES.peach)(g, L, rnd);
    const sky = skyTexture(info.sky);
    const bobbers = [], flaps = [];
    g.traverse((o) => {
      if (o.userData && o.userData.bob != null) bobbers.push(o);
      if (o.userData && o.userData.flap != null) flaps.push(o);
    });
    return {
      group: g,
      sky,
      info,
      update(dt, camX, t) {
        for (const b of bobbers) b.rotation.z = Math.sin(t * 2 + b.userData.bob) * 0.08;
        for (const f of flaps) f.rotation.y = Math.sin(t * 2.4 + f.userData.flap) * 0.25;
        if (info.update) info.update(dt, camX, t);
      },
    };
  }

  // A treasure chest (red and gold) or a clay jar (the bonus rounds).
  function crate(look) {
    const g = new T.Group();
    if (look === 'jar') {
      const clay = mat('#b8683a');
      const body = new T.Mesh(new T.SphereGeometry(0.42, 14, 10), clay);
      body.scale.y = 1.15;
      body.position.y = 0.48;
      g.add(body);
      cyl(g, 0.2, 0.26, 0.2, clay, 0, 0.9, 0, 12);
      cyl(g, 0.24, 0.24, 0.06, '#8a4a2a', 0, 1.08, 0, 12);
      const band = new T.Mesh(new T.TorusGeometry(0.42, 0.035, 6, 20), mat('#2a2a3a'));
      band.rotation.x = PI / 2;
      band.position.y = 0.55;
      g.add(band);
      const tex = canvasTex(64, 64, (c) => {
        c.fillStyle = '#e8c86a'; c.fillRect(0, 0, 64, 64);
        c.fillStyle = '#c0302a'; c.font = `900 44px ${CJK}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('福', 32, 34);
      });
      const lab = plane(g, 0.36, 0.36, new T.MeshStandardMaterial({ map: tex }), 0, 0.55, 0.47);
      lab.rotation.y = 0;
    } else {
      const red = mat('#b0302a'), gold = mat('#ffc83a', { metalness: 0.5, roughness: 0.35, emissive: '#7a5a00', emissiveIntensity: 0.25 });
      box(g, 0.95, 0.55, 0.7, red, 0, 0, 0);
      const lid = new T.Mesh(new T.CylinderGeometry(0.35, 0.35, 0.95, 12, 1, false, 0, PI), red);
      lid.rotation.z = PI / 2;
      lid.position.y = 0.55;
      g.add(lid);
      box(g, 0.97, 0.08, 0.72, gold, 0, 0.5, 0);
      for (const x of [-0.38, 0.38]) box(g, 0.08, 0.92, 0.74, gold, x, 0, 0);
      box(g, 0.18, 0.2, 0.06, gold, 0, 0.38, 0.36);
    }
    return g;
  }

  window.TKScenery = { build, crate, THEMES, lantern, roof };
})();
