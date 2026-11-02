// 像素精灵：用字符画定义，启动时烘焙成离屏画布
const PAL = {
  '.': null,
  'k': '#1a1423', // 描边
  'w': '#f4f4f4', 's': '#c7d4e1', 'g': '#7b8ea3', 'd': '#4a5568', // 钢
  'y': '#ffd65a', 'o': '#e8913a', 'b': '#8a4b2a', // 金/护手
  'r': '#e8403f', 'R': '#9b1d33', 'p': '#ffb3a7',
  'c': '#5ad1ff', 'C': '#2a6fd6', 'n': '#1e3a7a',
  'l': '#8ee05a', 'L': '#3f9a3a', 'G': '#1f5a33',
  'v': '#b46cff', 'V': '#6a2fb8',
  'e': '#fff6d0', 'h': '#f2c49b', 'm': '#2a1f2e',
};

const SPR_SRC = {
  hero: [
    '...kkkk...',
    '..kCCCCk..',
    '.kCcccCCk.',
    '.kChhhhCk.',
    '.khmhhmhk.',
    '.kkhhhhkk.',
    'kyknnnnkyk',
    'kykCcCCkyk',
    '.knCCCCnk.',
    '.kkCnnCkk.',
    '..kbk.kbk.',
    '..kkk.kkk.',
  ],
  hero2: [
    '...kkkk...',
    '..kCCCCk..',
    '.kCcccCCk.',
    '.kChhhhCk.',
    '.khmhhmhk.',
    '.kkhhhhkk.',
    'kyknnnnkyk',
    'kykCcCCkyk',
    '.knCCCCnk.',
    '.kkCnnCkk.',
    '.kbk..kbk.',
    '.kkk..kkk.',
  ],
  sword: [
    '..k..',
    '.kwk.',
    '.kwsk',
    '.kwsk',
    '.kwsk',
    '.kwsk',
    '.kwsk',
    '.kwsk',
    'kkykk',
    'kyoyk',
    '.kbk.',
    '.kbk.',
    '.kyk.',
    '..k..',
  ],
  // 圣焰剑环进化后的金剑
  sword_h: [
    '..k..',
    '.kek.',
    '.keyk',
    '.keyk',
    '.keyk',
    '.keyk',
    '.keyk',
    '.keyk',
    'kkokk',
    'kyryk',
    '.kRk.',
    '.kRk.',
    '.kyk.',
    '..k..',
  ],
  slime: [
    '...kkkk...',
    '..klllLk..',
    '.kllwlLLk.',
    '.klllllLk.',
    'kllmllmlLk',
    'klllllllLk',
    'kLLlllLLGk',
    '.kkkkkkkk.',
  ],
  slime2: [
    '..........',
    '...kkkk...',
    '..kllwlLk.',
    '.klllllLLk',
    'kllmllmlLk',
    'klllllllLk',
    'kLLLlLLLGk',
    'kkkkkkkkkk',
  ],
  bat: [
    'k........k',
    'kVk.kk.kVk',
    'kvVkvvkVvk',
    'kvvvrvrvvk',
    '.kvvvvvvk.',
    '..kVkkVk..',
    '...k..k...',
  ],
  bat2: [
    '..........',
    '....kk....',
    '.kkkvvkkk.',
    'kvVvrvrvVk',
    'kVkvvvvkVk',
    'k..kVVk..k',
    '...k..k...',
  ],
  skel: [
    '..kkkk..',
    '.kwwwwk.',
    '.kwmwmk.',
    '.kwwwwk.',
    '..kwkwk.',
    '.kkwwkk.',
    'kwkwwkwk',
    'k.kswk.k',
    '..kwwk..',
    '..kwkwk.',
    '.kwk.kwk',
    '.kk...kk',
  ],
  skel2: [
    '..kkkk..',
    '.kwwwwk.',
    '.kwmwmk.',
    '.kwwwwk.',
    '..kwkwk.',
    '.kkwwkk.',
    'kwkwwkwk',
    'k.kswk.k',
    '..kwwk..',
    '.kwkkwk.',
    '.kwk.kk.',
    '.kk.....',
  ],
  mage: [
    '..kkkk..',
    '.kRRRRk.',
    'kRRRRRRk',
    'kRmyymRk',
    'kRRmmRRk',
    '.kRRRRk.',
    'kRkRRkRk',
    'kokRRkok',
    '.kRRRRk.',
    '.kkkkkk.',
  ],
  // 首领：深渊领主（20x22）
  boss: [
    '.k................k.',
    '.kwk............kwk.',
    '.kwk...kkkkkk...kwk.',
    '..kwk.kVVVVVVk.kwk..',
    '..kwkkVvvvvvvVkkwk..',
    '...kkVvvvvvvvvVkk...',
    '....kvyyvvvvyyvk....',
    '....kvvvvrrvvvvk....',
    '....kVvwkwwkwvVk....',
    '.....kVvvvvvvVk.....',
    '..kkkkkVVVVVVkkkk...',
    '.kRRRRkVvvvvVkRRRRk.',
    'kRrrRRkVvvvvVkRRrrRk',
    'kRrrRRkVyyyyVkRRrrRk',
    '.kkkkkkVvyyvVkkkkkk.',
    '......kVvvvvVk......',
    '.....kVVvvvvVVk.....',
    '....kVVkkkkkkVVk....',
    '....kVVk....kVVk....',
    '...kkVVk....kVVkk...',
    '...kRRRk....kRRRk...',
    '...kkkkk....kkkkk...',
  ],
  orb: ['.kk.', 'kyrk', 'krRk', '.kk.'],
  ring: ['..kkkk..', '.kcCCck.', 'kcn..nck', 'kC....Ck', 'kC....Ck', 'kcn..nck', '.kcCCck.', '..kkkk..'],
  nova: ['...kk...', 'k.kcck.k', '.kcwwck.', 'kcwwwwck', 'kcwwwwck', '.kcwwck.', 'k.kcck.k', '...kk...'],
  gem: ['.k.', 'kck', 'kCk', '.k.'],
  gem2: ['..k..', '.kck.', 'kcwCk', '.kCk.', '..k..'],
  gem3: ['..kk..', '.kyyk.', 'kyweok', 'kyyook', '.kook.', '..kk..'],
  heart: ['.kk.kk.', 'krrkrrk', 'krprrrk', 'krrrrrk', '.krrrk.', '..krk..', '...k...'],
  dagger: ['.k.', 'kwk', 'kwk', 'kwk', 'kyk', 'kbk', '.k.'],
  daggerz: ['.k.', 'kwk', 'kck', 'kck', 'kyk', 'kbk', '.k.'],
  // 进化图标
  tdag: ['.....kkk', '....kcwk', '...kcwck', '..kcwck.', '.kkwck..', 'kyykk...', 'kbyk....', 'kkk.....'],
  holy: ['...kk...', '..koyk..', '..kyek..', '..kyek..', '..kyek..', 'kkkyykkk', 'kooooook', '...kbk..'],
  quake: ['.kkkkkk.', 'kcc..cck', 'kc.kk.ck', 'k.kwwk.k', 'k.kwwk.k', 'kc.kk.ck', 'kcc..cck', '.kkkkkk.'],
  bloodboom: ['.....kr.', '....k.o.', '..kkkk..', '.kRRRRk.', 'kRprRRRk', 'kRRrRRRk', '.kRRRRk.', '..kkkk..'],
  // 升级卡图标
  bolt: ['....kkk.', '...kyyk.', '..kyyk..', '.kyyyykk', '.kkkyyk.', '...kyk..', '..kyk...', '..kk....'],
  bomb: ['.....ky.', '....k.o.', '..kkkk..', '.kddddk.', 'kdwddddk', 'kdddddgk', '.kddddk.', '..kkkk..'],
  boot: ['.kkkk...', '.kbbk...', '.kbbk...', '.kbbk...', '.kbbbkk.', 'kbbbbbbk', 'kooooook', '.kkkkkk.'],
  magnet: ['kkk..kkk', 'kwk..kwk', 'krk..krk', 'krk..krk', 'krkkkkrk', 'krrrrrrk', '.krrrrk.', '..kkkk..'],
  fang: ['.kkkkkk.', 'kRrrrrRk', 'krrrrrrk', 'kwkrrkwk', 'kwk..kwk', '.k....k.'],
  star: ['...kk...', '...kyk..', 'kkkyykkk', 'kyyyeyyk', '.kyyyyk.', '.kykkyk.', 'kyk..kyk', 'kk....kk'],
  swirl: ['..kkkk..', '.kcCCck.', 'kck..kCk', 'kCk.kkck', 'kck.kck.', 'kCk..k..', '.kcCk...', '..kk....'],
  flame: ['...k....', '..kok...', '..kyok..', '.kyoyok.', 'kyoeyork', 'kyeeeyok', '.kyeeyk.', '..kkkk..'],
  skull: ['.kkkkk.', 'kwwwwwk', 'kwmwmwk', 'kwwwwwk', '.kwkwk.', '..kkk..'],
};

const SPR = {};
function bakeSprites() {
  for (const [name, rows] of Object.entries(SPR_SRC)) {
    const h = rows.length, w = rows[0].length;
    const mk = (fn) => {
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const x = cv.getContext('2d');
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const col = PAL[rows[j][i]];
        if (col) { x.fillStyle = fn(col, rows[j][i]); x.fillRect(i, j, 1, 1); }
      }
      return cv;
    };
    SPR[name] = mk(c => c);
    // 受击白闪版本
    SPR[name + '_w'] = mk((c, ch) => ch === 'k' ? '#ffffff' : '#ffffff');
  }
}
bakeSprites();
