/* The keys the ? panel shows. Press ? (Shift + /) in the game, or tap the round ? button.
   The panel and the freeze live in the shared kit: kit/help.js (Kit.help). */
Kit.help.setup({
  title: window.TK_TITLE.NAME,
  cols: ['Player 1', 'Player 2'],
  keys: [
    ['walk (up and down the road too)', 'W A S D', '↑ ← ↓ →'],
    ['swing your weapon', 'F', 'J'],
    ['jump (jump + swing = flying kick)', 'G', 'K'],
    ['magic (uses a 🔮)', 'H', 'L'],
    ['rescue spin, or the horse stomp when riding (costs a heart)', 'F + G', 'J + K'],
    ['dash', 'double-tap A or D', 'double-tap ← or →'],
    ['walk into a soldier to grab him, swing to toss him', 'F', 'J'],
    ['call a horse (walk to it to ride, jump to hop off)', 'R', 'O'],
    ['on a horse: swing next to a soldier to scoop him up, swing again to fling him', 'F', 'J'],
    ['call your brother · team-up', 'T', 'Enter'],
    ['pause · sound', 'P or Esc · M', ''],
  ],
  note: 'In 1 player both sets of keys work, and Space jumps. With no 🔮 left, magic does the rescue spin.',
  touch: 'Joystick, ⚔️ SWING, ⬆️ JUMP, ✨ MAGIC and 🐎 HORSE. Tap your brother\'s face to call him.',
});
