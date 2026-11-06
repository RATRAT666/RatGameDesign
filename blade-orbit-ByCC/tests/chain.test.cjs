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

test('new chains share a 0.1 second cast interval and cool independently after fast retraction', () => {
  const g = setup(); g.G.up.chain = 2;
  const a = enemy(g, 90), b = enemy(g, 100);
  g.updateChains(.01);
  const [first, second] = g.G.chains;
  assert.equal(first.tip.target, a); assert.equal(second.tip, null);
  g.G.t = .099; g.updateChains(.01); assert.equal(second.tip, null);
  g.G.t = .1; g.updateChains(.01); assert.equal(second.tip.target, b);
  assert(g.chainOccupied(a)); assert(g.chainOccupied(b));

  g.updateChains(.4);
  g.retractChain(first); assert(!g.chainOccupied(a));
  g.updateChains(.09); assert.equal(first.phase, 'cooldown'); assert.equal(first.cooldown, .1);
  assert.equal(second.phase, 'hold');
  g.G.t += .05; g.updateChains(.05);
  assert.equal(first.phase, 'cooldown'); assert.equal(first.cooldown, .05);
  g.G.t += .05; g.updateChains(.05);
  assert.equal(first.tip.target, a);
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

test('chain pulls outside blade reach and repels radially inside the inner edge', () => {
  const g = setup(); const light = enemy(g, 80, 'bat'), heavy = enemy(g, 80, 'boss');
  g.chainPull(light, -1, 0, 80, .1); g.chainPull(heavy, -1, 0, 80, .1);
  assert.equal(light.kvx, -(80 - 8) * 18 * 1.5 * light.type.kbm * .1);
  assert(Math.abs(light.kvx) > Math.abs(heavy.kvx));
  light.x = g.G.sw.r + 2; light.kvx = 0;
  g.chainPull(light, -1, 0, 80, .1); assert.equal(light.kvx, 0);
  g.G.up.ring2 = 1; light.x = g.G.sw.r * 1.75 + 2;
  g.chainPull(light, -1, 0, 80, .1); assert.equal(light.kvx, 0);
  light.x = 8;
  g.chainPull(light, 0, -1, 80, .1);
  assert.equal(light.kvx, (g.G.sw.r - 8) * 18 * 1.5 * light.type.kbm * .1);
  assert.equal(light.kvy, 0);
});

test('each chain level adds 20% of base hit damage, including linked hits', () => {
  const g = setup();
  g.G.sw.dmg = 100; Object.assign(g.G.up, {chain: 5, chainlink: 1});
  const first = enemy(g, 60), second = enemy(g, 118);
  first.hp = second.hp = 1000;
  const random = Math.random;
  try {
    Math.random = () => .5;
    g.updateChains(.3);
    g.updateChains(.3);
    assert.equal(first.hp, 793);
    assert.equal(second.hp, 793);
  } finally { Math.random = random; }
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
