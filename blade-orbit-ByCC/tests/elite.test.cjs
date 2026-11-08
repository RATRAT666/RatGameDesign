const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./harness.cjs');

test('elite encounter preserves survivors and replaces waves with capped reinforcements', () => {
  const g = loadGame();
  g.newGame();
  const survivor = g.spawnEnemy('slime', 120, 0);
  g.G.t = 88;
  g.spawner(.01);
  const elite = g.G.elite;
  assert.ok(elite.type.elite);
  assert.deepEqual(Array.from(g.G.enemies), [survivor, elite]);
  g.spawner(2);
  assert.equal(g.G.enemies.length, 3);
  g.G.t = 140;
  for (let i = 0; i < 10; i++) g.spawner(4);
  assert.equal(g.G.enemies.length, 7);
  assert.equal(g.G.waveIdx, 3);
});

test('a surviving elite delays the boss, and defeating it resumes the run', () => {
  const g = loadGame();
  g.newGame();
  g.G.t = 180;
  g.spawner(.01);
  assert.equal(g.G.boss, null);
  const elite = g.G.elite;
  g.hurt(elite, 100000, 0, 0, 0, false, true);
  assert.equal(g.G.elite, null);
  assert.equal(g.G.state, 'play');
  assert.ok(g.G.gems.some(gem => gem.v === 12));
  g.G.t = 181;
  g.spawner(.7);
  assert.ok(g.G.enemies.some(e => e !== elite && !e.dead && !e.type.boss));
  g.G.t = 192;
  g.spawner(.01);
  assert.ok(g.G.boss.type.boss);
});
