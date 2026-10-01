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
    chartMode: 'bar',
    paceUnit: 'month',
    paceExtra: 100000,
    sub: { ledger: 'calendar', money: 'assets', goals: 'list' },
    editing: null,
    draft: null,
    installEvt: null,
    errors: []
  };

  var TABS = [
    { id: 'home', name: '홈', spr: 'tower' },
    { id: 'ledger', name: '가계부', spr: 'cal' },
    { id: 'money', name: '자산', spr: 'piggy' },
    { id: 'goals', name: '목표', spr: 'house' },
    { id: 'settings', name: '설정', spr: 'gear' }
  ];

  /* 각 탭 안의 하위 탭 */
  var SUBS = {
    ledger: [{ id: 'calendar', name: '달력' }, { id: 'stats', name: '통계' }],
    money: [{ id: 'assets', name: '내 자산' }, { id: 'fixed', name: '고정지출' }],
    goals: [{ id: 'list', name: '목표 아파트' }, { id: 'loan', name: '대출 조건' }]
  };

  function subTabs(view) {
    var list = SUBS[view];
    if (!list) return '';
    var cur = UI.sub[view] || list[0].id;
    return '<div class="subtabs">' + list.map(function (t) {
      return '<button class="' + (cur === t.id ? 'on' : '') + '" data-act="sub:' + view + '" data-s="' + t.id + '">' +
        esc(t.name) + '</button>';
    }).join('') + '</div>';
  }

  function subOf(view) {
    var list = SUBS[view];
    return (UI.sub[view] && list.some(function (t) { return t.id === UI.sub[view]; }))
      ? UI.sub[view] : list[0].id;
  }

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

  function money(name, value, extra, ph) {
    var v = Number(value) || 0;
    return '<input type="text" inputmode="numeric" data-money="1" ' + (extra || '') +
      ' value="' + (v ? C.fmt(v) : '') + '" placeholder="' + esc(ph || '입력해 주세요') +
      '" aria-label="' + esc(name) + '">';
  }

  function dot(m) {
    return '<span class="mdot" style="background:' + m.color + '" title="' + esc(m.name) + '"></span>';
  }

  function txRow(t) {
    var m = TYPE_META[t.type] || TYPE_META.expense;
    var c = S.cat(t.type, t.cat);
    var multi = S.state.members.length > 1;
    var who = multi ? dot(S.member(t.by)) + S.member(t.by).name + ' · ' : '';
    var pay = (t.type === 'expense' && S.method) ? esc(S.method(t.method).short) + ' · ' : '';
    return '<div class="tx" data-act="tx:edit" data-id="' + t.id + '">' +
      spr(c.spr) +
      '<div class="t"><b>' + esc(t.memo || c.name) + '</b>' +
      '<span>' + who + pay + esc(t.date) + ' · ' + esc(c.name) + '</span></div>' +
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

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
  }

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
      '<div class="nameplate">' + esc(g.name || '이름을 지어주세요') + '</div>' +
      '<div class="shapetag">' + esc(Pixel.shape(g.shape).name) + ' · ' + Pixel.clampFloors(g.shape, g.floors) + '층</div>' +
      '</div>';

    var ymKey = S.monthKey(now);
    var bg = C.budget(ym, ymEnd, ymKey);
    var cond = p.loan.cond;
    var dayOfMonth = now.getDate();

    h += '<div class="hcards">';

    /* ---- 1. 자금 계획 ---- */
    h += '<div class="card hcard"><div class="card-h"><h2>자금 계획</h2>' +
      '<span class="tiny muted">' + g.rank + '위 · ' + esc(g.name || '이름 없는 집') + '</span></div>';

    if (p.noPrice) {
      h += '<div class="empty">목표 금액을 정하면 계산이 시작돼요</div>' +
        '<button class="btn p block" data-act="nav:goals">목표 설정하러 가기</button>';
    } else {
      h += '<div class="kv"><span>목표 매매가</span><b class="num">' + C.kor(p.loan.price) + '</b></div>' +
        '<div class="kv"><span>+ 부대비용 (' + cond.extraRate + '%)</span><b class="num">' + C.kor(p.loan.extra) + '</b></div>' +
        '<div class="kv"><span>− 대출 가능액</span><b class="num a sav">' + C.kor(p.loan.amount) + '</b></div>' +
        '<div class="chips capchips">' +
        p.loan.caps.map(function (c) {
          return '<span class="chip ' + (c.active ? 'on sav' : '') + '">' +
            esc(c.k.replace(/ \d+%$/, '')) + ' ' + short(c.v) + '</span>';
        }).join('') + '</div>' +
        '<div class="hint">세 한도 중 가장 적은 금액이 적용돼요</div>' +
        '<div class="divider"></div>' +
        '<div class="kv"><span>= 필요 자기자본</span><b class="num">' + C.kor(p.loan.needCash) + '</b></div>' +
        '<div class="kv"><span>현재 모은 돈</span><b class="num">' + C.kor(p.have) + '</b></div>' +
        '<div class="kv"><span>남은 금액</span><b class="num hi">' + C.kor(p.short) + '</b></div>' +
        '<div class="gap"></div>' + pbar(p.ratio, p.ratio >= 1 ? '' : (p.ratio < .3 ? 'warn sm' : 'sm')) +
        '<div class="divider"></div>' +
        '<div class="kv"><span>월 상환 예상 · ' + cond.years + '년 · ' + cond.rate + '%</span>' +
        '<b class="num">' + C.kor(p.loan.monthlyPayment) + '</b></div>';
    }
    h += '</div>';

    /* ---- 2. 저축 페이스 ---- */
    var per = { day: p.pace.monthly / 30.4375, week: p.pace.monthly / 4.348, month: p.pace.monthly };
    h += '<div class="card hcard"><div class="card-h"><h2>저축 페이스</h2>' +
      '<span class="tiny muted">' + esc(p.pace.basis) + '</span></div>' +
      '<div class="paceboxes">' +
      [['day', '하루'], ['week', '일주일'], ['month', '한 달']].map(function (x) {
        return '<button class="pbox ' + (UI.paceUnit === x[0] ? 'on' : '') + '" data-act="pace:unit" data-u="' + x[0] + '">' +
          '<span>' + x[1] + '</span><b class="num">' + short(Math.round(per[x[0]])) + '원</b></button>';
      }).join('') + '</div>';

    if (!p.noPrice && p.short > 0) {
      h += '<div class="gap"></div><h3 class="mini-h">조금 더 모으면?</h3>' +
        '<div class="chips" style="margin-bottom:10px">' +
        [100000, 300000, 500000, 1000000].map(function (v) {
          return '<button class="chip ' + (UI.paceExtra === v ? 'on' : '') + '" data-act="pace:extra" data-v="' + v + '">월 +' + short(v) + '</button>';
        }).join('') + '</div>';

      var faster = C.etaFor(p.short, p.pace.monthly + UI.paceExtra);
      h += '<div class="simbox">';
      if (!faster) {
        h += '<span class="tiny">저축 속도를 알 수 없어요</span>';
      } else if (faster.done) {
        h += '<b>이미 달성했어요!</b>';
      } else {
        var saved = (p.eta && !p.eta.tooLong) ? p.eta.monthsR - faster.monthsR : 0;
        h += '<span class="tiny">매달 ' + short(UI.paceExtra) + '원씩 더 저축하면</span>' +
          '<b>' + (saved > 0 ? saved + '개월 빨리 · ' : '') +
          (faster.tooLong ? '50년 이상' : faster.date.slice(0, 4) + '년 ' + (faster.date.slice(5, 7) * 1) + '월 입주') + '</b>';
      }
      h += '</div>';
    } else if (p.short <= 0 && !p.noPrice) {
      h += '<div class="gap"></div><div class="simbox"><b>🎉 자기자본 준비 완료!</b>' +
        '<span class="tiny">지금 바로 입주 가능해요</span></div>';
    }
    h += '</div>';

    /* ---- 3. 이번 달 가계부 ---- */
    h += '<div class="card hcard"><div class="card-h"><h2>' + (now.getMonth() + 1) + '월 가계부</h2>' +
      '<span class="tiny muted">' + dayOfMonth + '일째</span></div>' +
      '<div class="moneyline"><span><i class="sq inc"></i>수입</span><b class="num a inc">+' + C.fmt(mo.income) + '원</b></div>' +
      '<div class="moneyline"><span><i class="sq exp"></i>지출</span><b class="num a exp">−' + C.fmt(mo.expense) + '원</b></div>' +
      '<div class="moneyline"><span><i class="sq sav2"></i>저축</span><b class="num">' + C.fmt(mo.save) + '원</b></div>';

    if (bg.limit > 0) {
      h += '<div class="divider"></div>' +
        '<div class="row tiny" style="justify-content:space-between">' +
        '<span>예산 ' + short(bg.limit) + '원' + (bg.custom ? ' <span class="tag">이 달만</span>' : '') + '</span>' +
        '<span>' + Math.round(bg.ratio * 100) + '% 사용</span></div>' +
        pbar(Math.min(1, bg.ratio), bg.ratio > 1 ? 'over sm' : (bg.ratio > .8 ? 'warn sm' : 'sm'));
    } else {
      h += '<div class="divider"></div><div class="hint">용돈을 정하면 남은 금액을 보여드려요</div>';
    }

    h += '<div class="gap"></div><div class="row" style="justify-content:space-between;align-items:center">' +
      '<span class="row" style="gap:6px">' + spr('thumb') +
      '<span class="tiny">무지출 <b>' + ns.count + '</b> 일' +
      (streak > 1 ? ' · 연속 ' + streak + '일' : '') + '</span></span>' +
      (bg.limit > 0
        ? '<span class="tiny ' + (bg.left < 0 ? 'a exp' : 'hi') + '">' +
          (bg.left >= 0 ? short(bg.left) + '원 남음' : short(-bg.left) + '원 초과') + '</span>'
        : '') +
      '</div>';

    if (bg.fixedLeft > 0) {
      h += '<div class="hint">남은 고정지출 ' + short(bg.fixedLeft) + '원을 빼면 ' +
        short(bg.leftAfterFixed) + '원</div>';
    }

    var mem = C.byMember(ym, ymEnd);
    if (mem.length > 1) {
      h += '<div class="gap"></div><div class="row wrap tiny">' + mem.map(function (x) {
        return '<span class="memchip">' + dot(x.member) + esc(x.member.name) + ' ' + short(x.amount) + '원</span>';
      }).join('') + '</div>';
    }
    h += '</div>';

    h += '</div>';

    var recent = S.state.tx.slice(0, 5);
    h += '<div class="card"><div class="card-h"><h2>최근 내역</h2>' +
      '<button class="btn sm" data-act="nav:ledger">전체보기</button></div>';
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
    n = Math.round(Number(n) || 0);
    if (n >= 100000000) {
      var eok = n / 100000000;
      return (eok < 10 ? eok.toFixed(1).replace('.0', '') : Math.round(eok)) + '억';
    }
    if (n >= 10000) {
      var man = n / 10000;
      return (man < 10 ? man.toFixed(1).replace('.0', '') : Math.round(man)) + '만';
    }
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + '천';
    return String(n);
  }

  /* ---------- 가계부 : 달력 / 통계 ---------- */
  function viewLedger() {
    var which = subOf('ledger');
    var inner = which === 'stats' ? viewStats() : viewCalendar();
    return { html: subTabs('ledger') + inner.html, after: inner.after };
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

    var pm = C.byMethod(from, to);
    var pmTotal = pm.reduce(function (a, x) { return a + x.amount; }, 0);
    if (pmTotal > 0) {
      h += '<div class="card"><div class="card-h"><h2>결제수단별 지출</h2></div>' +
        pm.map(function (x) {
          return '<div class="catrow">' + spr(x.method.spr) +
            '<div class="n">' + esc(x.method.name) + '</div>' +
            '<div class="bar"><i style="width:' + Math.max(2, Math.round(x.amount / pmTotal * 100)) + '%"></i></div>' +
            '<div class="v num">' + C.fmt(x.amount) + '</div></div>';
        }).join('') +
        '<div class="hint">세 가지 모두 이번 달 용돈(예산)에서 차감됩니다</div></div>';
    }

    h += '<div class="card"><div class="card-h"><h2>카테고리별 지출</h2>' +
      '<div class="chips">' +
      [['bar', '막대'], ['donut', '원형'], ['box', '박스']].map(function (x) {
        return '<button class="chip ' + (UI.chartMode === x[0] ? 'on' : '') +
          '" data-act="chart:mode" data-m="' + x[0] + '">' + x[1] + '</button>';
      }).join('') + '</div></div>';
    if (!cats.length) h += '<div class="empty">지출 기록이 없어요</div>';
    else h += catChart(cats, catMax);
    h += '</div>';
    return { html: h };
  }

  /* ---------- 카테고리 차트 ---------- */
  var CHART_COLORS = ['#f2938c', '#f7c48d', '#ffe08a', '#9ad693', '#9cc9f0',
    '#c9adf2', '#f7b3cb', '#e0bb8e', '#b6ddc3', '#a9c4e2', '#dcc9a2'];

  function catChart(cats, catMax) {
    if (UI.chartMode === 'donut') return donutChart(cats);
    if (UI.chartMode === 'box') return boxChart(cats);
    return cats.map(function (c, i) {
      return '<div class="catrow">' + spr(c.meta.spr) +
        '<div class="n">' + esc(c.meta.name) + '</div>' +
        '<div class="bar"><i style="width:' + Math.max(3, Math.round(c.amount / catMax * 100)) +
        '%;background:' + CHART_COLORS[i % CHART_COLORS.length] + '"></i></div>' +
        '<div class="v num">' + C.fmt(c.amount) + '</div></div>';
    }).join('');
  }

  /* items: [{label, amount}] */
  function donutOf(items) {
    var total = items.reduce(function (a, c) { return a + c.amount; }, 0) || 1;
    var R = 60, CIRC = 2 * Math.PI * R, off = 0;
    var arcs = items.map(function (c, i) {
      var len = c.amount / total * CIRC;
      var seg = '<circle cx="80" cy="80" r="' + R + '" fill="none" stroke="' +
        CHART_COLORS[i % CHART_COLORS.length] + '" stroke-width="30"' +
        ' stroke-dasharray="' + len.toFixed(2) + ' ' + (CIRC - len).toFixed(2) + '"' +
        ' stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 80 80)"></circle>';
      off += len;
      return seg;
    }).join('');
    return '<div class="donutwrap">' +
      '<svg viewBox="0 0 160 160" class="donut" role="img" aria-label="구성 비율 원형 차트">' +
      '<circle cx="80" cy="80" r="' + R + '" fill="none" stroke="var(--panel-2)" stroke-width="30"></circle>' +
      arcs + '</svg>' +
      '<div class="legend">' + items.map(function (c, i) {
        return '<div class="lg"><span class="sw" style="background:' + CHART_COLORS[i % CHART_COLORS.length] + '"></span>' +
          '<span class="nm">' + esc(c.label) + '</span>' +
          '<b class="num">' + Math.round(c.amount / total * 100) + '%</b>' +
          '<span class="am num">' + C.fmt(c.amount) + '</span></div>';
      }).join('') + '</div></div>';
  }

  function donutChart(cats) {
    return donutOf(cats.map(function (c) { return { label: c.meta.name, amount: c.amount }; }));
  }


  /* 면적이 금액에 비례하는 네모 배치 (squarified treemap 간소화) */
  function boxChart(cats) {
    var total = cats.reduce(function (a, c) { return a + c.amount; }, 0) || 1;
    var rows = [], cur = [], curSum = 0;
    var target = total / Math.max(2, Math.ceil(Math.sqrt(cats.length)));
    cats.forEach(function (c) {
      cur.push(c);
      curSum += c.amount;
      if (curSum >= target && cur.length) { rows.push({ items: cur, sum: curSum }); cur = []; curSum = 0; }
    });
    if (cur.length) rows.push({ items: cur, sum: curSum });

    var idx = 0;
    return '<div class="treemap">' + rows.map(function (r) {
      return '<div class="trow" style="flex:' + (r.sum / total).toFixed(4) + '">' +
        r.items.map(function (c) {
          var color = CHART_COLORS[idx++ % CHART_COLORS.length];
          var pct = Math.round(c.amount / total * 100);
          return '<div class="tbox" style="flex:' + (c.amount / r.sum).toFixed(4) +
            ';background:' + color + '" title="' + esc(c.meta.name) + ' ' + C.fmt(c.amount) + '원">' +
            '<b>' + esc(c.meta.name) + '</b>' +
            '<span class="num">' + C.fmt(c.amount) + '</span>' +
            '<span class="pct">' + pct + '%</span></div>';
        }).join('') + '</div>';
    }).join('') + '</div>';
  }

  /* ---------- 목표 : 목표 아파트 / 대출 조건 ---------- */
  function viewGoalsTab() {
    var which = subOf('goals');
    var inner = which === 'loan' ? viewLoanCond() : viewGoalList();
    return { html: subTabs('goals') + inner.html, after: inner.after };
  }

  function viewGoalList() {
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
        '<span class="nm">' + esc(g.name || '(이름 없음)') + '</span>' +
        '<button class="btn sm" data-act="goal:up" data-id="' + g.id + '"' + (idx === 0 ? ' disabled' : '') + '>▲</button>' +
        '<button class="btn sm" data-act="goal:down" data-id="' + g.id + '"' + (idx === goals.length - 1 ? ' disabled' : '') + '>▼</button>' +
        (goals.length > 1 ? '<button class="btn sm r" data-act="goal:del" data-id="' + g.id + '">삭제</button>' : '') +
        '</div>';

      h += '<div class="gbanner"><canvas class="mini" data-goal="' + g.id + '" width="160" height="200"></canvas></div>';
      h += '<div class="gb">';

      h += '<div class="field"><label>아파트 이름</label>' +
        '<input type="text" data-gid="' + g.id + '" data-k="name" value="' + esc(g.name) + '" maxlength="20" placeholder="예) 한강뷰 우리집"></div>' +
        '<div class="field"><label>목표 금액 (원)</label>' +
        money('목표 금액', g.price, 'data-gid="' + g.id + '" data-k="price"', '예) 600000000') +
        '<div class="hint">' + (g.price ? C.kor(g.price) : '아파트 매매가를 입력해 주세요') + '</div></div>';

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

      h += '<div class="divider"></div>';
      p.loan.warnings.forEach(function (w) {
        h += '<div class="warn-box">⚠ ' + esc(w) + '</div>';
      });

      h += '<div class="kv"><span>받을 수 있는 대출 <span class="tag">' + esc(p.loan.capBy) + '</span></span><b class="num">' + C.kor(p.loan.amount) + '</b></div>' +
        '<div class="kv"><span>예상 월 상환액</span><b class="num">' + C.won(p.loan.monthlyPayment) + '</b></div>' +
        '<div class="kv"><span>필요 자기자본</span><b class="num">' + C.kor(p.loan.needCash) + '</b></div>' +
        '<div class="kv"><span>남은 금액</span><b class="num">' + C.kor(p.short) + '</b></div>' +
        '<div class="kv"><span>달성 예상</span><b>' +
        (p.eta ? (p.eta.done ? '달성!' : (p.eta.tooLong ? '50년 이상' : p.eta.monthsR + '개월 후 (' + p.eta.date + ')')) : '-') + '</b></div>' +
        '<div class="gap"></div>' + pbar(p.ratio, 'sm') +
        '<div class="hint">진행률 ' + Math.floor(p.ratio * 100) + '% · 대출 조건은 위 <b>대출 조건</b> 탭에서 한 번만 설정합니다</div>';

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

  /* ---------- 자산 : 내 자산 / 고정지출 ---------- */
  function viewMoney() {
    var which = subOf('money');
    var st = S.state.settings;
    var h = subTabs('money');

    if (which === 'assets') {
      var list = S.assetList();
      var total = S.assetTotal();
      var byType = S.assetByType();

      h += '<div class="card"><div class="card-h"><h2>보유 자산</h2>' +
        '<button class="btn sm p" data-act="as:add">+ 추가</button></div>';

      if (!list.length) {
        h += '<div class="empty">예금·적금·주택청약·주식·펀드처럼 지금 가진 자산을 등록해 주세요.<br>' +
          '합계가 내 집 마련 종잣돈이 됩니다.</div>';
      } else {
        h += '<div class="bigmsg" style="margin-bottom:12px">총 자산<br><b>' + C.kor(total) + '</b></div>';
        h += '<div class="ascards">' +
          list.slice().sort(function (x, y) { return y.amount - x.amount; }).map(function (a) {
            var t = S.assetType(a.type);
            return '<button class="ascard" data-act="as:edit" data-id="' + a.id + '"' +
              ' title="' + esc(a.name || t.name) + ' · ' + C.won(a.amount) +
              (a.memo ? ' · ' + esc(a.memo) : '') + '">' +
              spr(t.spr) +
              '<b>' + esc(a.name || t.name) + '</b>' +
              '<span class="ty">' + esc(t.name) + '</span>' +
              '<span class="am num">' + short(a.amount) + '</span></button>';
          }).join('') +
          '<button class="ascard add" data-act="as:add">+<span>자산 추가</span></button>' +
          '</div>';
        if (byType.length > 1) {
          h += '<div class="divider"></div>' +
            donutOf(byType.map(function (t) { return { label: t.meta.name, amount: t.amount }; }));
        }
      }
      h += '</div>';

      h += '<div class="card"><div class="card-h"><h2>모은 돈 계산 방식</h2></div>' +
        '<div class="chips" style="margin-bottom:10px">' +
        [['both', '자산 + 가계부 저축'], ['assets', '자산 합계만']].map(function (x) {
          return '<button class="chip ' + (st.haveMode === x[0] ? 'on' : '') +
            '" data-act="as:mode" data-m="' + x[0] + '">' + x[1] + '</button>';
        }).join('') + '</div>' +
        '<div class="note-box">' +
        (st.haveMode === 'assets'
          ? '자산 합계만 사용합니다. 주식·펀드처럼 평가액이 바뀌는 자산을 직접 갱신하는 경우에 알맞아요.'
          : '자산 합계에 가계부로 모은 순저축을 더합니다. 자산은 <b>기록 시작 시점</b> 금액으로 두세요. 자산 금액을 계속 최신화하면 저축이 이중으로 잡힙니다.') +
        '</div>' +
        '<div class="gap"></div>' +
        '<div class="kv"><span>보유 자산</span><b class="num">' + C.kor(S.assetTotal()) + '</b></div>' +
        (st.haveMode === 'both'
          ? '<div class="kv"><span>가계부 순저축</span><b class="num">' + C.kor(C.allSums().gain) + '</b></div>'
          : '') +
        '<div class="kv"><span><b>모은 돈</b></span><b class="num">' + C.kor(C.have()) + '</b></div></div>';

      h += '<div class="card"><div class="card-h"><h2>소득 · 용돈</h2></div>' +
        '<div class="field"><label>연소득 (세전 · 부부합산)</label>' +
        money('연소득', st.annualIncome, 'data-set="annualIncome"', '예) 60000000') +
        '<div class="hint">' + (st.annualIncome ? C.kor(st.annualIncome) + ' · DSR·정책자금 요건 계산에 사용'
          : 'DSR·정책자금 요건 계산에 사용돼요') + '</div></div>' +
        '<div class="g2">' +
        '<div class="field"><label>기본 용돈 (매달 기본값)</label>' +
        money('기본 용돈', st.monthlyBudget, 'data-set="monthlyBudget"', '예) 500000') +
        '<div class="hint">' + (st.monthlyBudget ? C.kor(st.monthlyBudget) + ' · 달마다 다르게 쓰려면 홈에서 "용돈 수정"'
          : '설정하면 홈에 남은 용돈이 표시돼요') + '</div></div>' +
        '<div class="field"><label>월 저축액 직접 입력</label>' +
        money('월 저축액', st.manualSaving, 'data-set="manualSaving"', '비워두면 자동') +
        '<div class="hint">비워두면 기록에서 자동 계산</div></div>' +
        '</div></div>';
    }

    if (which === 'fixed') {
    /* 고정지출 */
    var fx = S.fixedList();
    var fxTotal = S.fixedTotal();
    var ymNow = S.monthKey();
    var fxDone = S.fixedDone(ymNow);
    h += '<div class="card"><div class="card-h"><h2>고정지출</h2>' +
      '<button class="btn sm p" data-act="fx:add">+ 추가</button></div>';
    if (!fx.length) {
      h += '<div class="empty">차 할부·구독료·통신비처럼 매달 같은 금액으로 나가는 지출을 등록해 두세요</div>';
    } else {
      h += fx.map(function (f) {
        var c = S.cat('expense', f.cat);
        var on = !!fxDone[f.id];
        return '<div class="fxrow" data-act="fx:edit" data-id="' + f.id + '">' +
          spr(c.spr) +
          '<div class="t"><b>' + esc(f.name || c.name) + '</b>' +
          '<span>' + esc(c.name) + ' · 매월 ' + f.day + '일 · ' + esc(S.method(f.method).short) + '</span></div>' +
          '<div class="a exp num">' + C.fmt(f.amount) + '</div>' +
          '<span class="tag">' + (on ? '기록됨' : '대기') + '</span></div>';
      }).join('');
      h += '<div class="divider"></div>' +
        '<div class="kv"><span>월 고정지출 합계</span><b class="num a exp">' + C.fmt(fxTotal) + '원</b></div>' +
        '<button class="btn b block" data-act="fx:apply" style="margin-top:10px">' +
        (ymNow.slice(5) * 1) + '월 고정지출 기록하기</button>' +
        '<div class="hint">아직 기록되지 않은 항목만 추가됩니다. 중복 기록되지 않아요.</div>';
    }
    h += '</div>';
    }

    return { html: h };
  }

  /* ---------- 대출 조건 (목표 공통, 한 번만 작성) ---------- */
  function viewLoanCond() {
    var h = '';
      var L = S.loanCond();
      var prod = S.product(L.product);
      var g = S.activeGoal();
      var pr = C.progress(g);

      h += '<div class="card"><div class="card-h"><h2>대출 상품</h2></div>' +
        '<div class="tiny muted" style="margin-bottom:10px">목표와 상관없이 한 번만 설정하면 모든 목표에 똑같이 적용됩니다.</div>' +
        '<div class="chips" style="margin-bottom:10px">' +
        S.PRODUCTS.map(function (x) {
          return '<button class="chip ' + (L.product === x.id ? 'on' : '') + '" data-act="set:product" data-p="' + x.id + '">' +
            esc(x.name) + '</button>';
        }).join('') + '</div>' +
        '<div class="note-box">' + esc(prod.note) + '</div>';

      if (prod.priceCap > 0 || prod.incomeCap > 0) {
        h += '<div class="row wrap tiny" style="margin:8px 0 2px">' +
          (prod.priceCap ? '<span class="tag">주택가격 ' + C.kor(prod.priceCap) + ' 이하</span>' : '') +
          (prod.incomeCap ? '<span class="tag">연소득 ' + C.kor(prod.incomeCap) + ' 이하</span>' : '') +
          '</div>';
      }

      h += '<div class="g3" style="margin-top:10px">' +
        '<div class="field"><label>LTV (%)</label><input type="number" min="0" max="100" step="1" value="' + L.ltv + '" data-loan="ltv"></div>' +
        '<div class="field"><label>금리 (%)</label><input type="number" min="0" max="20" step="0.1" value="' + L.rate + '" data-loan="rate"></div>' +
        '<div class="field"><label>기간 (년)</label><input type="number" min="1" max="50" step="1" value="' + L.years + '" data-loan="years"></div>' +
        '</div><div class="g2">' +
        '<div class="field"><label>DSR (%) · 0이면 미적용</label><input type="number" min="0" max="100" step="1" value="' + L.dsr + '" data-loan="dsr"></div>' +
        '<div class="field"><label>부대비용 (%)</label><input type="number" min="0" max="20" step="0.1" value="' + L.extraRate + '" data-loan="extraRate"></div>' +
        '</div>' +
        '<div class="field"><label>상품 대출 한도 (비우면 제한 없음)</label>' +
        money('대출 한도', L.maxLoan, 'data-loan="maxLoan" data-money="1"', '제한 없음') +
        '<div class="hint">' + (L.maxLoan ? C.kor(L.maxLoan) : '한도 제한 없음') + '</div></div>' +
        '<div class="hint">정책자금 조건은 공고에 따라 수시로 바뀝니다. 선택 후 실제 공고 기준으로 조정해서 쓰세요.</div></div>';

      h += '<div class="card"><div class="card-h"><h2>지금 조건으로 계산하면</h2>' +
        '<span class="tag">' + esc(g.name || '1순위 목표') + '</span></div>';
      pr.loan.warnings.forEach(function (w) {
        h += '<div class="warn-box">⚠ ' + esc(w) + '</div>';
      });
      h += '<div class="kv"><span>집값</span><b class="num">' + C.kor(pr.loan.price) + '</b></div>' +
        '<div class="kv"><span>받을 수 있는 대출 <span class="tag">' + esc(pr.loan.capBy) + '</span></span><b class="num">' + C.kor(pr.loan.amount) + '</b></div>' +
        '<div class="kv"><span>예상 월 상환액</span><b class="num">' + C.won(pr.loan.monthlyPayment) + '</b></div>' +
        '<div class="kv"><span>필요 자기자본</span><b class="num">' + C.kor(pr.loan.needCash) + '</b></div></div>';
    return { html: h };
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
      '<textarea data-sync="token" rows="2" placeholder="github_pat_... 전체를 붙여넣으세요"' +
      ' autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"' +
      ' style="font-size:12px;line-height:1.5;resize:vertical;word-break:break-all"' +
      (sy.show ? '' : ' class="masked"') + '>' + esc(sy.token) + '</textarea>' +
      '<div class="row wrap" style="margin-top:6px">' +
      '<button class="btn sm" data-act="tok:paste">클립보드에서 붙여넣기</button>' +
      '<button class="btn sm" data-act="tok:show">' + (sy.show ? '가리기' : '보기') + '</button>' +
      '<button class="btn sm" data-act="tok:clear">지우기</button>' +
      '</div>' +
      '<div class="hint">저장된 토큰: ' + (function () {
        if (!sy.token) return '없음';
        var t = String(sy.token);
        var bad = Sync.tokenIssue && Sync.tokenIssue();
        return esc(t.slice(0, 11)) + '… <b>' + t.length + '자</b>' +
          (bad ? ' <span class="a exp">← ' + esc(bad) + '</span>' : ' ✓');
      })() + '</div></div>' +
      '<div class="row wrap">' +
      '<button class="btn b" data-act="sync:now">지금 동기화</button>' +
      '<button class="btn" data-act="sync:test">연결 확인</button>' +
      '<button class="btn sm" data-act="sync:diag">진단</button>' +
      '<label class="row tiny" style="gap:6px;cursor:pointer"><input type="checkbox" data-sync="auto" ' +
      (sy.auto ? 'checked' : '') + ' style="width:auto"> 자동 동기화</label>' +
      '</div>' +
      '<div class="hint">마지막 동기화: ' + esc(last) + '</div>' +
      '<div class="divider"></div>' +
      '<div class="card-h"><h2 style="font-size:13px">다른 기기로 옮기기</h2></div>' +
      '<div class="tiny muted" style="margin-bottom:8px">PC에서 복사한 코드를 폰에 한 번 붙여넣으면 저장소·경로·토큰이 한꺼번에 설정됩니다.</div>' +
      '<div class="row wrap">' +
      '<button class="btn sm" data-act="tok:export"' + (Sync.configured() ? '' : ' disabled') + '>연결 코드 복사</button>' +
      '<button class="btn sm" data-act="tok:import">연결 코드 입력</button>' +
      '</div>' +
      '<div class="warn-box">⚠ 토큰은 이 기기의 브라우저에 그대로 저장됩니다. 반드시 <b>비공개 저장소 1개에만</b> 권한을 준 fine-grained 토큰을 쓰고, 기기를 공유하지 마세요.</div>' +
      '</div>';

    h += '<div class="card"><div class="card-h"><h2>앱 · 데이터</h2></div>' +
      '<div class="row wrap" style="gap:8px">' +
      '<button class="btn b" data-act="set:install">' +
      (isStandalone() ? '설치됨 ✓' : (UI.installEvt ? '홈 화면에 설치' : '설치 방법 보기')) + '</button>' +
      '<button class="btn" data-act="set:export">백업 내보내기</button>' +
      '<button class="btn" data-act="set:import">백업 불러오기</button>' +
      '<button class="btn" data-act="set:fresh">앱 새로 받기</button>' +
      '<button class="btn r" data-act="set:reset">초기화</button>' +
      '</div>' +
      '<input type="file" id="importFile" accept="application/json,.json" style="display:none">' +
      '<div class="hint">데이터는 이 기기의 브라우저에 저장되고, 동기화를 켜면 지정한 저장소에도 올라갑니다.</div></div>';

    h += '<div class="card"><div class="card-h"><h2>정보</h2></div>' +
      '<div class="tiny muted">하우스푸어 v5.0<br>' +
      '폰트: JayeonSans (SIL OFL) · 모든 계산은 참고용 추정치입니다.<br>' +
      '기록 ' + S.state.tx.length + '건 · 목표 ' + S.state.goals.length + '개 · 멤버 ' + S.state.members.length + '명</div>' +
      (UI.errors && UI.errors.length
        ? '<div class="warn-box" style="margin-top:8px"><b>최근 오류</b><br>' +
          UI.errors.slice(-3).map(esc).join('<br>') +
          '<br><br>"앱 새로 받기"를 눌러 캐시를 비우면 대부분 해결됩니다.</div>'
        : '') + '</div>';

    return { html: h };
  }

  /* ---------- 내역 입력 시트 ---------- */
  function openTxSheet(tx, dateISO) {
    UI.editing = tx ? tx.id : null;
    UI.draft = tx ? Object.assign({}, tx) : {
      type: 'expense', amount: 0, cat: 'food', method: 'cash',
      date: dateISO || S.todayISO(), memo: '', by: S.state.me
    };
    if (!UI.draft.method) UI.draft.method = 'cash';
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

    if (d.type === 'expense' && S.METHODS) {
      h += '<div class="field"><label>결제수단</label><div class="chips">' +
        S.METHODS.map(function (mm) {
          return '<button class="chip ' + (d.method === mm.id ? 'on' : '') + '" data-act="sheet:method" data-pm="' + mm.id + '">' +
            spr(mm.spr) + esc(mm.name) + '</button>';
        }).join('') + '</div></div>';
    }

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
  var VIEWS = { home: viewHome, ledger: viewLedger, money: viewMoney, goals: viewGoalsTab, settings: viewSettings };

  function renderNav() {
    var mk = function (t) {
      return '<button data-act="nav:' + t.id + '" class="' + (UI.view === t.id ? 'on' : '') + '">' +
        spr(t.spr) + '<span>' + t.name + '</span></button>';
    };
    document.getElementById('tabbar').innerHTML = TABS.map(mk).join('');
    document.getElementById('rail').innerHTML = TABS.map(mk).join('');
  }

  /* 사용자가 입력 중인지 — 다시 그리면 입력값과 포커스가 날아간다 */
  function isTyping() {
    var ae = document.activeElement;
    if (!ae || !/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return false;
    var v = document.getElementById('view');
    return !!(v && v.contains(ae));
  }

  /* 입력이 끝날 때까지 미뤄둔 렌더를 스스로 재시도한다
     (focusout 이 안 올 수도 있어 타이머로도 확인) */
  var pendT = null;
  function schedulePending() {
    clearTimeout(pendT);
    pendT = setTimeout(flushPending, 700);
  }
  function flushPending() {
    if (!UI.pendingRender) return;
    if (isTyping()) { schedulePending(); return; }
    var o = UI.pendingRender;
    UI.pendingRender = null;
    render(o);
  }

  /* opts.top: true → 맨 위로. 기본은 스크롤 위치 유지(클릭 시 화면이 튀지 않게) */
  function render(opts) {
    /* 입력 중이면 미뤘다가 끝난 뒤에 그린다 */
    if (!(opts && opts.force) && isTyping()) {
      UI.pendingRender = opts || {};
      schedulePending();
      return;
    }
    clearTimeout(pendT);
    UI.pendingRender = null;
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
    render: render, isTyping: isTyping, flushPending: flushPending, renderSheet: renderSheet, openTxSheet: openTxSheet,
    readSheet: readSheet, closeSheet: closeSheet, toast: toast,
    repaintBuildings: repaintBuildings, paintBuilding: paintBuilding,
    TYPE_META: TYPE_META, short: short, esc: esc
  });
})(window);
