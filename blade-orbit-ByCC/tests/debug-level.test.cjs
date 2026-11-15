const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./harness.cjs');

test('debug level uses normal upgrade flow and preserves XP', () => {
  const game = loadGame();
  game.newGame();
  game.G.xp = 3;
  game.buttonListeners.click({ currentTarget: game.debugLevel });
  assert.equal(game.G.lv, 2);
  assert.equal(game.G.xp, 3);
  assert.equal(game.G.pendingLv, 1);
  assert.equal(game.G.debugRun, true);
  game.update(0.4);
  assert.equal(game.G.state, 'level');
  assert.equal(game.G.choices.length, 3);
  game.choose(0);
  assert.equal(game.G.pendingLv, 0);
  assert.equal(game.G.state, 'play');
});

test('debug level ignores non-playing screens', () => {
  const game = loadGame();
  for (const state of ['title', 'pause', 'level', 'over', 'win']) {
    game.newGame(state);
    game.buttonListeners.click({ currentTarget: game.debugLevel });
    assert.equal(game.G.lv, 1, state);
    assert.equal(game.G.state, state);
    assert.notEqual(game.G.debugRun, true);
  }
});
