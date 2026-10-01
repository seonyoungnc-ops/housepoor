/* ===== 앱 부트 & 이벤트 ===== */
(function () {
  'use strict';

  var C = Calc, S = Store;

  /* ---------- 테마 ---------- */
  function applyTheme() {
    var t = S.state.theme === 'night' ? 'night' : 'day';
    document.documentElement.dataset.theme = t;
    document.getElementById('themeBtn').textContent = t === 'night' ? '☀' : '☾';
    var meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', t === 'night' ? '#c9adf2' : '#ffe9a3');
  }

  /* ---------- 확인 시트 ---------- */
  var confirmCb = null;
  function askConfirm(title, desc, yesLabel, cb) {
    confirmCb = cb;
    var sheet = document.getElementById('sheet');
    sheet.innerHTML = '<h3>' + UI.esc(title) + '<button class="icon-btn" data-act="confirm:no">✕</button></h3>' +
      '<div class="tiny muted" style="margin-bottom:14px">' + UI.esc(desc) + '</div>' +
      '<div class="row"><button class="btn grow" data-act="confirm:no" style="text-align:center">취소</button>' +
      '<button class="btn r grow" data-act="confirm:yes" style="text-align:center">' + UI.esc(yesLabel) + '</button></div>';
    document.getElementById('sheetWrap').hidden = false;
  }

  function digits(v) { return Number(String(v).replace(/[^\d]/g, '')) || 0; }

  /* ---------- 입력 ---------- */
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (!el.dataset) return;

    if (el.dataset.money === '1') {
      var n = digits(el.value);
      el.value = n ? n.toLocaleString('ko-KR') : '';
    }
    if (el.id === 'amt') {
      var a = digits(el.value);
      el.value = a ? a.toLocaleString('ko-KR') : '';
      if (UI.draft) UI.draft.amount = a;
      return;
    }

    /* 목표 */
    if (el.dataset.gid) {
      var g = S.state.goals.find(function (x) { return x.id === el.dataset.gid; });
      if (!g) return;
      var k = el.dataset.k;
      if (k === 'price') g.price = digits(el.value);
      else if (k === 'floors') {
        g.floors = Pixel.clampFloors(g.shape, el.value);
        var cv = document.querySelector('canvas.mini[data-goal="' + g.id + '"]');
        if (cv) UI.paintBuilding(cv, g, C.progress(g).ratio, document.documentElement.dataset.theme === 'night');
        var lab = el.parentElement.querySelector('label');
        var sh = Pixel.shape(g.shape);
        if (lab) lab.textContent = '층수 (' + g.floors + '층 · ' + sh.min + '~' + sh.max + ')';
      } else g[k] = el.value;
      S.touchGoal(g);
      Sync.schedule();
      return;
    }

    /* 멤버 이름 */
    if (el.dataset.mem) {
      var m = S.state.members.find(function (x) { return x.id === el.dataset.mem; });
      if (m) { m.name = el.value.slice(0, 10); m.updatedAt = S.now(); S.save(); Sync.schedule(); }
      return;
    }

    /* 동기화 설정 (로컬 전용) */
    if (el.dataset.sync) {
      var v = el.type === 'checkbox' ? el.checked : el.value.trim();
      if (el.dataset.sync === 'token' && typeof v === 'string') {
        var cleaned = Sync.cleanToken(v);
        if (cleaned !== el.value) el.value = cleaned;
        v = cleaned;
      }
      S.state.sync[el.dataset.sync] = v;
      S.save();
      return;
    }

    /* 설정 */
    if (el.dataset.set) {
      S.state.settings[el.dataset.set] = el.dataset.money === '1' ? digits(el.value) : Number(el.value);
      S.touchSettings();
      Sync.schedule();
    }
  });

  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.id === 'importFile') { readImport(el); return; }
    if (el.dataset && el.dataset.sync === 'auto') { UI.render(); return; }
    if (el.dataset && (el.dataset.gid || el.dataset.set)) UI.render();
  });

  /* ---------- 클릭 ---------- */
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) { UI.closeSheet(); return; }
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.dataset.act, id = t.dataset.id;

    if (act.indexOf('nav:') === 0) {
      UI.view = act.slice(4);
      UI.render({ top: true });
      return;
    }

    switch (act) {
      /* ---- 목표 ---- */
      case 'goal:select':
        S.state.activeGoal = id; S.save(); UI.render(); return;

      case 'goal:add': {
        if (!S.addGoal()) { UI.toast('목표는 최대 3개까지예요'); return; }
        UI.render(); UI.toast('목표를 추가했어요'); Sync.schedule(); return;
      }
      case 'goal:del':
        askConfirm('목표를 삭제할까요?', '해당 목표 아파트 정보가 사라집니다. 가계부 내역은 그대로 남아요.', '삭제', function () {
          S.removeGoal(id); UI.render(); UI.toast('삭제했어요'); Sync.schedule();
        });
        return;
      case 'goal:up':
      case 'goal:down': {
        var list = S.goalsSorted();
        var i = list.findIndex(function (x) { return x.id === id; });
        var j = act === 'goal:up' ? i - 1 : i + 1;
        if (j < 0 || j >= list.length) return;
        var r = list[i].rank; list[i].rank = list[j].rank; list[j].rank = r;
        list[i].updatedAt = list[j].updatedAt = S.now();
        S.save(); UI.render(); Sync.schedule(); return;
      }
      case 'goal:theme': {
        var gt = S.state.goals.find(function (x) { return x.id === id; });
        if (gt) { gt.theme = t.dataset.t; S.touchGoal(gt); UI.render(); Sync.schedule(); }
        return;
      }
      case 'goal:shape': {
        var gs = S.state.goals.find(function (x) { return x.id === id; });
        if (gs) {
          gs.shape = t.dataset.s;
          gs.floors = Pixel.clampFloors(gs.shape, gs.floors);
          S.touchGoal(gs); UI.render(); Sync.schedule();
        }
        return;
      }

      /* ---- 멤버 ---- */
      case 'mem:add':
        if (!S.addMember('배우자')) { UI.toast('2명까지만 등록할 수 있어요'); return; }
        UI.render(); UI.toast('함께 쓰는 사람을 추가했어요'); Sync.schedule(); return;
      case 'mem:me':
        S.state.me = id; S.save(); UI.render(); return;
      case 'mem:del':
        askConfirm('이 사람을 삭제할까요?', '이미 기록된 내역의 작성자 표시만 사라집니다.', '삭제', function () {
          S.removeMember(id); UI.render(); Sync.schedule();
        });
        return;

      /* ---- 동기화 ---- */
      case 'sync:now': Sync.run(false); return;
      case 'sync:test': Sync.test(); return;
      case 'sync:diag': {
        UI.toast('진단 중...');
        Sync.diagnose().then(function (steps) {
          var h = '<h3>연결 진단<button class="icon-btn" data-act="sheet:close">✕</button></h3>' +
            '<div class="note-box" style="line-height:2">' +
            steps.map(function (s2) {
              return '<b>' + UI.esc(s2[0]) + '</b><br>' + UI.esc(s2[1]);
            }).join('<br><br>') + '</div>' +
            '<div class="hint">✗ 가 처음 나오는 단계가 원인입니다. 그 줄을 알려주세요.</div>' +
            '<button class="btn p block" data-act="sheet:close" style="margin-top:12px">확인</button>';
          document.getElementById('sheet').innerHTML = h;
          document.getElementById('sheetWrap').hidden = false;
        });
        return;
      }

      /* ---- 달력 ---- */
      case 'cal:prev': UI.cal = new Date(UI.cal.getFullYear(), UI.cal.getMonth() - 1, 1); UI.render(); return;
      case 'cal:next': UI.cal = new Date(UI.cal.getFullYear(), UI.cal.getMonth() + 1, 1); UI.render(); return;
      case 'cal:today': UI.cal = new Date(); UI.calSel = S.todayISO(); UI.render(); return;
      case 'cal:day':
        UI.calSel = UI.calSel === t.dataset.d ? null : t.dataset.d;
        UI.render();
        return;

      /* ---- 통계 ---- */
      case 'stat:mode': UI.statMode = t.dataset.m; UI.render(); return;

      /* ---- 내역 ---- */
      case 'tx:new': UI.openTxSheet(null, t.dataset.d); return;
      case 'tx:edit': {
        var tx = S.state.tx.find(function (x) { return x.id === id; });
        if (tx) UI.openTxSheet(tx);
        return;
      }
      case 'sheet:close': UI.closeSheet(); return;
      case 'sheet:type':
        UI.readSheet();
        UI.draft.type = t.dataset.t;
        if (UI.draft.type === 'expense') { if (!UI.draft.method) UI.draft.method = 'cash'; }
        else delete UI.draft.method;
        UI.renderSheet();
        return;
      case 'sheet:cat': UI.readSheet(); UI.draft.cat = t.dataset.c; UI.renderSheet(); return;
      case 'sheet:by': UI.readSheet(); UI.draft.by = t.dataset.b; UI.renderSheet(); return;
      case 'sheet:method': UI.readSheet(); UI.draft.method = t.dataset.pm; UI.renderSheet(); return;
      case 'sheet:quick': {
        UI.readSheet();
        UI.draft.amount = (UI.draft.amount || 0) + Number(t.dataset.v);
        var amt = document.getElementById('amt');
        if (amt) amt.value = UI.draft.amount.toLocaleString('ko-KR');
        return;
      }
      case 'sheet:clear': {
        UI.draft.amount = 0;
        var a2 = document.getElementById('amt');
        if (a2) { a2.value = ''; a2.focus(); }
        return;
      }
      case 'sheet:save': {
        UI.readSheet();
        var d = UI.draft;
        if (!d.amount) { UI.toast('금액을 입력해 주세요'); return; }
        var before = C.progress(S.activeGoal()).ratio;
        if (UI.editing) { S.updateTx(UI.editing, d); UI.toast('수정했어요'); }
        else { S.addTx(d); UI.toast(UI.TYPE_META[d.type].name + ' ' + C.fmt(d.amount) + '원 기록 완료!'); }
        var after = C.progress(S.activeGoal()).ratio;
        if (UI.view === 'calendar') UI.calSel = d.date;
        UI.closeSheet();
        UI.render();
        Sync.schedule();
        if (after >= 1 && before < 1) setTimeout(function () { UI.toast('🎉 목표 자기자본 달성! 입주 가능해요'); }, 1400);
        return;
      }
      case 'sheet:del': {
        var delId = UI.editing;
        askConfirm('이 내역을 삭제할까요?', '되돌릴 수 없습니다.', '삭제', function () {
          S.removeTx(delId); UI.closeSheet(); UI.render(); UI.toast('삭제했어요'); Sync.schedule();
        });
        return;
      }

      /* ---- 확인 시트 ---- */
      case 'confirm:no': {
        var wasTx = UI.editing;
        document.getElementById('sheetWrap').hidden = true;
        confirmCb = null;
        if (wasTx) {
          var still = S.state.tx.find(function (x) { return x.id === wasTx; });
          if (still) UI.openTxSheet(still);
        }
        return;
      }
      case 'confirm:yes': {
        var cb = confirmCb; confirmCb = null;
        document.getElementById('sheetWrap').hidden = true;
        if (cb) cb();
        return;
      }

      /* ---- 설정 ---- */
      case 'set:product': {
        var p = S.applyProduct(t.dataset.p);
        UI.render();
        UI.toast(p.name + ' 조건을 적용했어요');
        Sync.schedule();
        return;
      }
      case 'set:fresh': freshReload(); return;
      case 'set:export': doExport(); return;
      case 'set:import': document.getElementById('importFile').click(); return;
      case 'set:reset': openResetSheet(); return;
      case 'reset:go': {
        var scope = t.dataset.scope;
        var cb = document.getElementById('resetPropagate');
        var propagate = !!(cb && cb.checked);
        S.resetData({ scope: scope, propagate: propagate });
        document.getElementById('sheetWrap').hidden = true;
        applyTheme();
        UI.view = 'home';
        UI.render({ top: true });
        UI.toast(scope === 'all' ? '전체 초기화했어요' : '내역을 모두 삭제했어요');
        if (propagate && Sync.configured()) Sync.run(true);
        return;
      }
      case 'set:install':
        if (UI.installEvt) {
          UI.installEvt.prompt();
          UI.installEvt.userChoice.then(function () { UI.installEvt = null; UI.render(); });
        } else {
          openInstallSheet();
        }
        return;
    }
  });


  /* ---------- 초기화 시트 ---------- */
  function openResetSheet() {
    var synced = Sync.configured();
    var h = '<h3>초기화<button class="icon-btn" data-act="sheet:close">✕</button></h3>' +
      '<div class="tiny muted" style="margin-bottom:12px">' +
      '현재 내역 ' + S.state.tx.length + '건 · 목표 ' + S.state.goals.length + '개가 있어요.<br>' +
      '되돌릴 수 없으니 필요하면 먼저 <b>백업 내보내기</b>를 해주세요.</div>';

    if (synced) {
      h += '<label class="row tiny" style="gap:7px;cursor:pointer;margin-bottom:12px;' +
        'border:var(--bw) solid var(--line);padding:9px 10px;background:var(--panel)">' +
        '<input type="checkbox" id="resetPropagate" checked style="width:auto;flex:none">' +
        '<span>연결된 저장소와 <b>다른 기기에서도</b> 삭제<br>' +
        '<span class="muted">끄면 이 기기에서만 지워지고, 다음 동기화 때 다시 내려옵니다</span></span></label>';
    }

    h += '<button class="btn block" data-act="reset:go" data-scope="tx" style="margin-bottom:9px">' +
      '가계부 내역만 삭제</button>' +
      '<div class="hint" style="margin-bottom:14px">목표·설정·용돈은 그대로 둡니다</div>' +
      '<button class="btn r block" data-act="reset:go" data-scope="all">전체 초기화</button>' +
      '<div class="hint">내역 · 목표 · 소득 · 용돈 · 대출 조건까지 모두 지웁니다 (동기화 설정은 유지)</div>';

    document.getElementById('sheet').innerHTML = h;
    document.getElementById('sheetWrap').hidden = false;
  }

  /* ---------- 설치 안내 시트 ---------- */
  function openInstallSheet() {
    var ua = navigator.userAgent;
    var iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    var android = /Android/.test(ua);
    var standalone = window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    var h = '<h3>홈 화면에 설치<button class="icon-btn" data-act="sheet:close">✕</button></h3>';

    if (standalone) {
      h += '<div class="note-box">이미 앱으로 설치해서 실행 중이에요 ✅</div>';
    } else if (iOS) {
      h += '<div class="note-box"><b>iPhone / iPad (Safari)</b><br>' +
        '1. 아래쪽 <b>공유 버튼</b>(□↑) 누르기<br>' +
        '2. 목록을 내려서 <b>"홈 화면에 추가"</b> 선택<br>' +
        '3. 오른쪽 위 <b>추가</b> 누르기</div>' +
        '<div class="hint">iOS는 Safari에서만 설치할 수 있어요. Chrome 앱에서는 안 됩니다.</div>';
    } else if (android) {
      h += '<div class="note-box"><b>Android (Chrome)</b><br>' +
        '1. 오른쪽 위 <b>⋮ 메뉴</b> 누르기<br>' +
        '2. <b>"앱 설치"</b> 또는 <b>"홈 화면에 추가"</b> 선택</div>';
    } else {
      h += '<div class="note-box"><b>PC (Chrome / Edge)</b><br>' +
        '1. 주소창 오른쪽 끝의 <b>설치 아이콘</b>(⊞ 또는 모니터 모양) 클릭<br>' +
        '2. 없으면 <b>⋮ 메뉴 → 캐스트·저장 및 공유 → 페이지를 앱으로 설치</b></div>';
    }

    h += '<div class="hint">설치하면 주소창 없이 앱처럼 열리고, 인터넷이 끊겨도 동작합니다. ' +
      '가계부 데이터는 기기마다 따로 저장되니, 두 기기에서 쓰려면 각 기기에서 동기화 설정을 해주세요.</div>' +
      '<button class="btn p block" data-act="sheet:close" style="margin-top:12px">확인</button>';

    document.getElementById('sheet').innerHTML = h;
    document.getElementById('sheetWrap').hidden = false;
  }

  /* ---------- 캐시 비우고 다시 받기 ---------- */
  function freshReload() {
    UI.toast('앱을 새로 받는 중...');
    var done = function () {
      location.replace(location.origin + location.pathname + '?fresh=' + Date.now());
    };
    clearWorkers().then(done, done);
  }

  /* ---------- 백업 ---------- */
  function doExport() {
    try {
      var blob = new Blob([S.exportJSON()], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'housepoor-' + S.todayISO() + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      UI.toast('백업 파일을 내려받았어요');
    } catch (err) {
      UI.toast('내보내기에 실패했어요');
    }
  }

  function readImport(el) {
    var f = el.files && el.files[0];
    if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      try {
        S.importJSON(String(fr.result));
        applyTheme();
        UI.render({ top: true });
        UI.toast('불러오기 완료!');
      } catch (err) {
        UI.toast('파일을 읽을 수 없어요');
      }
      el.value = '';
    };
    fr.readAsText(f);
  }

  /* ---------- 오류 수집 ---------- */
  function noteError(msg) {
    msg = String(msg || '').slice(0, 160);
    if (!msg) return;
    UI.errors.push(msg);
    if (UI.errors.length > 10) UI.errors.shift();
    if (UI.toast) UI.toast('오류: ' + msg);
  }
  window.addEventListener('error', function (e) {
    noteError((e.message || '') + (e.filename ? ' @' + e.filename.split('/').pop() + ':' + e.lineno : ''));
  });
  window.addEventListener('unhandledrejection', function (e) {
    noteError(e.reason && (e.reason.message || e.reason));
  });

  /* ---------- 부트 ---------- */
  S.load();
  applyTheme();
  UI.calSel = S.todayISO();
  UI.render({ top: true });

  document.getElementById('fab').addEventListener('click', function () {
    UI.openTxSheet(null, UI.view === 'calendar' && UI.calSel ? UI.calSel : S.todayISO());
  });

  document.getElementById('themeBtn').addEventListener('click', function () {
    S.state.theme = S.state.theme === 'night' ? 'day' : 'night';
    S.save();
    applyTheme();
    UI.render();
  });

  document.getElementById('syncBtn').addEventListener('click', function () {
    if (!Sync.configured()) { UI.view = 'settings'; UI.render({ top: true }); UI.toast('설정에서 저장소를 연결해 주세요'); return; }
    Sync.run(false);
  });

  document.addEventListener('keydown', function (e) {
    var wrap = document.getElementById('sheetWrap');
    if (e.key === 'Escape' && !wrap.hidden) UI.closeSheet();
    if (e.key === 'Enter' && !wrap.hidden && UI.draft && (e.target.tagName || '').toLowerCase() === 'input') {
      e.preventDefault();
      var btn = document.querySelector('[data-act="sheet:save"]');
      if (btn) btn.click();
    }
  });

  /* 창 크기가 바뀌면 건물만 다시 그린다 (레이아웃은 그대로) */
  var rsT = null;
  window.addEventListener('resize', function () {
    clearTimeout(rsT);
    rsT = setTimeout(function () { UI.repaintBuildings(); }, 150);
  });

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    UI.installEvt = e;
    if (UI.view === 'settings') UI.render();
  });

  /* 앱이 다시 보일 때 자동 동기화 */
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && Sync.configured() && S.state.sync.auto) Sync.run(true);
  });

  if (Sync.configured() && S.state.sync.auto) setTimeout(function () { Sync.run(true); }, 800);

  /* ---------- 서비스워커 ----------
     ?fresh= 로 들어오면 먼저 해제·캐시 삭제를 "끝낸 뒤" 재등록한다.
     (동시에 돌리면 사라진 등록에 update() 를 호출해 TypeError 가 난다) */
  function clearWorkers() {
    var jobs = [];
    if ('serviceWorker' in navigator) {
      jobs.push(navigator.serviceWorker.getRegistrations()
        .then(function (rs) {
          return Promise.all(rs.map(function (r) { return r.unregister(); }));
        }).catch(function () { }));
    }
    if (window.caches) {
      jobs.push(caches.keys()
        .then(function (ks) {
          return Promise.all(ks.map(function (k) { return caches.delete(k); }));
        }).catch(function () { }));
    }
    return Promise.all(jobs).catch(function () { });
  }

  function safeUpdate(reg) {
    try {
      if (!reg || (!reg.installing && !reg.waiting && !reg.active)) return;
      var p = reg.update();
      if (p && p.catch) p.catch(function () { });
    } catch (e) { /* 이미 해제된 등록 — 무시 */ }
  }

  function registerSW() {
    if (!('serviceWorker' in navigator) || location.protocol.indexOf('http') !== 0) return;

    /* 설치 직후의 controllerchange 로 새로고침 루프가 돌지 않도록, 
       원래 컨트롤러가 있던 경우(=업데이트)에만 한 번 새로고침한다 */
    var hadController = !!navigator.serviceWorker.controller;
    var reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController || reloading) return;
      reloading = true;
      location.reload();
    });

    navigator.serviceWorker.register('sw.js').then(function (reg) {
      safeUpdate(reg);
      setInterval(function () { safeUpdate(reg); }, 60 * 60 * 1000);
    }).catch(function () { });
  }

  var fresh = /[?&]fresh=/.test(location.search);
  if (fresh) {
    clearWorkers().then(function () {
      /* 주소에서 fresh 파라미터를 치워 다음 새로고침 때 반복되지 않게 */
      try { history.replaceState(null, '', location.pathname); } catch (e) { }
      registerSW();
    });
  } else {
    window.addEventListener('load', registerSW);
  }
})();
