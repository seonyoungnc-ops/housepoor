/* ===== 화면 ===== */
(function (global) {
  'use strict';

  var C = Calc, S = Store;
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
    });
  };
  var spr = function (n, cls) { return Sprites.tag(n, cls || ''); };

  var UI = {
    view: 'home',
    cal: new Date(),
    calSel: null,
    statMode: 'month',
    editing: null,
    draft: null,
    installEvt: null
  };

  var TABS = [
    { id: 'home', name: '홈', spr: 'tower' },
    { id: 'calendar', name: '달력', spr: 'cal' },
    { id: 'stats', name: '통계', spr: 'chart' },
    { id: 'goals', name: '목표', spr: 'house' },
    { id: 'settings', name: '설정', spr: 'gear' }
  ];

  var TYPE_META = {
    expense: { name: '지출', cls: 'exp', sign: '-' },
    income: { name: '수입', cls: 'inc', sign: '+' },
    save: { name: '저축', cls: 'sav', sign: '' }
  };

  /* ---------- 공통 조각 ---------- */
  function pbar(ratio, cls) {
    var n = 20, on = Math.round(Math.max(0, Math.min(1, ratio)) * n), h = '';
    for (var i = 0; i < n; i++) h += '<i class="' + (i < on ? 'f' : '') + '"></i>';
    return '<div class="pbar ' + (cls || '') + '">' + h + '</div>';
  }

  function money(name, value, extra) {
    return '<input type="text" inputmode="numeric" data-money="1" ' + (extra || '') +
      ' value="' + C.fmt(value) + '" aria-label="' + esc(name) + '">';
  }

  function dot(m) {
    return '<span class="mdot" style="background:' + m.color + '" title="' + esc(m.name) + '"></span>';
  }

  function txRow(t) {
    var m = TYPE_META[t.type] || TYPE_META.expense;
    var c = S.cat(t.type, t.cat);
    var multi = S.state.members.length > 1;
    var who = multi ? dot(S.member(t.by)) + S.member(t.by).name + ' · ' : '';
    return '<div class="tx" data-act="tx:edit" data-id="' + t.id + '">' +
      spr(c.spr) +
      '<div class="t"><b>' + esc(t.memo || c.name) + '</b>' +
      '<span>' + who + esc(t.date) + ' · ' + esc(c.name) + '</span></div>' +
      '<div class="a ' + m.cls + ' num">' + m.sign + C.fmt(t.amount) + '</div></div>';
  }

  function heroCanvas(id) {
    return '<canvas id="' + id + '" width="160" height="200"></canvas>';
  }

  /* 컨테이너 비율에 맞춰 가로 도트 수를 계산 → 배경이 항상 꽉 찬다 */
  function paintBuilding(cv, goal, ratio, night) {
    if (!cv) return;
    var w = cv.clientWidth || cv.offsetWidth || 320;
    var h = cv.clientHeight || 200;
    var lw = Math.round(Pixel.H * w / Math.max(1, h));
    Pixel.render(cv, goal, ratio, night, lw);
  }

  function isNight() { return document.documentElement.dataset.theme === 'night'; }

  /* ---------- 홈 ---------- */
  function viewHome() {
    var goals = S.goalsSorted();
    var g = S.activeGoal();
    var p = C.progress(g);
    var now = new Date();
    var ym = C.iso(new Date(now.getFullYear(), now.getMonth(), 1));
    var ymEnd = C.iso(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    var mo = C.sums(ym, ymEnd);
    var ns = C.noSpendDays(now.getFullYear(), now.getMonth());
    var streak = C.noSpendStreak();
    var budget = Number(S.state.settings.monthlyBudget) || 0;
    var h = '';

    if (goals.length > 1) {
      h += '<div class="goalswitch">';
      goals.forEach(function (x) {
        h += '<button data-act="goal:select" data-id="' + x.id + '" class="' + (x.id === g.id ? 'on' : '') + '">' +
          x.rank + '위 ' + esc(x.name) + '</button>';
      });
      h += '</div>';
    }

    h += '<div class="hero">' + heroCanvas('heroCanvas') +
      '<div class="rankbadge">' + g.rank + '위</div>' +
      '<div class="nameplate">' + esc(g.name || '이름 없는 집') + '</div>' +
      '<div class="shapetag">' + esc(Pixel.shape(g.shape).name) + ' · ' + Pixel.clampFloors(g.shape, g.floors) + '층</div>' +
      '</div>';

    h += '<div class="card">' +
      '<div class="card-h"><h2>' + esc(g.name) + ' 모으기</h2>' +
      '<span class="tag">' + Math.floor(p.ratio * 100) + '%</span></div>' +
      pbar(p.ratio, p.ratio >= 1 ? '' : (p.ratio < .3 ? 'warn' : '')) +
      '<div class="gap"></div>';

    if (p.eta && p.eta.done) {
      h += '<div class="bigmsg celebrate">🎉 자기자본 준비 완료!<br>지금 바로 <b>입주 가능</b>해요</div>';
    } else if (p.eta && p.eta.tooLong) {
      h += '<div class="bigmsg">지금 속도로는 <b>50년 이상</b> 걸려요<br>' +
        '<span class="tiny">목표 금액을 낮추거나, 월 저축액을 늘리거나, 대출 조건을 다시 확인해 보세요</span></div>';
    } else if (p.eta) {
      h += '<div class="bigmsg">앞으로 <b>' + p.eta.monthsR + '개월</b> 더 모으면 입주 가능!<br>' +
        '<span class="tiny">= ' + C.fmt(p.eta.weeks) + '주 · ' + C.fmt(p.eta.days) + '일 · 예상 ' + p.eta.date + '</span></div>';
    } else {
      h += '<div class="bigmsg">아직 저축 속도를 몰라요<br><span class="tiny">내역을 기록하거나 설정에서 월 저축액을 입력해 주세요</span></div>';
    }

    h += '<div class="gap"></div><div class="stat">' +
      '<div><b class="num">' + C.kor(p.have) + '</b><span>모은 돈</span></div>' +
      '<div><b class="num">' + C.kor(p.loan.needCash) + '</b><span>필요 자기자본</span></div>' +
      '<div><b class="num">' + C.kor(p.short) + '</b><span>남은 금액</span></div>' +
      '</div>';
    h += '<div class="hint">월 저축 속도 ' + C.kor(p.pace.monthly) + ' · ' + esc(p.pace.basis) + '</div>';
    h += '</div>';

    h += '<div class="card"><div class="card-h"><h2>대출·자금 계획</h2>' +
      '<button class="btn sm" data-act="nav:settings">조건 수정</button></div>' +
      '<div class="row wrap" style="margin-bottom:8px"><span class="tag big">' + esc(p.loan.product.name) + '</span>' +
      '<span class="tag">금리 ' + S.state.settings.rate + '%</span>' +
      '<span class="tag">' + S.state.settings.years + '년</span></div>';

    p.loan.warnings.forEach(function (w) {
      h += '<div class="warn-box">⚠ ' + esc(w) + '</div>';
    });

    h += '<div class="kv"><span>집값</span><b class="num">' + C.kor(p.loan.price) + '</b></div>' +
      '<div class="kv"><span>취득세 등 부대비용 (' + S.state.settings.extraRate + '%)</span><b class="num">' + C.kor(p.loan.extra) + '</b></div>' +
      '<div class="kv"><span>필요 총액</span><b class="num">' + C.kor(p.loan.totalCost) + '</b></div>' +
      '<div class="kv"><span>받을 수 있는 대출 <span class="tag">' + esc(p.loan.capBy) + '</span></span><b class="num">' + C.kor(p.loan.amount) + '</b></div>' +
      '<div class="kv"><span>예상 월 상환액</span><b class="num">' + C.won(p.loan.monthlyPayment) + '</b></div>' +
      '<div class="kv"><span>필요 자기자본</span><b class="num">' + C.kor(p.loan.needCash) + '</b></div>' +
      '<div class="hint">' + esc(p.loan.product.note) + '</div>' +
      '</div>';

    h += '<div class="card"><div class="card-h"><h2>이번 달</h2>' +
      '<span class="tag">' + (now.getMonth() + 1) + '월</span></div>' +
      '<div class="stat">' +
      '<div><b class="num a exp">' + C.fmt(mo.expense) + '</b><span>지출</span></div>' +
      '<div><b class="num a inc">' + C.fmt(mo.income) + '</b><span>수입</span></div>' +
      '<div><b class="num a sav">' + C.fmt(mo.save) + '</b><span>저축</span></div>' +
      '</div>';
    if (budget > 0) {
      var br = mo.expense / budget;
      h += '<div class="gap"></div>' +
        '<div class="row tiny" style="justify-content:space-between"><span>예산 ' + C.fmt(budget) + '원</span>' +
        '<span>' + Math.round(br * 100) + '% 사용</span></div>' +
        pbar(Math.min(1, br), br > 1 ? 'over sm' : (br > .8 ? 'warn sm' : 'sm'));
    }
    var mem = C.byMember(ym, ymEnd);
    if (mem.length > 1) {
      h += '<div class="gap"></div><div class="row wrap tiny">' + mem.map(function (x) {
        return '<span class="memchip">' + dot(x.member) + esc(x.member.name) + ' ' + C.fmt(x.amount) + '원</span>';
      }).join('') + '</div>';
    }
    h += '<div class="gap"></div><div class="row" style="gap:10px">' +
      spr('thumb') + '<div class="tiny grow">이번 달 무지출 <b>' + ns.count + '일</b> / ' + ns.total + '일' +
      (streak > 1 ? ' · 연속 <b>' + streak + '일</b> 기록 중!' : '') + '</div></div>';
    h += '</div>';

    var recent = S.state.tx.slice(0, 5);
    h += '<div class="card"><div class="card-h"><h2>최근 내역</h2>' +
      '<button class="btn sm" data-act="nav:calendar">전체보기</button></div>';
    h += recent.length ? recent.map(txRow).join('')
      : '<div class="empty">아직 기록이 없어요.<br>오른쪽 아래 + 버튼으로 첫 내역을 남겨보세요!</div>';
    h += '</div>';

    return {
      html: h,
      after: function () { paintBuilding(document.getElementById('heroCanvas'), g, p.ratio, isNight()); }
    };
  }

  /* ---------- 달력 ---------- */
  function viewCalendar() {
    var d = UI.cal, y = d.getFullYear(), m = d.getMonth();
    var map = C.monthMap(y, m);
    var first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
    var startPad = first.getDay(), days = last.getDate();
    var todayI = S.todayISO();
    var tot = C.sums(C.iso(first), C.iso(last));
    var ns = C.noSpendDays(y, m);

    var h = '<div class="calnav">' +
      '<button class="btn sm" data-act="cal:prev">◀</button>' +
      '<div class="m">' + y + '년 ' + (m + 1) + '월</div>' +
      '<div class="row"><button class="btn sm" data-act="cal:today">오늘</button>' +
      '<button class="btn sm" data-act="cal:next">▶</button></div></div>';

    h += '<div class="card"><div class="stat">' +
      '<div><b class="num a exp">' + C.fmt(tot.expense) + '</b><span>지출</span></div>' +
      '<div><b class="num a inc">' + C.fmt(tot.income) + '</b><span>수입</span></div>' +
      '<div><b class="num a sav">' + C.fmt(tot.save) + '</b><span>저축</span></div></div>' +
      '<div class="hint">무지출 ' + ns.count + '일 · 합계 ' + tot.count + '건</div></div>';

    h += '<div class="card">';
    h += '<div class="calhead">' + ['일', '월', '화', '수', '목', '금', '토']
      .map(function (w) { return '<div>' + w + '</div>'; }).join('') + '</div>';
    h += '<div class="cal">';
    for (var i = 0; i < startPad; i++) h += '<div class="c mute"></div>';
    for (var dd = 1; dd <= days; dd++) {
      var key = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(dd).padStart(2, '0');
      var e = map[key];
      var cls = 'c' + (key === todayI ? ' today' : '') + (key === UI.calSel ? ' sel' : '');
      h += '<div class="' + cls + '" data-act="cal:day" data-d="' + key + '">';
      h += '<span class="d">' + dd + '</span>';
      if (e && e.save > 0) h += '<span class="sv"></span>';
      if (e && e.expense > 0) h += '<span class="e">-' + short(e.expense) + '</span>';
      if (e && e.income > 0) h += '<span class="i">+' + short(e.income) + '</span>';
      if ((!e || e.expense === 0) && key <= todayI) h += spr('thumb');
      h += '</div>';
    }
    h += '</div></div>';

    var sel = UI.calSel;
    if (sel) {
      var list = C.byDate(sel);
      var s = C.sums(sel, sel);
      h += '<div class="card"><div class="card-h"><h2>' + sel.replace(/-/g, '.') + '</h2>' +
        '<button class="btn sm p" data-act="tx:new" data-d="' + sel + '">+ 추가</button></div>';
      if (!list.length) {
        h += '<div class="empty">' + (sel <= todayI ? '무지출 데이! 👍' : '예정된 내역이 없어요') + '</div>';
      } else {
        h += '<div class="row tiny" style="justify-content:space-between;margin-bottom:6px">' +
          '<span class="a exp">지출 ' + C.fmt(s.expense) + '</span>' +
          '<span class="a inc">수입 ' + C.fmt(s.income) + '</span>' +
          '<span class="a sav">저축 ' + C.fmt(s.save) + '</span></div>';
        h += list.map(txRow).join('');
      }
      h += '</div>';
    }
    return { html: h };
  }

  function short(n) {
    if (n >= 100000000) return (n / 100000000).toFixed(1).replace('.0', '') + '억';
    if (n >= 10000) return Math.round(n / 10000) + '만';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + '천';
    return String(n);
  }

  /* ---------- 통계 ---------- */
  function viewStats() {
    var mode = UI.statMode;
    var count = mode === 'day' ? 14 : (mode === 'week' ? 8 : 6);
    var ser = C.series(mode, count);
    var max = 1;
    ser.forEach(function (x) { max = Math.max(max, x.s.expense, x.s.save); });

    var from = ser[0].key, to = S.todayISO();
    var tot = C.sums(from, to);
    var cats = C.byCategory('expense', from, to);
    var catMax = cats.length ? cats[0].amount : 1;
    var mem = C.byMember(from, to);

    var h = '<div class="card"><div class="card-h"><h2>지출 · 저축 추이</h2>' +
      '<div class="chips">' +
      [['day', '일'], ['week', '주'], ['month', '월']].map(function (x) {
        return '<button class="chip ' + (mode === x[0] ? 'on' : '') + '" data-act="stat:mode" data-m="' + x[0] + '">' + x[1] + '</button>';
      }).join('') + '</div></div>';

    h += '<div class="bars">' + ser.map(function (x) {
      return '<div class="b">' +
        '<i style="height:' + (x.s.expense ? Math.max(3, Math.round(x.s.expense / max * 100)) : 3) + '%"></i>' +
        '<i class="s" style="height:' + (x.s.save ? Math.max(3, Math.round(x.s.save / max * 100)) : 3) + '%"></i></div>';
    }).join('') + '</div>';
    h += '<div class="barlabels">' + ser.map(function (x) { return '<div>' + x.label + '</div>'; }).join('') + '</div>';
    h += '<div class="row tiny" style="gap:14px;margin-top:4px">' +
      '<span><b style="color:var(--red-d)">■</b> 지출</span>' +
      '<span><b style="color:var(--blue-d)">■</b> 저축</span>' +
      '<span class="muted">최대 ' + C.fmt(max) + '원</span></div></div>';

    var rate = tot.income > 0 ? Math.round(tot.gain / tot.income * 100) : 0;
    h += '<div class="card"><div class="card-h"><h2>기간 합계</h2><span class="tag">' + from + ' ~ ' + to + '</span></div>' +
      '<div class="stat">' +
      '<div><b class="num a exp">' + C.fmt(tot.expense) + '</b><span>지출</span></div>' +
      '<div><b class="num a inc">' + C.fmt(tot.income) + '</b><span>수입</span></div>' +
      '<div><b class="num a sav">' + C.fmt(tot.gain) + '</b><span>순저축</span></div></div>' +
      '<div class="gap"></div>' +
      '<div class="row tiny" style="justify-content:space-between"><span>저축률</span><span>' + rate + '%</span></div>' +
      pbar(rate / 100, 'sm') +
      '<div class="hint">순저축 = 저축 기록 + 남은 현금 (중복 집계 방지)</div></div>';

    if (mem.length > 1) {
      var memMax = Math.max(1, mem[0].amount, mem[1].amount);
      h += '<div class="card"><div class="card-h"><h2>누가 얼마나 썼나</h2></div>' +
        mem.map(function (x) {
          return '<div class="catrow"><span class="mdot big" style="background:' + x.member.color + '"></span>' +
            '<div class="n">' + esc(x.member.name) + '</div>' +
            '<div class="bar"><i style="width:' + Math.max(3, Math.round(x.amount / memMax * 100)) + '%;background:' + x.member.color + '"></i></div>' +
            '<div class="v num">' + C.fmt(x.amount) + '</div></div>';
        }).join('') + '</div>';
    }

    h += '<div class="card"><div class="card-h"><h2>카테고리별 지출</h2></div>';
    if (!cats.length) h += '<div class="empty">지출 기록이 없어요</div>';
    else h += cats.map(function (c) {
      return '<div class="catrow">' + spr(c.meta.spr) +
        '<div class="n">' + esc(c.meta.name) + '</div>' +
        '<div class="bar"><i style="width:' + Math.max(3, Math.round(c.amount / catMax * 100)) + '%"></i></div>' +
        '<div class="v num">' + C.fmt(c.amount) + '</div></div>';
    }).join('');
    h += '</div>';
    return { html: h };
  }

  /* ---------- 목표 ---------- */
  function viewGoals() {
    var goals = S.goalsSorted();
    var h = '<div class="card"><div class="card-h"><h2>목표 아파트</h2>' +
      (goals.length < 3 ? '<button class="btn sm p" data-act="goal:add">+ 목표 추가</button>' : '<span class="tag">최대 3개</span>') +
      '</div><div class="tiny muted">1~3위까지 등록할 수 있어요. 홈 화면은 선택한 목표를 기준으로 계산됩니다.</div></div>';

    goals.forEach(function (g, idx) {
      var p = C.progress(g);
      var sh = Pixel.shape(g.shape);
      var floors = Pixel.clampFloors(g.shape, g.floors);

      h += '<div class="goalcard"><div class="gh">' +
        '<span class="rk">' + g.rank + '위</span>' +
        '<span class="nm">' + esc(g.name || '이름 없는 집') + '</span>' +
        '<button class="btn sm" data-act="goal:up" data-id="' + g.id + '"' + (idx === 0 ? ' disabled' : '') + '>▲</button>' +
        '<button class="btn sm" data-act="goal:down" data-id="' + g.id + '"' + (idx === goals.length - 1 ? ' disabled' : '') + '>▼</button>' +
        (goals.length > 1 ? '<button class="btn sm r" data-act="goal:del" data-id="' + g.id + '">삭제</button>' : '') +
        '</div>';

      h += '<div class="gbanner"><canvas class="mini" data-goal="' + g.id + '" width="160" height="200"></canvas></div>';
      h += '<div class="gb">';

      h += '<div class="field"><label>아파트 이름</label>' +
        '<input type="text" data-gid="' + g.id + '" data-k="name" value="' + esc(g.name) + '" maxlength="20" placeholder="예) 한강뷰 우리집"></div>' +
        '<div class="field"><label>목표 금액 (원)</label>' +
        money('목표 금액', g.price, 'data-gid="' + g.id + '" data-k="price"') +
        '<div class="hint">' + C.kor(g.price) + '</div></div>';

      h += '<div class="g2">' +
        '<div class="field"><label>지역 / 단지</label>' +
        '<input type="text" data-gid="' + g.id + '" data-k="region" value="' + esc(g.region) + '" maxlength="24" placeholder="예) 마포구"></div>' +
        '<div class="field"><label>평형 / 타입</label>' +
        '<input type="text" data-gid="' + g.id + '" data-k="size" value="' + esc(g.size) + '" maxlength="16" placeholder="예) 84A"></div>' +
        '</div>';

      h += '<div class="field"><label>건물 형태</label><div class="chips">' +
        Pixel.SHAPE_IDS.map(function (sid) {
          return '<button class="chip ' + (g.shape === sid ? 'on' : '') + '" data-act="goal:shape" data-id="' + g.id + '" data-s="' + sid + '">' +
            esc(Pixel.SHAPES[sid].name) + '</button>';
        }).join('') + '</div></div>';

      h += '<div class="field"><label>층수 (' + floors + '층 · ' + sh.min + '~' + sh.max + ')</label>' +
        '<input type="range" min="' + sh.min + '" max="' + sh.max + '" step="1" value="' + floors + '" data-gid="' + g.id + '" data-k="floors"></div>';

      h += '<div class="field"><label>건물 색</label><div class="swatches">' +
        S.THEMES.map(function (t) {
          return '<button data-act="goal:theme" data-id="' + g.id + '" data-t="' + t.id + '" title="' + t.name + '"' +
            ' class="' + (g.theme === t.id ? 'on' : '') + '" style="background:' + t.body + '"></button>';
        }).join('') + '</div></div>';

      h += '<div class="divider"></div>' +
        '<div class="kv"><span>받을 수 있는 대출</span><b class="num">' + C.kor(p.loan.amount) + '</b></div>' +
        '<div class="kv"><span>필요 자기자본</span><b class="num">' + C.kor(p.loan.needCash) + '</b></div>' +
        '<div class="kv"><span>남은 금액</span><b class="num">' + C.kor(p.short) + '</b></div>' +
        '<div class="kv"><span>달성 예상</span><b>' +
        (p.eta ? (p.eta.done ? '달성!' : (p.eta.tooLong ? '50년 이상' : p.eta.monthsR + '개월 후 (' + p.eta.date + ')')) : '-') + '</b></div>' +
        '<div class="gap"></div>' + pbar(p.ratio, 'sm') +
        '<div class="hint">진행률 ' + Math.floor(p.ratio * 100) + '%</div>';

      h += '</div></div>';
    });

    return {
      html: h,
      after: function () {
        var night = isNight();
        document.querySelectorAll('canvas.mini[data-goal]').forEach(function (cv) {
          var g = S.state.goals.find(function (x) { return x.id === cv.dataset.goal; });
          if (g) paintBuilding(cv, g, C.progress(g).ratio, night);
        });
      }
    };
  }

  /* ---------- 설정 ---------- */
  function viewSettings() {
    var st = S.state.settings;
    var sy = S.state.sync;
    var h = '';

    /* 멤버 */
    h += '<div class="card"><div class="card-h"><h2>함께 쓰는 사람</h2>' +
      (S.state.members.length < 2 ? '<button class="btn sm p" data-act="mem:add">+ 추가</button>' : '<span class="tag">최대 2명</span>') +
      '</div>';
    S.state.members.forEach(function (m) {
      h += '<div class="memrow">' +
        '<span class="mdot big" style="background:' + m.color + '"></span>' +
        '<input type="text" class="grow" data-mem="' + m.id + '" value="' + esc(m.name) + '" maxlength="10">' +
        '<button class="btn sm ' + (S.state.me === m.id ? 'p' : '') + '" data-act="mem:me" data-id="' + m.id + '">' +
        (S.state.me === m.id ? '이게 나' : '나로 지정') + '</button>' +
        (S.state.members.length > 1 ? '<button class="btn sm r" data-act="mem:del" data-id="' + m.id + '">삭제</button>' : '') +
        '</div>';
    });
    h += '<div class="hint">기록할 때 작성자가 함께 저장돼요. 두 기기에서 같은 저장소에 연결하면 내역이 합쳐집니다.</div></div>';

    /* 동기화 */
    var last = sy.lastSync ? new Date(sy.lastSync).toLocaleString('ko-KR') : '없음';
    h += '<div class="card"><div class="card-h"><h2>GitHub 동기화</h2>' +
      '<span class="tag">' + (sy.repo && sy.token ? '연결됨' : '미설정') + '</span></div>' +
      '<div class="field"><label>저장소 (owner/repo · 비공개 권장)</label>' +
      '<input type="text" data-sync="repo" value="' + esc(sy.repo) + '" placeholder="myname/housepoor-data" autocomplete="off"></div>' +
      '<div class="g2">' +
      '<div class="field"><label>파일 경로</label><input type="text" data-sync="path" value="' + esc(sy.path) + '" placeholder="housepoor.json"></div>' +
      '<div class="field"><label>브랜치</label><input type="text" data-sync="branch" value="' + esc(sy.branch) + '" placeholder="main"></div>' +
      '</div>' +
      '<div class="field"><label>액세스 토큰 (Contents: Read and write)</label>' +
      '<input type="password" data-sync="token" value="' + esc(sy.token) + '" placeholder="github_pat_..." autocomplete="off"></div>' +
      '<div class="row wrap">' +
      '<button class="btn b" data-act="sync:now">지금 동기화</button>' +
      '<button class="btn" data-act="sync:test">연결 확인</button>' +
      '<label class="row tiny" style="gap:6px;cursor:pointer"><input type="checkbox" data-sync="auto" ' +
      (sy.auto ? 'checked' : '') + ' style="width:auto"> 자동 동기화</label>' +
      '</div>' +
      '<div class="hint">마지막 동기화: ' + esc(last) + '</div>' +
      '<div class="warn-box">⚠ 토큰은 이 기기의 브라우저에 그대로 저장됩니다. 반드시 <b>비공개 저장소 1개에만</b> 권한을 준 fine-grained 토큰을 쓰고, 기기를 공유하지 마세요.</div>' +
      '</div>';

    h += '<div class="card"><div class="card-h"><h2>내 자산 · 소득</h2></div>' +
      '<div class="field"><label>현재 모아둔 돈 (시드머니)</label>' +
      money('시드머니', st.seed, 'data-set="seed"') +
      '<div class="hint">' + C.kor(st.seed) + ' · 기록을 시작하기 전까지 모은 금액</div></div>' +
      '<div class="field"><label>연소득 (세전 · 부부합산)</label>' +
      money('연소득', st.annualIncome, 'data-set="annualIncome"') +
      '<div class="hint">' + C.kor(st.annualIncome) + ' · DSR·정책자금 요건 계산에 사용</div></div>' +
      '<div class="g2">' +
      '<div class="field"><label>월 지출 예산</label>' + money('월 예산', st.monthlyBudget, 'data-set="monthlyBudget"') + '</div>' +
      '<div class="field"><label>월 저축액 직접 입력</label>' + money('월 저축액', st.manualSaving, 'data-set="manualSaving"') +
      '<div class="hint">0이면 기록에서 자동 계산</div></div>' +
      '</div></div>';

    /* 대출 상품 */
    var prod = S.product(st.product);
    h += '<div class="card"><div class="card-h"><h2>대출 상품</h2></div>' +
      '<div class="chips" style="margin-bottom:10px">' +
      S.PRODUCTS.map(function (p) {
        return '<button class="chip ' + (st.product === p.id ? 'on' : '') + '" data-act="set:product" data-p="' + p.id + '">' +
          esc(p.name) + '</button>';
      }).join('') + '</div>' +
      '<div class="note-box">' + esc(prod.note) + '</div>';

    if (prod.priceCap > 0 || prod.incomeCap > 0) {
      h += '<div class="row wrap tiny" style="margin:8px 0 2px">' +
        (prod.priceCap ? '<span class="tag">주택가격 ' + C.kor(prod.priceCap) + ' 이하</span>' : '') +
        (prod.incomeCap ? '<span class="tag">연소득 ' + C.kor(prod.incomeCap) + ' 이하</span>' : '') +
        '</div>';
    }

    h += '<div class="g3" style="margin-top:10px">' +
      '<div class="field"><label>LTV (%)</label><input type="number" min="0" max="100" step="1" value="' + st.ltv + '" data-set="ltv"></div>' +
      '<div class="field"><label>금리 (%)</label><input type="number" min="0" max="20" step="0.1" value="' + st.rate + '" data-set="rate"></div>' +
      '<div class="field"><label>기간 (년)</label><input type="number" min="1" max="50" step="1" value="' + st.years + '" data-set="years"></div>' +
      '</div><div class="g2">' +
      '<div class="field"><label>DSR (%) · 0이면 미적용</label><input type="number" min="0" max="100" step="1" value="' + st.dsr + '" data-set="dsr"></div>' +
      '<div class="field"><label>부대비용 (%)</label><input type="number" min="0" max="20" step="0.1" value="' + st.extraRate + '" data-set="extraRate"></div>' +
      '</div>' +
      '<div class="field"><label>상품 대출 한도 (0이면 제한 없음)</label>' + money('대출 한도', st.maxLoan, 'data-set="maxLoan"') +
      '<div class="hint">' + (st.maxLoan ? C.kor(st.maxLoan) : '한도 제한 없음') + '</div></div>' +
      '<div class="hint">정책자금 조건은 공고에 따라 수시로 바뀝니다. 선택 후 실제 공고 기준으로 값을 직접 조정해서 쓰세요.</div></div>';

    h += '<div class="card"><div class="card-h"><h2>앱 · 데이터</h2></div>' +
      '<div class="row wrap" style="gap:8px">' +
      '<button class="btn b" data-act="set:install"' + (UI.installEvt ? '' : ' disabled') + '>홈 화면에 설치</button>' +
      '<button class="btn" data-act="set:export">백업 내보내기</button>' +
      '<button class="btn" data-act="set:import">백업 불러오기</button>' +
      '<button class="btn r" data-act="set:reset">전체 초기화</button>' +
      '</div>' +
      '<input type="file" id="importFile" accept="application/json,.json" style="display:none">' +
      '<div class="hint">데이터는 이 기기의 브라우저에 저장되고, 동기화를 켜면 지정한 저장소에도 올라갑니다.</div></div>';

    h += '<div class="card"><div class="card-h"><h2>정보</h2></div>' +
      '<div class="tiny muted">하우스푸어 v2.0<br>' +
      '폰트: Galmuri (SIL OFL) · 모든 계산은 참고용 추정치입니다.<br>' +
      '기록 ' + S.state.tx.length + '건 · 목표 ' + S.state.goals.length + '개 · 멤버 ' + S.state.members.length + '명</div></div>';

    return { html: h };
  }

  /* ---------- 내역 입력 시트 ---------- */
  function openTxSheet(tx, dateISO) {
    UI.editing = tx ? tx.id : null;
    UI.draft = tx ? Object.assign({}, tx) : {
      type: 'expense', amount: 0, cat: 'food',
      date: dateISO || S.todayISO(), memo: '', by: S.state.me
    };
    renderSheet();
  }

  function renderSheet() {
    var d = UI.draft;
    var cats = S.catList(d.type);
    if (!cats.some(function (c) { return c.id === d.cat; })) d.cat = cats[0].id;

    var h = '<h3>' + (UI.editing ? '내역 수정' : '내역 추가') +
      '<button class="icon-btn" data-act="sheet:close">✕</button></h3>';

    h += '<div class="chips" style="margin-bottom:10px">' +
      Object.keys(TYPE_META).map(function (t) {
        return '<button class="chip ' + (d.type === t ? 'on ' + TYPE_META[t].cls : '') + '" data-act="sheet:type" data-t="' + t + '">' +
          TYPE_META[t].name + '</button>';
      }).join('') + '</div>';

    h += '<div class="amountbox"><input id="amt" type="text" inputmode="numeric" value="' +
      (d.amount ? C.fmt(d.amount) : '') + '" placeholder="0"><span>원</span></div>';

    h += '<div class="quick">' +
      [1000, 10000, 50000, 100000].map(function (v) {
        return '<button class="btn sm" data-act="sheet:quick" data-v="' + v + '">+' + short(v) + '</button>';
      }).join('') + '</div>';
    h += '<div class="quick" style="grid-template-columns:repeat(3,1fr)">' +
      '<button class="btn sm" data-act="sheet:quick" data-v="1000000">+100만</button>' +
      '<button class="btn sm" data-act="sheet:quick" data-v="10000000">+1000만</button>' +
      '<button class="btn sm" data-act="sheet:clear">초기화</button></div>';

    h += '<div class="field"><label>카테고리</label><div class="chips">' +
      cats.map(function (c) {
        return '<button class="chip ' + (d.cat === c.id ? 'on' : '') + '" data-act="sheet:cat" data-c="' + c.id + '">' +
          spr(c.spr) + esc(c.name) + '</button>';
      }).join('') + '</div></div>';

    if (S.state.members.length > 1) {
      h += '<div class="field"><label>누가</label><div class="chips">' +
        S.state.members.map(function (m) {
          return '<button class="chip ' + (d.by === m.id ? 'on' : '') + '" data-act="sheet:by" data-b="' + m.id + '">' +
            '<span class="mdot" style="background:' + m.color + '"></span>' + esc(m.name) + '</button>';
        }).join('') + '</div></div>';
    }

    h += '<div class="g2">' +
      '<div class="field"><label>날짜</label><input type="date" id="dt" value="' + d.date + '"></div>' +
      '<div class="field"><label>메모</label><input type="text" id="memo" value="' + esc(d.memo) + '" maxlength="30" placeholder="선택 입력"></div>' +
      '</div>';

    h += '<div class="row" style="margin-top:6px">' +
      (UI.editing ? '<button class="btn r" data-act="sheet:del">삭제</button>' : '') +
      '<button class="btn p grow" data-act="sheet:save" style="text-align:center">저장하기</button></div>';

    var sheet = document.getElementById('sheet');
    sheet.innerHTML = h;
    Sprites.hydrate(sheet);
    document.getElementById('sheetWrap').hidden = false;
    var amt = document.getElementById('amt');
    if (amt && !UI.editing) setTimeout(function () { amt.focus(); }, 60);
  }

  function readSheet() {
    var amt = document.getElementById('amt');
    var dt = document.getElementById('dt');
    var memo = document.getElementById('memo');
    if (amt) UI.draft.amount = Number(String(amt.value).replace(/[^\d]/g, '')) || 0;
    if (dt && dt.value) UI.draft.date = dt.value;
    if (memo) UI.draft.memo = memo.value.slice(0, 30);
  }

  function closeSheet() {
    document.getElementById('sheetWrap').hidden = true;
    UI.editing = null;
    UI.draft = null;
  }

  /* ---------- 렌더 ---------- */
  var VIEWS = { home: viewHome, calendar: viewCalendar, stats: viewStats, goals: viewGoals, settings: viewSettings };

  function renderNav() {
    var mk = function (t) {
      return '<button data-act="nav:' + t.id + '" class="' + (UI.view === t.id ? 'on' : '') + '">' +
        spr(t.spr) + '<span>' + t.name + '</span></button>';
    };
    document.getElementById('tabbar').innerHTML = TABS.map(mk).join('');
    document.getElementById('rail').innerHTML = TABS.map(mk).join('');
  }

  /* opts.top: true → 맨 위로. 기본은 스크롤 위치 유지(클릭 시 화면이 튀지 않게) */
  function render(opts) {
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    var out = (VIEWS[UI.view] || viewHome)();
    var v = document.getElementById('view');
    v.innerHTML = out.html;
    renderNav();
    Sprites.hydrate(document);
    if (out.after) out.after();
    if (opts && opts.top) window.scrollTo(0, 0);
    else window.scrollTo(0, y);
  }

  function repaintBuildings() {
    var night = isNight();
    var hero = document.getElementById('heroCanvas');
    if (hero) paintBuilding(hero, S.activeGoal(), C.progress(S.activeGoal()).ratio, night);
    document.querySelectorAll('canvas.mini[data-goal]').forEach(function (cv) {
      var g = S.state.goals.find(function (x) { return x.id === cv.dataset.goal; });
      if (g) paintBuilding(cv, g, C.progress(g).ratio, night);
    });
  }

  var toastT = null;
  function toast(msg) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(function () { el.hidden = true; }, 2200);
  }

  global.UI = Object.assign(UI, {
    render: render, renderSheet: renderSheet, openTxSheet: openTxSheet,
    readSheet: readSheet, closeSheet: closeSheet, toast: toast,
    repaintBuildings: repaintBuildings, paintBuilding: paintBuilding,
    TYPE_META: TYPE_META, short: short, esc: esc
  });
})(window);
