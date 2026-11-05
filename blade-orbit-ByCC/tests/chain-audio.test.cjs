const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./harness.cjs');
const setup = () => { const g = loadGame(); g.newGame(); g.G.spawnT = 1000; g.audioEvents.length = 0; return g; };
const enemy = (g, x) => g.spawnEnemy('skel', x, 0);
const names = g => Array.from(g.audioEvents, e => e.name);
const count = (g, name) => names(g).filter(n => n === name).length;

test('root cast, linked cast and impacts have dedicated sounds', () => {
  const g = setup(); Object.assign(g.G.up, { chain: 1, chainlink: 1 });
  enemy(g, 70); enemy(g, 110);
  g.updateChains(.01);
  assert.equal(count(g, 'chainCast'), 1);
  g.updateChains(.3);
  assert.equal(count(g, 'chainHit'), 1);
  assert.equal(count(g, 'hit'), 0);
  g.updateChains(.01);
  assert.equal(count(g, 'chainLink'), 1);
  g.updateChains(.3);
  assert.equal(count(g, 'chainHit'), 2);
  assert.equal(count(g, 'hit'), 0);
});

test('binding sounds on application and once on expiration for living enemies', () => {
  const g = setup(); const e = enemy(g, 100);
  g.bindEnemy(e); assert.equal(count(g, 'bindOn'), 1);
  g.update(2.9); assert.equal(count(g, 'bindOff'), 0);
  g.update(.2); assert.equal(count(g, 'bindOff'), 1);
  g.update(.1); assert.equal(count(g, 'bindOff'), 1);
});

test('death during binding does not produce a release sound', () => {
  const g = setup(); const e = enemy(g, 100);
  g.bindEnemy(e); e.dead = true; g.update(3.1);
  assert.equal(count(g, 'bindOff'), 0);
});

test('recall plays once and excessive length also produces a break sound', () => {
  const g = setup(); g.G.up.chain = 1; const e = enemy(g, 70);
  g.updateChains(.3); const c = g.G.chains[0];
  g.retractChain(c); g.retractChain(c);
  assert.equal(count(g, 'chainRecall'), 1);
  g.newGame(); g.audioEvents.length = 0; g.G.up.chain = 1;
  const far = enemy(g, 70); g.updateChains(.3); far.x = g.CHAIN.maxLength + 1;
  g.updateChains(.01);
  assert.equal(count(g, 'chainBreak'), 1);
  assert.equal(count(g, 'chainRecall'), 1);
});

test('tension sounds on first pull and no more than once per slot per 0.65 seconds', () => {
  const g = setup(); g.G.up.chain = 2;
  enemy(g, 70); enemy(g, 90); g.updateChains(.4);
  g.audioEvents.length = 0; g.updateChains(.01);
  assert.equal(count(g, 'chainTension'), 2);
  g.G.t += .64; g.updateChains(.01); assert.equal(count(g, 'chainTension'), 2);
  g.G.t += .02; g.updateChains(.01); assert.equal(count(g, 'chainTension'), 4);
});

test('enemies inside the sword ring produce no tension sound', () => {
  const g = setup(); g.G.up.chain = 1; const e = enemy(g, 70);
  g.updateChains(.4); e.x = g.G.sw.r - 1; g.audioEvents.length = 0;
  g.updateChains(.1); assert.equal(count(g, 'chainTension'), 0);
});

test('pause and upgrade screen trigger no chain or binding sounds', () => {
  const g = setup(); g.G.up.chain = 1; const e = enemy(g, 70); g.bindEnemy(e);
  for (const state of ['pause', 'level']) {
    g.G.state = state; g.audioEvents.length = 0; g.update(4);
    assert.deepEqual(names(g), []);
  }
});
