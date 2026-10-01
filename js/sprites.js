/* ===== 16x16 픽셀 스프라이트 ===== */
(function (global) {
  'use strict';

  var PAL = {
    '.': null,
    k: '#6b6383',
    w: '#ffffff',
    r: '#f2938c', R: '#d9706a',
    o: '#f7c48d', O: '#dd9f61',
    y: '#ffe08a', Y: '#edc45f',
    g: '#9ad693', G: '#6fb268',
    b: '#9cc9f0', B: '#6e9fd4',
    p: '#f7b3cb', P: '#dd87a8',
    u: '#c9adf2', U: '#a382dd',
    n: '#e0bb8e', N: '#bd9262',
    s: '#e4ded2', S: '#b5ae9f',
    f: '#fbdcc0'
  };

  var S = {};

  S.burger = [
    '................',
    '.....kkkkkk.....',
    '...kkoowoookk...',
    '..koooooooooook.',
    '..kooowoooowook.',
    '..kkkkkkkkkkkkk.',
    '..kgggggggggggk.',
    '..kkkkkkkkkkkkk.',
    '..kNnnnnnnnnnNk.',
    '..kNNNNNNNNNNNk.',
    '..kkkkkkkkkkkkk.',
    '..koooooooooook.',
    '..kkoooooooookk.',
    '....kkkkkkkkk...',
    '................',
    '................'
  ];

  S.coffee = [
    '................',
    '.....k..k.......',
    '......k..k......',
    '.....k..k.......',
    '................',
    '..kkkkkkkkkk....',
    '..kwwwwwwwwk....',
    '..kwNNNNNNwkkk..',
    '..kwNNNNNNwk.k..',
    '..kwNNNNNNwkkk..',
    '..kwwwwwwwwk....',
    '...kwwwwwwk.....',
    '....kkkkkk......',
    '..kkkkkkkkkkk...',
    '................',
    '................'
  ];

  S.bus = [
    '................',
    '...kkkkkkkkkk...',
    '..kyyyyyyyyyyk..',
    '..kybbbbbbbbyk..',
    '..kybbkbbkbbyk..',
    '..kyyyyyyyyyyk..',
    '..kyyyyyyyyyyk..',
    '..kyyyyyyyyyyk..',
    '..kyykyyyykyyk..',
    '..kyyyyyyyyyyk..',
    '..kkkkkkkkkkkk..',
    '...kkk....kkk...',
    '..kkkkk..kkkkk..',
    '..kkskk..kkskk..',
    '...kkk....kkk...',
    '................'
  ];

  S.house = [
    '................',
    '.......kk.......',
    '......kkkk......',
    '.....kkrrkk.....',
    '....kkrrrrkk....',
    '...kkrrrrrrkk...',
    '..kkrrrrrrrrkk..',
    '.kkrrrrrrrrrrkk.',
    '..kwwwwwwwwwwk..',
    '..kwbbwwwwbbwk..',
    '..kwbbwwwwbbwk..',
    '..kwwwwwwwwwwk..',
    '..kwwwknnkwwwk..',
    '..kwwwknnkwwwk..',
    '..kkkkkkkkkkkk..',
    '................'
  ];

  S.cart = [
    '................',
    '.kk.............',
    '.kkkkkkkkkkkk...',
    '..kooooooooook..',
    '..kowwwwwwwwok..',
    '..kowwwwwwwwok..',
    '..kowwwwwwwwok..',
    '..kooooooooook..',
    '...kooooooook...',
    '....kkkkkkkk....',
    '....k......k....',
    '................',
    '...kkk...kkk....',
    '...kkk...kkk....',
    '................',
    '................'
  ];

  S.health = [
    '................',
    '................',
    '......kkkk......',
    '.....kkkkkk.....',
    '..kkkkkkkkkkkk..',
    '..krrrrrrrrrrk..',
    '..krrrrwwrrrrk..',
    '..krrwwwwwwrrk..',
    '..krrwwwwwwrrk..',
    '..krrrrwwrrrrk..',
    '..krrrrrrrrrrk..',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
    '................',
    '................'
  ];

  S.game = [
    '................',
    '................',
    '................',
    '..kkkkkkkkkkkk..',
    '.kuuuuuuuuuuuuk.',
    '.kuukuuuuuuwuuk.',
    '.kukkkuuuuwuwuk.',
    '.kuukuuuuuuwuuk.',
    '.kuuuuuuuuuuuuk.',
    '..kkkuuuuuukkk..',
    '...kkk....kkk...',
    '................',
    '................',
    '................',
    '................',
    '................'
  ];

  S.shirt = [
    '................',
    '................',
    '................',
    '.kkkkkkkkkkkkkk.',
    'kkppppkkkkppppkk',
    'kppppppkkppppppk',
    'kppppppppppppppk',
    'kppppppppppppppk',
    'kkppppppppppppkk',
    '.kkppppppppppkk.',
    '...kppppppppk...',
    '...kppppppppk...',
    '...kppppppppk...',
    '...kkkkkkkkkk...',
    '................',
    '................'
  ];

  S.book = [
    '................',
    '..kkkkkkkkkkkkk.',
    '..kbbbbbbbbbbbk.',
    '..kbwwwwkwwwwbk.',
    '..kbwwwwkwwwwbk.',
    '..kbwwwwkwwwwbk.',
    '..kbwwwwkwwwwbk.',
    '..kbwwwwkwwwwbk.',
    '..kbwwwwkwwwwbk.',
    '..kbbbbbbbbbbbk.',
    '..kkkkkkkkkkkkk.',
    '................',
    '................',
    '................',
    '................',
    '................'
  ];

  S.gift = [
    '................',
    '......kk.kk.....',
    '.....k..k..k....',
    '......kkkkk.....',
    '..kkkkkkkkkkkk..',
    '..krrrrkkrrrrk..',
    '..krrrrkkrrrrk..',
    '..kkkkkkkkkkkk..',
    '..krrrrkkrrrrk..',
    '..krrrrkkrrrrk..',
    '..krrrrkkrrrrk..',
    '..krrrrkkrrrrk..',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
    '................'
  ];

  S.box = [
    '................',
    '................',
    '................',
    '..kkkkkkkkkkkk..',
    '..knnnnkknnnnk..',
    '..knnnnkknnnnk..',
    '..kkkkkkkkkkkk..',
    '..kNNNNNNNNNNk..',
    '..kNNNNkkNNNNk..',
    '..kNNNNkkNNNNk..',
    '..kNNNNNNNNNNk..',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
    '................',
    '................'
  ];

  S.bag = [
    '................',
    '......kkkk......',
    '.....kwwwwk.....',
    '......kkkk......',
    '.....kkkkkk.....',
    '....knnnnnnk....',
    '...knnnnnnnnk...',
    '..knnnnyynnnnk..',
    '..knnnyyyynnnk..',
    '..knnnnyynnnnk..',
    '..knnnnnnnnnnk..',
    '...kkkkkkkkkk...',
    '................',
    '................',
    '................',
    '................'
  ];

  S.coin = [
    '................',
    '.....kkkkkk.....',
    '...kkyyyyyykk...',
    '..kyyyyyyyyyyk..',
    '.kyyyYyyyyYyyyk.',
    '.kyyyYyyyyYyyyk.',
    '.kyyyYYYYYYyyyk.',
    '.kyyyyYyyYyyyyk.',
    '.kyyyYYYYYYyyyk.',
    '.kyyyyyYYyyyyyk.',
    '..kyyyyyyyyyyk..',
    '...kkyyyyyykk...',
    '.....kkkkkk.....',
    '................',
    '................',
    '................'
  ];

  S.mail = [
    '................',
    '................',
    '................',
    '..kkkkkkkkkkkk..',
    '..kwwkkkkkkwwk..',
    '..kwwwwkkwwwwk..',
    '..kwwwwwwwwwwk..',
    '..kwwwwwwwwwwk..',
    '..kwwwwwwwwwwk..',
    '..kwwwwwwwwwwk..',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
    '................',
    '................',
    '................'
  ];

  S.piggy = [
    '................',
    '................',
    '......kkk.......',
    '...kkkkkkkkk....',
    '..kppppppppppk..',
    '.kpppkpppppppk..',
    '.kppppppppppppk.',
    '.kppppppppppkpk.',
    '.kppppppppppppk.',
    '..kpppppppppppk.',
    '..kkpkkkkkkpkk..',
    '....kk....kk....',
    '................',
    '................',
    '................',
    '................'
  ];

  S.doc = [
    '................',
    '...kkkkkkkkkk...',
    '...kwwwwwwwwk...',
    '...kwkkkkkkwk...',
    '...kwwwwwwwwk...',
    '...kwkkkkkkwk...',
    '...kwwwwwwwwk...',
    '...kwkkkkwwwk...',
    '...kwwwwwwwwk...',
    '...kwwwwwwwwk...',
    '...kkkkkkkkkk...',
    '................',
    '................',
    '................',
    '................',
    '................'
  ];

  S.chart = [
    '................',
    '..kkkkkkkkkkkk..',
    '..kwwwwwwwwwwk..',
    '..kwwwwwwwwwwk..',
    '..kwwwwwwwggwk..',
    '..kwwwwwwwggwk..',
    '..kwwwwggwggwk..',
    '..kwwwwggwggwk..',
    '..kwggwggwggwk..',
    '..kwggwggwggwk..',
    '..kwwwwwwwwwwk..',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
    '................',
    '................'
  ];

  S.thumb = [
    '................',
    '.......kk.......',
    '......kffk......',
    '......kffk......',
    '....kkkffkkkk...',
    '...kffffffffk...',
    '..kkffffffffk...',
    '..kfkfffffffk...',
    '..kfkfffffffk...',
    '..kfkfffffffk...',
    '..kfkfffffffk...',
    '..kfkfffffffk...',
    '..kkffffffffk...',
    '...kkkkkkkkk....',
    '................',
    '................'
  ];

  S.star = [
    '................',
    '.......kk.......',
    '......kyyk......',
    '......kyyk......',
    '..kkkkkyykkkkk..',
    '..kyyyyyyyyyyk..',
    '...kyyyyyyyyk...',
    '....kyyyyyyk....',
    '....kyyyyyyk....',
    '...kyyykkyyyk...',
    '..kyykk..kkyyk..',
    '..kkk......kkk..',
    '................',
    '................',
    '................',
    '................'
  ];

  S.heart = [
    '................',
    '................',
    '...kkkk..kkkk...',
    '..kppppkkppppk..',
    '.kppppppppppppk.',
    '.kppppppppppppk.',
    '.kppppppppppppk.',
    '..kppppppppppk..',
    '...kppppppppk...',
    '....kppppppk....',
    '.....kppppk.....',
    '......kppk......',
    '.......kk.......',
    '................',
    '................',
    '................'
  ];

  S.tower = [
    '................',
    '....kkkkkkkk....',
    '...kkkkkkkkkk...',
    '...kyykkkkyyk...',
    '...kkkkkkkkkk...',
    '...kyykkkkyyk...',
    '...kkkkkkkkkk...',
    '...kyykkkkyyk...',
    '...kkkkkkkkkk...',
    '...kyykkkkyyk...',
    '...kkkkkkkkkk...',
    '...kyykkkkyyk...',
    '...kkkkkkkkkk...',
    '...kkkkkkkkkk...',
    '..kkkkkkkkkkkk..',
    '................'
  ];

  S.cal = [
    '................',
    '...kk......kk...',
    '..kkkkkkkkkkkk..',
    '..krrrrrrrrrrk..',
    '..kkkkkkkkkkkk..',
    '..kwwwwwwwwwwk..',
    '..kwkwkwkwkwwk..',
    '..kwwwwwwwwwwk..',
    '..kwkwkwkwkwwk..',
    '..kwwwwwwwwwwk..',
    '..kwkwkwkwwwwk..',
    '..kwwwwwwwwwwk..',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
    '................'
  ];

  S.gear = [
    '................',
    '................',
    '......kkkk......',
    '......kssk......',
    '..kkkkksskkkkk..',
    '..kssssssssssk..',
    'kkksssssssssskkk',
    'kkkssskkkkssskkk',
    'kkkssswwwwssskkk',
    'kkkssswwwwssskkk',
    'kkkssskkkkssskkk',
    'kkksssssssssskkk',
    '..kssssssssssk..',
    '..kkkkksskkkkk..',
    '......kssk......',
    '......kkkk......'
  ];

  S.plus = [
    '................',
    '................',
    '......kkkk......',
    '......kggk......',
    '......kggk......',
    '..kkkkkggkkkkk..',
    '..kgggggggggggk.',
    '..kgggggggggggk.',
    '..kkkkkggkkkkk..',
    '......kggk......',
    '......kggk......',
    '......kkkk......',
    '................',
    '................',
    '................',
    '................'
  ];

  var cache = {};

  function draw(name, px) {
    var grid = S[name] || S.box;
    px = px || 1;
    var c = document.createElement('canvas');
    c.width = 16 * px;
    c.height = 16 * px;
    var x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    for (var r = 0; r < grid.length; r++) {
      var row = grid[r];
      for (var i = 0; i < row.length; i++) {
        var col = PAL[row[i]];
        if (!col) continue;
        x.fillStyle = col;
        x.fillRect(i * px, r * px, px, px);
      }
    }
    return c;
  }

  function url(name) {
    if (!cache[name]) cache[name] = draw(name, 1).toDataURL();
    return cache[name];
  }

  /* <canvas> 대신 data-sprite 속성을 읽어 배경으로 채워 넣는다 */
  function hydrate(root) {
    var list = (root || document).querySelectorAll('canvas[data-sprite]');
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (el.dataset.done === '1') continue;
      var g = S[el.dataset.sprite] ? el.dataset.sprite : 'box';
      el.width = 16; el.height = 16;
      var ctx = el.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, 16, 16);
      var grid = S[g];
      for (var r = 0; r < grid.length; r++) {
        for (var cI = 0; cI < grid[r].length; cI++) {
          var col = PAL[grid[r][cI]];
          if (!col) continue;
          ctx.fillStyle = col;
          ctx.fillRect(cI, r, 1, 1);
        }
      }
      el.dataset.done = '1';
    }
  }

  function tag(name, cls) {
    return '<canvas data-sprite="' + name + '" class="' + (cls || '') + '" width="16" height="16"></canvas>';
  }

  global.Sprites = { PAL: PAL, data: S, draw: draw, url: url, hydrate: hydrate, tag: tag, names: Object.keys(S) };
})(window);
