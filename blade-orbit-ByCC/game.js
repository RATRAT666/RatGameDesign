'use strict';
// ================== 剑环 · Blade Orbit —— 第 3 轮：音效 / 稀有度与进化 / 存档 ==================
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const buf = document.createElement('canvas'), g = buf.getContext('2d');
let W = 400, H = 225, S = 3;
function resize() {
  S = Math.max(2, Math.round(innerHeight / 230));
  cv.width = innerWidth; cv.height = innerHeight;
  W = Math.ceil(innerWidth / S); H = Math.ceil(innerHeight / S);
  buf.width = W; buf.height = H;
}
addEventListener('resize', resize); resize();

const TAU = Math.PI * 2;
const BOSS_T = 150; // 2:30 首领降临，击败首领即通关（整局约 3 分钟）
const TS = 1.6;     // 难度时间倍率：压缩原 4 分钟的难度曲线
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function hash(x, y) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function distSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(px - x1 - dx * t, py - y1 - dy * t);
}

// ---------- 输入 ----------
const keys = {};
const mouse = { x: 0, y: 0, down: false };
addEventListener('keydown', e => { SFX.init(); if (!e.repeat) onKey(e.code); keys[e.code] = true; });
addEventListener('keyup', e => { keys[e.code] = false; });
cv.addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
cv.addEventListener('pointerdown', e => { SFX.init(); mouse.x = e.clientX; mouse.y = e.clientY; mouse.down = true; onClick(); });
addEventListener('pointerup', () => { mouse.down = false; });
// 切走窗口时自动暂停，并清空按键（避免回来时角色自己跑）
addEventListener('blur', () => {
  for (const k in keys) keys[k] = false;
  mouse.down = false;
  if (G && G.state === 'play') { G.state = 'pause'; SFX.duck(true); }
});

// ---------- 存档：最高记录 + 进化图鉴 ----------
const SAVE_KEY = 'bladeOrbit.save';
const SAVE = (() => {
  const def = { plays: 0, wins: 0, bestTime: 0, bestKills: 0, bestLv: 0, evos: [] };
  try { return Object.assign(def, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) { return def; }
})();
function recordRun(win) {
  const rec = [];
  SAVE.plays++;
  if (win) { SAVE.wins++; if (!SAVE.bestTime || G.t < SAVE.bestTime) { SAVE.bestTime = G.t; rec.push('time'); } }
  if (G.kills > SAVE.bestKills) { SAVE.bestKills = G.kills; rec.push('kills'); }
  if (G.lv > SAVE.bestLv) { SAVE.bestLv = G.lv; rec.push('lv'); }
  G.newRec = rec;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { }
}
function discoverEvo(id) {
  if (SAVE.evos.includes(id)) return;
  SAVE.evos.push(id);
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { }
}
const fmtTime = t => { t = Math.floor(t); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

// ---------- 地面瓦片 ----------
const TILES = [];
for (let v = 0; v < 8; v++) {
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const x = c.getContext('2d');
  x.fillStyle = v % 2 ? '#1b2420' : '#1d2722'; x.fillRect(0, 0, 16, 16);
  for (let i = 0; i < 5; i++) { x.fillStyle = Math.random() < .5 ? '#212c26' : '#18201c'; x.fillRect(rand(0, 15) | 0, rand(0, 15) | 0, 1, 1); }
  if (v === 2 || v === 5) { // 草丛
    x.fillStyle = '#2c4632'; const ox = rand(3, 10) | 0, oy = rand(4, 10) | 0;
    x.fillRect(ox, oy, 1, 3); x.fillRect(ox + 2, oy - 1, 1, 4); x.fillRect(ox + 4, oy + 1, 1, 2);
    x.fillStyle = '#3d6142'; x.fillRect(ox + 2, oy - 1, 1, 1);
  }
  if (v === 3) { x.fillStyle = '#2b2f3a'; x.fillRect(5, 8, 4, 3); x.fillStyle = '#3d4352'; x.fillRect(6, 8, 2, 1); }
  if (v === 4) { x.fillStyle = '#c4607e'; x.fillRect(7, 6, 1, 1); x.fillRect(6, 7, 1, 1); x.fillRect(8, 7, 1, 1); x.fillRect(7, 8, 1, 1); x.fillStyle = '#ffd65a'; x.fillRect(7, 7, 1, 1); x.fillStyle = '#2c4632'; x.fillRect(7, 9, 1, 2); }
  if (v === 6) { x.fillStyle = '#24302a'; x.fillRect(2, 3, 12, 1); x.fillRect(1, 4, 3, 1); }
  if (v === 7) { x.fillStyle = '#5a8fd6'; x.fillRect(10, 4, 1, 1); x.fillRect(4, 11, 1, 1); }
  TILES.push(c);
}

// ---------- 像素字体（数字与少量字母） ----------
const FONT = {
  '0': [7, 5, 5, 5, 7], '1': [2, 6, 2, 2, 7], '2': [7, 1, 7, 4, 7], '3': [7, 1, 7, 1, 7], '4': [5, 5, 7, 1, 1],
  '5': [7, 4, 7, 1, 7], '6': [7, 4, 7, 5, 7], '7': [7, 1, 1, 1, 1], '8': [7, 5, 7, 5, 7], '9': [7, 5, 7, 1, 7],
  'L': [4, 4, 4, 4, 7], 'V': [5, 5, 5, 5, 2], ':': [0, 2, 0, 2, 0], '+': [0, 2, 7, 2, 0], '/': [1, 1, 2, 4, 4],
  ' ': [0, 0, 0, 0, 0], 'x': [0, 5, 2, 5, 0], '!': [2, 2, 2, 0, 2],
};
function glyphs(c, str, ox, oy, s) {
  for (let i = 0; i < str.length; i++) {
    const gl = FONT[str[i]]; if (!gl) continue;
    for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++)
      if (gl[r] & (4 >> k)) c.fillRect(ox + (i * 4 + k) * s, oy + r * s, s, s);
  }
}
function pxText(c, str, x, y, s, col, align = 'c') {
  const w = (str.length * 4 - 1) * s;
  let ox = Math.round(align === 'c' ? x - w / 2 : align === 'r' ? x - w : x); y = Math.round(y);
  c.fillStyle = '#1a1423';
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) glyphs(c, str, ox + dx * s, oy(y, dy, s), s);
  c.fillStyle = col; glyphs(c, str, ox, y, s);
}
const oy = (y, dy, s) => y + dy * s;

// ---------- 敌人类型 ----------
const ETYPES = {
  slime: { hp: 12, spd: 22, dmg: 8, r: 5, xp: 1, spr: ['slime', 'slime2'], anim: .3, kbm: 1, cols: ['#8ee05a', '#3f9a3a', '#1f5a33'] },
  bat: { hp: 6, spd: 46, dmg: 5, r: 4, xp: 1, spr: ['bat', 'bat2'], anim: .1, kbm: 1.4, cols: ['#b46cff', '#6a2fb8', '#e8403f'], wobble: true },
  skel: { hp: 42, spd: 27, dmg: 12, r: 5, xp: 3, spr: ['skel', 'skel2'], anim: .22, kbm: .6, cols: ['#f4f4f4', '#c7d4e1', '#7b8ea3'] },
  mage: { hp: 24, spd: 20, dmg: 8, r: 5, xp: 3, spr: ['mage', 'mage'], anim: .3, kbm: .8, cols: ['#e8403f', '#9b1d33', '#ffd65a'], ranged: true },
  boss: { hp: 3200, spd: 20, dmg: 20, r: 11, xp: 0, spr: ['boss', 'boss'], anim: .4, kbm: .04, cols: ['#b46cff', '#6a2fb8', '#e8403f'], boss: true },
};

// ---------- 升级 ----------
const UPS = [
  { id: 'blade', name: '再添一剑', icon: 'sword', max: 6, desc: () => '环绕之剑 +1', apply: () => G.sw.n++ },
  { id: 'sharp', name: '淬火锋刃', icon: 'flame', max: 5, desc: () => '所有伤害 +30%', apply: () => G.sw.dmg *= 1.3 },
  { id: 'spin', name: '旋风', icon: 'swirl', max: 5, desc: () => '剑的旋转速度 +25%', apply: () => G.sw.spin *= 1.25 },
  { id: 'long', name: '巨剑', icon: 'sword', max: 4, desc: () => '剑体积 +20%，环绕半径 +15%', apply: () => { G.sw.size *= 1.2; G.sw.r *= 1.15; } },
  { id: 'crit', name: '致命一击', icon: 'star', max: 5, desc: () => '暴击率 +10%（暴击伤害 ×2.5）', apply: () => G.sw.crit += .1 },
  { id: 'boots', name: '疾风靴', icon: 'boot', max: 4, desc: () => '移动速度 +12%', apply: () => G.p.spd *= 1.12 },
  { id: 'magnet', name: '磁石', icon: 'magnet', max: 4, desc: () => '经验拾取范围 +50%', apply: () => G.p.magnet *= 1.5 },
  { id: 'heart', name: '龙之心', icon: 'heart', max: 5, desc: () => '最大生命 +25，并回满生命', apply: () => { G.p.maxHp += 25; G.p.hp = G.p.maxHp; } },
  { id: 'leech', name: '嗜血', icon: 'fang', max: 3, desc: () => '击杀时 10% 几率回复 4 生命', apply: () => { } },
  { id: 'dagger', name: '飞剑诀', icon: 'dagger', max: 5, desc: l => l ? '飞剑数量 +1，冷却 -10%' : '定时向最近的敌人射出穿透飞剑', apply: () => { } },
  { id: 'thunder', name: '天雷', icon: 'bolt', max: 5, desc: l => l ? '落雷数量 +1，伤害 +25%' : '每 2.5 秒召唤落雷劈向敌人', apply: () => { } },
  { id: 'boom', name: '爆裂诅咒', icon: 'bomb', max: 4, desc: () => '敌人死亡时 +15% 几率爆炸（可连锁）', apply: () => { } },
  { id: 'knock', name: '震荡', icon: 'gem3', max: 3, desc: () => '击退 +60%，命中使敌人减速', apply: () => G.sw.kb *= 1.6 },
  { id: 'ring2', name: '逆旋之环', icon: 'ring', max: 4, req: () => lvOf('blade') >= 2, desc: l => l ? '外环之剑 +1' : '外圈生成 3 把逆向旋转的剑', apply: () => { } },
  { id: 'nova', name: '震荡波', icon: 'nova', max: 5, desc: l => l ? '冲击波伤害 +25%，冷却 -12%' : '每 4 秒释放冲击波，重创并击退周围敌人，同时击碎弹幕', apply: () => { } },
];
// 进化：满足两项前置后出现的金色卡，每局每种只能拿一次
const EVOS = [
  { id: 'tdag', name: '雷霆飞剑', icon: 'tdag', base: 'dagger', req: { dagger: 3, thunder: 2 }, desc: () => '飞剑命中时放出连锁闪电，弹射 3 个敌人，飞剑穿透 +2', apply: () => { } },
  { id: 'holy', name: '圣焰剑环', icon: 'holy', base: 'blade', req: { blade: 4, sharp: 3 }, desc: () => '环绕之剑化为金焰，伤害 ×1.4，命中点燃敌人持续灼烧', apply: () => { G.sw.dmg *= 1.4; } },
  { id: 'quake', name: '天崩地裂', icon: 'quake', base: 'nova', req: { nova: 3, knock: 2 }, desc: () => '冲击波范围 +30%，并在 0.35 秒后引发一次余震；命中使敌人眩晕', apply: () => { } },
  { id: 'bloodboom', name: '血爆', icon: 'bloodboom', base: 'boom', req: { boom: 2, leech: 1 }, desc: () => '爆炸范围与伤害 +50%，每次爆炸回复 1 生命', apply: () => { } },
];
// 稀有度：一次给多级。传说只在进化卡上出现
const RARITY = [
  { k: 'common', name: '', lv: 1, col: '#5ad1ff', hi: '#3a3156' },
  { k: 'rare', name: '稀有', lv: 2, col: '#ffd65a', hi: '#5a4a2a' },
  { k: 'epic', name: '史诗', lv: 3, col: '#b46cff', hi: '#4a2f6a' },
  { k: 'evo', name: '进化', lv: 1, col: '#ff8a3a', hi: '#6a3a1a' },
];
const evoReady = v => !G.up[v.id] && Object.entries(v.req).every(([id, n]) => lvOf(id) >= n);
const lvOf = id => G.up[id] || 0;
// 环绕的所有剑：内环顺时针，逆旋之环（外圈）逆时针
function bladeList() {
  const sw = G.sw, out = [];
  for (let i = 0; i < sw.n; i++) out.push({ a: sw.ang + i * TAU / sw.n, r: sw.r, i, dir: 1 });
  const m = lvOf('ring2') ? 2 + lvOf('ring2') : 0;
  for (let j = 0; j < m; j++) out.push({ a: -sw.ang * .8 + j * TAU / m, r: sw.r * 1.75, i: 12 + j, dir: -1 });
  return out;
}

// ---------- 游戏状态 ----------
let G;
function newGame(state = 'play') {
  G = {
    state, t: 0, real: 0, stateT: 0,
    p: { x: 0, y: 0, vx: 0, vy: 0, hp: 100, maxHp: 100, spd: 64, inv: 0, face: 1, walk: 0, magnet: 30 },
    sw: { n: 2, r: 24, spin: 3.4, dmg: 7, size: 1, ang: 0, crit: .05, kb: 70 },
    lv: 1, xp: 0, xpNext: 6, pendingLv: 0, toLevel: -1, choices: null, cardRects: [], cardT: 0,
    enemies: [], gems: [], parts: [], nums: [], projs: [], fx: [], booms: [],
    kills: 0, spawnT: 0, waveIdx: 0, up: {}, shake: 0, freeze: 0, hurtFlash: 0, flash: 0,
    dagT: 1, thT: 1, novaT: 2, cam: { x: 0, y: 0 }, banner: null,
    eps: [], boss: null, bossIn: 0, bossDead: 0,
    combo: 0, comboT: 0, bestCombo: 0, rerolls: 2, quakes: [], newRec: [], evoFx: 0, gemSeq: 0, gemSeqT: 0,
  };
  SFX.music(state === 'play' ? 'play' : null);
  if (state === 'play') SFX.duck(false);
}
newGame('title');

function onKey(code) {
  if (code === 'KeyM') { SFX.toggle(); return; }
  if (G.state === 'title') { newGame('play'); return; }
  if ((G.state === 'over' || G.state === 'win') && G.stateT > .8 && (code === 'KeyR' || code === 'Space' || code === 'Enter')) { newGame('play'); return; }
  if (G.state === 'level' && G.cardT > .35) {
    const i = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[code];
    if (i !== undefined && G.choices[i]) choose(i);
    else if (code === 'KeyR') reroll();
  }
  if (code === 'KeyP' || code === 'Escape') {
    if (G.state === 'play') { G.state = 'pause'; SFX.duck(true); } else if (G.state === 'pause') { G.state = 'play'; SFX.duck(false); }
  }
}
function onClick() {
  if (G.state === 'title') { newGame('play'); return; }
  if ((G.state === 'over' || G.state === 'win') && G.stateT > .8) { newGame('play'); return; }
  if (G.state === 'pause') { G.state = 'play'; SFX.duck(false); return; }
  if (G.state === 'level' && G.cardT > .35) {
    const r = G.rerollRect;
    if (r && mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h) { reroll(); return; }
    G.cardRects.forEach((r, i) => {
      if (mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h) choose(i);
    });
  }
}

// ---------- 特效工具 ----------
function part(x, y, col, n, spd = 60, life = .5, size = 1, grav = 0) {
  for (let i = 0; i < n && G.parts.length < 700; i++) {
    const a = Math.random() * TAU, s = spd * (.3 + Math.random() * .7);
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (.6 + Math.random() * .4), max: life, col, size, grav });
  }
}
function addNum(x, y, txt, col, big) { G.nums.push({ x: x + rand(-3, 3), y, txt: String(txt), col, big, life: big ? .8 : .6 }); }
function shake(v) { G.shake = Math.max(G.shake, v); }

// ---------- 伤害与击杀 ----------
function hurt(e, dmg, kx, ky, kb, canCrit, silent) {
  if (e.dead) return;
  const crit = canCrit && Math.random() < G.sw.crit;
  if (crit) dmg *= 2.5;
  dmg = Math.max(1, Math.round(dmg * rand(.85, 1.15)));
  e.hp -= dmg; e.flash = .09; e.squash = .15;
  e.kvx += kx * kb * e.type.kbm; e.kvy += ky * kb * e.type.kbm;
  if (lvOf('knock')) e.slow = .5 + lvOf('knock') * .3;
  addNum(e.x, e.y - 8, dmg, crit ? '#ffd65a' : silent ? '#ff9a5a' : '#ffffff', crit);
  if (!silent) SFX.play(crit ? 'crit' : 'hit');
  for (let i = 0; i < (crit ? 6 : silent ? 1 : 3); i++) {
    const a = Math.atan2(ky, kx) + rand(-.7, .7), s = rand(40, 110);
    G.parts.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: .25, max: .25, col: crit ? '#ffd65a' : '#ffffff', size: 1, grav: 0 });
  }
  if (crit) { G.freeze = Math.max(G.freeze, .03); shake(1.5); }
  if (e.hp <= 0) kill(e);
}
function kill(e, quiet) {
  e.dead = true;
  if (e.type.boss) { bossDie(e); return; }
  if (quiet) { part(e.x, e.y, e.type.cols[0], 3, 50, .4, 1); return; }
  G.kills++;
  G.combo++; G.comboT = 2.2; G.bestCombo = Math.max(G.bestCombo, G.combo);
  if (G.combo % 50 === 0) { addNum(G.p.x, G.p.y - 20, G.combo + ' !', '#ff8a3a', true); SFX.play('rare'); }
  SFX.play('kill', Math.floor(G.combo / 6));
  const c = e.type.cols;
  part(e.x, e.y, c[0], 8, 70, .5, 2); part(e.x, e.y, c[1], 6, 50, .6, 1); part(e.x, e.y, '#ffffff', 3, 90, .2, 1);
  G.fx.push({ k: 'puff', x: e.x, y: e.y, life: .2, max: .2, r: e.type.r + 3 });
  const xp = e.type.xp;
  const v = xp >= 3 ? (Math.random() < .15 ? 10 : 3) : (Math.random() < .04 ? 3 : 1);
  G.gems.push({ x: e.x, y: e.y, vx: rand(-30, 30), vy: rand(-40, -10), v, mag: false, t: 0 });
  // 稀有掉落：烤鸡腿（回血）与磁石（吸取全场经验）
  const r = Math.random();
  if (r < .006) G.gems.push({ x: e.x, y: e.y, vx: rand(-20, 20), vy: -30, v: 0, item: 'heart', mag: false, t: 0 });
  else if (r < .009) G.gems.push({ x: e.x, y: e.y, vx: rand(-20, 20), vy: -30, v: 0, item: 'magnet', mag: false, t: 0 });
  if (lvOf('leech') && Math.random() < .1 && G.p.hp < G.p.maxHp) {
    G.p.hp = Math.min(G.p.maxHp, G.p.hp + 4); addNum(G.p.x, G.p.y - 12, '+4', '#8ee05a');
  }
  if (lvOf('boom') && Math.random() < .15 * lvOf('boom')) G.booms.push({ x: e.x, y: e.y, t: .07 });
  shake(.8);
}
function bossDie(b) {
  G.boss = null; G.bossDead = 1; G.kills++; G.eps = [];
  for (const e of G.enemies) if (e !== b && !e.dead) { e.dead = true; part(e.x, e.y, e.type.cols[0], 5, 60, .5, 1); }
  G.enemies = [];
  G.state = 'win'; G.stateT = -1.2; // 先慢放爆炸，再弹出结算
  G.freeze = .25; G.flash = .6; shake(10);
  recordRun(true);
  SFX.music(null); SFX.play('bossDie');
  const run = G;
  setTimeout(() => { if (G === run) SFX.play('win'); }, 1200);
  for (let i = 0; i < 6; i++) setTimeout(() => {
    if (!G || G.bossDead !== 1) return;
    const x = b.x + rand(-14, 14), y = b.y + rand(-16, 12);
    part(x, y, '#b46cff', 14, 130, .8, 2); part(x, y, '#ffd65a', 10, 100, .6, 2); part(x, y, '#ffffff', 6, 150, .3, 1);
    G.fx.push({ k: 'boom', x, y, life: .3, max: .3, r: 22 }); shake(5); SFX.play('boom');
  }, 150 + i * 170);
  part(b.x, b.y, '#b46cff', 60, 180, 1.4, 2); part(b.x, b.y, '#e8403f', 30, 140, 1.2, 2);
  G.fx.push({ k: 'ring', x: b.x, y: b.y, life: .9, max: .9, r: 200, col: '#ffffff' });
  for (let i = 0; i < 40; i++) G.gems.push({ x: b.x, y: b.y, vx: rand(-90, 90), vy: rand(-90, 90), v: 10, mag: false, t: 0 });
}
function explode(x, y) {
  const blood = G.up.bloodboom, R = blood ? 39 : 26, dmg = G.sw.dmg * 2.2 * (blood ? 1.5 : 1);
  G.fx.push({ k: 'boom', x, y, life: .3, max: .3, r: R, blood });
  part(x, y, '#ffd65a', 10, 120, .4, 2); part(x, y, blood ? '#e8403f' : '#e8913a', 10, 80, .5, 2); part(x, y, blood ? '#9b1d33' : '#e8403f', 6, 60, .6, 1);
  for (const e of G.enemies) {
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < R + e.type.r && !e.dead) hurt(e, dmg, (e.x - x) / (d || 1), (e.y - y) / (d || 1), 120, false, true);
  }
  if (blood && G.p.hp < G.p.maxHp) G.p.hp = Math.min(G.p.maxHp, G.p.hp + 1);
  SFX.play('boom');
  shake(2.5);
}
function hurtPlayer(dmg) {
  const p = G.p;
  p.hp -= dmg; p.inv = .7; G.hurtFlash = .35; G.freeze = .07; shake(4);
  G.combo = 0;
  part(p.x, p.y, '#e8403f', 12, 80, .5, 2);
  addNum(p.x, p.y - 12, dmg, '#e8403f', true);
  SFX.play('hurt');
  if (p.hp <= 0) {
    p.hp = 0; G.state = 'over'; G.stateT = 0;
    part(p.x, p.y, '#5ad1ff', 30, 120, 1, 2); part(p.x, p.y, '#ffffff', 20, 160, .6, 1);
    shake(8);
    recordRun(false);
    SFX.music(null); SFX.play('lose');
  }
}

// ---------- 升级流程 ----------
function gainXp(v) {
  G.xp += v;
  while (G.xp >= G.xpNext) {
    G.xp -= G.xpNext; G.lv++; G.pendingLv++;
    G.xpNext = Math.floor(6 + G.lv * 3.2 + G.lv * G.lv * .18);
    if (G.toLevel < 0) levelBurst();
  }
}
function levelBurst() {
  const p = G.p;
  G.toLevel = .35; G.flash = .25;
  SFX.play('level');
  G.fx.push({ k: 'ring', x: p.x, y: p.y, life: .45, max: .45, r: 90, col: '#ffd65a' });
  part(p.x, p.y, '#ffd65a', 24, 140, .6, 2); part(p.x, p.y, '#ffffff', 12, 100, .4, 1);
  for (const e of G.enemies) {
    const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
    if (d < 90) { e.kvx += dx / d * 260; e.kvy += dy / d * 260; e.flash = .1; }
  }
  shake(3);
}
const HEAL = { id: 'heal', name: '烤鸡腿', icon: 'heart', max: 99, desc: () => '回复 40 生命', apply: () => { G.p.hp = Math.min(G.p.maxHp, G.p.hp + 40); } };
function rollRarity(u) {
  const room = u.max - lvOf(u.id), r = Math.random();
  // 越往后越容易出高稀有度
  const epic = .05 + G.t / BOSS_T * .06, rare = epic + .2;
  if (r < epic && room >= 3) return RARITY[2];
  if (r < rare && room >= 2) return RARITY[1];
  return RARITY[0];
}
function rollChoices() {
  const ch = [];
  // 进化条件满足时必定出现在第一张
  const evo = EVOS.filter(evoReady);
  if (evo.length) { const v = evo[Math.random() * evo.length | 0]; ch.push({ u: v, rar: RARITY[3], evo: true }); }
  const pool = UPS.filter(u => lvOf(u.id) < u.max && (!u.req || u.req()));
  while (ch.length < 3 && pool.length) {
    const u = pool.splice(Math.random() * pool.length | 0, 1)[0];
    ch.push({ u, rar: rollRarity(u) });
  }
  while (ch.length < 3) ch.push({ u: HEAL, rar: RARITY[0] });
  return ch;
}
function openLevel() {
  G.choices = rollChoices(); G.state = 'level'; G.cardT = 0;
  SFX.duck(true);
  if (G.choices.some(c => c.rar.lv > 1 || c.evo)) setTimeout(() => SFX.play('rare'), 180);
}
function reroll() {
  if (G.rerolls <= 0 || G.state !== 'level') return;
  G.rerolls--; G.choices = rollChoices(); G.cardT = .2;
  SFX.play('pick');
}
function choose(i) {
  const { u, rar, evo } = G.choices[i];
  const n = evo ? 1 : Math.min(rar.lv, u.max - lvOf(u.id));
  for (let k = 0; k < n; k++) { G.up[u.id] = lvOf(u.id) + 1; u.apply(); }
  if (u.id === 'dagger') G.dagT = .3;
  if (u.id === 'thunder') G.thT = .3;
  if (u.id === 'nova') G.novaT = .5;
  G.pendingLv--; G.state = 'play'; G.choices = null;
  SFX.duck(false);
  if (evo) {
    discoverEvo(u.id);
    G.banner = { txt: '进化！' + u.name, life: 2.4, evo: true };
    G.evoFx = 1.2; G.flash = .5; G.freeze = .15; shake(6);
    G.fx.push({ k: 'ring', x: G.p.x, y: G.p.y, life: .8, max: .8, r: 160, col: '#ff8a3a' });
    G.fx.push({ k: 'ring', x: G.p.x, y: G.p.y, life: .6, max: .6, r: 110, col: '#ffd65a' });
    part(G.p.x, G.p.y, '#ff8a3a', 40, 170, .9, 2); part(G.p.x, G.p.y, '#ffd65a', 30, 120, .8, 2);
    SFX.play('evolve');
  } else {
    G.banner = { txt: u.name + (G.up[u.id] > 1 ? ' Lv.' + G.up[u.id] : '') + (n > 1 ? `（+${n}）` : ''), life: 1.6, col: rar.lv > 1 ? rar.col : null };
    part(G.p.x, G.p.y, rar.lv > 1 ? rar.col : '#5ad1ff', 16 + n * 8, 90, .5, 2);
    SFX.play(n > 1 ? 'rare' : 'pick');
  }
  G.toLevel = G.pendingLv > 0 ? .25 : -1;
}

// ---------- 生成敌人 ----------
function spawnEnemy(type, x, y) {
  if (G.enemies.length >= 320) return;
  const T = ETYPES[type], p = G.p;
  if (x === undefined) {
    const a = Math.random() * TAU, d = Math.hypot(W, H) / 2 + 16;
    x = p.x + Math.cos(a) * d; y = p.y + Math.sin(a) * d;
  }
  const hm = 1 + G.t * TS / 45;
  const en = { type: T, x, y, hp: T.hp * hm, maxHp: T.hp * hm, kvx: 0, kvy: 0, cd: new Float32Array(24), flash: 0, squash: 0, slow: 0, anim: Math.random(), seed: Math.random() * 10, dead: false, shootT: rand(1.5, 3.5) };
  G.enemies.push(en); return en;
}
function pickType() {
  const r = Math.random(), t = G.t * TS;
  if (t > 100 && r < .12) return 'mage';
  if (t > 70 && r < .3) return 'skel';
  if (t > 25 && r < .62) return 'bat';
  return 'slime';
}
function spawner(dt) {
  if (G.boss) return; // 首领战期间只靠首领自带的召唤
  G.spawnT -= dt;
  const interval = Math.max(.11, .9 - G.t * TS * .0036);
  while (G.spawnT <= 0) {
    G.spawnT += interval;
    const n = 1 + Math.floor(G.t * TS / 55);
    for (let i = 0; i < n; i++) spawnEnemy(pickType());
  }
  // 敌潮：环形包围
  const waves = [32, 68, 108];
  if (G.waveIdx < waves.length && G.t >= waves[G.waveIdx]) {
    const type = ['bat', 'slime', 'skel'][G.waveIdx], n = 28 + G.waveIdx * 8;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU;
      spawnEnemy(type, G.p.x + Math.cos(a) * 150, G.p.y + Math.sin(a) * 150);
    }
    G.banner = { txt: '敌潮来袭！', life: 2, warn: true };
    SFX.play('wave');
    G.waveIdx++;
  }
  if (G.t >= BOSS_T && !G.boss && !G.bossDead) spawnBoss();
}
function spawnBoss() {
  const p = G.p;
  for (const e of G.enemies) if (!e.dead) { e.hp = 0; kill(e, true); }
  G.enemies = [];
  const b = spawnEnemy('boss', p.x, p.y - 110);
  b.hp = b.maxHp = 5000 * (1 + (G.sw.dmg - 7) / 30); b.atkT = 2.5; b.atkN = 0; b.summonT = 6; b.rage = false;
  G.boss = b; G.bossIn = 1.2;
  G.banner = { txt: '深渊领主降临！', life: 2.6, warn: true };
  G.fx.push({ k: 'ring', x: b.x, y: b.y, life: .7, max: .7, r: 120, col: '#b46cff' });
  part(b.x, b.y, '#b46cff', 30, 140, .8, 2);
  shake(7); G.flash = .3;
  SFX.play('roar'); SFX.music('boss');
}
// 敌方弹幕
function enemyShot(x, y, a, spd, dmg = 8, life = 4) {
  G.eps.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, dmg, life, t: 0 });
}

// 首领行为：环形弹幕 → 扇形瞄准 → 螺旋，半血狂暴并持续召唤小怪
function bossAI(b, dt, d) {
  if (G.bossIn > 0) return;
  const rage = b.hp < b.maxHp * .5;
  if (rage && !b.rage) {
    b.rage = true; b.flash = .3;
    G.banner = { txt: '领主狂暴了！', life: 2, warn: true };
    G.fx.push({ k: 'ring', x: b.x, y: b.y, life: .6, max: .6, r: 140, col: '#e8403f' });
    part(b.x, b.y, '#e8403f', 30, 140, .8, 2); shake(6); G.flash = .25;
    SFX.play('roar');
  }
  const p = G.p, aim = Math.atan2(p.y - b.y, p.x - b.x);
  b.atkT -= dt;
  if (b.atkT <= 0) {
    const k = b.atkN++ % 3;
    b.atkT = rage ? 1.7 : 2.4;
    if (k === 0) { // 环
      const n = rage ? 20 : 14, off = Math.random() * TAU;
      for (let i = 0; i < n; i++) enemyShot(b.x, b.y, off + i / n * TAU, 52, 9, 5);
    } else if (k === 1) { // 扇形瞄准
      const n = rage ? 7 : 5;
      for (let i = 0; i < n; i++) enemyShot(b.x, b.y, aim + (i - (n - 1) / 2) * .22, 78, 9, 4);
    } else { // 螺旋（分帧发射）
      b.spiral = rage ? 26 : 18; b.spiralT = 0; b.spiralA = Math.random() * TAU;
    }
    part(b.x, b.y, '#e8403f', 8, 70, .4, 2); G.fx.push({ k: 'ring', x: b.x, y: b.y, life: .25, max: .25, r: 26, col: '#e8403f' });
    SFX.play('shot');
  }
  if (b.spiral > 0 && (b.spiralT -= dt) <= 0) {
    b.spiralT = .07; b.spiral--; b.spiralA += .5;
    enemyShot(b.x, b.y, b.spiralA, 60, 8, 5); enemyShot(b.x, b.y, b.spiralA + Math.PI, 60, 8, 5);
  }
  b.summonT -= dt;
  if (b.summonT <= 0) {
    b.summonT = rage ? 5 : 8;
    for (let i = 0; i < (rage ? 8 : 5); i++) {
      const a = Math.random() * TAU; spawnEnemy(Math.random() < .5 ? 'bat' : 'slime', b.x + Math.cos(a) * 24, b.y + Math.sin(a) * 24);
    }
    part(b.x, b.y, '#b46cff', 14, 80, .5, 2);
  }
}
function novaBlast(x, y, R, dmg, after) {
  const quake = G.up.quake;
  G.fx.push({ k: 'ring', x, y, life: .4, max: .4, r: R * 1.1, col: quake ? '#ffd65a' : '#c4f0ff' });
  G.fx.push({ k: 'ring', x, y, life: .3, max: .3, r: R * .8, col: quake ? '#ff8a3a' : '#5ad1ff' });
  part(x, y, quake ? '#ffd65a' : '#c4f0ff', after ? 12 : 18, 150, .4, 2);
  for (const e of G.enemies) {
    const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy) || 1;
    if (e.dead || d >= R + e.type.r) continue;
    hurt(e, e.type.boss ? dmg * .5 : dmg, dx / d, dy / d, after ? 120 : 200, false, true);
    if (quake && !e.type.boss) e.stun = .8;
  }
  for (const q of G.eps) if (Math.hypot(q.x - x, q.y - y) < R) { q.dead = true; part(q.x, q.y, '#ffd65a', 3, 60, .3, 1); }
  shake(after ? 3 : 2); G.flash = Math.max(G.flash, .05);
  SFX.play(after ? 'boom' : 'nova');
}
// 雷霆飞剑：从命中点向附近敌人弹射闪电
function chainZap(from, n, dmg) {
  const hit = new Set([from]);
  let cur = from;
  for (let i = 0; i < n; i++) {
    let best = null, bd = 60;
    for (const e of G.enemies) {
      if (e.dead || hit.has(e)) continue;
      const d = Math.hypot(e.x - cur.x, e.y - cur.y);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) break;
    const pts = [[cur.x, cur.y]];
    for (let k = 1; k < 4; k++) pts.push([cur.x + (best.x - cur.x) * k / 4 + rand(-4, 4), cur.y + (best.y - cur.y) * k / 4 + rand(-4, 4)]);
    pts.push([best.x, best.y]);
    G.fx.push({ k: 'bolt', pts, life: .15, max: .15 });
    part(best.x, best.y, '#5ad1ff', 4, 60, .3, 1);
    hit.add(best); hurt(best, dmg, 0, 0, 0, false, true);
    cur = best;
  }
  if (hit.size > 1) SFX.play('zap');
}
// ---------- 更新 ----------
function update(dt) {
  G.real += dt; G.stateT += dt;
  if (G.state === 'title') { G.sw.ang += G.sw.spin * dt; return; }
  if (G.state === 'level') { G.cardT += dt; return; }
  if (G.state === 'pause') return;
  if (G.state === 'over' || G.state === 'win') { updateParts(dt * .5); return; }
  if (G.freeze > 0) { G.freeze -= dt; return; }
  G.t += dt;
  const p = G.p, sw = G.sw;

  // 玩家移动（键盘优先，其次鼠标按住朝指针方向）
  let mx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  let my = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  if (!mx && !my && mouse.down) {
    const wx = mouse.x / S - W / 2 + G.cam.x - p.x, wy = mouse.y / S - H / 2 + G.cam.y - p.y;
    if (Math.hypot(wx, wy) > 4) { mx = wx; my = wy; }
  }
  const ml = Math.hypot(mx, my);
  const tvx = ml ? mx / ml * p.spd : 0, tvy = ml ? my / ml * p.spd : 0;
  const k = Math.min(1, dt * 14);
  p.vx += (tvx - p.vx) * k; p.vy += (tvy - p.vy) * k;
  p.x += p.vx * dt; p.y += p.vy * dt;
  if (Math.abs(mx) > .1) p.face = Math.sign(mx);
  p.walk = ml ? p.walk + dt : 0;
  p.inv -= dt;
  G.cam.x += (p.x - G.cam.x) * Math.min(1, dt * 7);
  G.cam.y += (p.y - G.cam.y) * Math.min(1, dt * 7);

  // 环绕之剑（内环 + 逆旋外环）
  sw.ang += sw.spin * dt;
  for (const b of bladeList()) {
    const a = b.a, ca = Math.cos(a), sa = Math.sin(a), d = b.dir;
    const x1 = p.x + ca * (b.r - 3 * sw.size), y1 = p.y + sa * (b.r - 3 * sw.size);
    const x2 = p.x + ca * (b.r + 7 * sw.size), y2 = p.y + sa * (b.r + 7 * sw.size);
    for (const e of G.enemies) {
      if (e.dead || e.cd[b.i] > 0) continue;
      if (distSeg(e.x, e.y, x1, y1, x2, y2) < e.type.r + 2 * sw.size) {
        // 击退方向 = 径向 + 切向（扫击感）
        let kx = ca * .6 - sa * .8 * d, ky = sa * .6 + ca * .8 * d; const kl = Math.hypot(kx, ky);
        hurt(e, sw.dmg, kx / kl, ky / kl, sw.kb, true);
        if (G.up.holy) e.burn = 2; // 圣焰：点燃
        e.cd[b.i] = .28;
      }
    }
    // 剑刃可以格挡敌方弹幕
    for (const q of G.eps) {
      if (q.dead) continue;
      if (distSeg(q.x, q.y, x1, y1, x2, y2) < 3 + 2 * sw.size) {
        q.dead = true; part(q.x, q.y, '#ffd65a', 5, 70, .3, 1); part(q.x, q.y, '#ffffff', 2, 40, .2, 1);
        SFX.play('block');
      }
    }
  }

  // 震荡波（进化「天崩地裂」：范围更大，附带余震与眩晕）
  if (lvOf('nova')) {
    G.novaT -= dt;
    if (G.novaT <= 0) {
      const L = lvOf('nova'); G.novaT = 4 * Math.pow(.88, L - 1);
      novaBlast(p.x, p.y, (70 + L * 6) * (G.up.quake ? 1.3 : 1), sw.dmg * 3 * Math.pow(1.25, L - 1), false);
      if (G.up.quake) G.quakes.push({ t: .35, mul: .6 });
    }
  }
  for (const qk of G.quakes) {
    if ((qk.t -= dt) <= 0) {
      const L = lvOf('nova');
      novaBlast(p.x, p.y, (70 + L * 6) * 1.3 * .85, sw.dmg * 3 * Math.pow(1.25, L - 1) * qk.mul, true);
    }
  }
  G.quakes = G.quakes.filter(qk => qk.t > 0);

  spawner(dt);
  if (G.bossIn > 0) G.bossIn -= dt;

  // 敌人
  const grid = new Map();
  for (const e of G.enemies) {
    const key = ((e.x >> 4) * 73856093) ^ ((e.y >> 4) * 19349663);
    let l = grid.get(key); if (!l) grid.set(key, l = []); l.push(e);
  }
  for (const e of G.enemies) {
    if (e.dead) continue;
    for (let i = 0; i < 24; i++) e.cd[i] -= dt;
    e.flash -= dt; e.squash -= dt; e.slow -= dt; e.anim += dt;
    // 圣焰灼烧：每 0.4 秒结算一次
    if (e.burn > 0) {
      e.burn -= dt; e.burnT = (e.burnT || 0) - dt;
      if (Math.random() < .3) G.parts.push({ x: e.x + rand(-3, 3), y: e.y - rand(0, 4), vx: 0, vy: -20, life: .3, max: .3, col: Math.random() < .5 ? '#ffd65a' : '#ff8a3a', size: 1, grav: 0 });
      if (e.burnT <= 0) { e.burnT = .4; hurt(e, sw.dmg * .35, 0, 0, 0, false, true); if (e.dead) continue; }
    }
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
    let spd = e.type.spd * (e.slow > 0 ? .45 : 1);
    if (e.type.boss && G.bossIn > 0) spd = 0;
    if (e.stun > 0) { e.stun -= dt; spd = 0; }
    let dir = 1;
    if (e.type.ranged) { // 法师：保持距离并发射弹幕
      if (d < 70) dir = -.8; else if (d < 95) dir = 0;
      e.shootT -= dt;
      if (e.shootT <= 0 && d < 150 && !(e.stun > 0)) {
        e.shootT = 2.6; const a = Math.atan2(dy, dx);
        enemyShot(e.x, e.y, a, 62, 7); part(e.x, e.y, '#e8403f', 4, 40, .3, 1);
        SFX.play('shot');
      }
    }
    if (e.type.boss) bossAI(e, dt, d);
    let vx = dx / d * spd * dir, vy = dy / d * spd * dir;
    if (e.type.wobble && spd) { const w = Math.sin(G.t * 5 + e.seed) * 25; vx += -dy / d * w; vy += dx / d * w; }
    e.x += (vx + e.kvx) * dt; e.y += (vy + e.kvy) * dt;
    const kd = Math.min(1, dt * 9); e.kvx -= e.kvx * kd; e.kvy -= e.kvy * kd;
    // 分离
    const cx = e.x >> 4, cy = e.y >> 4;
    for (let ox = -1; ox <= 1; ox++) for (let oy2 = -1; oy2 <= 1; oy2++) {
      const l = grid.get(((cx + ox) * 73856093) ^ ((cy + oy2) * 19349663)); if (!l) continue;
      for (const o of l) {
        if (o === e) continue;
        const sx = e.x - o.x, sy = e.y - o.y, sd = Math.hypot(sx, sy), min = e.type.r + o.type.r;
        if (sd < min && sd > .01) { const push = (min - sd) * .5; e.x += sx / sd * push; e.y += sy / sd * push; }
      }
    }
    if (d < e.type.r + 5 && p.inv <= 0 && G.state === 'play' && !(e.stun > 0)) hurtPlayer(e.type.dmg);
    // 远离太多则回收到玩家附近
    if (d > 400 && !e.type.boss) { const a = Math.random() * TAU, r = Math.hypot(W, H) / 2 + 16; e.x = p.x + Math.cos(a) * r; e.y = p.y + Math.sin(a) * r; }
  }
  // 敌方弹幕
  for (const q of G.eps) {
    q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; q.t += dt;
    if (Math.random() < .5) G.parts.push({ x: q.x, y: q.y, vx: 0, vy: 0, life: .2, max: .2, col: '#e8403f', size: 1, grav: 0 });
    if (!q.dead && p.inv <= 0 && Math.hypot(q.x - p.x, q.y - p.y) < 6) { q.dead = true; hurtPlayer(q.dmg); }
  }
  G.eps = G.eps.filter(q => q.life > 0 && !q.dead);

  // 飞剑诀
  if (lvOf('dagger')) {
    G.dagT -= dt;
    if (G.dagT <= 0) {
      const L = lvOf('dagger');
      G.dagT = 1.5 * Math.pow(.9, L - 1);
      const tg = G.enemies.filter(e => !e.dead).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
      for (let i = 0; i < L; i++) {
        const e = tg[i % Math.max(1, tg.length)];
        const a = e ? Math.atan2(e.y - p.y, e.x - p.x) + (i >= tg.length ? rand(-.3, .3) : 0) : Math.random() * TAU;
        G.projs.push({ x: p.x, y: p.y, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, a, life: 1.1, pierce: 2 + (L >> 1) + (G.up.tdag ? 2 : 0), hit: new Set() });
      }
      SFX.play('dagger');
    }
  }
  // 天雷
  if (lvOf('thunder')) {
    G.thT -= dt;
    if (G.thT <= 0) {
      const L = lvOf('thunder'); G.thT = 2.5;
      const vis = G.enemies.filter(e => !e.dead && Math.abs(e.x - p.x) < W / 2 && Math.abs(e.y - p.y) < H / 2);
      for (let i = 0; i < L && vis.length; i++) {
        const e = vis.splice(Math.random() * vis.length | 0, 1)[0];
        const pts = []; let x = e.x + rand(-20, 20), y = e.y - H;
        while (y < e.y) { pts.push([x, y]); y += rand(8, 16); x += (e.x - x) * .3 + rand(-6, 6); }
        pts.push([e.x, e.y]);
        G.fx.push({ k: 'bolt', pts, life: .2, max: .2 });
        G.fx.push({ k: 'ring', x: e.x, y: e.y, life: .25, max: .25, r: 18, col: '#5ad1ff' });
        part(e.x, e.y, '#5ad1ff', 10, 100, .4, 1); part(e.x, e.y, '#ffffff', 6, 60, .3, 2);
        const dmg = G.sw.dmg * 2.6 * Math.pow(1.25, L - 1);
        for (const o of G.enemies) if (!o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 18) hurt(o, dmg, 0, 0, 0, false, true);
        shake(2); G.flash = Math.max(G.flash, .08);
        SFX.play('thunder');
      }
    }
  }
  // 飞剑弹道
  for (const pr of G.projs) {
    pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.life -= dt;
    if (Math.random() < .6) G.parts.push({ x: pr.x, y: pr.y, vx: 0, vy: 0, life: .2, max: .2, col: G.up.tdag ? '#5ad1ff' : '#c7d4e1', size: 1, grav: 0 });
    for (const e of G.enemies) {
      if (e.dead || pr.hit.has(e) || pr.life <= 0) continue;
      if (Math.hypot(e.x - pr.x, e.y - pr.y) < e.type.r + 3) {
        pr.hit.add(e); hurt(e, G.sw.dmg * 1.3, Math.cos(pr.a), Math.sin(pr.a), 60, true);
        if (G.up.tdag) chainZap(e, 3, G.sw.dmg * 1.1);
        if (--pr.pierce <= 0) pr.life = 0;
      }
    }
  }
  G.projs = G.projs.filter(pr => pr.life > 0);
  // 连锁爆炸
  for (const b of G.booms) b.t -= dt;
  const ready = G.booms.filter(b => b.t <= 0); G.booms = G.booms.filter(b => b.t > 0);
  ready.forEach(b => explode(b.x, b.y));
  G.enemies = G.enemies.filter(e => !e.dead);

  // 经验宝石（连续拾取时音高递增）
  G.gemSeqT -= dt; if (G.gemSeqT <= 0) G.gemSeq = 0;
  G.comboT -= dt; if (G.comboT <= 0) G.combo = 0;
  for (const gm of G.gems) {
    gm.t += dt;
    const dx = p.x - gm.x, dy = p.y - gm.y, d = Math.hypot(dx, dy) || 1;
    if (!gm.mag && d < p.magnet && gm.t > .25) gm.mag = true;
    if (gm.mag) {
      const s = 60 + gm.t * 200; gm.vx += (dx / d * s - gm.vx) * Math.min(1, dt * 10); gm.vy += (dy / d * s - gm.vy) * Math.min(1, dt * 10);
    } else { gm.vx *= .9; gm.vy *= .9; }
    gm.x += gm.vx * dt; gm.y += gm.vy * dt;
    if (d < 6) {
      gm.dead = true;
      if (gm.item === 'heart') {
        const h = Math.min(30, p.maxHp - p.hp); p.hp += h;
        addNum(p.x, p.y - 12, '+' + Math.round(h), '#8ee05a', true); part(p.x, p.y, '#8ee05a', 14, 70, .5, 2); SFX.play('pick');
      } else if (gm.item === 'magnet') {
        for (const o of G.gems) if (!o.item) { o.mag = true; o.t = Math.max(o.t, .3); }
        G.fx.push({ k: 'ring', x: p.x, y: p.y, life: .5, max: .5, r: 120, col: '#5ad1ff' }); SFX.play('rare');
      } else {
        gainXp(gm.v);
        part(gm.x, gm.y, gm.v >= 10 ? '#ffd65a' : '#5ad1ff', 3, 30, .3, 1);
        SFX.play('gem', G.gemSeq++); G.gemSeqT = .4;
      }
    }
  }
  G.gems = G.gems.filter(gm => !gm.dead);
  if (G.gems.length > 400) G.gems.splice(0, G.gems.length - 400);
  if (G.evoFx > 0) G.evoFx -= dt;

  updateParts(dt);
  if (G.toLevel >= 0) { G.toLevel -= dt; if (G.toLevel < 0 && G.pendingLv > 0) openLevel(); }
}
function updateParts(dt) {
  for (const q of G.parts) {
    q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.grav * dt;
    q.vx *= Math.pow(.02, dt); q.vy *= Math.pow(.02, dt); q.life -= dt;
  }
  G.parts = G.parts.filter(q => q.life > 0);
  for (const n of G.nums) { n.life -= dt; n.y -= dt * 22; }
  G.nums = G.nums.filter(n => n.life > 0);
  for (const f of G.fx) f.life -= dt;
  G.fx = G.fx.filter(f => f.life > 0);
  G.shake = Math.max(0, G.shake - dt * 18);
  G.hurtFlash -= dt; G.flash -= dt;
  if (G.banner && (G.banner.life -= dt) <= 0) G.banner = null;
}

// ---------- 渲染 ----------
function spr(name, x, y, flip = false, white = false, sx = 1, sy = 1) {
  const im = SPR[name + (white ? '_w' : '')];
  g.save(); g.translate(Math.round(x), Math.round(y)); g.scale(flip ? -sx : sx, sy);
  g.drawImage(im, -(im.width >> 1), -im.height); g.restore();
}
function shadow(x, y, w) {
  g.fillStyle = 'rgba(0,0,0,.35)';
  g.fillRect(Math.round(x - w), Math.round(y - 1), w * 2, 2);
  g.fillRect(Math.round(x - w + 1), Math.round(y - 2), w * 2 - 2, 4);
}
function render() {
  g.imageSmoothingEnabled = false; ctx.imageSmoothingEnabled = false;
  const p = G.p, sw = G.sw;
  const shx = (Math.random() - .5) * G.shake * 2, shy = (Math.random() - .5) * G.shake * 2;
  const camX = Math.round(G.cam.x - W / 2 + shx), camY = Math.round(G.cam.y - H / 2 + shy);
  g.save(); g.translate(-camX, -camY);

  // 地面
  for (let ty = Math.floor(camY / 16); ty <= Math.floor((camY + H) / 16); ty++)
    for (let tx = Math.floor(camX / 16); tx <= Math.floor((camX + W) / 16); tx++) {
      const v = hash(tx, ty);
      g.drawImage(TILES[v < .72 ? (tx + ty) & 1 : 2 + ((v * 1000) | 0) % 6], tx * 16, ty * 16);
    }

  // 经验宝石
  for (const gm of G.gems) {
    const bob = Math.sin(gm.t * 6 + gm.x) * 1;
    if (gm.item) { // 道具：发光脉冲
      g.globalAlpha = .35 + Math.sin(G.real * 6) * .2; g.fillStyle = gm.item === 'heart' ? '#e8403f' : '#5ad1ff';
      g.fillRect(Math.round(gm.x - 5), Math.round(gm.y - 5 + bob), 10, 10); g.globalAlpha = 1;
      spr(gm.item, gm.x, gm.y + bob + 4); continue;
    }
    const name = gm.v >= 10 ? 'gem3' : gm.v >= 3 ? 'gem2' : 'gem';
    spr(name, gm.x, gm.y + bob + 2);
  }

  // 实体（按 y 排序）
  const list = G.enemies.map(e => ({ y: e.y, e }));
  if (G.state !== 'over') list.push({ y: p.y, player: true });
  list.sort((a, b) => a.y - b.y);
  for (const it of list) {
    if (it.player) {
      shadow(p.x, p.y + 6, 4);
      if (p.inv > 0 && Math.floor(p.inv * 20) % 2) continue;
      const fr = p.walk > 0 && Math.floor(p.walk * 8) % 2 ? 'hero2' : 'hero';
      const bob = p.walk > 0 ? -Math.abs(Math.sin(p.walk * 12)) : Math.sin(G.real * 3) * .5;
      spr(fr, p.x, p.y + 6 + bob, p.face < 0, p.inv > .55);
    } else {
      const e = it.e, T = e.type;
      shadow(e.x, e.y + T.r, T.r - 1);
      const fr = T.spr[Math.floor(e.anim / T.anim) % 2];
      const sq = e.squash > 0 ? 1 + e.squash * 2 : 1;
      const fly = T.wobble ? -4 + Math.sin(G.t * 8 + e.seed) * 1.5 : 0;
      spr(fr, e.x, e.y + T.r + fly, p.x < e.x, e.flash > 0, sq, 2 - sq);
      if (e.stun > 0) { // 眩晕：头顶转圈的星星
        for (let k = 0; k < 2; k++) {
          const a = G.real * 8 + k * Math.PI;
          g.fillStyle = '#ffd65a'; g.fillRect(Math.round(e.x + Math.cos(a) * 4), Math.round(e.y - T.r - 6 + Math.sin(a) * 1.5), 1, 1);
        }
      }
      if (e.hp < e.maxHp && T.hp >= 40) {
        g.fillStyle = '#1a1423'; g.fillRect(Math.round(e.x - 6), Math.round(e.y - 12), 12, 2);
        g.fillStyle = '#e8403f'; g.fillRect(Math.round(e.x - 6), Math.round(e.y - 12), Math.round(12 * e.hp / e.maxHp), 2);
      }
    }
  }

  // 环绕之剑：光弧 + 残影 + 本体
  if (G.state !== 'over') {
    g.lineWidth = 2;
    const holy = G.up.holy;
    for (const b of bladeList()) {
      const a = b.a, dr = b.dir, rr = b.r;
      g.strokeStyle = holy && dr > 0 ? 'rgba(255,170,60,.3)' : b.dir > 0 ? 'rgba(160,220,255,.18)' : 'rgba(255,190,120,.18)';
      g.beginPath(); g.arc(p.x, p.y, rr + 4 * sw.size, dr > 0 ? a - .9 : a, dr > 0 ? a : a + .9); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.28)';
      g.beginPath(); g.arc(p.x, p.y, rr + 6 * sw.size, dr > 0 ? a - .45 : a, dr > 0 ? a : a + .45); g.stroke();
      const im = holy && dr > 0 ? SPR.sword_h : SPR.sword;
      for (let k = 3; k >= 0; k--) {
        const ak = a - k * .11 * dr;
        g.save(); g.globalAlpha = k ? .22 / k : 1;
        g.translate(p.x + Math.cos(ak) * rr, p.y + Math.sin(ak) * rr);
        g.rotate(ak + Math.PI / 2); g.scale(sw.size, sw.size);
        g.drawImage(k ? SPR.sword_w : im, -2, -7); g.restore();
      }
      if (holy && dr > 0 && G.state === 'play' && Math.random() < .3) {
        const fx = p.x + Math.cos(a) * (rr + rand(0, 6) * sw.size), fy = p.y + Math.sin(a) * (rr + rand(0, 6) * sw.size);
        G.parts.push({ x: fx, y: fy, vx: 0, vy: -15, life: .25, max: .25, col: Math.random() < .5 ? '#ffd65a' : '#ff8a3a', size: 1, grav: 0 });
      }
    }
  }

  // 敌方弹幕
  for (const q of G.eps) spr('orb', q.x, q.y + 2);

  // 飞剑
  for (const pr of G.projs) {
    g.save(); g.translate(Math.round(pr.x), Math.round(pr.y)); g.rotate(pr.a + Math.PI / 2);
    g.drawImage(G.up.tdag ? SPR.daggerz : SPR.dagger, -1, -3); g.restore();
  }

  // 特效
  for (const f of G.fx) {
    const t = 1 - f.life / f.max;
    if (f.k === 'ring') {
      g.strokeStyle = f.col; g.globalAlpha = 1 - t; g.lineWidth = 2;
      g.beginPath(); g.arc(f.x, f.y, f.r * (.2 + t * .8), 0, TAU); g.stroke(); g.globalAlpha = 1;
    } else if (f.k === 'boom') {
      g.fillStyle = t < .3 ? '#ffffff' : t < .6 ? (f.blood ? '#ff6b5a' : '#ffd65a') : (f.blood ? '#9b1d33' : '#e8913a'); g.globalAlpha = 1 - t * .8;
      g.beginPath(); g.arc(f.x, f.y, f.r * (.5 + t * .5), 0, TAU); g.fill(); g.globalAlpha = 1;
    } else if (f.k === 'puff') {
      g.strokeStyle = '#ffffff'; g.globalAlpha = 1 - t; g.lineWidth = 1;
      g.beginPath(); g.arc(f.x, f.y, f.r * (.5 + t), 0, TAU); g.stroke(); g.globalAlpha = 1;
    } else if (f.k === 'bolt') {
      for (const [w, col] of [[3, '#2a6fd6'], [1, '#ffffff']]) {
        g.strokeStyle = col; g.lineWidth = w; g.beginPath();
        f.pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
      }
    }
  }
  // 粒子
  for (const q of G.parts) {
    g.globalAlpha = Math.min(1, q.life / q.max * 1.5);
    g.fillStyle = q.col; g.fillRect(Math.round(q.x), Math.round(q.y), q.size, q.size);
  }
  g.globalAlpha = 1;
  // 伤害数字
  for (const n of G.nums) {
    const pop = n.big && n.life > .65 ? 3 : n.big ? 2 : 1;
    g.globalAlpha = Math.min(1, n.life * 4);
    pxText(g, n.txt, n.x, n.y, pop, n.col);
  }
  g.globalAlpha = 1;
  // 玩家血条
  if (G.state === 'play' || G.state === 'level') {
    g.fillStyle = '#1a1423'; g.fillRect(Math.round(p.x - 8), Math.round(p.y + 9), 16, 3);
    g.fillStyle = '#4a1a2a'; g.fillRect(Math.round(p.x - 7), Math.round(p.y + 10), 14, 1);
    g.fillStyle = p.hp / p.maxHp < .3 ? '#ff6b5a' : '#e8403f';
    g.fillRect(Math.round(p.x - 7), Math.round(p.y + 10), Math.round(14 * p.hp / p.maxHp), 1);
  }
  g.restore();

  ctx.drawImage(buf, 0, 0, W * S, H * S);
  drawOverlay();
}

// ---------- 屏幕层 UI ----------
const FONT_CN = "'Microsoft YaHei','PingFang SC','Noto Sans SC',sans-serif";
function cnText(txt, x, y, size, col, align = 'center', outline = true) {
  ctx.font = `bold ${size}px ${FONT_CN}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (outline) { ctx.lineWidth = Math.max(3, size / 6); ctx.strokeStyle = '#1a1423'; ctx.lineJoin = 'round'; ctx.strokeText(txt, x, y); }
  ctx.fillStyle = col; ctx.fillText(txt, x, y);
}
function pixBox(x, y, w, h, fill, border, hi) {
  x = Math.round(x); y = Math.round(y);
  const b = S;
  ctx.fillStyle = '#1a1423'; ctx.fillRect(x - b, y, w + 2 * b, h); ctx.fillRect(x, y - b, w, h + 2 * b);
  ctx.fillStyle = border; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill; ctx.fillRect(x + b, y + b, w - 2 * b, h - 2 * b);
  if (hi) { ctx.fillStyle = hi; ctx.fillRect(x + b, y + b, w - 2 * b, b); }
}
function drawIcon(name, cx, cy, size) {
  const im = SPR[name], sc = Math.max(1, Math.floor(size / Math.max(im.width, im.height)));
  ctx.drawImage(im, Math.round(cx - im.width * sc / 2), Math.round(cy - im.height * sc / 2), im.width * sc, im.height * sc);
}
function wrap(txt, maxW) {
  const lines = []; let cur = '';
  for (const ch of txt) { if (ctx.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ch; } else cur += ch; }
  if (cur) lines.push(cur); return lines;
}
function drawOverlay() {
  const CW = cv.width, CH = cv.height, p = G.p;
  // 暗角
  const vg = ctx.createRadialGradient(CW / 2, CH / 2, Math.min(CW, CH) * .35, CW / 2, CH / 2, Math.max(CW, CH) * .75);
  vg.addColorStop(0, 'rgba(8,6,16,0)'); vg.addColorStop(1, 'rgba(8,6,16,.75)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, CW, CH);
  const low = p.hp / p.maxHp < .3 && G.state === 'play' ? (Math.sin(G.real * 6) * .5 + .5) * .25 : 0;
  if (G.hurtFlash > 0 || low > 0) {
    const a = Math.max(0, G.hurtFlash) * 1.2 + low;
    const rg = ctx.createRadialGradient(CW / 2, CH / 2, Math.min(CW, CH) * .3, CW / 2, CH / 2, Math.max(CW, CH) * .7);
    rg.addColorStop(0, 'rgba(232,64,63,0)'); rg.addColorStop(1, `rgba(232,64,63,${Math.min(.6, a)})`);
    ctx.fillStyle = rg; ctx.fillRect(0, 0, CW, CH);
  }
  if (G.flash > 0) { ctx.fillStyle = `rgba(255,250,220,${G.flash * .6})`; ctx.fillRect(0, 0, CW, CH); }

  if (G.state === 'title') { drawTitle(); return; }

  // HUD：经验条
  const bh = 4 * S;
  ctx.fillStyle = '#1a1423'; ctx.fillRect(0, 0, CW, bh + S);
  ctx.fillStyle = '#1e3a7a'; ctx.fillRect(S, S, CW - 2 * S, bh - S);
  const fw = (CW - 2 * S) * G.xp / G.xpNext;
  ctx.fillStyle = '#5ad1ff'; ctx.fillRect(S, S, fw, bh - S);
  ctx.fillStyle = '#c4f0ff'; ctx.fillRect(S, S, fw, S);
  pxText(ctx, 'LV ' + G.lv, CW - 6 * S, bh + 3 * S, S * 2, '#ffd65a', 'r');
  // 倒计时 / 首领血条
  if (G.boss) {
    const b = G.boss, bw = Math.min(CW * .6, 160 * S), bx = CW / 2 - bw / 2, by = bh + 3 * S;
    pixBox(bx, by, bw, 5 * S, '#2a1030', '#4a5568');
    ctx.fillStyle = G.boss.rage ? '#ff6b5a' : '#b46cff'; ctx.fillRect(bx + S, by + S, (bw - 2 * S) * Math.max(0, b.hp / b.maxHp), 3 * S);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(bx + S, by + S, (bw - 2 * S) * Math.max(0, b.hp / b.maxHp), S);
    cnText('深渊领主', CW / 2, by + 10 * S, 4.5 * S, '#e8d4ff');
  } else if (!G.bossDead) {
    const rem = Math.max(0, BOSS_T - G.t), mm = Math.floor(rem / 60), ss = Math.floor(rem % 60);
    pxText(ctx, mm + ':' + String(ss).padStart(2, '0'), CW / 2, bh + 3 * S, S * 3, rem < 20 ? '#ff6b5a' : '#ffffff');
    cnText('距首领降临', CW / 2, bh + 13 * S, 3.5 * S, '#7b8ea3');
  }
  // 击杀
  drawIcon('skull', 10 * S, bh + 7 * S, 7 * S);
  pxText(ctx, String(G.kills), 16 * S, bh + 4 * S, S * 2, '#ffffff', 'l');
  // 已获得的升级（进化排在最前，带橙色底框）
  let ix = 6 * S;
  for (const v of EVOS) {
    if (!G.up[v.id]) continue;
    ctx.fillStyle = '#6a3a1a'; ctx.fillRect(ix - S, CH - 13 * S, 10 * S, 10 * S);
    drawIcon(v.icon, ix + 4 * S, CH - 8 * S, 8 * S);
    ix += 11 * S;
  }
  for (const u of UPS) {
    const l = lvOf(u.id); if (!l) continue;
    drawIcon(u.icon, ix + 4 * S, CH - 8 * S, 8 * S);
    pxText(ctx, String(l), ix + 8 * S, CH - 6 * S, S, '#ffd65a', 'r');
    ix += 11 * S;
  }
  // 连斩
  if (G.combo >= 10 && G.state === 'play') {
    const pulse = 1 + Math.max(0, G.comboT - 2) * 1.5;
    const col = G.combo >= 100 ? '#ff6b5a' : G.combo >= 50 ? '#ff8a3a' : '#ffd65a';
    pxText(ctx, String(G.combo), CW - 8 * S, bh + 15 * S, S * 3 * pulse, col, 'r');
    cnText('连斩', CW - 8 * S, bh + 37 * S, 4 * S, '#c7d4e1', 'right');
    ctx.fillStyle = '#1a1423'; ctx.fillRect(CW - 30 * S, bh + 41 * S, 22 * S, S);
    ctx.fillStyle = col; ctx.fillRect(CW - 30 * S, bh + 41 * S, 22 * S * Math.min(1, G.comboT / 2.2), S);
  }
  if (SFX.muted) cnText('静音（M）', CW - 6 * S, CH - 6 * S, 3.5 * S, '#7b8ea3', 'right');
  // 横幅
  if (G.banner) {
    const b = G.banner, a = Math.min(1, b.life * 2), rise = (1 - Math.min(1, (2 - b.life) * 4)) * 10 * S;
    ctx.globalAlpha = a;
    const sc = b.evo ? 1.3 + Math.max(0, b.life - 2.1) * 2 : 1;
    cnText(b.txt, CW / 2, CH * .28 + rise, 9 * S * sc, b.evo ? '#ff8a3a' : b.warn ? '#ff6b5a' : b.col || '#ffd65a');
    ctx.globalAlpha = 1;
  }
  // 进化时的屏幕边缘金光
  if (G.evoFx > 0) {
    const eg = ctx.createRadialGradient(CW / 2, CH / 2, Math.min(CW, CH) * .3, CW / 2, CH / 2, Math.max(CW, CH) * .7);
    eg.addColorStop(0, 'rgba(255,138,58,0)'); eg.addColorStop(1, `rgba(255,170,60,${G.evoFx * .45})`);
    ctx.fillStyle = eg; ctx.fillRect(0, 0, CW, CH);
  }

  if (G.state === 'level') drawCards();
  if (G.state === 'pause') {
    ctx.fillStyle = 'rgba(10,8,20,.6)'; ctx.fillRect(0, 0, CW, CH);
    cnText('暂停', CW / 2, CH / 2, 14 * S, '#ffffff'); cnText('按 P / 点击 继续    M 切换静音', CW / 2, CH / 2 + 14 * S, 5 * S, '#c7d4e1');
  }
  if (G.state === 'over' || G.state === 'win') drawEnd();
}
function drawCards() {
  const CW = cv.width, CH = cv.height, t = G.cardT;
  ctx.fillStyle = `rgba(10,8,20,${Math.min(.72, t * 3)})`; ctx.fillRect(0, 0, CW, CH);
  const ts = 1 + Math.max(0, .2 - t) * 3;
  cnText('升 级 ！', CW / 2, CH * .18, 14 * S * ts, '#ffd65a');
  cnText('选择一项强化（1 / 2 / 3 或点击）', CW / 2, CH * .18 + 13 * S, 4.5 * S, '#c7d4e1');
  const cw = Math.min(80 * S, (CW - 40 * S) / 3), ch = cw * 1.35, gap = 8 * S;
  const x0 = CW / 2 - (cw * 3 + gap * 2) / 2, y0 = CH * .52 - ch / 2;
  G.cardRects = [];
  G.choices.forEach(({ u, rar, evo }, i) => {
    const ti = clamp((t - i * .07) / .25, 0, 1), ease = 1 - Math.pow(1 - ti, 3);
    const x = x0 + i * (cw + gap);
    let y = y0 + (1 - ease) * 60 * S;
    const hov = mouse.x >= x && mouse.x <= x + cw && mouse.y >= y && mouse.y <= y + ch;
    if (hov && ti >= 1) y -= 3 * S;
    G.cardRects.push({ x, y, w: cw, h: ch });
    ctx.globalAlpha = ease;
    const l = lvOf(u.id), special = evo || rar.lv > 1;
    // 稀有 / 进化卡：外圈呼吸光晕
    if (special) {
      ctx.globalAlpha = ease * (.35 + Math.sin(G.real * 5 + i) * .2);
      ctx.fillStyle = rar.col; ctx.fillRect(x - 4 * S, y - 4 * S, cw + 8 * S, ch + 8 * S);
      ctx.globalAlpha = ease;
    }
    const border = hov ? '#ffffff' : special ? rar.col : (l ? '#7b8ea3' : '#5ad1ff');
    pixBox(x, y, cw, ch, hov ? '#3a2f58' : evo ? '#3a2418' : '#2a2340', border, hov ? '#4c3f70' : rar.hi);
    if (special) cnText(rar.name, x + cw - 7 * S, y + 6 * S, 4 * S, rar.col, 'right');
    // 图标框
    const icy = y + ch * .3;
    pixBox(x + cw / 2 - 16 * S, icy - 16 * S, 32 * S, 32 * S, '#1e1a2e', special ? rar.col : '#4a5568');
    const bob = hov ? Math.sin(G.real * 8) * S : 0;
    drawIcon(u.icon, x + cw / 2, icy + bob, 22 * S);
    // 进化卡在图标框下方显示两个前置图标
    if (evo) {
      const ids = Object.keys(u.req);
      ids.forEach((id, k) => {
        const up = UPS.find(o => o.id === id);
        drawIcon(up.icon, x + cw / 2 + (k - (ids.length - 1) / 2) * 12 * S, icy + 20 * S, 7 * S);
      });
    }
    cnText(u.name, x + cw / 2, y + ch * .6, 7 * S, evo ? '#ffd65a' : '#ffffff');
    const n = Math.min(rar.lv, u.max - l);
    const sub = evo ? '两项强化融合' : u.id === 'heal' ? '' : l ? `Lv.${l} → ${l + n}` : n > 1 ? `新！直达 Lv.${n}` : '新！';
    cnText(sub, x + cw / 2, y + ch * .6 + 8 * S, 4.5 * S, evo ? '#ff8a3a' : n > 1 ? rar.col : l ? '#ffd65a' : '#8ee05a');
    ctx.font = `bold ${4.5 * S}px ${FONT_CN}`;
    wrap(u.desc(l), cw - 12 * S).forEach((ln, k) => cnText(ln, x + cw / 2, y + ch * .6 + (17 + k * 6.5) * S, 4.5 * S, '#c7d4e1', 'center', false));
    pxText(ctx, String(i + 1), x + 6 * S, y + 5 * S, S * 2, '#7b8ea3', 'l');
    ctx.globalAlpha = 1;
  });
  // 重抽按钮
  const rw = 52 * S, rh = 12 * S, rx = CW / 2 - rw / 2, ry = y0 + ch + 12 * S;
  const can = G.rerolls > 0, rh0 = can && mouse.x >= rx && mouse.x <= rx + rw && mouse.y >= ry && mouse.y <= ry + rh;
  G.rerollRect = can ? { x: rx, y: ry, w: rw, h: rh } : null;
  ctx.globalAlpha = Math.min(1, t * 3);
  pixBox(rx, ry, rw, rh, rh0 ? '#3a2f58' : '#2a2340', can ? (rh0 ? '#ffffff' : '#7b8ea3') : '#4a5568');
  cnText(`R 重抽（剩 ${G.rerolls}）`, CW / 2, ry + rh / 2, 4.5 * S, can ? '#c7d4e1' : '#4a5568');
  ctx.globalAlpha = 1;
}
function drawTitle() {
  const CW = cv.width, CH = cv.height;
  ctx.fillStyle = 'rgba(10,8,20,.45)'; ctx.fillRect(0, 0, CW, CH);
  const bob = Math.sin(G.real * 2) * 2 * S;
  cnText('剑 环', CW / 2, CH * .3 + bob, 22 * S, '#ffd65a');
  cnText('BLADE ORBIT', CW / 2, CH * .3 + 16 * S + bob, 6 * S, '#5ad1ff');
  if (Math.floor(G.real * 2) % 2 === 0) cnText('按任意键 / 点击 开始', CW / 2, CH * .72, 6 * S, '#ffffff');
  cnText('WASD / 方向键 移动（或按住鼠标）  ·  剑会自动旋转斩敌  ·  撑到首领降临并击败它', CW / 2, CH * .72 + 12 * S, 4 * S, '#7b8ea3');
  cnText('P 暂停  ·  M 静音  ·  升级时 R 重抽', CW / 2, CH * .72 + 19 * S, 4 * S, '#7b8ea3');
  // 历史记录 + 进化图鉴
  if (SAVE.plays) {
    const best = `通关 ${SAVE.wins} / ${SAVE.plays} 局    最快通关 ${SAVE.bestTime ? fmtTime(SAVE.bestTime) : '--'}    最多击杀 ${SAVE.bestKills}    最高等级 ${SAVE.bestLv}`;
    cnText(best, CW / 2, CH * .52, 4.5 * S, '#c7d4e1');
  }
  const ex = CW / 2 - (EVOS.length - 1) * 7 * S, ey = CH * .6;
  EVOS.forEach((v, i) => {
    const got = SAVE.evos.includes(v.id), x = ex + i * 14 * S;
    pixBox(x - 6 * S, ey - 6 * S, 12 * S, 12 * S, '#1e1a2e', got ? '#ff8a3a' : '#4a5568');
    if (got) drawIcon(v.icon, x, ey, 8 * S);
    else cnText('?', x, ey, 6 * S, '#4a5568', 'center', false);
  });
  cnText(`进化图鉴 ${SAVE.evos.length} / ${EVOS.length}`, CW / 2, ey + 10 * S, 3.5 * S, '#7b8ea3');
}
function drawEnd() {
  const CW = cv.width, CH = cv.height, win = G.state === 'win';
  if (G.stateT < 0) return; // 首领爆炸慢放阶段，先不遮挡画面
  ctx.fillStyle = `rgba(10,8,20,${Math.min(.75, G.stateT)})`; ctx.fillRect(0, 0, CW, CH);
  const s = 1 + Math.max(0, .3 - G.stateT) * 2;
  cnText(win ? '胜 利 ！' : '倒 下 了…', CW / 2, CH * .28, 18 * S * s, win ? '#ffd65a' : '#e8403f');
  const rec = G.newRec, tag = k => rec.includes(k) ? ' ★' : '';
  cnText(`${win ? '用时' : '存活'} ${fmtTime(G.t)}${tag('time')}    等级 ${G.lv}${tag('lv')}    击杀 ${G.kills}${tag('kills')}    最高连斩 ${G.bestCombo}`, CW / 2, CH * .44, 6 * S, '#ffffff');
  if (rec.length && Math.floor(G.real * 3) % 2 === 0) cnText('★ 新纪录！', CW / 2, CH * .44 + 9 * S, 5 * S, '#ffd65a');
  const owned = EVOS.filter(v => G.up[v.id]).length + UPS.filter(u => lvOf(u.id)).length;
  let ix = CW / 2 - owned * 6 * S;
  for (const v of EVOS) {
    if (!G.up[v.id]) continue;
    ctx.fillStyle = '#6a3a1a'; ctx.fillRect(ix + S, CH * .6 - 5 * S, 10 * S, 10 * S);
    drawIcon(v.icon, ix + 6 * S, CH * .6, 9 * S); ix += 12 * S;
  }
  for (const u of UPS) { const l = lvOf(u.id); if (!l) continue; drawIcon(u.icon, ix + 6 * S, CH * .6, 9 * S); pxText(ctx, String(l), ix + 10 * S, CH * .6 + 2 * S, S, '#ffd65a', 'r'); ix += 12 * S; }
  if (!win && !EVOS.some(v => G.up[v.id])) cnText('提示：某些强化组合到一定等级后会出现「进化」', CW / 2, CH * .67, 4 * S, '#7b8ea3');
  if (G.stateT > .8 && Math.floor(G.real * 2) % 2 === 0) cnText('按 R / 点击 再来一局', CW / 2, CH * .76, 6 * S, '#c7d4e1');
}

// ---------- 主循环 ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  update(dt); render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
