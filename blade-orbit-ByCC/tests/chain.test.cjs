const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./harness.cjs');
const setup = () => { const g = loadGame(); g.newGame(); g.G.spawnT = 1000; return g; };
const enemy = (g, x, type = 'skel') => g.spawnEnemy(type, x, 0);

test('upgrade prerequisites and caps govern the card pool', () => {
  const g = setup();
  for (const u of g.UPS) if (!['chain','chainlink','chainbind'].includes(u.id)) g.G.up[u.id] = u.max;
  for (let i = 0; i < 20; i++) assert(!g.rollChoices().some(c => ['chainlink','chainbind'].includes(c.u.id)));
  g.G.up.chain = 1;
  for (const id of ['chainlink','chainbind']) assert(g.UPS.find(u => u.id === id).req());
  const seen = new Set(); for (let i = 0; i < 100; i++) for (const c of g.rollChoices()) seen.add(c.u.id);
  for (const id of ['chain','chainlink','chainbind']) assert(seen.has(id));
  Object.assign(g.G.up, { chain: 5, chainlink: 2, chainbind: 1 });
  assert(!g.rollChoices().some(c => ['chain','chainlink','chainbind'].includes(c.u.id)));
});

test('slots reserve targets in flight and cool independently after retraction', () => {
  const g = setup(); g.G.up.chain = 2;
  const a = enemy(g, 90), b = enemy(g, 100);
  g.updateChains(.01);
  const [first, second] = g.G.chains;
  assert.equal(first.tip.target, a); assert.equal(second.tip.target, b);
  assert(g.chainOccupied(a)); assert.notEqual(first.tip.target, second.tip.target);
  g.retractChain(first); assert(!g.chainOccupied(a));
  g.updateChains(1); assert.equal(first.phase, 'cooldown'); assert.equal(first.cooldown, 1);
  assert.equal(second.phase, 'hold');
  g.updateChains(.5); assert.equal(first.phase, 'cooldown'); assert.equal(first.cooldown, .5);
  g.updateChains(.5); assert.equal(first.phase, 'hold'); assert.equal(first.nodes[0], a);
});

test('two link upgrades cap a chain at three distinct enemies', () => {
  const g = setup(); Object.assign(g.G.up, {chain: 1, chainlink: 2});
  [60, 80, 100, 120].forEach(x => enemy(g, x));
  for (let i=0; i<10; i++) g.updateChains(.2);
  const c = g.G.chains[0]; assert.equal(c.nodes.length, 3); assert.equal(new Set(c.nodes).size, 3); assert.equal(c.tip, null);
});

test('death and excessive length trigger retraction and release occupancy', () => {
  const g = setup(); g.G.up.chain = 1; const e = enemy(g, 70);
  g.updateChains(.3); const c = g.G.chains[0]; assert.equal(c.nodes[0], e);
  e.dead = true; g.updateChains(.01); assert.equal(c.phase, 'retract'); assert(!g.chainOccupied(e));
  g.newGame(); g.G.up.chain = 1; const far = enemy(g, 70); g.updateChains(.3);
  far.x = g.CHAIN.maxLength + 1; g.updateChains(.01); assert.equal(g.G.chains[0].phase, 'retract');
});

test('pull respects weight and stops inside the sword ring', () => {
  const g = setup(); const light = enemy(g, 80, 'bat'), heavy = enemy(g, 80, 'boss');
  g.chainPull(light, -1, 0, 80, .1); g.chainPull(heavy, -1, 0, 80, .1);
  assert(Math.abs(light.kvx) > Math.abs(heavy.kvx));
  light.x = g.G.sw.r; light.kvx = 0; g.chainPull(light, -1, 0, 80, .1); assert.equal(light.kvx, 0);
  g.G.up.ring2 = 1; light.x = g.G.sw.r * 1.5; g.chainPull(light, -1, 0, 80, .1); assert.equal(light.kvx, 0);
});

test('binding duration diminishes and resets after ten seconds without a hit', () => {
  const g = setup(); const e = enemy(g, 100);
  g.bindEnemy(e); assert.equal(e.bindUntil, 3); assert.equal(e.bindHits, 1);
  g.G.t = 4; g.bindEnemy(e); const second = e.bindUntil - g.G.t; assert(second > 0 && second < 3); assert.equal(e.bindHits, 2);
  g.G.t = 14; g.bindEnemy(e); assert.equal(e.bindHits, 1); assert.equal(e.bindUntil, 17);
});

test('binding prevents self movement but allows external velocity; pause freezes time', () => {
  const g = setup(); const e = enemy(g, 100); g.bindEnemy(e);
  g.update(.1); assert.equal(e.x, 100);
  e.kvx = 20; g.update(.1); assert(e.x > 100);
  const t = g.G.t, x = e.x, until = e.bindUntil; g.G.state = 'pause'; g.update(5);
  assert.equal(g.G.t, t); assert.equal(e.x, x); assert.equal(e.bindUntil, until);
});

test('new game clears chain slots, upgrades and old enemies', () => {
  const g = setup(); Object.assign(g.G.up, {chain: 1, chainbind: 1}); const e = enemy(g, 80);
  g.updateChains(.4); assert(g.G.chains.length); assert(e.bindUntil > 0);
  g.newGame(); assert.equal(g.G.chains.length, 0); assert.equal(g.G.enemies.length, 0); assert.equal(g.G.up.chain, undefined); assert.equal(g.G.t, 0);
});
