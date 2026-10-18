#!/usr/bin/env node
/* Three Kingdoms TT: headless check. Loads the real engine (js/rules.js, js/stages.js, js/sim.js, js/brains.js,
   js/check.js, and the kit's roster for the companion) in a sandbox with no browser.

     node tools/check.js             the move checks, then the autopilot through every stage x every set-up
     node tools/check.js --soak 5    plus 5 extra random seeds per stage and set-up
     node tools/check.js --prove     also proves the check can fail
     node tools/check.js --stage 2   only one stage (0-based) */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
const num = (flag, d) => (args.includes(flag) ? parseInt(args[args.indexOf(flag) + 1], 10) : d);

const sandbox = { console, Math, Set, Map, Object, Array, JSON, Infinity, NaN, isFinite, Number, String };
sandbox.window = sandbox;
sandbox.Kit = {};
vm.createContext(sandbox);
for (const f of ['kit/roster.js', 'js/rules.js', 'js/stages.js', 'js/sim.js', 'js/brains.js', 'js/check.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
}
const C = sandbox.TKCheck;

let bad = 0;
console.log('Moves:');
for (const [name, pass, info] of C.moves()) {
  if (!pass) bad++;
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${name}${!pass && info ? '   (' + info + ')' : ''}`);
}
console.log('');
const pad = (s, n) => String(s).padEnd(n);
console.log(pad('stage', 14) + pad('set-up', 26) + pad('result', 7) + pad('time', 7) + pad('KOs', 5) + pad('KO', 4) + pad('C', 4) + 'notes');
const r = C.soak({ seeds: num('--soak', 0), stage: args.includes('--stage') ? num('--stage', 0) : null, verbose: args.includes('-v'), log: (l) => console.log(l) });
bad += r.bad;
console.log(`\n${r.total - r.bad}/${r.total} runs finished with no problems (${r.needCont} needed a continue).`);

if (args.includes('--prove')) {
  const p = C.prove();
  console.log('\nProving the check can fail:');
  console.log(`  idle player on stage 1: ${p.idleCleared ? 'CLEARED (bad: the check would pass anything)' : 'did not clear (good)'}, knocked out ${p.idleDeaths} times`);
  console.log(`  soldier pushed off-screen: ${p.sabotageCaught ? 'caught (good): ' + p.sabotageProblem : 'NOT caught (bad)'}`);
  if (!p.ok) bad++;
}
process.exit(bad ? 1 : 0);
