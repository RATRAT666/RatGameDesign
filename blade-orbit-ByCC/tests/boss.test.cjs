const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./harness.cjs');

test('purple shots survive blades and nova, but can still hurt the player', () => {
  const g = loadGame();
  g.newGame();
  g.G.spawnT = 1000;
  g.G.sw.spin = 0;
  g.enemyShot(24, 0, 0, 0);
  g.enemyShot(24, 0, 0, 0, 10, 4, true);
  g.update(.01);
  assert.equal(g.G.eps.length, 1);
  const purple = g.G.eps[0];
  assert.ok(purple.unbreakable);
  g.enemyShot(24, 0, 0, 0);
  const red = g.G.eps[1];
  g.novaBlast(24, 0, 30, 1, false);
  assert.ok(red.dead);
  assert.ok(!purple.dead);
  purple.x = g.G.p.x;
  purple.y = g.G.p.y;
  g.update(.01);
  assert.equal(g.G.p.hp, 90);
});

test('boss warns before each of four phrases and keeps lane escape gaps', () => {
  const g = loadGame();
  g.newGame();
  g.spawnBoss();
  g.G.bossIn = 0;
  const boss = g.G.boss;
  for (const kind of [0, 1, 2, 3]) {
    g.G.t = boss.nextPhrase;
    g.G.eps.length = 0;
    g.bossAI(boss);
    const phrase = boss.phrase;
    assert.equal(phrase.kind, kind);
    assert.equal(g.G.eps.length, 0);
    assert.ok(phrase.at - g.G.t >= .75);
    while (boss.phrase) {
      g.G.t = phrase.at;
      g.bossAI(boss);
    }
    assert.ok(g.G.eps.some(q => q.unbreakable));
    if (kind === 2) {
      const xs = new Set(g.G.eps.map(q => q.x));
      assert.equal(xs.size, 8);
      assert.ok(!xs.has(g.G.p.x - 16));
    }
  }
});

test('hard keeps the old elite health and strengthens the final boss', () => {
  const g = loadGame();
  g.newGame('play', 'hard');
  const eliteHp = g.spawnEnemy('elite', 80, 0).hp;
  g.spawnBoss();
  const hardBossHp = g.G.boss.hp;
  g.newGame('play', 'normal');
  assert.equal(eliteHp, g.ETYPES.elite.hp);
  assert.ok(g.spawnEnemy('elite', 80, 0).hp < eliteHp);
  g.spawnBoss();
  assert.ok(g.G.boss.hp < hardBossHp);
});

test('laser telegraphs, misses outside its lane, and deals damage inside it', () => {
  const g = loadGame();
  g.newGame();
  g.spawnBoss();
  g.G.bossIn = 0;
  const boss = g.G.boss;
  boss.phraseIndex = 4;
  g.G.t = boss.nextPhrase;
  g.bossAI(boss);
  assert.equal(g.G.p.hp, 100);
  g.G.p.x = 40;
  g.G.t = boss.phrase.at;
  g.bossAI(boss);
  assert.equal(g.G.p.hp, 100);
  g.G.p.x = 0;
  g.G.p.y = 550;
  g.bossAI(boss);
  assert.equal(g.G.p.hp, 82);
  assert.equal(g.G.eps.length, 0);
});
