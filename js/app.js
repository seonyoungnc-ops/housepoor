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
      S.state.sync[el.dataset.sync] = el.type === 'checkbox' ? el.checked : el.value.trim();
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
      case 'set:export': doExport(); return;
      case 'set:import': document.getElementById('importFile').click(); return;
      case 'set:reset':
        askConfirm('전체 초기화할까요?', '이 기기의 모든 내역과 목표가 삭제됩니다. 먼저 백업을 내보내는 것을 권장해요.', '초기화', function () {
          S.reset(); applyTheme(); UI.view = 'home'; UI.render({ top: true }); UI.toast('초기화했어요');
        });
        return;
      case 'set:install':
        if (UI.installEvt) {
          UI.installEvt.prompt();
          UI.installEvt.userChoice.then(function () { UI.installEvt = null; UI.render(); });
        }
        return;
    }
  });

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

  /* 새 버전이 배포되면 서비스워커 교체 후 한 번만 자동 새로고침 */
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    var reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (reloading) return;
      reloading = true;
      location.reload();
    });
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        reg.update();
        setInterval(function () { reg.update(); }, 60 * 60 * 1000);
      }).catch(function () { });
    });
  }
})();
