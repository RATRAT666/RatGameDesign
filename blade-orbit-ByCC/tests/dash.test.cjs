const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./harness.cjs');

function key(game, code, repeat = false) {
  game.listeners.keydown({ code, repeat });
}
function pointer(game, button, x, y) {
  game.mainCanvas.listeners.pointerdown({ button, clientX: x, clientY: y });
}

test('Shift dashes along movement, blocks repeat and respects cooldown and pause', () => {
  const game = loadGame(); game.newGame();
  key(game, 'KeyD'); key(game, 'ShiftLeft');
  const p = game.G.p;
  assert.equal(p.dashX, 1); assert.equal(p.dashY, 0);
  assert.ok(p.inv > 0); assert.ok(p.dashCd > 0);
  game.update(.05); assert.ok(p.x > 10);
  const dashTime = p.dashT; key(game, 'ShiftLeft', true); key(game, 'ShiftRight');
  assert.equal(p.dashT, dashTime);
  game.G.state = 'pause'; const cd = p.dashCd; game.update(.05);
  assert.equal(p.dashCd, cd);
  game.newGame('pause'); key(game, 'ShiftLeft');
  assert.equal(game.G.p.dashT, 0);
});

test('right click dashes towards pointer and does not activate mouse movement or pause menu', () => {
  const game = loadGame(); game.newGame();
  pointer(game, 2, 900, 337.5);
  assert.ok(game.G.p.dashX > .99); assert.ok(game.G.p.dashCd > 0);
  let prevented = false; game.mainCanvas.listeners.contextmenu({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  game.newGame('pause'); pointer(game, 2, 900, 337.5);
  assert.equal(game.G.state, 'pause');
});

test('dash invulnerability protects from enemy contact and expires', () => {
  const game = loadGame(); game.newGame();
  key(game, 'ShiftLeft');
  const p = game.G.p, enemy = game.spawnEnemy('slime', 0, 0);
  enemy.type = { ...enemy.type, dmg: 10 };
  game.update(.01); assert.equal(p.hp, 100);
  p.dashT = 0; p.inv = 0; enemy.x = p.x; enemy.y = p.y;
  game.update(.01); assert.ok(p.hp < 100);
});
