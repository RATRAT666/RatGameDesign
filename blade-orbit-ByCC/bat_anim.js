// 紫色蝙蝠动画：程序化生成像素帧（待机 6 帧 + 冲刺 6 帧），单帧 48x40，冲刺朝右
const BAT_PAL = {
  '.': null,
  'k': '#1a1423', // 描边
  'P': '#e2b8ff', // 高光
  'B': '#cf94ff', // 肚皮
  'v': '#b46cff', // 主色 / 翼骨
  'V': '#6a2fb8', // 暗部 / 翼膜
  'D': '#3d1a6e', // 翼膜深处
  'r': '#ff4f6d', 'e': '#fff6d0', // 眼睛
  'm': '#2a1f2e', 'w': '#f4f4f4', 'p': '#ff9fc4',
};
const BAT_W = 48, BAT_H = 40;

const batGrid = () => Array.from({ length: BAT_H }, () => new Array(BAT_W).fill('.'));
function batPut(g, x, y, c) {
  x = Math.floor(x); y = Math.floor(y);
  if (x >= 0 && y >= 0 && x < BAT_W && y < BAT_H) g[y][x] = c;
}

// 以像素中心做奇偶规则判断，填充多边形
function batPoly(g, pts, c) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.max(0, Math.floor(Math.min(...xs))), x1 = Math.min(BAT_W - 1, Math.ceil(Math.max(...xs)));
  const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(BAT_H - 1, Math.ceil(Math.max(...ys)));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x + .5, py = y + .5;
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
    }
    if (inside) g[y][x] = c;
  }
}

function batLine(g, x0, y0, x1, y1, c) {
  const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) + 1;
  for (let i = 0; i <= n; i++) batPut(g, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c);
}

// 翅膀：肩点 (sx,sy)，ang 为展开方向，L 为翼长，s 决定扇形翼膜的缺口朝向
function batWing(g, sx, sy, ang, L, s) {
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy * s, ny = dx * s;
  const P = (u, v) => [sx + u * dx + v * nx, sy + u * dy + v * ny];
  const shape = [[0, -2.5], [.45 * L, -4], [L, -2], [.9 * L, 1], [.78 * L, 4.5], [.62 * L, 1.5],
    [.45 * L, 5.5], [.3 * L, 2.5], [.15 * L, 5], [0, 4]];
  batPoly(g, shape.map(([u, v]) => P(u, v)), 'V');
  batPoly(g, [[0, -1.5], [.38 * L, -2.5], [.34 * L, 3], [.15 * L, 4], [0, 3]].map(([u, v]) => P(u, v)), 'D');
  // 前缘臂骨 + 从腕部散开的三根指骨
  const wr = P(.45 * L, -3);
  batLine(g, ...P(0, -1.5), ...wr, 'v');
  for (const [u, v] of [[L, -2], [.78 * L, 4.5], [.45 * L, 5.5]]) batLine(g, ...wr, ...P(u, v), 'v');
  batPut(g, ...P(.45 * L, -4.6), 'w'); // 腕部小爪
}

// 身体 + 耳朵 + 五官；face: 0 正面，1 朝右
function batBody(g, bx, by, rx, ry, face) {
  const ears = face === 0
    ? [[[bx - rx * .85, by - ry * .35], [bx - rx * .15, by - ry * .85], [bx - rx * .8, by - ry - 4.5]]]
    : [[[bx - rx * .2, by - ry * .7], [bx + rx * .4, by - ry * .75], [bx - rx * .65, by - ry - 3.5]]];
  if (face === 0) ears.push(ears[0].map(([x, y]) => [2 * bx - x, y]));
  else ears.unshift(ears[0].map(([x, y]) => [x - 3, y + .5])); // 远侧耳朵
  for (const e of ears) {
    batPoly(g, e, 'v');
    const cx = (e[0][0] + e[1][0] + e[2][0]) / 3, cy = (e[0][1] + e[1][1] + e[2][1]) / 3;
    batPoly(g, e.map(([x, y]) => [cx + (x - cx) * .45, cy + (y - cy) * .45]), 'p');
  }

  const [bcx, bcy, brx, bry] = face === 0
    ? [bx, by + ry * .3, rx * .55, ry * .55]
    : [bx + rx * .1, by + ry * .45, rx * .6, ry * .45];
  for (let y = 0; y < BAT_H; y++) for (let x = 0; x < BAT_W; x++) {
    const nx = (x + .5 - bx) / rx, ny = (y + .5 - by) / ry;
    if (nx * nx + ny * ny > 1) continue;
    const bnx = (x + .5 - bcx) / brx, bny = (y + .5 - bcy) / bry;
    let c = 'v';
    if (bnx * bnx + bny * bny <= 1) c = 'B';
    if (nx * .55 + ny * .8 > .62) c = 'V';          // 右下阴影
    else if (-nx * .6 - ny * .8 > .62) c = 'P';     // 左上高光
    g[y][x] = c;
  }

  if (face === 0) {
    const ey = Math.floor(by - ry * .25);
    for (const x of [bx - 3, bx - 2, bx + 1, bx + 2]) { batPut(g, x, ey, 'r'); batPut(g, x, ey + 1, 'r'); }
    batPut(g, bx - 3, ey, 'e'); batPut(g, bx + 1, ey, 'e');
    for (let x = bx - 2; x <= bx + 1; x++) batPut(g, x, ey + 3, 'm');
    batPut(g, bx - 2, ey + 4, 'w'); batPut(g, bx + 1, ey + 4, 'w');
    for (const x of [bx - 3, bx + 2]) { batPut(g, x, by + ry, 'm'); batPut(g, x, by + ry + 1, 'm'); }
  } else {
    const ey = Math.floor(by - ry * .3), ex = Math.floor(bx + rx * .35);
    batPut(g, ex, ey, 'e'); batPut(g, ex + 1, ey, 'r'); batPut(g, ex, ey + 1, 'r'); batPut(g, ex + 1, ey + 1, 'r');
    batPut(g, ex + 3, ey, 'r'); // 远侧眼
    for (let x = ex + 2; x <= ex + 4; x++) batPut(g, x, ey + 2, 'm');
    batPut(g, ex + 3, ey + 3, 'w');
    const fx = Math.floor(bx - rx * .55);
    for (const x of [fx, fx - 2]) batPut(g, x, by + ry, 'm'); // 收起的爪子
  }
}

// 四邻域自动描边
function batOutline(g) {
  const o = g.map(r => r.slice());
  for (let y = 0; y < BAT_H; y++) for (let x = 0; x < BAT_W; x++) {
    if (g[y][x] !== '.') continue;
    if ((g[y - 1] && g[y - 1][x] !== '.') || (g[y + 1] && g[y + 1][x] !== '.') ||
        (x > 0 && g[y][x - 1] !== '.') || (x < BAT_W - 1 && g[y][x + 1] !== '.')) o[y][x] = 'k';
  }
  return o;
}

function batToCanvas(g) {
  const cv = document.createElement('canvas');
  cv.width = BAT_W; cv.height = BAT_H;
  const x = cv.getContext('2d');
  for (let j = 0; j < BAT_H; j++) for (let i = 0; i < BAT_W; i++) {
    const col = BAT_PAL[g[j][i]];
    if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); }
  }
  return cv;
}

function batIdleFrame(i, n) {
  const t = i / n * Math.PI * 2;
  const bx = 24, by = 18 + Math.round(Math.cos(t)), rx = 6, ry = 7;
  const ang = -Math.cos(t) * .6; // 第 0 帧翅膀最高，随后下扇
  const L = 12 + Math.round(2 * (1 - Math.abs(Math.cos(t))));
  const g = batGrid();
  batWing(g, bx + rx - 1.5, by - 2, ang, L, 1);
  batWing(g, bx - rx + 1.5, by - 2, Math.PI - ang, L, -1);
  batBody(g, bx, by, rx, ry, 0);
  return batToCanvas(batOutline(g));
}

// 冲刺：蓄力 → 弹出 → 3 帧高速 → 收势
const BAT_DASH = [
  { bx: 28, by: 21, rx: 6, ry: 6, a: [-Math.PI / 2 - .25, -Math.PI / 2 - .55], s: [-1, -1], L: 12, ghost: 0, lines: 0 },
  { bx: 31, by: 20, rx: 8, ry: 4, a: [Math.PI - .45, Math.PI + .45], s: [1, -1], L: 13, ghost: 1, lines: 1 },
  { bx: 31, by: 20, rx: 8, ry: 4, a: [Math.PI - .3, Math.PI + .3], s: [1, -1], L: 14, ghost: 2, lines: 2 },
  { bx: 31, by: 19, rx: 8, ry: 4, a: [Math.PI - .25, Math.PI + .38], s: [1, -1], L: 14, ghost: 2, lines: 2 },
  { bx: 31, by: 20, rx: 8, ry: 4, a: [Math.PI - .3, Math.PI + .3], s: [1, -1], L: 14, ghost: 2, lines: 2 },
  { bx: 30, by: 20, rx: 7, ry: 5, a: [Math.PI - .9, Math.PI + .9], s: [1, -1], L: 13, ghost: 1, lines: 1 },
];

function batDashFrame(i) {
  const f = BAT_DASH[i];
  const g = batGrid();
  for (let k = 0; k < 2; k++) batWing(g, f.bx - 3, f.by - 1, f.a[k], f.L, f.s[k]);
  batBody(g, f.bx, f.by, f.rx, f.ry, 1);
  const main = batToCanvas(batOutline(g));

  const cv = document.createElement('canvas');
  cv.width = BAT_W; cv.height = BAT_H;
  const x = cv.getContext('2d');
  // 速度线
  if (f.lines) {
    [-5, -1, 3, 6].forEach((dy, r) => {
      const len = (f.lines === 2 ? 7 : 4) + (r * 3) % 4;
      const x0 = f.bx - 16 - ((i * 5 + r * 7) % 11);
      x.fillStyle = r % 2 ? '#ffffff' : '#e2b8ff';
      x.globalAlpha = .75;
      x.fillRect(Math.max(0, x0 - len), f.by + dy, Math.min(len, x0), 1);
    });
    x.globalAlpha = 1;
  }
  // 残影：紫色剪影，越远越淡
  if (f.ghost) {
    const sil = document.createElement('canvas');
    sil.width = BAT_W; sil.height = BAT_H;
    const sx = sil.getContext('2d');
    sx.drawImage(main, 0, 0);
    sx.globalCompositeOperation = 'source-in';
    sx.fillStyle = '#8b4fe0';
    sx.fillRect(0, 0, BAT_W, BAT_H);
    for (let k = f.ghost; k >= 1; k--) {
      x.globalAlpha = (i === 5 ? .25 : .5) / k;
      x.drawImage(sil, -6 * k, 0);
    }
    x.globalAlpha = 1;
  }
  x.drawImage(main, 0, 0);
  return cv;
}

const BAT_ANIM = {
  w: BAT_W, h: BAT_H,
  idle: Array.from({ length: 6 }, (_, i) => batIdleFrame(i, 6)),
  dash: BAT_DASH.map((_, i) => batDashFrame(i)),
  // 横向拼成精灵表
  sheet(name) {
    const fr = this[name], cv = document.createElement('canvas');
    cv.width = BAT_W * fr.length; cv.height = BAT_H;
    const x = cv.getContext('2d');
    fr.forEach((f, i) => x.drawImage(f, i * BAT_W, 0));
    return cv;
  },
};
