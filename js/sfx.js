/* Three Kingdoms TT: sounds, synthesised with the kit's Kit.sound.tone / hiss (so mute and volume are shared).
   Kit.sound already has punch (a bonk), swish, jump, land, coin, powerup, click. The foam-weapon thwacks, the
   gong, the horse, the jars and a little pentatonic tune for the storybook are here (adapted from brawler-tt's). */
(function () {
  'use strict';
  const S = () => window.Kit.sound;

  const sfx = {
    // a foam weapon landing: a soft whumpf of noise and a low thump
    flomp(big) {
      S().hiss({ filter: 'lowpass', f: big ? 1400 : 1900, to: 250, dur: big ? 0.22 : 0.14, vol: big ? 0.45 : 0.3, attack: 0.008 });
      S().tone({ f: big ? 150 : 190, to: 60, dur: big ? 0.18 : 0.1, vol: big ? 0.35 : 0.22 });
      if (big) S().tone({ type: 'triangle', f: 520, to: 180, dur: 0.16, vol: 0.12, at: 0.02 });
    },
    bonk() { S().punch(); },
    // a foam weapon on a clockwork soldier's tin hat
    clang() {
      S().tone({ type: 'triangle', f: 1320, to: 1250, dur: 0.18, vol: 0.08 });
      S().tone({ type: 'triangle', f: 1870, to: 1800, dur: 0.14, vol: 0.05 });
      S().tone({ f: 180, to: 80, dur: 0.08, vol: 0.18 });
    },
    // a big gong for the generals and the start of a fight
    gong() {
      [110, 165, 220, 277].forEach((f, i) => S().tone({ type: 'sine', f, to: f * 0.985, dur: 1.6, vol: [0.32, 0.12, 0.1, 0.05][i] }));
      S().hiss({ filter: 'bandpass', f: 500, q: 0.7, dur: 0.6, vol: 0.12 });
    },
    // a pentatonic pluck tune (the storybook card and the stage clear)
    tune() {
      [[587, 0], [659, 0.14], [784, 0.28], [880, 0.42], [784, 0.62], [988, 0.8]].forEach(([f, at]) => {
        S().tone({ type: 'triangle', f, to: f * 0.995, dur: 0.3, vol: 0.12, at });
        S().tone({ type: 'sine', f: f * 2, dur: 0.12, vol: 0.03, at });
      });
    },
    neigh() {
      S().tone({ type: 'sawtooth', f: 700, to: 1100, dur: 0.18, vol: 0.05, lp: 2200 });
      [1050, 900, 1000, 850, 920].forEach((f, i) => S().tone({ type: 'sawtooth', f, dur: 0.07, vol: 0.045, lp: 2200, at: 0.16 + i * 0.07 }));
      S().tone({ type: 'sawtooth', f: 800, to: 400, dur: 0.25, vol: 0.04, lp: 1800, at: 0.5 });
    },
    clop() { [0, 0.11].forEach((at) => S().tone({ type: 'triangle', f: 900, to: 500, dur: 0.05, vol: 0.12, at })); },
    jar() {
      S().hiss({ filter: 'highpass', f: 2500, dur: 0.25, vol: 0.2 });
      [1900, 2600, 2200, 3100].forEach((f, i) => S().tone({ type: 'triangle', f, dur: 0.06, vol: 0.05, at: i * 0.035 }));
      S().tone({ f: 260, to: 120, dur: 0.1, vol: 0.18 });
    },
    coin() { S().coin(1); },
    thunder() {
      S().hiss({ filter: 'lowpass', f: 3000, to: 120, dur: 0.9, vol: 0.45 });
      S().tone({ f: 70, to: 35, dur: 0.8, vol: 0.4 });
      S().tone({ type: 'sawtooth', f: 1600, to: 200, dur: 0.15, vol: 0.05, lp: 4000 });
    },
    fwoosh() {
      S().hiss({ filter: 'lowpass', f: 600, to: 2400, dur: 0.6, vol: 0.32, attack: 0.08 });
      S().tone({ f: 90, to: 50, dur: 0.5, vol: 0.25 });
    },
    gale() { S().hiss({ filter: 'bandpass', f: 500, to: 1800, q: 1.2, dur: 0.9, vol: 0.3, attack: 0.1 }); },
    darts() { [0, 0.07, 0.14, 0.21, 0.28].forEach((at) => S().hiss({ f: 3000, to: 1200, q: 2, dur: 0.08, vol: 0.1, at })); },
    shing() { S().tone({ type: 'triangle', f: 2200, to: 3200, dur: 0.3, vol: 0.06 }); S().hiss({ f: 4000, to: 1500, q: 1, dur: 0.5, vol: 0.18 }); },
    runoff() { [660, 620, 580, 540].forEach((f, i) => S().tone({ type: 'triangle', f, to: f * 1.05, dur: 0.1, vol: 0.05, at: i * 0.09 })); },
    level() { [523, 784, 1047, 1568].forEach((f, i) => S().tone({ type: 'square', f, dur: 0.1, vol: 0.06, lp: 3000, at: i * 0.06 })); },
    whoosh(big) { S().hiss({ f: big ? 900 : 1600, to: big ? 300 : 700, q: 1.4, dur: big ? 0.22 : 0.11, vol: big ? 0.16 : 0.08 }); },
    ouch() {
      S().tone({ type: 'triangle', f: 600, to: 300, dur: 0.14, vol: 0.14 });
      S().tone({ f: 140, to: 70, dur: 0.12, vol: 0.2 });
    },
    down() {
      S().tone({ f: 110, to: 45, dur: 0.25, vol: 0.35 });
      S().hiss({ filter: 'lowpass', f: 900, to: 200, dur: 0.25, vol: 0.2 });
    },
    boing() { S().tone({ type: 'sine', f: 180, to: 720, dur: 0.22, vol: 0.18 }); S().tone({ type: 'sine', f: 720, to: 360, dur: 0.18, vol: 0.1, at: 0.2 }); },
    // the dizzy KO: a wooden bonk and tweeting birds
    ko() {
      S().tone({ type: 'triangle', f: 520, to: 180, dur: 0.22, vol: 0.3 });
      [1568, 1319, 1568, 1319].forEach((f, i) => S().tone({ type: 'sine', f, dur: 0.09, vol: 0.06, at: 0.3 + i * 0.12 }));
    },
    poof() {
      S().hiss({ f: 2400, to: 600, q: 0.8, dur: 0.3, vol: 0.18, attack: 0.02 });
      S().tone({ type: 'sine', f: 880, to: 1760, dur: 0.12, vol: 0.05 });
    },
    // the white flag: a little "we give up" kazoo
    flag() { [392, 330].forEach((f, i) => S().tone({ type: 'sawtooth', f, dur: 0.16, vol: 0.035, lp: 1400, at: i * 0.16 })); },
    grab() { S().tone({ type: 'triangle', f: 330, to: 440, dur: 0.08, vol: 0.12 }); },
    toss() { S().hiss({ f: 1200, to: 400, q: 1.2, dur: 0.3, vol: 0.14 }); S().tone({ type: 'square', f: 300, to: 900, dur: 0.25, vol: 0.04, lp: 2000 }); },
    jump() { S().jump(); },
    land() { S().land(); },
    dash() { S().hiss({ filter: 'lowpass', f: 2600, to: 500, dur: 0.25, vol: 0.18 }); },
    // Teddy's dragon dunk and Tommy's peace Y
    dunk() {
      S().tone({ f: 120, to: 40, dur: 0.35, vol: 0.5 });
      S().hiss({ filter: 'lowpass', f: 3000, to: 200, dur: 0.4, vol: 0.35 });
      S().tone({ type: 'sine', f: 200, to: 800, dur: 0.25, vol: 0.14, at: 0.05 });
    },
    specialUp() { S().powerup(); },
    peace() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => S().tone({ type: 'triangle', f, dur: 0.18, vol: 0.09, at: i * 0.05 }));
      S().hiss({ f: 4000, to: 8000, dur: 0.5, vol: 0.05 });
    },
    // pick-ups
    eat() {
      S().tone({ type: 'square', f: 300, to: 200, dur: 0.06, vol: 0.06, lp: 1500 });
      S().tone({ type: 'square', f: 320, to: 210, dur: 0.06, vol: 0.06, lp: 1500, at: 0.1 });
      S().coin(2);
    },
    pickup() { S().coin(1); S().tone({ type: 'triangle', f: 660, to: 990, dur: 0.12, vol: 0.1, at: 0.05 }); },
    crate() { S().hiss({ filter: 'bandpass', f: 900, q: 1, dur: 0.18, vol: 0.25 }); S().tone({ f: 200, to: 90, dur: 0.12, vol: 0.2 }); },
    // the companion
    buddy() {
      [659, 784, 988].forEach((f, i) => S().tone({ type: 'triangle', f, dur: 0.14, vol: 0.12, at: i * 0.07 }));
      S().hiss({ f: 1200, to: 3000, dur: 0.25, vol: 0.06 });
    },
    treat() { [784, 988, 1175, 1568].forEach((f, i) => S().tone({ type: 'sine', f, dur: 0.12, vol: 0.1, at: i * 0.06 })); },
    saved() {
      S().tone({ type: 'triangle', f: 330, to: 260, dur: 0.08, vol: 0.2 });
      S().hiss({ filter: 'highpass', f: 3500, dur: 0.08, vol: 0.1 });
      [880, 1320].forEach((f, i) => S().tone({ type: 'sine', f, dur: 0.18, vol: 0.1, at: 0.08 + i * 0.09 }));
    },
    teamup() {
      [392, 523, 659, 784, 1047].forEach((f, i) => {
        S().tone({ type: 'square', f, dur: 0.15, vol: 0.06, lp: 2600, at: i * 0.07 });
        S().tone({ type: 'triangle', f: f / 2, dur: 0.15, vol: 0.1, at: i * 0.07 });
      });
    },
    blast() {
      S().crash();
      S().tone({ f: 90, to: 30, dur: 0.6, vol: 0.5 });
    },
    // the army
    windup() { S().tone({ type: 'sine', f: 1200, to: 1500, dur: 0.07, vol: 0.05 }); },
    zombie() { S().tone({ type: 'sawtooth', f: 140, to: 100, dur: 0.35, vol: 0.06, lp: 700 }); },
    beep() { S().tone({ type: 'square', f: 1200, dur: 0.05, vol: 0.04, lp: 3000 }); S().tone({ type: 'square', f: 800, dur: 0.05, vol: 0.04, lp: 3000, at: 0.07 }); },
    giggle() { [880, 1100, 940, 1180].forEach((f, i) => S().tone({ type: 'triangle', f, to: f * 0.8, dur: 0.06, vol: 0.05, at: i * 0.06 })); },
    stomp() { S().tone({ f: 80, to: 30, dur: 0.4, vol: 0.55 }); S().hiss({ filter: 'lowpass', f: 1200, to: 100, dur: 0.5, vol: 0.35 }); },
    zap() { S().tone({ type: 'sawtooth', f: 200, to: 1600, dur: 0.35, vol: 0.06, lp: 3000 }); },
    throwIt() { S().hiss({ f: 1400, to: 700, q: 1.5, dur: 0.15, vol: 0.1 }); },
    splat() { S().hiss({ filter: 'lowpass', f: 1600, to: 300, dur: 0.15, vol: 0.25 }); S().tone({ f: 260, to: 120, dur: 0.1, vol: 0.12 }); },
    whistle() { S().tone({ type: 'sine', f: 2600, to: 2400, dur: 0.45, vol: 0.12 }); S().hiss({ filter: 'bandpass', f: 2500, q: 6, dur: 0.45, vol: 0.12 }); },
    note() { [523, 659, 784].forEach((f, i) => S().tone({ type: 'square', f, dur: 0.08, vol: 0.04, lp: 2400, at: i * 0.07 })); },
    // the show
    go() { [988, 1319].forEach((f, i) => S().tone({ type: 'square', f, dur: 0.12, vol: 0.06, lp: 3000, at: i * 0.13 })); },
    bossIn() {
      sfx.gong();
      [196, 185, 175, 165].forEach((f, i) => S().tone({ type: 'sawtooth', f, dur: 0.3, vol: 0.06, lp: 900, at: 0.3 + i * 0.22 }));
    },
    ready() { [392, 523].forEach((f, i) => S().tone({ type: 'square', f, dur: 0.18, vol: 0.06, lp: 2200, at: i * 0.14 })); },
    fight() {
      S().bump();
      [523, 659, 784, 1047].forEach((f, i) => S().tone({ type: 'square', f, dur: 0.12, vol: 0.06, lp: 2600, at: i * 0.06 }));
    },
    fanfare() {
      [[523, 0], [659, 0.15], [784, 0.3], [1047, 0.45], [784, 0.65], [1047, 0.8]].forEach(([f, at]) => {
        S().tone({ type: 'square', f, dur: 0.22, vol: 0.06, lp: 2600, at });
        S().tone({ type: 'triangle', f: f / 2, dur: 0.25, vol: 0.1, at });
      });
    },
    clap() {
      S().hiss({ filter: 'bandpass', f: 1800, q: 0.8, dur: 0.09, vol: 0.5 });
      S().hiss({ filter: 'highpass', f: 3000, dur: 0.05, vol: 0.2, at: 0.01 });
      S().coin(3);
    },
    cheer() {
      S().hiss({ f: 1400, to: 1800, q: 0.6, dur: 1.4, vol: 0.12, attack: 0.15 });
      S().powerup();
    },
    out() { [392, 349, 330, 262].forEach((f, i) => S().tone({ type: 'triangle', f, dur: 0.22, vol: 0.12, at: i * 0.2 })); },
    click() { S().click(); },
  };

  window.TKSfx = sfx;
})();
