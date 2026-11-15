# 独眼绿眼蝙蝠小怪 · 四分之三侧（朝右前方）· 32x32 · 待机悬停动画 6 帧
# 运行: python gen_eyebat34.py  -> 输出到脚本所在目录
import math, os
from PIL import Image

W, H = 32, 32
OUT = os.path.dirname(os.path.abspath(__file__))
# 配色：暖棕炭色身体、橘褐翼膜、翠绿独眼
PAL = {'k': (24, 16, 18), 'D': (48, 32, 34), 'd': (72, 48, 46), 'b': (102, 70, 60), 'l': (138, 98, 76),
       'h': (176, 132, 98), 'c': (210, 170, 124),
       'M': (150, 78, 52), 'N': (108, 52, 40), 'Q': (72, 36, 32), 'u': (196, 120, 76),
       'p': (214, 120, 120), 'E': (236, 240, 214), 'e': (178, 186, 160),
       'G': (64, 214, 96), 'g': (22, 128, 58), 'L': (168, 255, 150), 'P': (8, 28, 14), 'W': (255, 255, 240),
       'm': (54, 14, 20), 't': (246, 238, 220)}


def grid(): return [['.'] * W for _ in range(H)]


def put(g, x, y, c):
    x, y = int(math.floor(x)), int(math.floor(y))
    if 0 <= x < W and 0 <= y < H: g[y][x] = c


def poly(g, pts, c):
    for y in range(H):
        for x in range(W):
            px, py = x + .5, y + .5; ins = False; j = len(pts) - 1
            for i in range(len(pts)):
                xi, yi = pts[i]; xj, yj = pts[j]
                if (yi > py) != (yj > py) and px < (xj - xi) * (py - yi) / (yj - yi) + xi: ins = not ins
                j = i
            if ins: g[y][x] = c


def line(g, x0, y0, x1, y1, c):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(n + 1): put(g, x0 + (x1 - x0) * i / n + .5, y0 + (y1 - y0) * i / n + .5, c)


def wing(g, sx, sy, ang, L, side, mem, deep, bone):
    """sx,sy 肩点; ang 翼展方向(弧度); side=-1 向左展, 1 向右; 翼膜下缘呈扇贝状"""
    dx, dy = math.cos(ang) * side, math.sin(ang)
    nx, ny = 0, 1  # 翼膜垂向下
    P = lambda u, v: (sx + u * dx + v * nx, sy + u * dy + v * ny)
    shp = [(0, -1.5), (.5 * L, -2.6), (L, -1.2), (.95 * L, 2), (.78 * L, 4.2), (.66 * L, 2.4),
           (.48 * L, 5), (.34 * L, 3), (.18 * L, 5), (0, 4)]
    poly(g, [P(u, v) for u, v in shp], mem)
    poly(g, [P(u, v) for u, v in [(0, 0), (.4 * L, -.6), (.32 * L, 3), (.16 * L, 4), (0, 3.4)]], deep)
    wr = P(.5 * L, -2.2)
    line(g, *P(0, -1), *wr, bone)
    for u, v in [(L, -1), (.78 * L, 4), (.48 * L, 4.6)]: line(g, *wr, *P(u, v), bone)
    put(g, wr[0] + .5, wr[1] - .6, 't')  # 腕爪


def frame(flap, bob, blink=False):
    """flap: 翼角(弧度, 负=上扬); bob: 身体垂直偏移(像素); blink: 眯眼"""
    g = grid()
    bx, by = 15.5, 16.0 + bob  # 身体中心（圆滚滚的毛球）
    rx, ry = 6.2, 6.6
    # 远侧翅膀（右后方，透视缩短、更暗，先画）
    wing(g, bx + 3.8, by - 1.8, flap * .8 - .2, 8, 1, 'N', 'Q', 'd')
    # 远侧耳（窄小）
    poly(g, [(bx + 2.0, by - 5.0), (bx + 5.4, by - 11.0), (bx + 5.6, by - 3.6)], 'd')
    # 身体：光源左上，朝右前方 -> 右下为暗部
    for y in range(H):
        for x in range(W):
            nx = (x + .5 - bx) / rx; ny = (y + .5 - by) / ry
            if nx * nx + ny * ny <= 1:
                v = -(nx * .65 + ny * .75)
                g[y][x] = 'h' if v > .72 else 'l' if v > .28 else 'b' if v > -.38 else 'd'
    # 毛边：身体下缘锯齿状绒毛
    for x in range(int(bx - 4), int(bx + 5), 2): put(g, x, by + ry, 'd')
    # 胸前浅色绒毛（偏向朝向侧）
    for y in range(H):
        for x in range(W):
            nx = (x + .5 - (bx + 1.4)) / 3.2; ny = (y + .5 - (by + 4.0)) / 2.4
            if nx * nx + ny * ny <= 1 and g[y][x] in 'hlbd': g[y][x] = 'c' if ny < 0 else 'h'
    # 近侧大耳（左前，粉色内耳）
    poly(g, [(bx - 5.6, by - 2.6), (bx - 5.4, by - 13.0), (bx - 0.8, by - 5.6)], 'b')
    poly(g, [(bx - 5.4, by - 2.6), (bx - 5.5, by - 7.0), (bx - 3.5, by - 4.2)], 'l')
    poly(g, [(bx - 4.4, by - 5.0), (bx - 4.6, by - 10.6), (bx - 2.0, by - 6.0)], 'p')
    # 独眼：占据上半张脸，偏向朝向侧，横向压缩表示 3/4 透视
    ex, ey = bx + 1.4, by - 1.8
    if blink:
        for y in range(H):
            for x in range(W):
                ox, oy = (x + .5 - ex) / .84, y + .5 - ey
                if math.hypot(ox, oy) <= 4.2: g[y][x] = 'd' if oy < .5 else g[y][x]
        for x in range(int(ex - 3), int(ex + 4)): put(g, x, ey + .6, 'k')
        put(g, ex - 3.4, ey + .2, 'k'); put(g, ex + 3.6, ey + .2, 'k')
    else:
        for y in range(H):
            for x in range(W):
                ox, oy = (x + .5 - ex) / .84, y + .5 - ey
                d = math.hypot(ox, oy)
                if d <= 4.2: g[y][x] = 'k' if d > 3.6 else ('E' if ox + oy < 1.2 else 'e')
                if d <= 2.9: g[y][x] = 'g' if ox + oy > 2.0 else 'G'
                if d <= 1.6 and ox + oy < -.6: g[y][x] = 'L'
        # 竖瞳偏右，视线朝前
        for yy in (-1.5, -.5, .5, 1.5): put(g, ex + 1.3, ey + yy, 'P')
        put(g, ex - 1.4, ey - 2.0, 'W'); put(g, ex - .4, ey - 2.4, 'W')
    # 小嘴 + 一对獠牙（偏右，近侧獠牙更长）
    mx, my = bx + 1.6, by + 3.4
    for x in range(int(mx - 2), int(mx + 3)): put(g, x, my, 'm')
    put(g, mx - 2.4, my - 1, 'm'); put(g, mx + 2.6, my - 1, 'm')
    put(g, mx - 1.6, my + 1, 't'); put(g, mx - 1.6, my + 2, 't')
    put(g, mx + 1.6, my + 1, 't')
    # 近侧大翅膀（左前，最后画）
    wing(g, bx - 4.6, by - .8, flap, 11.5, -1, 'M', 'N', 'u')
    # 悬垂小脚爪
    fy = by + ry + .6
    for fx in (bx - 1.2, bx + 2.6):
        put(g, fx, fy, 'D'); put(g, fx, fy + 1, 't')
    # 自动描边
    o = [r[:] for r in g]
    for y in range(H):
        for x in range(W):
            if g[y][x] != '.': continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                X, Y = x + dx, y + dy
                if 0 <= X < W and 0 <= Y < H and g[Y][X] != '.': o[y][x] = 'k'; break
    return o


def img(g):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for y in range(H):
        for x in range(W):
            if g[y][x] != '.': im.putpixel((x, y), PAL[g[y][x]] + (255,))
    return im


# 待机：缓慢扇翅 + 身体随翼拍上下浮动 1px，第 5 帧眨眼（翅下压时身体被托起）
IDLE = [(-.6, 0, 0), (-.25, 0, 0), (.2, -1, 0), (.5, -1, 0), (.2, 0, 1), (-.25, 1, 0)]
if __name__ == '__main__':
    frames = [img(frame(f, b, k)) for f, b, k in IDLE]
    for i, f in enumerate(frames): f.save(os.path.join(OUT, f'eyebat34_idle_{i}.png'))
    sheet = Image.new('RGBA', (W * len(frames), H))
    for i, f in enumerate(frames): sheet.paste(f, (W * i, 0))
    sheet.save(os.path.join(OUT, 'eyebat34_idle_sheet.png'))
    S = 10; bg = (34, 30, 40, 255)
    gif = []
    for f in frames:
        c = Image.new('RGBA', (W * S, H * S), bg); c.alpha_composite(f.resize((W * S, H * S), Image.NEAREST))
        gif.append(c.convert('P', palette=Image.ADAPTIVE))
    gif[0].save(os.path.join(OUT, 'eyebat34_idle_x10.gif'), save_all=True, append_images=gif[1:], duration=120, loop=0)
    pv = Image.new('RGBA', (W * S * len(frames) // 2 + 40, H * S // 2 * 1 + 30), bg)
    pv.alpha_composite(sheet.resize((W * S * len(frames) // 2, H * S // 2), Image.NEAREST), (20, 15))
    pv.save(os.path.join(OUT, 'eyebat34_preview.png'))
