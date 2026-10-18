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
    ['rescue spin (costs a heart)', 'F + G', 'J + K'],
    ['dash', 'double-tap A or D', 'double-tap ← or →'],
    ['walk into a soldier to grab him, swing to toss him', 'F', 'J'],
    ['walk to a horse to ride it, jump to hop off', 'G', 'K'],
    ['call your brother · team-up', 'T', 'Enter'],
    ['pause · sound', 'P or Esc · M', ''],
  ],
  note: 'In 1 player both sets of keys work, and Space jumps. With no 🔮 left, magic does the rescue spin.',
  touch: 'Joystick, ⚔️ SWING, ⬆️ JUMP and ✨ MAGIC. Tap your brother\'s face to call him.',
});
