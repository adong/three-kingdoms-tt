/* Three Kingdoms TT: the tuning tables. Everything you might want to tweak lives here: the six heroes and their
   foam weapons, combos and magic, the straw-hat army and its cartoon generals, food, chests, horses, the companion
   and the two difficulty levels. Units are metres and seconds. x runs along the road (right is +x), z is depth (up
   the road is -z, toward the camera is +z), y is height. Stages and their waves are in js/stages.js.
   Health is counted in hearts: every bonk costs one heart. */
(function () {
  'use strict';

  // ---------------------------------------------------------------- the world

  const WORLD = {
    VIEW_HALF: 7,        // half the visible road width (the game narrows it on a portrait screen)
    Z_MIN: -2.7,         // the far edge of the road
    Z_MAX: 1.3,          // the near edge
    GRAVITY: 18,
    EDGE: 0.55,          // how close to the screen edge anyone may stand
  };

  // ---------------------------------------------------------------- moves

  // len: how long it lasts. at..until: when it can hit. reach: how far in front it hits. depth: how far up/down the
  // road. dmg: damage (enemies have 25-45). stun: how long a light hit freezes them. knock: knocks down.
  // next: from when a new press chains the next combo hit. word: the comic burst. anim: the pose (js/poses.js).
  const MOVES = {
    // Teddy, the dragon spear: his Tyson jab and straight are quick spear pokes, then a big spinning sweep
    jab:      { len: 0.24, at: 0.06, until: 0.14, reach: 1.6, depth: 0.55, dmg: 6, stun: 0.34, push: 0.4, next: 0.1, word: 'POKE!', anim: 'jab' },
    straight: { len: 0.27, at: 0.07, until: 0.15, reach: 1.7, depth: 0.55, dmg: 7, stun: 0.36, push: 0.5, next: 0.11, word: 'POW!', anim: 'straight' },
    sweep:    { len: 0.5, at: 0.14, until: 0.27, reach: 1.85, depth: 0.7, dmg: 12, knock: true, next: 0.4, word: 'WHOOSH!', big: true, anim: 'hook', lunge: 1.2 },
    // Tommy, the little strategist: fan, fan, and a gust of wind that blows them over
    fan1:     { len: 0.25, at: 0.07, until: 0.15, reach: 1.4, depth: 0.55, dmg: 6, stun: 0.34, push: 0.4, next: 0.1, word: 'SWISH!', anim: 'poke' },
    fan2:     { len: 0.27, at: 0.07, until: 0.15, reach: 1.45, depth: 0.55, dmg: 7, stun: 0.36, push: 0.5, next: 0.11, word: 'FWIP!', anim: 'poke2' },
    gust:     { len: 0.52, at: 0.16, until: 0.29, reach: 2.0, depth: 0.75, dmg: 12, knock: true, next: 0.42, word: 'WHOOSH!', big: true, anim: 'swing', lunge: 0.6 },
    // Zoom, the roaring one: serpent spear thrust, thrust, and a big overhead chop
    thrust:   { len: 0.26, at: 0.07, until: 0.15, reach: 1.7, depth: 0.55, dmg: 7, stun: 0.34, push: 0.45, next: 0.1, word: 'POKE!', anim: 'poke' },
    thrust2:  { len: 0.28, at: 0.08, until: 0.16, reach: 1.75, depth: 0.55, dmg: 7, stun: 0.36, push: 0.5, next: 0.11, word: 'POW!', anim: 'poke2' },
    chop:     { len: 0.54, at: 0.17, until: 0.3, reach: 1.8, depth: 0.7, dmg: 13, knock: true, next: 0.44, word: 'BONK!', big: true, anim: 'swing', lunge: 1.0 },
    // Luna, the moon princess: twin foam swords, quick quick, then a spin that hits both sides
    slash:    { len: 0.22, at: 0.05, until: 0.13, reach: 1.35, depth: 0.55, dmg: 6, stun: 0.32, push: 0.35, next: 0.09, word: 'SWISH!', anim: 'wjab' },
    slash2:   { len: 0.24, at: 0.06, until: 0.14, reach: 1.4, depth: 0.55, dmg: 6, stun: 0.34, push: 0.4, next: 0.1, word: 'SWISH!', anim: 'poke2' },
    spin:     { len: 0.48, at: 0.12, until: 0.3, reach: 1.6, depth: 0.75, dmg: 11, knock: true, next: 0.4, word: 'WHIRL!', big: true, anim: 'hook', both: true },
    // Bolt, the wooden-ox robot: a foam hammer, bonk, bonk, SLAM
    bonk:     { len: 0.28, at: 0.08, until: 0.16, reach: 1.45, depth: 0.6, dmg: 8, stun: 0.36, push: 0.45, next: 0.12, word: 'BONK!', anim: 'poke' },
    bonk2:    { len: 0.3, at: 0.09, until: 0.17, reach: 1.5, depth: 0.6, dmg: 8, stun: 0.38, push: 0.5, next: 0.13, word: 'CLANG!', anim: 'poke2' },
    slam:     { len: 0.58, at: 0.2, until: 0.32, reach: 1.7, depth: 0.8, dmg: 14, knock: true, next: 0.48, word: 'WHAM!', big: true, anim: 'swing', lunge: 0.6 },
    // Bruno, the bearded general: green-dragon blade, cut, cut, and a wide crescent swing
    cut1:     { len: 0.27, at: 0.08, until: 0.16, reach: 1.75, depth: 0.6, dmg: 7, stun: 0.34, push: 0.45, next: 0.11, word: 'SWISH!', anim: 'poke' },
    cut2:     { len: 0.29, at: 0.08, until: 0.17, reach: 1.8, depth: 0.6, dmg: 8, stun: 0.36, push: 0.5, next: 0.12, word: 'CLANG!', anim: 'poke2' },
    crescent: { len: 0.56, at: 0.17, until: 0.31, reach: 2.0, depth: 0.8, dmg: 13, knock: true, next: 0.46, word: 'WHOOSH!', big: true, anim: 'hook', lunge: 0.9 },
    // everyone
    jumpKick: { reach: 1.4, depth: 0.55, dmg: 10, knock: true, word: 'BAM!', big: true },
    dashHit:  { len: 0.45, at: 0.04, until: 0.3, reach: 1.4, depth: 0.6, dmg: 11, knock: true, next: 0.45, word: 'WHOOSH!', big: true, anim: 'dash', lunge: 4.5 },
    ride:     { len: 0.4, at: 0.1, until: 0.24, reach: 2.1, depth: 0.85, dmg: 12, knock: true, next: 0.32, word: 'CLIP-CLOP!', big: true, anim: 'ride' },
    bop:      { len: 0.24, at: 0.08, until: 0.12, dmg: 5, word: 'BOP!' },           // bop while holding someone
    toss:     { len: 0.42, dmg: 12, hitOthers: 10, speed: 8, word: 'WHEE!' },        // throwing someone you're holding
    trample:  { dmg: 8, word: 'CLIP-CLOP!' },                                         // running into them on a horse
  };

  // Chests hold a weapon upgrade: level 1 wood, 2 silver, 3 gold. Each level hits harder and a little further.
  const WEAPON_LEVEL = { dmg: [1, 1.35, 1.7], reach: [0, 0.15, 0.3], max: 3 };

  // ---------------------------------------------------------------- the heroes

  // weapon: the foam weapon model (js/game.js). special: their magic (SPECIALS). costume: extras on the kit person.
  // look: changes to the kit roster's look (so friends wear their costume, not their hoodie).
  const HEROES = {
    teddy: {
      name: 'TEDDY', title: 'THE DRAGON SPEAR', weapon: 'spear', costume: 'zhaoyun',
      combo: ['jab', 'straight', 'sweep'], special: 'dunk', specialName: 'DRAGON DUNK!', specialIcon: '🏀',
      blurb: 'spear jab · straight · sweep', speed: 3.4, speedZ: 2.3, run: 6.6, jump: 7.0,
      hello: 'boxing', bye: 'jumpshot', tag: '#8cc2ff', color: '#3d8bff',
      look: { top: '#e8eef6', bottom: '#2f4a7a', shoes: '#e53935', print: null },
    },
    tommy: {
      name: 'TOMMY', title: 'THE LITTLE STRATEGIST', weapon: 'fan', costume: 'zhuge',
      combo: ['fan1', 'fan2', 'gust'], special: 'wind', specialName: 'FEATHER-FAN GALE!', specialIcon: '✌️',
      blurb: 'feather fan · fan · gust', speed: 3.5, speedZ: 2.4, run: 6.6, jump: 7.2,
      hello: 'peace', bye: 'peace', tag: '#ffb02e', color: '#ff9f1c',
      look: { top: '#f4efe0', bottom: '#3a5a8a', shoes: '#2f4a7a', print: null },
    },
    zoom: {
      name: 'ZOOM', title: 'THE ROARING SPEAR', weapon: 'serpent', costume: 'zhangfei',
      combo: ['thrust', 'thrust2', 'chop'], special: 'thunder', specialName: 'THUNDER ROAR!', specialIcon: '⚡',
      blurb: 'snake spear thrust · thrust · chop', speed: 3.3, speedZ: 2.2, run: 6.5, jump: 6.9,
      hello: 'wave', bye: 'wave', tag: '#ff3d7f', color: '#ff3d7f',
      look: { hat: null, headphones: null, pack: null, packPocket: null, top: '#3a3f4f', bottom: '#20232e', print: null, brows: true },
    },
    luna: {
      name: 'LUNA', title: 'THE MOON PRINCESS', weapon: 'twin', costume: 'shangxiang',
      combo: ['slash', 'slash2', 'spin'], special: 'fire', specialName: 'FIRE SWIRL!', specialIcon: '🔥',
      blurb: 'twin swords · swords · spin', speed: 3.6, speedZ: 2.5, run: 6.8, jump: 7.3,
      hello: 'wave', bye: 'wave', tag: '#b98cff', color: '#8d5bd8',
      look: { pack: null, top: '#c03a5a', bottom: '#5a2a6a', print: null },
    },
    bolt: {
      name: 'BOLT', title: 'THE WOODEN-OX BOT', weapon: 'hammer', costume: 'woodenox',
      combo: ['bonk', 'bonk2', 'slam'], special: 'arrows', specialName: 'REPEATING CROSSBOW!', specialIcon: '🎯',
      blurb: 'foam hammer · bonk · SLAM', speed: 3.1, speedZ: 2.1, run: 6.2, jump: 6.7,
      hello: 'wave', bye: 'wave', tag: '#ffb02e', color: '#ff8a1f',
      look: { top: '#b07a3a', print: 'panel' },
    },
    bruno: {
      name: 'BRUNO', title: 'THE BEARDED GENERAL', weapon: 'guandao', costume: 'guanyu',
      combo: ['cut1', 'cut2', 'crescent'], special: 'crescent', specialName: 'GREEN DRAGON WAVE!', specialIcon: '🌙',
      blurb: 'green-dragon blade · cut · crescent', speed: 3.2, speedZ: 2.2, run: 6.4, jump: 6.8,
      hello: 'wave', bye: 'wave', tag: '#7dff5a', color: '#2fb36a',
      look: { top: '#2f8a4a', bottom: '#1f4a2a', print: null, shorts: false },
    },
  };
  const HERO_ORDER = ['teddy', 'tommy', 'zoom', 'luna', 'bolt', 'bruno'];

  // Magic: costs one 🔮. With no 🔮 left the same button does the rescue spin (costs a heart, never the last one).
  const SPECIALS = {
    dunk:     { len: 0.95, at: 0.55, radius: 3.4, depth: 1.8, dmg: 24, ahead: 1.4 },          // jump, slam a 🏀: a ring
    wind:     { len: 1.0, at: 0.3, speed: 10, dmg: 22, width: 1.2 },                           // ✌️, then two whirlwinds sweep the screen
    thunder:  { len: 0.9, at: 0.45, dmg: 22 },                                                 // a lightning bolt on every baddie on screen
    fire:     { len: 0.9, at: 0.25, radius: 5.5, speed: 9, dmg: 22, zScale: 1.6 },             // a ring of fire spreads out all around
    arrows:   { len: 0.9, at: 0.3, speed: 13, dmg: 20, n: 5, width: 0.5 },                     // five foam darts fly across the screen
    crescent: { len: 0.85, at: 0.3, speed: 9, dmg: 24, width: 0.9, zHalf: 1.7 },               // a giant moon-shaped wave rolls forward
    rescue:   { len: 0.6, at: 0.14, radius: 2.5, speed: 11, dmg: 12 },                         // the spin when you're surrounded
  };

  // ---------------------------------------------------------------- the straw-hat army

  // attack: how it attacks (js/brains.js). windup: how long it shows "!" before. coins: coins it drops when beaten.
  // extras: costume bits this game adds (straw hat, yellow turban, helmet...). drop: chance it leaves food.
  const ENEMIES = {
    straw: {
      name: 'STRAW-HAT SOLDIER', hp: 30, speed: 1.5, attack: 'poke', windup: 0.5, reach: 1.25, score: 100, coins: 2, drop: 0.1,
      extras: ['straw'],
      looks: [
        { head: 'human', skin: '#f0c49a', hair: 'short', hairColor: '#2a1a12', shirt: 'jacket', top: '#c0503a', bottom: '#5a4636', shoes: '#3a2a20', mustache: true },
        { head: 'human', skin: '#e2b088', hair: 'short', hairColor: '#1a1410', shirt: 'jacket', top: '#3a7ac0', bottom: '#4a4038', shoes: '#3a2a20' },
        { head: 'human', skin: '#f2c8a0', hair: 'short', hairColor: '#3a2a1a', shirt: 'jacket', top: '#4a9a5a', bottom: '#4a4038', shoes: '#3a2a20', belly: true },
      ],
    },
    turban: {
      name: 'YELLOW TURBAN ZOMBIE', hp: 36, speed: 1.2, attack: 'hug', windup: 0.6, reach: 1.1, score: 100, coins: 2, drop: 0.12,
      extras: ['turban'],
      looks: [
        { head: 'human', zombie: true, skin: '#8fbf6a', hair: 'short', hairColor: '#2b2f22', shirt: 'hoodie', top: '#8a6a3a', print: 'torn', bottom: '#4a4038', shoes: '#5b4636' },
        { head: 'human', zombie: true, skin: '#9fcf7a', hair: 'short', hairColor: '#33301f', shirt: 'tee', top: '#c8a24a', bottom: '#38405a', shoes: '#2a2a30' },
        { head: 'human', zombie: true, skin: '#86c08a', hair: 'spiky', hairColor: '#3a2f1f', shirt: 'hoodie', top: '#7a5a3a', bottom: '#4a4038', shoes: '#5b4636', shorts: true },
      ],
    },
    bot: {
      name: 'CLOCKWORK SOLDIER', hp: 44, speed: 1.8, attack: 'punch', windup: 0.45, reach: 1.2, score: 150, coins: 3, drop: 0.15,
      extras: ['helmet'],
      looks: [
        { head: 'robot', skin: '#d8c8a8', eyes: '#5ef2ff', shirt: 'jacket', top: '#a0603a', print: 'panel', bottom: '#5a4a3a', shoes: '#2a2a30' },
        { head: 'robot', skin: '#c8ccd4', eyes: '#ffe14d', shirt: 'jacket', top: '#3a6a9a', print: 'bolt', bottom: '#3a3f4b', shoes: '#2a2a30' },
      ],
    },
    archer: {
      name: 'PEA-SHOOTER', hp: 26, speed: 1.6, attack: 'shoot', windup: 0.75, reach: 1.0, score: 120, coins: 2, drop: 0.1, scale: 0.92,
      extras: ['straw'], shot: 'pea',
      looks: [
        { head: 'human', skin: '#f0c49a', hair: 'short', hairColor: '#2a1a12', shirt: 'tee', top: '#e0a030', bottom: '#5a4636', shoes: '#3a2a20', smile: true },
        { head: 'human', skin: '#e8b890', hair: 'ponytail', hairColor: '#2a1a12', shirt: 'tee', top: '#d06a8a', bottom: '#4a4038', shoes: '#3a2a20' },
      ],
    },
  };

  // The cartoon generals at the end of each stage. moves: how often each move is picked (js/brains.js).
  const BOSSES = {
    sergeant: {
      name: 'SERGEANT STRAW', title: 'The biggest hat in the army', hp: 200, speed: 1.5, scale: 1.45, score: 2000, coins: 15,
      moves: { swipe: 3, stomp: 2, summon: 1 }, summon: 'straw', extras: ['straw', 'beard'],
      look: { head: 'human', skin: '#f0c49a', hair: 'short', hairColor: '#2a1a12', shirt: 'jacket', top: '#b03a2a', print: 'star', bottom: '#4a3a2a', shoes: '#3a2a20', belly: true, brows: true },
    },
    wizard: {
      name: 'YELLOW TURBAN WIZARD', title: 'Calls the thunder', hp: 280, speed: 1.6, scale: 1.4, score: 2000, coins: 15,
      moves: { swipe: 2, zap: 3, summon: 2 }, summon: 'turban', extras: ['turban', 'beard', 'robe'],
      look: { head: 'human', zombie: true, skin: '#a6c96a', hair: 'short', hairColor: '#2b2f22', shirt: 'jacket', top: '#e0b020', print: 'star', bottom: '#8a6a1a', shoes: '#3a2a20', belly: true },
    },
    lubu: {
      name: 'MIGHTY LÜ BU', title: 'Strongest in the land (he says)', hp: 400, speed: 1.9, scale: 1.7, score: 3000, coins: 20,
      moves: { swipe: 3, charge: 3, stomp: 2 }, extras: ['feathers', 'cape'], cape: '#c0303a',
      look: { head: 'human', skin: '#f0c49a', hair: 'short', hairColor: '#1a1410', shirt: 'jacket', top: '#8a2a2a', print: 'panel', bottom: '#3a2a2a', shoes: '#ffd400', belly: true, brows: true },
    },
    clank: {
      name: 'GENERAL CLANK', title: 'The iron robot general', hp: 360, speed: 1.5, scale: 1.65, score: 2500, coins: 20,
      moves: { swipe: 3, zap: 2, charge: 2 }, extras: ['helmet'],
      look: { head: 'robot', skin: '#c8ccd4', eyes: '#ff5e5e', shirt: 'jacket', top: '#4a5a7a', print: 'panel', bottom: '#3a3f4b', shoes: '#2a2a30', belly: true },
    },
    caocao: {
      name: 'GRUMPY CAO CAO', title: 'Admiral of a thousand boats', hp: 400, speed: 1.6, scale: 1.55, score: 3000, coins: 20,
      moves: { swipe: 3, throw: 3, summon: 1 }, throws: 'lantern', summon: 'bot', extras: ['minister', 'beard', 'cape'], cape: '#1a1a3a',
      look: { head: 'human', skin: '#f2c8a0', hair: 'short', hairColor: '#1a1410', shirt: 'jacket', top: '#3a2a6a', print: 'star', bottom: '#2a1a4a', shoes: '#1a1a22', belly: true, brows: true },
    },
    sima: {
      name: 'SNEAKY SIMA YI', title: 'Is the city really empty?', hp: 460, speed: 1.7, scale: 1.6, score: 4000, coins: 30,
      moves: { swipe: 3, throw: 2, swoop: 2, summon: 1 }, throws: 'scroll', summon: 'turban', extras: ['scholar', 'beard', 'cape'], cape: '#2a5a4a',
      look: { head: 'human', skin: '#efc6a2', hair: 'short', hairColor: '#1a1410', shirt: 'jacket', top: '#1f4a3a', print: 'star', bottom: '#14302a', shoes: '#1a1a22', belly: true, brows: true },
    },
  };

  // What the army throws: emoji, speed along the road, upward speed (0 = flies straight).
  const SHOTS = {
    pea:     { emoji: '🟢', speed: 6.0, up: 0, r: 0.35, life: 2.6 },
    zap:     { emoji: '⚡', speed: 8.5, up: 0, r: 0.5, life: 2.2, knock: true },
    lantern: { emoji: '🏮', speed: 5.0, up: 5.5, r: 0.5, life: 2.5 },
    scroll:  { emoji: '📜', speed: 5.4, up: 0, r: 0.45, life: 3.0, wobble: true },
  };

  // ---------------------------------------------------------------- pick-ups

  // Food heals hearts. icon: an emoji, or BAO (a steamed bun drawn by js/game.js; there's no emoji for it).
  const FOOD = {
    bao:       { icon: 'BAO', name: 'BAO BUN', heal: 2 },
    drumstick: { icon: '🍗', name: 'DRUMSTICK', heal: 3 },
    peach:     { icon: '🍑', name: 'LONGEVITY PEACH', heal: 99 },
  };
  // Coins fly to you by themselves. INGOT is a gold ingot (drawn by js/game.js).
  const COINS = { coin: { icon: '🪙', value: 1 }, ingot: { icon: 'INGOT', value: 5 } };
  // Inside chests and jars, besides food and coins: up = weapon upgrade, orb = one more magic 🔮.
  const CHEST = { coins: 6 };

  const HORSE = {
    speed: 1.6, speedZ: 1.15,  // times your walking speed
    trampleSpeed: 3.2,         // faster than this, you bowl over anyone in front of you
    height: 0.82,              // how high the saddle is
    callSpeed: 8,              // a called horse gallops in from behind you at this speed
  };

  // ---------------------------------------------------------------- the companion

  const TREATS = [
    { icon: 'BAO', name: 'BAO BUN' },
    { icon: '🍑', name: 'LONGEVITY PEACH' },
    { icon: '🍦', name: 'ICE CREAM' },
    { icon: '💧', name: 'WATER' },
    { icon: '🧃', name: 'JUICE BOX' },
    { icon: '🍪', name: 'COOKIE' },
    { icon: '🍉', name: 'WATERMELON' },
    { icon: '🍌', name: 'BANANA' },
  ];

  const BUDDY = {
    visit: 10,         // seconds he stays; calling again gives another treat and resets this
    treatHeal: 2,      // hearts a treat gives back
    power: 0.7,        // his hits are this strong compared with yours
    helloRadius: 2.6,  // his hello move bonks anyone this close
  };

  // ---------------------------------------------------------------- difficulty

  const DIFF = {
    easy: {
      name: 'EASY', hearts: 8, lives: 5, continues: Infinity, orbs: 3, maxOrbs: 5,
      enemyHp: 0.6, enemySpeed: 0.78, windup: 1.5, bossHp: 0.55, keep: 0.67,
      maxActive: 3, maxAttackers: 1, teamCd: 15, mercy: 1.1, orbPerKo: 0.2, horseCd: 4,
    },
    normal: {
      name: 'NORMAL', hearts: 5, lives: 3, continues: 2, orbs: 2, maxOrbs: 3,
      enemyHp: 1, enemySpeed: 1, windup: 1, bossHp: 1, keep: 1,
      maxActive: 4, maxAttackers: 2, teamCd: 25, mercy: 0.7, orbPerKo: 0.12, horseCd: 10,
    },
  };

  window.TK_RULES = { WORLD, MOVES, WEAPON_LEVEL, HEROES, HERO_ORDER, SPECIALS, ENEMIES, BOSSES, SHOTS, FOOD, COINS, CHEST, HORSE, TREATS, BUDDY, DIFF };
})();
