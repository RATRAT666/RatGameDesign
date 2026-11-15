import math
from PIL import Image
W,H=24,20
PAL={'k':(20,14,22),'D':(38,30,42),'d':(58,46,60),'b':(84,68,82),'l':(112,94,104),'h':(140,120,124),
 'M':(70,40,52),'N':(46,26,38),'u':(98,78,86),
 'E':(214,224,190),'e':(150,166,130),'G':(120,230,60),'g':(52,150,40),'P':(12,30,10),'W':(240,255,220),
 'm':(60,10,18),'r':(124,28,36),'t':(226,214,180),'T':(160,146,120)}
def grid(): return [['.']*W for _ in range(H)]
def poly(g,pts,c):
    for y in range(H):
        for x in range(W):
            px,py=x+.5,y+.5;ins=False;j=len(pts)-1
            for i in range(len(pts)):
                xi,yi=pts[i];xj,yj=pts[j]
                if (yi>py)!=(yj>py) and px<(xj-xi)*(py-yi)/(yj-yi)+xi: ins=not ins
                j=i
            if ins: g[y][x]=c
def line(g,x0,y0,x1,y1,c):
    n=int(max(abs(x1-x0),abs(y1-y0)))+1
    for i in range(n+1):
        x=int(x0+(x1-x0)*i/n);y=int(y0+(y1-y0)*i/n)
        if 0<=x<W and 0<=y<H: g[y][x]=c
def rot(p,o,a):
    s,c=math.sin(a),math.cos(a);x,y=p[0]-o[0],p[1]-o[1];return (o[0]+x*c-y*s,o[1]+x*s+y*c)
def mirror(g):
    for y in range(H):
        for x in range(W//2): 
            if g[y][x]!='.': g[y][W-1-x]=g[y][x]
CX=12.0
def frame(flap):
    g=grid()
    WA={3:"...uu...",4:".uuMMu..",5:"uMMMMMuu",6:"uNMMMMMu",7:"uNNuNMMu",8:"uN.uNNMu",9:"u..uNNNu",10:"...u.NNu",11:"......Nu"}
    WB={0:"u.......",1:"uu..u...",2:"uMuuMu..",3:"uMMMMMu.",4:"uNMMMMMu",5:".uNNNMMu",6:".u.NuNMu",7:"....uNNu",8:"......Nu"}
    for y,row in (WB if flap else WA).items():
        for x,c in enumerate(row):
            if c!='.' and x<7: g[y+1][x+1]=c
    # ear
    poly(g,[(7.2,6),(10.5,4.2),(7.0,0.6)],'b'); poly(g,[(7.8,5),(9.2,4.4),(7.6,2.4)],'d')
    # body ellipse with shading
    bx,by,rx,ry=CX,10.2,5.6,6.4
    for y in range(H):
        for x in range(W):
            nx=(x+.5-bx)/rx; ny=(y+.5-by)/ry
            if nx*nx+ny*ny<=1:
                v=-(nx*.6+ny*.8)
                g[y][x]='h' if v>.62 else 'l' if v>.25 else 'b' if v>-.35 else 'd'
    mirror(g)
    # fur tufts bottom
    for x in (10,13): g[17][x]='d'
    # claws
    for x in (9,14): g[17][x]='D'; g[18][x]='t'
    # big eye
    ex,ey=CX,7.6
    for y in range(H):
        for x in range(W):
            d=math.hypot(x+.5-ex,(y+.5-ey)*1.05)
            if d<=3.5: g[y][x]='E' if (x+.5-ex)+(y+.5-ey)<1.5 else 'e'
            if d<=2.4: g[y][x]='G'
            if d<=2.4 and (x+.5-ex)+(y+.5-ey)>1.6: g[y][x]='g'
    for y in (7,8): g[y][12]='P'
    g[6][11]='W'
    # eyelid shadow on top
    for x in range(10,15): 
        if g[4][x] in 'Ee': g[4][x]='d'
    # big mouth
    for y in range(11,17):
        for x in range(W):
            nx=(x+.5-CX)/5.0; ny=(y-10.6)/5.4
            if ny>=0 and nx*nx+ny*ny<=1: g[y][x]='m'
    for x in range(7,17): 
        if g[11][x]=='m': g[11][x]='k'
    # tongue / throat
    for x in range(10,14): g[14][x]='r'
    for x in range(11,13): g[15][x]='r'
    # teeth top
    for x in (8,10,13,15): g[12][x]='t'
    for x in (8,15): g[13][x]='T'
    for x in (10,13): g[13][x]='T'
    # teeth bottom
    for x in (9,12,14): g[15][x]='t'
    g[14][9]='T'; g[14][14]='T'
    g[15][11]='t'
    # auto outline
    o=[r[:] for r in g]
    for y in range(H):
        for x in range(W):
            if g[y][x]!='.': continue
            for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                X,Y=x+dx,y+dy
                if 0<=X<W and 0<=Y<H and g[Y][X]!='.' : o[y][x]='k';break
    return o
def img(g):
    im=Image.new('RGBA',(W,H),(0,0,0,0))
    for y in range(H):
        for x in range(W):
            if g[y][x]!='.': im.putpixel((x,y),PAL[g[y][x]]+(255,))
    return im
f1=frame(0.0); f2=frame(0.55)
import sys
for n,f in (('a',f1),('b',f2)):
    print('\n'.join(''.join(r) for r in f)); print()
    img(f).save(f'/tmp/b/{n}.png')
sheet=Image.new('RGBA',(W*2,H)); sheet.paste(img(f1),(0,0)); sheet.paste(img(f2),(W,0)); sheet.save('/tmp/b/sheet.png')
bg=Image.new('RGBA',(W*2*14+60,H*14+40),(34,30,40,255))
bg.alpha_composite(sheet.resize((W*2*14,H*14),Image.NEAREST),(30,20)); bg.save('/sessions/practical-sharp-hypatia/mnt/outputs/prev.png')
