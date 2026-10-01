/* ===== 픽셀 건물 렌더러 ===== */
(function (global) {
  'use strict';

  var W = 160, H = 200, BASE = 168;

  /* 건물 형태 : 폭 / 층당 창문수 / 층높이 / 층수 범위 / 지붕 */
  var SHAPES = {
    tower: { name: '고층 아파트', w: 76, cols: 3, fh: 9, min: 8, max: 14, roof: 'flat', tank: true },
    corridor: { name: '복도식 아파트', w: 112, cols: 5, fh: 9, min: 5, max: 14, roof: 'flat', corridor: true },
    low: { name: '저층 아파트', w: 96, cols: 4, fh: 10, min: 3, max: 7, roof: 'slab' },
    villa: { name: '빌라 / 다세대', w: 68, cols: 2, fh: 11, min: 3, max: 6, roof: 'gable' },
    house: { name: '단독주택', w: 72, cols: 2, fh: 13, min: 1, max: 3, roof: 'gable', chimney: true, yard: true },
    officetel: { name: '오피스텔', w: 52, cols: 2, fh: 7, min: 10, max: 18, roof: 'antenna', glass: true }
  };
  var SHAPE_IDS = Object.keys(SHAPES);

  function shape(id) { return SHAPES[id] || SHAPES.tower; }
  function clampFloors(id, n) {
    var s = shape(id);
    n = Number(n) || s.min;
    return Math.max(s.min, Math.min(s.max, Math.round(n)));
  }

  function px(g, x, y, w, h, c) {
    if (!c || w <= 0 || h <= 0) return;
    g.fillStyle = c;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function disc(g, cx, cy, r, c) {
    for (var y = -r; y <= r; y++) {
      var w = Math.floor(Math.sqrt(r * r - y * y));
      px(g, cx - w, cy + y, w * 2 + 1, 1, c);
    }
  }

  function cloud(g, x, y, s, c) {
    px(g, x + 4 * s, y, 10 * s, 3 * s, c);
    px(g, x, y + 3 * s, 20 * s, 4 * s, c);
    px(g, x + 2 * s, y + 7 * s, 15 * s, 2 * s, c);
  }

  function tree(g, x, baseY, night, ink) {
    var leaf = night ? '#4f7d6a' : '#9ad693';
    var leaf2 = night ? '#416a59' : '#7bbd72';
    px(g, x + 4, baseY - 8, 4, 8, '#bd9262');
    px(g, x, baseY - 20, 12, 12, leaf);
    px(g, x, baseY - 12, 12, 4, leaf2);
    px(g, x + 2, baseY - 23, 8, 3, leaf);
    px(g, x - 1, baseY - 18, 1, 6, ink);
    px(g, x + 12, baseY - 18, 1, 6, ink);
  }

  var STARS = [[12, 14], [34, 26], [58, 10], [78, 30], [96, 16], [118, 36], [142, 20], [24, 44], [136, 52], [66, 46]];

  function gableRoof(g, x0, bodyW, topY, h, color, color2, ink) {
    var w0 = bodyW + 8, gx = x0 - 4;
    for (var k = 0; k < h; k++) {
      var ww = Math.max(4, Math.round(w0 * (k + 1) / h));
      if ((ww & 1) !== (w0 & 1)) ww++;
      var x = gx + Math.round((w0 - ww) / 2);
      px(g, x, topY - h + k, ww, 1, k > h - 3 ? color2 : color);
      px(g, x, topY - h + k, 1, 1, ink);
      px(g, x + ww - 1, topY - h + k, 1, 1, ink);
    }
    px(g, gx, topY - 1, w0, 1, ink);
  }

  /* ratio : 0~1 진척도 → 아래층부터 불이 켜진다
     logicalW : 컨테이너 비율에 맞춘 가로 도트 수(배경을 꽉 채우기 위함) */
  function render(canvas, goal, ratio, night, logicalW) {
    goal = goal || {};
    var sh = shape(goal.shape);
    var F = clampFloors(goal.shape, goal.floors);
    ratio = Math.max(0, Math.min(1, ratio || 0));

    var W = Math.max(130, Math.min(560, Math.round(logicalW || 160)));
    canvas.width = W;
    canvas.height = H;
    var g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;

    var th = Store.theme(goal.theme);
    var ink = '#6b6383';

    /* --- 하늘 --- */
    px(g, 0, 0, W, H, night ? '#5468a8' : '#d3ecfb');
    px(g, 0, 0, W, 50, night ? '#4a5c99' : '#c3e4fa');
    px(g, 0, 50, W, 10, night ? '#4f62a0' : '#cbe8fb');

    if (night) {
      for (var s = 0; s < STARS.length; s++) px(g, STARS[s][0], STARS[s][1], 2, 2, '#ffffff');
      disc(g, W - 30, 26, 11, '#fdf8e6');
      disc(g, W - 36, 22, 9, '#4a5c99');
      px(g, W - 26, 20, 2, 2, '#e8dec0');
      px(g, W - 31, 32, 3, 2, '#e8dec0');
    } else {
      disc(g, W - 30, 26, 12, '#ffe08a');
      disc(g, W - 30, 26, 9, '#fff0b8');
      cloud(g, 8, 22, 1, '#ffffff');
      cloud(g, Math.round(W * 0.62), 52, 1, '#f3fbff');
      if (W > 260) cloud(g, W - 64, 20, 1, '#ffffff');
    }

    /* --- 먼 산 --- */
    var hill = night ? '#49628e' : '#b6ddc3';
    var hills = Math.max(3, Math.ceil(W / 56));
    for (var i = 0; i < hills; i++) {
      var hx = -6 + i * 58, hw = 70, hh = [18, 26, 20][i % 3];
      for (var k = 0; k < hh; k++) {
        var inset = Math.round(k * (hw / 2) / hh);
        px(g, hx + inset, BASE - hh + k, hw - inset * 2, 1, hill);
      }
    }

    /* --- 땅 --- */
    var grass = night ? '#4f7d6a' : '#b9e49c';
    var grass2 = night ? '#44705e' : '#a0d184';
    px(g, 0, BASE, W, H - BASE, grass);
    px(g, 0, BASE, W, 2, ink);
    px(g, 0, BASE + 16, W, H - BASE - 16, grass2);
    var pathX = Math.round(W / 2) - 12;
    px(g, pathX, BASE + 2, 24, H - BASE - 2, night ? '#6a6490' : '#e8e2d6');
    px(g, pathX - 1, BASE + 2, 1, H - BASE - 2, ink);
    px(g, pathX + 24, BASE + 2, 1, H - BASE - 2, ink);
    for (var r = BASE + 6; r < H; r += 8) px(g, pathX + 10, r, 4, 3, night ? '#8b85ab' : '#fcfaf6');

    /* --- 건물 본체 --- */
    var bodyW = sh.w, x0 = Math.round((W - bodyW) / 2);
    var entrance = 16, fh = sh.fh;
    var bodyTop = BASE - entrance - F * fh;

    px(g, x0 + bodyW, bodyTop + 4, 4, BASE - bodyTop - 4, 'rgba(107,99,131,.16)');
    px(g, x0, bodyTop, bodyW, BASE - bodyTop, th.body);
    px(g, x0 + bodyW - 6, bodyTop, 6, BASE - bodyTop, th.body2);
    px(g, x0, bodyTop, 1, BASE - bodyTop, ink);
    px(g, x0 + bodyW - 1, bodyTop, 1, BASE - bodyTop, ink);
    for (var f = 0; f <= F; f++) px(g, x0, bodyTop + f * fh, bodyW, 1, 'rgba(107,99,131,.18)');

    /* --- 지붕 --- */
    if (sh.roof === 'gable') {
      gableRoof(g, x0, bodyW, bodyTop, Math.round(bodyW * 0.3), th.roof, th.body2, ink);
      if (sh.chimney) {
        var cx = x0 + bodyW - 20, ctop = bodyTop - Math.round(bodyW * 0.3) + 2;
        px(g, cx, ctop, 9, 14, th.body2);
        px(g, cx, ctop, 9, 1, ink);
        px(g, cx, ctop, 1, 14, ink);
        px(g, cx + 8, ctop, 1, 14, ink);
      }
    } else if (sh.roof === 'antenna') {
      px(g, x0 - 3, bodyTop - 5, bodyW + 6, 5, th.roof);
      px(g, x0 - 3, bodyTop - 5, bodyW + 6, 1, ink);
      px(g, x0 - 3, bodyTop - 1, bodyW + 6, 1, ink);
      px(g, x0 + bodyW / 2 - 1, bodyTop - 17, 1, 12, ink);
      px(g, x0 + bodyW / 2 - 2, bodyTop - 19, 3, 3, ratio >= 1 ? '#f2938c' : '#ffe08a');
    } else {
      var rh = sh.roof === 'slab' ? 5 : 7, ov = sh.roof === 'slab' ? 3 : 4;
      px(g, x0 - ov, bodyTop - rh, bodyW + ov * 2, rh, th.roof);
      px(g, x0 - ov, bodyTop - rh, bodyW + ov * 2, 1, ink);
      px(g, x0 - ov, bodyTop - 1, bodyW + ov * 2, 1, ink);
      px(g, x0 - ov, bodyTop - rh, 1, rh, ink);
      px(g, x0 + bodyW + ov - 1, bodyTop - rh, 1, rh, ink);
      if (sh.tank) {
        var tx = x0 + 10, ty = bodyTop - rh - 7;
        px(g, tx, ty, 12, 7, th.body2);
        px(g, tx, ty, 12, 1, ink);
        px(g, tx, ty, 1, 7, ink);
        px(g, tx + 11, ty, 1, 7, ink);
      }
    }

    /* --- 창문 --- */
    var pad = 5, gap = 5;
    var winW = Math.max(6, Math.floor((bodyW - pad * 2 - gap * (sh.cols - 1)) / sh.cols));
    var used = winW * sh.cols + gap * (sh.cols - 1);
    var sx = x0 + Math.round((bodyW - used) / 2);
    var winH = Math.max(3, fh - 4);
    var total = F * sh.cols;
    var lit = Math.round(ratio * total);
    var onC = '#ffe08a', onC2 = '#fff6d2';
    var offC = night ? '#3f4f85' : '#a9c4e2';
    var idx = 0;

    for (var row = 0; row < F; row++) {
      var fy = BASE - entrance - (row + 1) * fh + 2;
      for (var c2 = 0; c2 < sh.cols; c2++) {
        var on = idx < lit;
        var wx = sx + c2 * (winW + gap);
        px(g, wx, fy, winW, winH, on ? onC : offC);
        px(g, wx - 1, fy - 1, winW + 2, 1, ink);
        px(g, wx - 1, fy + winH, winW + 2, 1, ink);
        px(g, wx - 1, fy, 1, winH, ink);
        px(g, wx + winW, fy, 1, winH, ink);
        if (!sh.glass) px(g, wx + Math.floor(winW / 2), fy, 1, winH, 'rgba(107,99,131,.40)');
        if (on) px(g, wx + 1, fy + 1, Math.min(4, winW - 2), 1, onC2);
        idx++;
      }
      /* 복도식 : 층마다 복도 난간 */
      if (sh.corridor) {
        var ry = fy + winH + 1;
        px(g, x0 + 1, ry, bodyW - 2, 2, th.body2);
        px(g, x0 + 1, ry, bodyW - 2, 1, ink);
        for (var pp = x0 + 4; pp < x0 + bodyW - 4; pp += 7) px(g, pp, ry, 1, 2, ink);
      }
    }

    /* --- 1층 : 간판 + 현관 --- */
    var ey = BASE - entrance;
    px(g, x0 + 1, ey, bodyW - 2, entrance, th.body2);
    px(g, x0, ey, bodyW, 1, ink);

    if (sh.roof !== 'gable') {
      px(g, x0 + 8, ey + 2, bodyW - 16, 4, '#ffffff');
      px(g, x0 + 8, ey + 2, bodyW - 16, 1, ink);
      px(g, x0 + 8, ey + 5, bodyW - 16, 1, ink);
      px(g, x0 + 8, ey + 2, 1, 4, ink);
      px(g, x0 + bodyW - 9, ey + 2, 1, 4, ink);
      var slots = Math.max(3, Math.floor((bodyW - 20) / 10));
      for (var sg = 0; sg < slots; sg++) px(g, x0 + 12 + sg * 10, ey + 3, 6, 2, th.roof);
    }

    var dw = Math.min(20, Math.max(12, Math.round(bodyW * 0.25)));
    var dx = x0 + Math.round((bodyW - dw) / 2), dy = ey + (sh.roof === 'gable' ? 4 : 7);
    var dh = BASE - dy;
    px(g, dx, dy, dw, dh, ratio >= 1 ? '#ffe08a' : (night ? '#5a5488' : '#b3d2ee'));
    px(g, dx - 1, dy - 1, dw + 2, 1, ink);
    px(g, dx - 1, dy, 1, dh, ink);
    px(g, dx + dw, dy, 1, dh, ink);
    px(g, dx + Math.floor(dw / 2), dy, 1, dh, ink);

    /* --- 마당 (단독주택) --- */
    if (sh.yard) {
      var fx0 = x0 - 52;
      if (fx0 > 4) {
        for (var fx = fx0; fx < fx0 + 44; fx += 7) {
          px(g, fx, BASE + 4, 2, 10, '#ffffff');
          px(g, fx, BASE + 4, 2, 1, ink);
        }
        px(g, fx0, BASE + 7, 44, 2, '#ffffff');
        px(g, fx0, BASE + 7, 44, 1, ink);
      }
    }

    /* --- 완공 깃발 --- */
    if (ratio >= 1 && sh.roof !== 'antenna') {
      var topEdge = bodyTop - (sh.roof === 'gable' ? Math.round(bodyW * 0.3) : (sh.roof === 'slab' ? 5 : 7));
      var fp = x0 + bodyW - 14;
      px(g, fp, topEdge - 18, 1, 18, ink);
      px(g, fp + 1, topEdge - 18, 11, 7, '#f2938c');
      px(g, fp + 1, topEdge - 18, 11, 1, ink);
      px(g, fp + 1, topEdge - 12, 11, 1, ink);
      px(g, fp + 12, topEdge - 18, 1, 7, ink);
    }
    if (ratio >= 1) {
      px(g, 22, 76, 3, 3, '#ffe08a');
      px(g, W - 22, 96, 3, 3, '#ffe08a');
      px(g, 18, 112, 2, 2, '#ffffff');
    }

    /* --- 조경 --- */
    tree(g, 10, BASE + 22, night, ink);
    tree(g, W - 22, BASE + 26, night, ink);
    px(g, 30, BASE + 24, 6, 3, grass2);
    px(g, W - 36, BASE + 14, 5, 2, grass2);
    for (var bx = x0 - 34; bx > 24; bx -= 46) tree(g, bx, BASE + 12, night, ink);
    for (var bx2 = x0 + bodyW + 22; bx2 < W - 34; bx2 += 46) tree(g, bx2, BASE + 12, night, ink);

    return canvas;
  }

  global.Pixel = {
    render: render, W: W, H: H,
    SHAPES: SHAPES, SHAPE_IDS: SHAPE_IDS, shape: shape, clampFloors: clampFloors
  };
})(window);
