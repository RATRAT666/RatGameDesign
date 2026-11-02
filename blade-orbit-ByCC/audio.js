'use strict';
// ================== 音效：WebAudio 实时合成（无外部音频文件） ==================
const SFX = (() => {
  let ac = null, master, sfx, mus, noiseBuf;
  let muted = false;
  try { muted = localStorage.getItem('bladeOrbit.muted') === '1'; } catch (e) { }
  const VOL = .6, last = {};
  const n2f = n => 440 * Math.pow(2, (n - 69) / 12);

  // 浏览器要求用户交互后才能出声：在首次按键 / 点击时调用
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = muted ? 0 : VOL;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -12; comp.ratio.value = 8;
    master.connect(comp); comp.connect(ac.destination);
    sfx = ac.createGain(); sfx.connect(master);
    mus = ac.createGain(); mus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    setInterval(schedule, 25);
  }

  function tone(type, f0, f1, dur, vol, at = 0, bus = sfx) {
    const t = ac.currentTime + Math.max(0, at);
    const o = ac.createOscillator(), gn = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(vol, t + .005);
    gn.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(gn); gn.connect(bus);
    o.start(t); o.stop(t + dur + .05);
  }
  function noise(dur, vol, f0, f1, at = 0, type = 'lowpass', bus = sfx) {
    const t = ac.currentTime + Math.max(0, at);
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const fl = ac.createBiquadFilter(); fl.type = type;
    fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const gn = ac.createGain();
    gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(fl); fl.connect(gn); gn.connect(bus);
    s.start(t, Math.random() * .4); s.stop(t + dur + .05);
  }

  // 音效表：[最小间隔（秒，防止同帧堆叠爆音）, 合成函数]
  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31];
  const DEF = {
    hit: [.035, () => { noise(.05, .18, 4000, 900); tone('square', 320, 140, .05, .05); }],
    crit: [.05, () => { noise(.09, .28, 7000, 1200); tone('square', 980, 260, .09, .08); }],
    kill: [.03, k => { const f = n2f(57 + PENTA[Math.min(k, 13)]); tone('triangle', f, f * .5, .1, .14); noise(.06, .08, 2500, 600); }],
    gem: [.025, k => { const f = n2f(76 + PENTA[Math.min(k, 8)]); tone('square', f, f, .05, .035); tone('sine', f * 2, f * 2, .08, .05, .02); }],
    level: [.2, () => { [72, 76, 79, 84].forEach((n, i) => tone('square', n2f(n), n2f(n), .14, .07, i * .06)); tone('triangle', n2f(96), n2f(96), .3, .05, .24); }],
    pick: [.1, () => { tone('square', n2f(79), n2f(91), .08, .07); tone('triangle', n2f(91), n2f(91), .18, .08, .06); }],
    rare: [.1, () => { [79, 83, 86, 91].forEach((n, i) => tone('triangle', n2f(n), n2f(n), .2, .1, i * .05)); noise(.3, .06, 9000, 4000, 0, 'highpass'); }],
    evolve: [.3, () => { [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => tone('square', n2f(n), n2f(n), .25, .06, i * .05)); tone('sawtooth', n2f(48), n2f(36), .9, .1); noise(.8, .12, 8000, 1500, .1, 'highpass'); }],
    hurt: [.1, () => { tone('sawtooth', 240, 60, .25, .14); noise(.18, .25, 1500, 200); }],
    block: [.04, () => { tone('square', 1500, 2100, .04, .04); }],
    boom: [.05, () => { noise(.35, .35, 1800, 60); tone('sine', 130, 40, .3, .25); }],
    nova: [.1, () => { tone('sine', 360, 60, .4, .25); noise(.3, .18, 3000, 300); }],
    thunder: [.06, () => { noise(.4, .35, 6000, 150); tone('sawtooth', 110, 40, .3, .1); }],
    zap: [.06, () => { tone('sawtooth', 1800, 600, .08, .05); noise(.08, .1, 9000, 3000, 0, 'highpass'); }],
    dagger: [.06, () => { noise(.07, .1, 8000, 2500, 0, 'highpass'); tone('triangle', 1400, 700, .06, .04); }],
    shot: [.07, () => { tone('square', 520, 260, .08, .035); }],
    wave: [.5, () => { for (const at of [0, .6]) { tone('sawtooth', 220, 220, .5, .08, at); tone('sawtooth', 233, 233, .5, .08, at); } }],
    roar: [.5, () => { tone('sawtooth', 95, 38, 1.2, .2); tone('square', 60, 30, 1.2, .1); noise(1.1, .3, 900, 80); }],
    bossDie: [1, () => { noise(1.5, .45, 4000, 40); tone('sine', 90, 25, 1.4, .35); tone('sawtooth', 200, 30, 1, .1); }],
    win: [1, () => {
      [[72, 0], [76, .12], [79, .24], [84, .36], [79, .6], [84, .72]].forEach(([n, at], i) => tone('square', n2f(n), n2f(n), i === 5 ? .7 : .16, .08, at));
      tone('triangle', n2f(48), n2f(48), 1.2, .15, .36);
    }],
    lose: [1, () => { [67, 63, 60, 55].forEach((n, i) => tone('triangle', n2f(n), n2f(n) * .98, .3, .14, i * .22)); }],
  };
  function play(name, k = 0) {
    if (!ac || muted) return;
    const d = DEF[name]; if (!d) return;
    const now = ac.currentTime;
    if (now - (last[name] || -9) < d[0]) return;
    last[name] = now; d[1](k);
  }

  // ---- 背景音乐：小调琶音循环，首领战换成更快更暗的进行 ----
  const SONGS = {
    play: { bpm: 126, ch: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]] }, // Am F C G
    boss: { bpm: 152, ch: [[57, 60, 64], [58, 62, 65], [52, 56, 59], [57, 60, 64]] }, // Am Bb E Am
  };
  let song = null, step = 0, nextT = 0;
  function music(name) {
    const s = name ? SONGS[name] : null;
    if (s === song) return;
    song = s; step = 0;
    if (ac) nextT = ac.currentTime + .1;
  }
  function schedule() {
    if (!song || muted) return;
    const sd = 60 / song.bpm / 4, now = ac.currentTime, boss = song === SONGS.boss;
    if (nextT < now - .05) nextT = now + .05; // 标签页切回后跳过积压的拍子
    while (nextT < now + .15) {
      const at = nextT - now, s = step % 16, ch = song.ch[(step >> 4) % 4];
      if (s % 2 === 0) tone('square', n2f(ch[0] - 24), n2f(ch[0] - 24), sd * 1.6, .05, at, mus); // 低音
      const n = ch[[0, 1, 2, 1][s % 4]] + (s >= 8 ? 12 : 0);
      tone('triangle', n2f(n), n2f(n), sd * .9, .07, at, mus);                                   // 琶音
      if (s % 8 === 0) tone('sine', 150, 42, .14, .3, at, mus);                                  // 底鼓
      if (s % 4 === 2) noise(.03, .05, 9000, 7000, at, 'highpass', mus);                         // 踩镲
      if (boss && s % 8 === 4) noise(.12, .14, 3500, 900, at, 'bandpass', mus);                  // 军鼓
      step++; nextT += sd;
    }
  }

  function duck(on) { if (ac) mus.gain.setTargetAtTime(on ? .25 : 1, ac.currentTime, .08); }
  function toggle() {
    muted = !muted;
    try { localStorage.setItem('bladeOrbit.muted', muted ? '1' : '0'); } catch (e) { }
    if (ac) master.gain.setTargetAtTime(muted ? 0 : VOL, ac.currentTime, .03);
  }
  return { init, play, music, duck, toggle, get muted() { return muted; } };
})();
