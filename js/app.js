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

    /* 목표 — 저장 버튼을 누를 때까지 보류 */
    if (el.dataset.gid) {
      var g = S.state.goals.find(function (x) { return x.id === el.dataset.gid; });
      if (!g) return;
      var k = el.dataset.k;
      var sc = 'g:' + g.id;
      if (k === 'price') UI.edits[sc + ':price'] = digits(el.value);
      else if (k === 'floors') {
        var shape = UI.pend(sc, 'shape', g.shape);
        var fl = Pixel.clampFloors(shape, el.value);
        UI.edits[sc + ':floors'] = fl;
        var cv = document.querySelector('canvas.mini[data-goal="' + g.id + '"]');
        if (cv) UI.paintBuilding(cv, { shape: shape, floors: fl, theme: UI.pend(sc, 'theme', g.theme) },
          C.progress(g).ratio, document.documentElement.dataset.theme === 'night');
        var lab = el.parentElement.querySelector('label');
        var sh = Pixel.shape(shape);
        if (lab) lab.textContent = '층수 (' + fl + '층 · ' + sh.min + '~' + sh.max + ')';
      } else UI.edits[sc + ':' + k] = el.value;
      markDirty();
      return;
    }

    /* 대출 조건 — 보류 */
    if (el.dataset.loan) {
      UI.edits['loan:' + el.dataset.loan] =
        el.dataset.money === '1' ? digits(el.value) : Number(el.value);
      markDirty();
      return;
    }

    /* 멤버 이름 — 보류 */
    if (el.dataset.mem) {
      UI.edits['mem:' + el.dataset.mem] = el.value.slice(0, 10);
      markDirty();
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

    /* 소득·용돈 — 보류 */
    if (el.dataset.set) {
      UI.edits['set:' + el.dataset.set] =
        el.dataset.money === '1' ? digits(el.value) : Number(el.value);
      markDirty();
    }
  });

  /* 입력이 끝나면 미뤄둔 렌더를 수행한다 */
  document.addEventListener('focusout', function () {
    setTimeout(function () { UI.flushPending(); }, 120);
  });

  /* 저장바를 띄우기 위해 한 번만 다시 그린다 (입력 중이면 미뤄짐) */
  var dirtyT = null;
  function markDirty() {
    if (document.querySelector('.saveact')) return;
    clearTimeout(dirtyT);
    dirtyT = setTimeout(function () { UI.render(); }, 250);
  }

  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.id === 'importFile') { readImport(el); return; }
    if (el.dataset && el.dataset.sync === 'auto') { UI.render(); return; }
    if (el.dataset && (el.dataset.gid || el.dataset.loan || el.dataset.set)) UI.render();
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

    /* 하위 탭 */
    if (act.indexOf('sub:') === 0) {
      UI.sub[act.slice(4)] = t.dataset.s;
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
      case 'goal:theme':
        UI.edits['g:' + id + ':theme'] = t.dataset.t;
        UI.render();
        return;
      case 'goal:shape': {
        var gs = S.state.goals.find(function (x) { return x.id === id; });
        if (gs) {
          var sc2 = 'g:' + id;
          UI.edits[sc2 + ':shape'] = t.dataset.s;
          UI.edits[sc2 + ':floors'] = Pixel.clampFloors(t.dataset.s, UI.pend(sc2, 'floors', gs.floors));
          UI.render();
        }
        return;
      }

      /* ---- 용돈 ---- */
      case 'budget:edit': openBudgetSheet(); return;
      case 'budget:save': {
        var ym = document.getElementById('bgMonth').value;
        var amt3 = digits(document.getElementById('bgAmount').value);
        var onlyThis = document.getElementById('bgOnly').checked;
        if (onlyThis) S.setBudget(ym, amt3);
        else { S.state.settings.monthlyBudget = amt3; S.setBudget(ym, null); }
        document.getElementById('sheetWrap').hidden = true;
        UI.render();
        UI.toast(onlyThis ? ym + ' 용돈을 ' + C.fmt(amt3) + '원으로 정했어요' : '기본 용돈을 바꿨어요');
        Sync.schedule();
        return;
      }
      case 'budget:clear': {
        var ym2 = document.getElementById('bgMonth').value;
        S.setBudget(ym2, null);
        document.getElementById('sheetWrap').hidden = true;
        UI.render();
        UI.toast('기본 용돈을 따르도록 되돌렸어요');
        Sync.schedule();
        return;
      }

      /* ---- 보유 자산 ---- */
      case 'as:add': openAssetSheet(null); return;
      case 'as:edit': openAssetSheet(id); return;
      case 'as:type': readAssetSheet(); UI.asDraft.type = t.dataset.t; renderAssetSheet(); return;
      case 'as:mode':
        UI.edits['mode:haveMode'] = t.dataset.m;
        UI.render();
        return;
      case 'as:save': {
        readAssetSheet();
        var a3 = UI.asDraft;
        if (!a3.amount) { UI.toast('금액을 입력해 주세요'); return; }
        if (a3.id) S.updateAsset(a3.id, a3); else S.addAsset(a3);
        document.getElementById('sheetWrap').hidden = true;
        UI.render();
        UI.toast('자산을 저장했어요');
        Sync.schedule();
        return;
      }
      case 'as:del': {
        var aid = UI.asDraft && UI.asDraft.id;
        S.removeAsset(aid);
        document.getElementById('sheetWrap').hidden = true;
        UI.render();
        UI.toast('삭제했어요');
        Sync.schedule();
        return;
      }

      /* ---- 고정지출 ---- */
      case 'fx:add': openFixedSheet(null); return;
      case 'fx:edit': openFixedSheet(id); return;
      case 'fx:cat': readFixedSheet(); UI.fxDraft.cat = t.dataset.c; renderFixedSheet(); return;
      case 'fx:method': readFixedSheet(); UI.fxDraft.method = t.dataset.pm; renderFixedSheet(); return;
      case 'fx:save': {
        readFixedSheet();
        var f = UI.fxDraft;
        if (!f.amount) { UI.toast('금액을 입력해 주세요'); return; }
        if (f.id) S.updateFixed(f.id, f); else S.addFixed(f);
        document.getElementById('sheetWrap').hidden = true;
        UI.render();
        UI.toast('고정지출을 저장했어요');
        Sync.schedule();
        return;
      }
      case 'fx:del': {
        var fid = UI.fxDraft && UI.fxDraft.id;
        S.removeFixed(fid);
        document.getElementById('sheetWrap').hidden = true;
        UI.render();
        UI.toast('삭제했어요');
        Sync.schedule();
        return;
      }
      case 'fx:apply': {
        var ymA = S.monthKey();
        var done = S.fixedDone(ymA);
        var added = 0;
        S.fixedList().forEach(function (f2) {
          if (done[f2.id]) return;
          S.addTx({
            type: 'expense', amount: f2.amount, cat: f2.cat, method: f2.method || 'cash',
            date: ymA + '-' + String(f2.day).padStart(2, '0'),
            memo: f2.name, fixedId: f2.id
          });
          added++;
        });
        UI.render();
        UI.toast(added ? '고정지출 ' + added + '건을 기록했어요' : '이미 모두 기록돼 있어요');
        if (added) Sync.schedule();
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

      /* ---- 토큰 입력 보조 ---- */
      case 'tok:show':
        S.state.sync.show = !S.state.sync.show;
        S.save();
        UI.render({ force: true });
        return;
      case 'tok:clear':
        S.state.sync.token = '';
        S.save();
        UI.render({ force: true });
        UI.toast('토큰을 지웠어요');
        return;
      case 'tok:paste':
        if (!navigator.clipboard || !navigator.clipboard.readText) {
          UI.toast('이 브라우저는 붙여넣기 버튼을 지원하지 않아요. 칸에 직접 붙여넣어 주세요');
          return;
        }
        navigator.clipboard.readText().then(function (txt) {
          var cleaned = Sync.cleanToken(txt);
          if (!cleaned) { UI.toast('클립보드가 비어 있어요'); return; }
          S.state.sync.token = cleaned;
          S.save();
          UI.render({ force: true });
          UI.toast('토큰 ' + cleaned.length + '자를 붙여넣었어요');
        }).catch(function () {
          UI.toast('클립보드를 읽을 수 없어요. 칸에 직접 붙여넣어 주세요');
        });
        return;

      case 'tok:export': {
        var c2 = S.state.sync;
        var code = 'HP1.' + btoa(unescape(encodeURIComponent(
          [c2.repo, c2.path || 'housepoor.json', c2.branch || 'main', Sync.cleanToken(c2.token)].join('\n')
        )));
        copyText(code, '연결 코드를 복사했어요. 다른 기기에서 "연결 코드 입력"에 붙여넣으세요');
        return;
      }
      case 'tok:import': openCodeSheet(); return;
      case 'tok:pasteCode':
        if (!navigator.clipboard || !navigator.clipboard.readText) {
          UI.toast('이 브라우저는 붙여넣기 버튼을 지원하지 않아요');
          return;
        }
        navigator.clipboard.readText().then(function (txt) {
          var el = document.getElementById('codeIn');
          if (el) el.value = txt.trim();
        }).catch(function () { UI.toast('클립보드를 읽을 수 없어요'); });
        return;
      case 'tok:apply': {
        var raw = (document.getElementById('codeIn') || {}).value || '';
        var parsed = parseCode(raw);
        if (!parsed) { UI.toast('연결 코드 형식이 아니에요'); return; }
        Object.assign(S.state.sync, parsed);
        S.save();
        document.getElementById('sheetWrap').hidden = true;
        UI.render({ top: true, force: true });
        UI.toast('연결 설정을 적용했어요 · 토큰 ' + parsed.token.length + '자');
        Sync.test();
        return;
      }

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
      case 'chart:mode': UI.chartMode = t.dataset.m; UI.render(); return;
      case 'pace:unit': UI.paceUnit = t.dataset.u; UI.render(); return;
      case 'pace:extra': UI.paceExtra = Number(t.dataset.v) || 0; UI.render(); return;

      /* ---- 대출 조건 바로가기 ---- */
      case 'go:loan':
        UI.view = 'goals';
        UI.sub.goals = 'loan';
        UI.render({ top: true });
        return;

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
        var pid = t.dataset.p;
        var pr2 = S.product(pid);
        UI.edits['loan:product'] = pid;
        if (pid !== 'custom') {
          UI.edits['loan:rate'] = pr2.rate;
          UI.edits['loan:years'] = pr2.years;
          UI.edits['loan:ltv'] = pr2.ltv;
          UI.edits['loan:dsr'] = pr2.dsr;
          UI.edits['loan:maxLoan'] = pr2.maxLoan;
        }
        UI.render();
        UI.toast(pr2.name + ' 조건을 불러왔어요 · 저장을 눌러주세요');
        return;
      }

      /* ---- 편집 저장 / 되돌리기 ---- */
      case 'edit:save': {
        var scope = t.dataset.scope;
        if (!commitEdits(scope)) { UI.toast('변경된 내용이 없어요'); return; }
        UI.render({ force: true });
        UI.toast('저장했어요');
        Sync.schedule();
        return;
      }
      case 'edit:cancel': {
        var sc3 = t.dataset.scope + ':';
        Object.keys(UI.edits).forEach(function (k) {
          if (k.indexOf(sc3) === 0) delete UI.edits[k];
        });
        UI.render({ force: true });
        UI.toast('되돌렸어요');
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


  /* ---------- 용돈 시트 ---------- */
  function openBudgetSheet() {
    var ym = S.monthKey();
    var cur = S.budgetFor(ym);
    var own = S.hasOwnBudget(ym);
    var h = '<h3>용돈 설정<button class="icon-btn" data-act="sheet:close">✕</button></h3>' +
      '<div class="field"><label>대상 월</label>' +
      '<input type="month" id="bgMonth" value="' + ym + '"></div>' +
      '<div class="field"><label>금액 (원)</label>' +
      '<input type="text" inputmode="numeric" data-money="1" id="bgAmount" value="' +
      (cur ? C.fmt(cur) : '') + '" placeholder="예) 500000"></div>' +
      '<label class="row tiny" style="gap:7px;cursor:pointer;margin:4px 0 12px;' +
      'border:var(--bw) solid var(--line);padding:9px 10px;background:var(--panel)">' +
      '<input type="checkbox" id="bgOnly" ' + (own ? 'checked' : '') + ' style="width:auto;flex:none">' +
      '<span>이 달에만 적용<br><span class="muted">끄면 매달 기본 용돈으로 저장됩니다</span></span></label>' +
      '<div class="row">' +
      (own ? '<button class="btn" data-act="budget:clear">기본값으로</button>' : '') +
      '<button class="btn p grow" data-act="budget:save" style="text-align:center">저장</button></div>' +
      '<div class="hint">월을 바꾸면 그 달의 용돈을 따로 정할 수 있어요.</div>';
    document.getElementById('sheet').innerHTML = h;
    document.getElementById('sheetWrap').hidden = false;
  }

  /* ---------- 편집 반영 ---------- */
  function commitEdits(scope) {
    var pre = scope + ':';
    var keys = Object.keys(UI.edits).filter(function (k) { return k.indexOf(pre) === 0; });
    if (!keys.length) return false;

    var goal = null;
    if (scope.indexOf('g:') === 0) {
      goal = S.state.goals.find(function (x) { return x.id === scope.slice(2); });
      if (!goal) return false;
    }

    keys.forEach(function (k) {
      var field = k.slice(pre.length);
      var v = UI.edits[k];
      if (scope === 'loan') S.loanCond()[field] = v;
      else if (scope === 'set' || scope === 'mode') S.state.settings[field] = v;
      else if (scope === 'mem') {
        var mm = S.state.members.find(function (x) { return x.id === field; });
        if (mm) { mm.name = v; mm.updatedAt = S.now(); }
      } else if (goal) goal[field] = v;
      delete UI.edits[k];
    });

    if (goal) {
      goal.floors = Pixel.clampFloors(goal.shape, goal.floors);
      S.touchGoal(goal);
    } else if (scope === 'mem') {
      S.save();
    } else {
      S.touchSettings();
    }
    return true;
  }

  /* ---------- 연결 코드 ---------- */
  function copyText(text, okMsg) {
    var done = function () { UI.toast(okMsg); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    } else {
      fallback();
    }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:-1000px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); }
      catch (e) { UI.toast('복사에 실패했어요'); }
      ta.remove();
    }
  }

  function parseCode(raw) {
    var t = String(raw || '').trim().replace(/\s/g, '');
    if (t.indexOf('HP1.') !== 0) return null;
    try {
      var txt = decodeURIComponent(escape(atob(t.slice(4))));
      var parts = txt.split('\n');
      if (parts.length < 4) return null;
      var tok = Sync.cleanToken(parts[3]);
      if (!parts[0] || !tok) return null;
      return { repo: parts[0], path: parts[1] || 'housepoor.json', branch: parts[2] || 'main', token: tok };
    } catch (e) { return null; }
  }

  function openCodeSheet() {
    var h = '<h3>연결 코드 입력<button class="icon-btn" data-act="sheet:close">✕</button></h3>' +
      '<div class="tiny muted" style="margin-bottom:10px">다른 기기의 설정에서 <b>연결 코드 복사</b>로 받은 값을 붙여넣으세요. ' +
      '저장소·경로·브랜치·토큰이 한 번에 설정됩니다.</div>' +
      '<textarea id="codeIn" rows="4" placeholder="HP1..." autocomplete="off" autocapitalize="off" ' +
      'autocorrect="off" spellcheck="false" style="font-size:12px;word-break:break-all"></textarea>' +
      '<div class="row" style="margin-top:10px">' +
      '<button class="btn grow" data-act="tok:pasteCode" style="text-align:center">클립보드에서</button>' +
      '<button class="btn p grow" data-act="tok:apply" style="text-align:center">적용</button></div>';
    document.getElementById('sheet').innerHTML = h;
    document.getElementById('sheetWrap').hidden = false;
    setTimeout(function () {
      var el = document.getElementById('codeIn');
      if (el) el.focus();
    }, 60);
  }

  /* ---------- 자산 시트 ---------- */
  function openAssetSheet(id) {
    var a = id ? S.assetList().find(function (x) { return x.id === id; }) : null;
    UI.asDraft = a ? Object.assign({}, a)
      : { name: '', type: 'deposit', amount: 0, memo: '' };
    renderAssetSheet();
  }

  function renderAssetSheet() {
    var a = UI.asDraft;
    var h = '<h3>' + (a.id ? '자산 수정' : '자산 추가') +
      '<button class="icon-btn" data-act="sheet:close">✕</button></h3>' +
      '<div class="field"><label>종류</label><div class="chips">' +
      S.assetTypes().map(function (t) {
        return '<button class="chip ' + (a.type === t.id ? 'on' : '') + '" data-act="as:type" data-t="' + t.id + '">' +
          Sprites.tag(t.spr) + UI.esc(t.name) + '</button>';
      }).join('') + '</div></div>' +
      '<div class="field"><label>이름</label>' +
      '<input type="text" id="asName" value="' + UI.esc(a.name) + '" maxlength="24" placeholder="예) 청년도약계좌, 삼성전자, 국민은행 예금"></div>' +
      '<div class="field"><label>금액 (원)</label>' +
      '<input type="text" inputmode="numeric" data-money="1" id="asAmount" value="' +
      (a.amount ? C.fmt(a.amount) : '') + '" placeholder="예) 10000000"></div>' +
      '<div class="field"><label>메모</label>' +
      '<input type="text" id="asMemo" value="' + UI.esc(a.memo || '') + '" maxlength="30" placeholder="선택 입력 (만기일, 계좌 등)"></div>' +
      '<div class="row" style="margin-top:6px">' +
      (a.id ? '<button class="btn r" data-act="as:del">삭제</button>' : '') +
      '<button class="btn p grow" data-act="as:save" style="text-align:center">저장</button></div>';
    var sheet = document.getElementById('sheet');
    sheet.innerHTML = h;
    Sprites.hydrate(sheet);
    document.getElementById('sheetWrap').hidden = false;
  }

  function readAssetSheet() {
    var n = document.getElementById('asName');
    var a = document.getElementById('asAmount');
    var m = document.getElementById('asMemo');
    if (n) UI.asDraft.name = n.value.slice(0, 24);
    if (a) UI.asDraft.amount = digits(a.value);
    if (m) UI.asDraft.memo = m.value.slice(0, 30);
  }

  /* ---------- 고정지출 시트 ---------- */
  function openFixedSheet(id) {
    var f = id ? S.fixedList().find(function (x) { return x.id === id; }) : null;
    UI.fxDraft = f ? Object.assign({}, f)
      : { name: '', amount: 0, cat: 'home', method: 'cash', day: 25 };
    renderFixedSheet();
  }

  function renderFixedSheet() {
    var f = UI.fxDraft;
    var h = '<h3>' + (f.id ? '고정지출 수정' : '고정지출 추가') +
      '<button class="icon-btn" data-act="sheet:close">✕</button></h3>' +
      '<div class="field"><label>이름</label>' +
      '<input type="text" id="fxName" value="' + UI.esc(f.name) + '" maxlength="20" placeholder="예) 차 할부, 넷플릭스, 통신비"></div>' +
      '<div class="field"><label>금액 (원)</label>' +
      '<input type="text" inputmode="numeric" data-money="1" id="fxAmount" value="' +
      (f.amount ? C.fmt(f.amount) : '') + '" placeholder="예) 350000"></div>' +
      '<div class="field"><label>카테고리</label><div class="chips">' +
      S.catList('expense').map(function (c) {
        return '<button class="chip ' + (f.cat === c.id ? 'on' : '') + '" data-act="fx:cat" data-c="' + c.id + '">' +
          Sprites.tag(c.spr) + UI.esc(c.name) + '</button>';
      }).join('') + '</div></div>' +
      '<div class="field"><label>결제수단</label><div class="chips">' +
      S.METHODS.map(function (m) {
        return '<button class="chip ' + (f.method === m.id ? 'on' : '') + '" data-act="fx:method" data-pm="' + m.id + '">' +
          Sprites.tag(m.spr) + UI.esc(m.name) + '</button>';
      }).join('') + '</div></div>' +
      '<div class="field"><label>결제일 (매월)</label>' +
      '<input type="number" id="fxDay" min="1" max="28" value="' + f.day + '"></div>' +
      '<div class="row" style="margin-top:6px">' +
      (f.id ? '<button class="btn r" data-act="fx:del">삭제</button>' : '') +
      '<button class="btn p grow" data-act="fx:save" style="text-align:center">저장</button></div>';
    var sheet = document.getElementById('sheet');
    sheet.innerHTML = h;
    Sprites.hydrate(sheet);
    document.getElementById('sheetWrap').hidden = false;
  }

  function readFixedSheet() {
    var n = document.getElementById('fxName');
    var a = document.getElementById('fxAmount');
    var d = document.getElementById('fxDay');
    if (n) UI.fxDraft.name = n.value.slice(0, 20);
    if (a) UI.fxDraft.amount = digits(a.value);
    if (d) UI.fxDraft.day = Number(d.value) || 1;
  }

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
