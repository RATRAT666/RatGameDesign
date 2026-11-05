const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup() {
  const sources = [], frequencies = [];
  const param = (frequency = false) => ({ value: 0,
    setValueAtTime(v, t) { if (frequency) frequencies.push([v, t]); },
    exponentialRampToValueAtTime(v, t) { if (frequency) frequencies.push([v, t]); },
    linearRampToValueAtTime() {}, setTargetAtTime() {} });
  const node = () => ({ connect() {} });
  class AudioContext {
    constructor() { this.currentTime = 0; this.sampleRate = 100; this.destination = {}; this.state = 'running'; }
    createGain() { return { ...node(), gain: param() }; }
    createDynamicsCompressor() { return { ...node(), threshold: param(), ratio: param() }; }
    createBuffer(channels, length) { return { getChannelData: () => new Float32Array(length) }; }
    createOscillator() { return this.source({ frequency: param(true) }); }
    createBufferSource() { return this.source({}); }
    createBiquadFilter() { return { ...node(), frequency: param(true) }; }
    source(extra) { const s = { ...node(), ...extra, start(t) { this.startTime = t; }, stop(t) { this.stopTime = t; } }; sources.push(s); return s; }
  }
  const sandbox = { window: { AudioContext }, localStorage: { getItem() { return null; }, setItem() {} }, setInterval() {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'audio.js'), 'utf8') + '\n;globalThis.api = SFX;', sandbox);
  sandbox.api.init();
  return { api: sandbox.api, sources, frequencies };
}

const sounds = ['chainCast', 'chainLink', 'chainHit', 'chainTension', 'chainBreak', 'chainRecall', 'bindOn', 'bindOff'];
test('every chain sound creates finite sources with positive frequencies', () => {
  for (const sound of sounds) {
    const { api, sources, frequencies } = setup(); api.play(sound);
    assert(sources.length > 0, sound); assert(frequencies.length > 0, sound);
    for (const s of sources) assert(Number.isFinite(s.startTime) && Number.isFinite(s.stopTime) && s.stopTime > s.startTime, sound);
    for (const [v, t] of frequencies) assert(Number.isFinite(v) && v > 0 && Number.isFinite(t), sound);
  }
});
test('same sound is throttled even when currentTime is zero', () => {
  for (const sound of sounds) {
    const { api, sources } = setup(); api.play(sound); const n = sources.length;
    api.play(sound); assert.equal(sources.length, n, sound);
  }
});
test('mute prevents new sources', () => {
  const { api, sources } = setup(); api.toggle();
  for (const sound of sounds) api.play(sound);
  assert.equal(sources.length, 0);
});
