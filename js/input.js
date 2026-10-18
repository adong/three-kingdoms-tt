/* Three Kingdoms TT: controls (from brawler-tt). The keyboard for one or two players, and on-screen joysticks and
   buttons for touch. Presses are latched until the game reads them, so a tap shorter than one frame still counts.
     Player 1: W A S D walk, F attack, G jump, H magic
     Player 2: arrows walk, J attack, K jump, L magic
     T or Enter: call your brother (1 player) / team-up (2 players).  R / O: call a horse.
     Double-tap left or right to dash.
     Attack + jump together: the rescue spin.
   In 1-player mode both key sets drive you, and Space jumps too. */
(function () {
  'use strict';

  const KEYS = {
    KeyA: [0, 'left'], KeyD: [0, 'right'], KeyW: [0, 'up'], KeyS: [0, 'down'],
    KeyF: [0, 'attack'], KeyG: [0, 'jump'], KeyH: [0, 'special'], KeyT: [0, 'call'], KeyR: [0, 'horse'],
    ArrowLeft: [1, 'left'], ArrowRight: [1, 'right'], ArrowUp: [1, 'up'], ArrowDown: [1, 'down'],
    KeyJ: [1, 'attack'], KeyK: [1, 'jump'], KeyL: [1, 'special'], Enter: [1, 'call'], NumpadEnter: [1, 'call'], KeyO: [1, 'horse'],
    Space: [0, 'jump'],
  };
  const PRESS = { attack: 1, jump: 1, special: 1, call: 1, horse: 1, rescue: 1 };
  const DASH_GAP = 0.3; // seconds between two taps of the same direction

  let twoPlayer = false;
  let enabled = true;
  const held = [{}, {}];       // [side][key code] = action
  const latched = [{}, {}];    // [side][action] = true
  const pressing = [{}, {}];   // [side][action] = true while that key or button is held down

  // Swing + jump together (F + G, J + K, or ⚔️ + ⬆️) is the rescue spin. Nobody presses two keys inside the same
  // 1/60 s, so the second key of the pair counts while the first one is still held down.
  function hit(side, act) {
    const other = act === 'attack' ? 'jump' : act === 'jump' ? 'attack' : null;
    if (other && pressing[side][other]) {
      latched[side].rescue = true;
      latched[side][other] = false;
      return;
    }
    latched[side][act] = true;
  }
  const lastTap = [{}, {}];    // [side][left|right] = time
  const dash = [0, 0];
  const sticks = [{ x: 0, y: 0, on: false }, { x: 0, y: 0, on: false }];
  const now = () => performance.now() / 1000;

  function tap(side, dir) {
    const t = now();
    if (t - (lastTap[side][dir] || -9) < DASH_GAP) dash[side] = dir === 'left' ? -1 : 1;
    lastTap[side][dir] = t;
  }

  function onKey(e, down) {
    if (e.metaKey || e.ctrlKey || e.altKey) return false;
    const m = KEYS[e.code];
    if (!m) return false;
    let [side, act] = m;
    if (e.code === 'Space' && twoPlayer) return false;
    if (down) {
      if (PRESS[act]) {
        if (!e.repeat) hit(side, act);
        pressing[side][act] = true;
      } else {
        if (!held[side][e.code] && !e.repeat && (act === 'left' || act === 'right')) tap(side, act);
        held[side][e.code] = act;
      }
    } else {
      delete held[side][e.code];
      if (PRESS[act]) pressing[side][act] = false;
    }
    return true;
  }

  window.addEventListener('keydown', (e) => {
    if (onKey(e, true) && (e.code.startsWith('Arrow') || e.code === 'Space')) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => onKey(e, false));
  window.addEventListener('blur', clear);

  function clear() {
    for (const s of [0, 1]) {
      for (const k in held[s]) delete held[s][k];
      for (const k in latched[s]) delete latched[s][k];
      for (const k in pressing[s]) delete pressing[s][k];
      sticks[s].x = sticks[s].y = 0;
      sticks[s].on = false;
      dash[s] = 0;
    }
    for (const b of document.querySelectorAll('.tbtn.down')) b.classList.remove('down');
  }

  // The controller for one brother this step. Clears the presses it reports.
  function read(slot) {
    const out = { mx: 0, mz: 0, attack: false, jump: false, special: false, call: false, horse: false, rescue: false, dash: 0 };
    if (!enabled) return out;
    const srcs = twoPlayer ? [slot] : [0, 1];
    for (const s of srcs) {
      const acts = Object.values(held[s]);
      if (acts.includes('left')) out.mx -= 1;
      if (acts.includes('right')) out.mx += 1;
      if (acts.includes('up')) out.mz -= 1;
      if (acts.includes('down')) out.mz += 1;
      for (const a in PRESS) if (latched[s][a]) { out[a] = true; latched[s][a] = false; }
      if (dash[s]) { out.dash = dash[s]; dash[s] = 0; }
      const st = sticks[s];
      if (st.on) { out.mx += st.x; out.mz += st.y; }
    }
    out.mx = Math.max(-1, Math.min(1, out.mx));
    out.mz = Math.max(-1, Math.min(1, out.mz));
    // a diagonal on the keyboard shouldn't be faster than a straight line
    if (out.mx && out.mz && Math.abs(out.mx) === 1 && Math.abs(out.mz) === 1) { out.mx *= 0.85; out.mz *= 0.85; }
    return out;
  }

  // Menus peek at presses without the game reading them.
  function peek(act) {
    return latched[0][act] || latched[1][act];
  }

  // ---------------------------------------------------------------- touch

  // A joystick: slide your thumb around it. Flick it to one side twice quickly to dash.
  function bindStick(el, side) {
    const knob = el.querySelector('.knob');
    let id = null, flickOut = false;
    const st = sticks[side];
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2, rad = r.width * 0.38;
      let dx = (e.clientX - cx) / rad, dy = (e.clientY - cy) / rad;
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      const dead = 0.22;
      st.x = Math.abs(dx) < dead ? 0 : dx;
      st.y = Math.abs(dy) < dead ? 0 : dy;
      st.on = true;
      knob.style.transform = `translate(${dx * rad}px, ${dy * rad}px)`;
      // two quick flicks the same way = dash
      const out = Math.abs(dx) > 0.8;
      if (out && !flickOut) tap(side, dx < 0 ? 'left' : 'right');
      if (Math.abs(dx) < 0.45) flickOut = false; else if (out) flickOut = true;
    };
    const end = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      st.x = st.y = 0;
      st.on = false;
      flickOut = false;
      knob.style.transform = '';
      el.classList.remove('on');
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      id = e.pointerId;
      try { el.setPointerCapture(id); } catch (err) { /* synthetic pointer */ }
      el.classList.add('on');
      if (window.TKGame) window.TKGame.gesture();
      move(e);
    });
    el.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  function bindButton(el, side, act) {
    const down = (e) => {
      e.preventDefault();
      hit(side, act);
      pressing[side][act] = true;
      el.classList.add('down');
      if (window.TKGame) window.TKGame.gesture();
    };
    const up = () => { el.classList.remove('down'); pressing[side][act] = false; };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
  }

  function bindTouch(root) {
    root.querySelectorAll('[data-stick]').forEach((el) => bindStick(el, +el.dataset.stick));
    root.querySelectorAll('[data-act]').forEach((el) => bindButton(el, +(el.dataset.side || 0), el.dataset.act));
  }

  // Press an action from code (the HUD's buttons, tests).
  function press(side, act) { latched[side][act] = true; }

  window.TKInput = {
    read, peek, clear, press, bindTouch,
    setTwoPlayer(v) { twoPlayer = !!v; clear(); },
    setEnabled(v) { enabled = !!v; if (!v) clear(); },
    get twoPlayer() { return twoPlayer; },
  };
})();
