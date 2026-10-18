/* Three Kingdoms TT: the storybook. Six stages that follow the old story (the novel and the history are hundreds
   of years old and free for everyone), plus two bonus rounds. Edit freely, then reload the page.

   Each stage is a road you walk along to the right. The screen stops at each `section` until everyone there is
   bonked, then shows GO →.
     name, cn    the stage's name in English, and in Chinese (shown as decoration in English too)
     story       the storybook card before the stage (English; js/zh.js has the 中文)
     art         the pictures on the storybook card
     length      how long the road is, in metres (a screen is about 14 m wide)
     theme       which scenery to draw (js/scenery.js)
     boss        the cartoon general waiting at the end (js/rules.js)
     bonus       a bonus round instead: smash the jars for coins before the incense stick burns down (time, in s)
   Each section:
     at          where the screen stops: 'start', 'end', or metres along the road (the middle of the screen)
     tip         a hint shown when you get there (the first stage teaches the moves)
     waves       groups of the army, one after another. A wave comes in when no more than `when` (default 1) of the
                 last one are still standing. from: 'right' (default), 'left' or 'both'.
                 Types: straw, turban, bot, archer, or the stage's boss.
     items       things lying on the road: food (bao, drumstick, peach) or a horse to ride.
                 x is metres from the middle of the screen, z is depth (-2.6 far ... 1.2 near).
     chests      treasure chests to bonk open, with something inside: up (weapon upgrade), orb (one more 🔮 magic),
                 coins, ingot, or food. */
window.TK_STAGES = [
  {
    id: 'peach', name: 'THE PEACH GARDEN OATH', cn: '桃园结义', emoji: '🌸', theme: 'peach', length: 62, boss: 'sergeant',
    art: ['🌸', '🍑', '🤝', '🌸'],
    story: 'Under the peach blossoms, three heroes promised to look after each other and help everyone. Teddy and Tommy want to be heroes too! First, some practice with the silly straw-hat soldiers.',
    sections: [
      {
        at: 'start', tip: 'move',
        waves: [
          { enemies: ['straw'] },
          { enemies: ['straw', 'straw'], when: 0 },
        ],
      },
      {
        at: 22, tip: 'jump',
        chests: [{ x: 3, z: -2.0, drop: 'up' }],
        waves: [
          { enemies: ['straw', 'straw'] },
          { enemies: ['straw', 'archer'], from: 'both', when: 0 },
        ],
      },
      {
        at: 40, tip: 'grab',
        items: [{ kind: 'bao', x: -3, z: 0.6 }],
        waves: [
          { enemies: ['straw', 'straw', 'straw'] },
        ],
      },
      {
        at: 'end', boss: true, tip: 'magic',
        chests: [{ x: -4, z: -2.1, drop: 'orb' }],
        waves: [
          { enemies: ['sergeant'] },
          { enemies: ['straw', 'straw'], when: 1 },
        ],
      },
    ],
  },
  {
    id: 'turban', name: 'THE YELLOW TURBANS', cn: '黄巾之乱', emoji: '💛', theme: 'village', length: 78, boss: 'wizard',
    art: ['💛', '🧟', '⚡', '🐎'],
    story: 'Uh-oh! A sneaky wizard tied yellow scarves on everyone and turned them into wobbly zombies. Hop on a horse and gallop to the rescue!',
    sections: [
      {
        at: 'start',
        waves: [
          { enemies: ['turban', 'straw'] },
          { enemies: ['turban', 'turban', 'straw'], from: 'both' },
        ],
      },
      {
        at: 24, tip: 'horse',
        items: [{ kind: 'horse', x: -2.5, z: 0.2 }],
        chests: [{ x: 4, z: -2.1, drop: 'drumstick' }],
        waves: [
          { enemies: ['turban', 'turban'] },
          { enemies: ['straw', 'turban', 'archer'], from: 'both' },
        ],
      },
      {
        at: 48,
        chests: [{ x: -3, z: -2.1, drop: 'up' }],
        waves: [
          { enemies: ['turban', 'turban', 'turban'] },
          { enemies: ['archer', 'turban', 'straw'], from: 'left' },
        ],
      },
      {
        at: 'end', boss: true,
        chests: [{ x: 4, z: -2.2, drop: 'bao' }],
        waves: [
          { enemies: ['wizard'] },
          { enemies: ['turban', 'turban'], when: 1 },
        ],
      },
    ],
  },
  {
    id: 'gate', name: 'SHOWDOWN AT TIGER GATE', cn: '虎牢关', emoji: '🐯', theme: 'gate', length: 80, boss: 'lubu',
    art: ['🏯', '🐯', '🪶', '🐎'],
    story: 'At the great Tiger Gate waits Lü Bu, with two giant feathers on his helmet. He says nobody can beat him. Three heroes took him on together. Can you?',
    sections: [
      {
        at: 'start',
        waves: [
          { enemies: ['straw', 'straw', 'archer'] },
          { enemies: ['bot', 'straw'], from: 'both' },
        ],
      },
      {
        at: 26,
        chests: [{ x: 3, z: -2.1, drop: 'orb' }],
        waves: [
          { enemies: ['bot', 'straw', 'straw'] },
          { enemies: ['archer', 'archer', 'straw'], from: 'both' },
        ],
      },
      {
        at: 50,
        items: [{ kind: 'peach', x: 3, z: 0.5 }],
        chests: [{ x: -3.5, z: -2.1, drop: 'up' }],
        waves: [
          { enemies: ['bot', 'bot'] },
          { enemies: ['straw', 'bot', 'turban'], from: 'left' },
        ],
      },
      {
        at: 'end', boss: true,
        chests: [{ x: -4, z: -2.2, drop: 'drumstick' }],
        waves: [
          { enemies: ['lubu'] },
          { enemies: ['straw', 'archer'], when: 1 },
        ],
      },
    ],
  },
  {
    id: 'jars1', name: 'BONUS: SMASH THE JARS', cn: '砸罐子', emoji: '🏺', theme: 'courtyard', length: 14, bonus: true, time: 25,
    art: ['🏺', '🪙', '🏺', '🪙'],
    story: 'The heroes found a courtyard full of old jars, and there are coins hiding inside! Smash as many as you can before the incense stick burns down.',
    sections: [],
  },
  {
    id: 'bridge', name: 'THE BRIDGE AT CHANGBAN', cn: '长坂坡', emoji: '🌉', theme: 'bridge', length: 82, boss: 'clank',
    art: ['🌉', '👶', '🐎', '🤖'],
    story: 'Brave Zhao Yun rode through a whole army to carry a baby to safety, and at the bridge Zhang Fei roared so loud that everyone ran away! Now an iron robot general is coming. Roar!',
    sections: [
      {
        at: 'start',
        items: [{ kind: 'horse', x: 1.5, z: 0.0 }],
        waves: [
          { enemies: ['bot', 'straw'] },
          { enemies: ['bot', 'bot', 'straw'], from: 'both' },
        ],
      },
      {
        at: 26,
        chests: [{ x: 4, z: -2.1, drop: 'bao' }],
        waves: [
          { enemies: ['bot', 'archer', 'bot'] },
          { enemies: ['straw', 'straw', 'bot'], from: 'left' },
        ],
      },
      {
        at: 52,
        items: [{ kind: 'horse', x: -3, z: 0.4 }],
        chests: [{ x: 3, z: -2.1, drop: 'up' }],
        waves: [
          { enemies: ['bot', 'bot', 'bot'] },
          { enemies: ['archer', 'bot', 'archer'], from: 'both' },
        ],
      },
      {
        at: 'end', boss: true,
        chests: [{ x: -4, z: -2.2, drop: 'orb' }],
        waves: [
          { enemies: ['clank'] },
          { enemies: ['bot', 'bot'], when: 1 },
        ],
      },
    ],
  },
  {
    id: 'cliffs', name: 'FIRE AT THE RED CLIFFS', cn: '赤壁之战', emoji: '🔥', theme: 'cliffs', length: 82, boss: 'caocao',
    art: ['⛵', '🪶', '🔥', '⛵'],
    story: "Cao Cao tied his thousand boats together. Tommy the little strategist waves his feather fan and calls the east wind. Whoosh! Run across the boats and stop the grumpy admiral!",
    sections: [
      {
        at: 'start',
        waves: [
          { enemies: ['bot', 'turban', 'straw'] },
          { enemies: ['archer', 'bot', 'turban'], from: 'both' },
        ],
      },
      {
        at: 26,
        chests: [{ x: 3, z: -2.1, drop: 'drumstick' }],
        waves: [
          { enemies: ['bot', 'bot', 'archer'] },
          { enemies: ['turban', 'turban', 'bot'], from: 'left' },
        ],
      },
      {
        at: 52,
        items: [{ kind: 'bao', x: -3, z: 0.6 }],
        chests: [{ x: 4, z: -2.1, drop: 'orb' }],
        waves: [
          { enemies: ['straw', 'archer', 'bot', 'turban'] },
          { enemies: ['bot', 'bot'], from: 'both' },
        ],
      },
      {
        at: 'end', boss: true,
        chests: [{ x: -4, z: -2.2, drop: 'peach' }],
        waves: [
          { enemies: ['caocao'] },
          { enemies: ['bot', 'turban'], when: 1 },
        ],
      },
    ],
  },
  {
    id: 'jars2', name: 'BONUS: LANTERN NIGHT', cn: '元宵灯会', emoji: '🏮', theme: 'lanterns', length: 14, bonus: true, time: 25,
    art: ['🏮', '🏺', '🪙', '🏮'],
    story: 'Lantern festival! The whole town is lit up, and the jars are stuffed with coins and gold. Smash them before the incense stick burns down!',
    sections: [],
  },
  {
    id: 'city', name: 'THE EMPTY CITY TRICK', cn: '空城计', emoji: '🏯', theme: 'city', length: 86, boss: 'sima',
    art: ['🏯', '🎶', '🪶', '🤔'],
    story: "The strategist opened the city gates, sat on the wall and played music. Sneaky Sima Yi thought it was a trap! Now he's back with zombies AND robots. The last fight!",
    sections: [
      {
        at: 'start',
        waves: [
          { enemies: ['turban', 'bot', 'straw'] },
          { enemies: ['archer', 'turban', 'bot'], from: 'both' },
        ],
      },
      {
        at: 26,
        items: [{ kind: 'horse', x: -2.5, z: 0.3 }],
        chests: [{ x: 3.5, z: -2.1, drop: 'up' }],
        waves: [
          { enemies: ['bot', 'bot', 'turban'] },
          { enemies: ['archer', 'archer', 'turban'], from: 'both' },
        ],
      },
      {
        at: 54,
        chests: [{ x: -3, z: -2.1, drop: 'drumstick' }, { x: 4, z: -2.1, drop: 'orb' }],
        waves: [
          { enemies: ['turban', 'turban', 'bot', 'straw'] },
          { enemies: ['bot', 'archer', 'bot'], from: 'left' },
        ],
      },
      {
        at: 'end', boss: true,
        chests: [{ x: -4, z: -2.2, drop: 'peach' }],
        waves: [
          { enemies: ['sima'] },
          { enemies: ['turban', 'bot'], when: 1 },
        ],
      },
    ],
  },
];

// The first stage teaches the moves: what each tip says, with keys or on a touch screen.
window.TK_TIPS = {
  move:  { keys: 'Walk with W A S D. Swing your weapon with F!', touch: 'Walk with the joystick. Tap ⚔️ to swing!' },
  jump:  { keys: 'G jumps. Jump, then F = flying kick! Bonk the chest open too.', touch: 'Tap ⬆️ to jump, then ⚔️ for a flying kick! Bonk the chest open too.' },
  grab:  { keys: 'Walk into a soldier to grab him, then F F F to toss him!', touch: 'Walk into a soldier to grab him, then ⚔️ ⚔️ ⚔️ to toss him!' },
  magic: { keys: 'H = magic! It uses a 🔮. Press T to call your brother!', touch: 'Tap ✨ for magic! It uses a 🔮. Tap your brother\'s face to call him!' },
  horse: { keys: 'A horse! Walk to it to ride. G hops off.', touch: 'A horse! Walk to it to ride. ⬆️ hops off.' },
  // two players
  move2:  { keys: 'Player 1: W A S D and F. Player 2: the arrows and J.', touch: 'Each player has a joystick and ⚔️ to swing!' },
  magic2: { keys: 'H or L = magic! It uses a 🔮. T = TEAM-UP!', touch: 'Tap ✨ for magic! It uses a 🔮. Tap TEAM-UP when it glows!' },
};
