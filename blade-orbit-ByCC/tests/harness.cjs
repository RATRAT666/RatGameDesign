const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const draw = new Proxy({}, { get: (_, key) => key === 'measureText' ? () => ({ width: 0 }) : () => {} });
function canvas() {
  const listeners = {};
  return { listeners, width: 400, height: 225, style: {}, getContext: () => draw,
    addEventListener(name, fn) { listeners[name] = fn; }, getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 225 }) };
}

function loadGame() {
  const mainCanvas = canvas();
  const store = new Map();
  const listeners = {};
  const audioEvents = [];
  const buttonListeners = {};
  const debugLevel = { addEventListener: (name, fn) => { buttonListeners[name] = fn; }, blur() {} };
  const sandbox = {
    audioEvents, buttonListeners, debugLevel, mainCanvas, listeners, console, Math, Set, Map, Float32Array, Uint8Array, Array, Object, String, Number,
    JSON, Date, Promise, performance: { now: () => 0 },
    innerWidth: 1200, innerHeight: 675,
    document: { getElementById: id => id === 'c' ? mainCanvas : id === 'debug-level' ? debugLevel : null, createElement: tag => tag === 'canvas' ? canvas() : {} },
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) },
    addEventListener: (name, fn) => { listeners[name] = fn; },
    requestAnimationFrame() {}, setTimeout() { return 0; }, clearTimeout() {},
    SFX: { init() {}, music() {}, duck() {}, play(name, k) { audioEvents.push({ name, k }); }, toggle() {} },
  };
  sandbox.window = sandbox;
  const filename = path.join(root, 'game.js');
  const source = fs.readFileSync(filename, 'utf8') + `\n;globalThis.__gameTest = {
    audioEvents, buttonListeners, debugLevel, mainCanvas, get G(){return G}, set G(v){G=v}, UPS, EVOS, RARITY, ETYPES, rollChoices, openLevel, choose,
    spawnEnemy, spawner, update, hurt, bladeList, newGame, CHAIN, updateChains, chainTarget, chainOccupied, retractChain, bindEnemy, chainPull, get keys(){return keys}, get listeners(){return listeners},
    spawnBoss, bossAI, enemyShot, novaBlast,
    get S(){return S}, get W(){return W}, get H(){return H}
  };`;
  vm.runInNewContext(source, sandbox, { filename });
  return sandbox.__gameTest;
}

module.exports = { loadGame };
