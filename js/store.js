/* ===== 데이터 저장소 ===== */
(function (global) {
  'use strict';

  var KEY = 'phb.v1';
  var VERSION = 2;

  var CATS = {
    expense: [
      { id: 'food', name: '식비', spr: 'burger' },
      { id: 'cafe', name: '카페/간식', spr: 'coffee' },
      { id: 'transport', name: '교통', spr: 'bus' },
      { id: 'home', name: '주거/통신', spr: 'house' },
      { id: 'living', name: '생활용품', spr: 'cart' },
      { id: 'health', name: '의료/건강', spr: 'health' },
      { id: 'fun', name: '문화/여가', spr: 'game' },
      { id: 'fashion', name: '의류/미용', spr: 'shirt' },
      { id: 'edu', name: '교육/자기계발', spr: 'book' },
      { id: 'event', name: '경조사', spr: 'gift' },
      { id: 'etc', name: '기타', spr: 'box' }
    ],
    income: [
      { id: 'salary', name: '급여', spr: 'bag' },
      { id: 'bonus', name: '상여/보너스', spr: 'star' },
      { id: 'side', name: '부수입', spr: 'coin' },
      { id: 'gift_in', name: '용돈/선물', spr: 'mail' },
      { id: 'etc_in', name: '기타', spr: 'box' }
    ],
    save: [
      { id: 'deposit', name: '예적금', spr: 'piggy' },
      { id: 'housing', name: '청약', spr: 'doc' },
      { id: 'invest', name: '투자', spr: 'chart' },
      { id: 'cash', name: '현금/기타', spr: 'coin' }
    ]
  };

  var THEMES = [
    { id: 'brick', name: '테라코타', body: '#f6b49c', body2: '#dd9480', roof: '#f2938c' },
    { id: 'sand', name: '샌드', body: '#f7e8c8', body2: '#dcc9a2', roof: '#9cc9f0' },
    { id: 'mint', name: '민트', body: '#bfe9d8', body2: '#97c7b4', roof: '#9ad693' },
    { id: 'sky', name: '스카이', body: '#cde2f7', body2: '#a3c0de', roof: '#8fb8e8' },
    { id: 'rose', name: '로즈', body: '#f9d2de', body2: '#dba9b9', roof: '#ef9fbd' },
    { id: 'grey', name: '모던그레이', body: '#e8e6e3', body2: '#c2bfbb', roof: '#b0abbd' }
  ];

  /* 대출 상품 프리셋
     dsr 0 = DSR 미적용(정책자금) / maxLoan·priceCap·incomeCap 0 = 제한 없음
     공고 기준은 수시로 바뀌므로 선택 후 설정에서 직접 수정할 수 있다. */
  var PRODUCTS = [
    {
      id: 'normal', name: '일반 주택담보대출',
      rate: 4.2, years: 30, ltv: 70, dsr: 40, maxLoan: 0, priceCap: 0, incomeCap: 0,
      note: 'DSR 40% 적용. 규제지역·다주택은 LTV가 더 낮아질 수 있어요.'
    },
    {
      id: 'firsttime', name: '생애최초 (LTV 80%)',
      rate: 4.0, years: 40, ltv: 80, dsr: 40, maxLoan: 600000000, priceCap: 0, incomeCap: 0,
      note: '생애최초 구입자 LTV 80%·한도 6억. DSR 40%는 그대로 적용됩니다.'
    },
    {
      id: 'bogeumjari', name: '보금자리론',
      rate: 4.2, years: 30, ltv: 70, dsr: 0, maxLoan: 360000000, priceCap: 600000000, incomeCap: 70000000,
      note: '주택가격 6억·부부합산 연소득 7천만원 이하, 한도 3.6억. DSR 대신 DTI 60% 적용. 신혼·다자녀는 소득/한도 우대.'
    },
    {
      id: 'didimdol', name: '디딤돌 대출',
      rate: 3.3, years: 30, ltv: 70, dsr: 0, maxLoan: 250000000, priceCap: 500000000, incomeCap: 60000000,
      note: '무주택 세대주 대상. 주택가격 5억·연소득 6천만원 이하, 한도 2.5억. 신혼·다자녀는 상향.'
    },
    {
      id: 'newborn', name: '신생아 특례',
      rate: 2.6, years: 30, ltv: 70, dsr: 0, maxLoan: 500000000, priceCap: 900000000, incomeCap: 130000000,
      note: '2년 이내 출산·입양 가구. 주택가격 9억·연소득 1.3억 이하, 한도 5억.'
    },
    {
      id: 'custom', name: '직접 입력',
      rate: 0, years: 0, ltv: 0, dsr: 0, maxLoan: 0, priceCap: 0, incomeCap: 0,
      note: '아래 값을 자유롭게 설정하세요.'
    }
  ];

  var MEMBER_COLORS = ['#9cc9f0', '#f7b3cb'];

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function now() { return Date.now(); }

  function todayISO(d) {
    d = d || new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  function defaults() {
    var t = now();
    return {
      v: VERSION,
      members: [{ id: 'm1', name: '나', color: MEMBER_COLORS[0], updatedAt: t }],
      me: 'm1',
      goals: [{
        id: uid(), rank: 1, name: '우리집 1호', price: 600000000,
        region: '', size: '', shape: 'tower', floors: 12, theme: 'brick', memo: '', updatedAt: t
      }],
      activeGoal: null,
      tx: [],
      tomb: {},
      goalTomb: {},
      settings: {
        seed: 0,
        annualIncome: 50000000,
        monthlyBudget: 0,
        manualSaving: 0,
        product: 'normal',
        ltv: 70,
        rate: 4.0,
        years: 30,
        dsr: 40,
        maxLoan: 0,
        extraRate: 3,
        updatedAt: t
      },
      theme: 'day',
      sync: { repo: '', path: 'housepoor.json', branch: 'main', token: '', sha: '', lastSync: 0, auto: true }
    };
  }

  var state = null;

  function migrate(p) {
    var d = defaults();
    var s = Object.assign(d, p);
    s.settings = Object.assign(d.settings, p.settings || {});
    s.sync = Object.assign(d.sync, p.sync || {});
    if (!Array.isArray(s.members) || !s.members.length) s.members = d.members;
    s.members = s.members.slice(0, 2);
    if (!s.me || !s.members.some(function (m) { return m.id === s.me; })) s.me = s.members[0].id;
    if (!Array.isArray(s.goals) || !s.goals.length) s.goals = d.goals;
    if (!Array.isArray(s.tx)) s.tx = [];
    s.tomb = s.tomb || {};
    s.goalTomb = s.goalTomb || {};

    /* v1 → v2 : 형태/소유자/타임스탬프 보강 */
    s.goals.forEach(function (g) {
      if (!g.shape) g.shape = 'tower';
      g.floors = global.Pixel ? Pixel.clampFloors(g.shape, g.floors) : (g.floors || 10);
      if (!g.updatedAt) g.updatedAt = now();
    });
    s.tx.forEach(function (t) {
      if (!t.by) t.by = s.me;
      if (!t.updatedAt) t.updatedAt = now();
    });
    if (p && p.settings && p.settings.theme && !p.theme) s.theme = p.settings.theme;
    delete s.settings.theme;
    s.v = VERSION;
    return s;
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      state = raw ? migrate(JSON.parse(raw)) : defaults();
    } catch (e) {
      state = defaults();
    }
    return state;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      if (global.UI && UI.toast) UI.toast('저장 공간이 가득 찼어요');
    }
  }

  /* ---- 거래 ---- */
  function addTx(t) {
    t.id = t.id || uid();
    t.amount = Math.round(Number(t.amount) || 0);
    t.by = t.by || state.me;
    t.updatedAt = now();
    state.tx.push(t);
    sortTx();
    save();
    return t;
  }
  function updateTx(id, patch) {
    var t = state.tx.find(function (x) { return x.id === id; });
    if (!t) return null;
    Object.assign(t, patch);
    t.amount = Math.round(Number(t.amount) || 0);
    t.updatedAt = now();
    sortTx();
    save();
    return t;
  }
  function removeTx(id) {
    state.tx = state.tx.filter(function (x) { return x.id !== id; });
    state.tomb[id] = now();
    save();
  }
  function sortTx() {
    state.tx.sort(function (a, b) {
      return a.date === b.date ? (a.id < b.id ? 1 : -1) : (a.date < b.date ? 1 : -1);
    });
  }

  /* ---- 목표 ---- */
  function goalsSorted() {
    return state.goals.slice().sort(function (a, b) { return a.rank - b.rank; });
  }
  function addGoal() {
    if (state.goals.length >= 3) return null;
    var used = state.goals.map(function (g) { return g.rank; });
    var rank = 1;
    while (used.indexOf(rank) >= 0) rank++;
    var g = {
      id: uid(), rank: rank, name: '우리집 ' + rank + '호', price: 500000000,
      region: '', size: '', shape: 'tower', floors: 12,
      theme: THEMES[state.goals.length % THEMES.length].id, memo: '', updatedAt: now()
    };
    state.goals.push(g);
    save();
    return g;
  }
  function removeGoal(id) {
    if (state.goals.length <= 1) return false;
    state.goals = state.goals.filter(function (g) { return g.id !== id; });
    state.goalTomb[id] = now();
    if (state.activeGoal === id) state.activeGoal = null;
    save();
    return true;
  }
  function activeGoal() {
    var list = goalsSorted();
    return list.find(function (x) { return x.id === state.activeGoal; }) || list[0];
  }
  function touchGoal(g) { if (g) { g.updatedAt = now(); save(); } }
  function touchSettings() { state.settings.updatedAt = now(); save(); }

  /* ---- 멤버 ---- */
  function addMember(name) {
    if (state.members.length >= 2) return null;
    var m = { id: uid(), name: name || '함께 쓰는 사람', color: MEMBER_COLORS[state.members.length] || MEMBER_COLORS[1], updatedAt: now() };
    state.members.push(m);
    save();
    return m;
  }
  function removeMember(id) {
    if (state.members.length <= 1) return false;
    state.members = state.members.filter(function (m) { return m.id !== id; });
    if (state.me === id) state.me = state.members[0].id;
    save();
    return true;
  }
  function member(id) {
    return state.members.find(function (m) { return m.id === id; }) ||
      { id: id, name: '알 수 없음', color: '#c2bfbb' };
  }
  function meMember() { return member(state.me); }

  /* ---- 동기화용 : 공유 데이터만 추출 ---- */
  function sharedPayload() {
    return {
      v: VERSION,
      members: state.members,
      goals: state.goals,
      tx: state.tx,
      tomb: state.tomb,
      goalTomb: state.goalTomb,
      settings: state.settings,
      savedAt: now()
    };
  }

  function pickById(list) {
    var m = {};
    (list || []).forEach(function (x) { if (x && x.id) m[x.id] = x; });
    return m;
  }

  /* 로컬 ↔ 원격 병합 : id 기준 합집합, updatedAt 큰 쪽 채택, 삭제 묘비 적용 */
  function mergeRemote(remote) {
    if (!remote || typeof remote !== 'object') throw new Error('원격 데이터 형식 오류');
    var report = { tx: 0, goals: 0, members: 0, settings: false };

    var tomb = Object.assign({}, remote.tomb || {});
    Object.keys(state.tomb || {}).forEach(function (k) {
      tomb[k] = Math.max(tomb[k] || 0, state.tomb[k]);
    });
    var gTomb = Object.assign({}, remote.goalTomb || {});
    Object.keys(state.goalTomb || {}).forEach(function (k) {
      gTomb[k] = Math.max(gTomb[k] || 0, state.goalTomb[k]);
    });

    function unify(localList, remoteList, tombs) {
      var out = pickById(localList), fresh = {};
      (remoteList || []).forEach(function (r) {
        if (!r || !r.id) return;
        var cur = out[r.id];
        if (!cur || (r.updatedAt || 0) > (cur.updatedAt || 0)) {
          if (!cur) fresh[r.id] = 1;
          out[r.id] = r;
        }
      });
      var list = Object.keys(out).map(function (k) { return out[k]; }).filter(function (x) {
        var t = tombs[x.id];
        return !(t && t >= (x.updatedAt || 0));
      });
      /* 삭제 묘비로 걸러진 건 "새 항목"에서 제외 */
      var added = list.filter(function (x) { return fresh[x.id]; }).length;
      return { list: list, added: added };
    }

    var rt = unify(state.tx, remote.tx, tomb);
    state.tx = rt.list; report.tx = rt.added;

    var rg = unify(state.goals, remote.goals, gTomb);
    state.goals = rg.list.length ? rg.list : defaults().goals;
    report.goals = rg.added;

    var rm = unify(state.members, remote.members, {});
    state.members = rm.list.slice(0, 2);
    report.members = rm.added;
    if (!state.members.some(function (m) { return m.id === state.me; })) state.me = state.members[0].id;

    if (remote.settings && (remote.settings.updatedAt || 0) > (state.settings.updatedAt || 0)) {
      var localTheme = state.theme;
      state.settings = Object.assign(defaults().settings, remote.settings);
      delete state.settings.theme;
      state.theme = localTheme;
      report.settings = true;
    }

    state.tomb = prune(tomb);
    state.goalTomb = prune(gTomb);
    sortTx();
    save();
    return report;
  }

  function prune(t) {
    var cut = now() - 180 * 86400000, out = {};
    Object.keys(t).forEach(function (k) { if (t[k] > cut) out[k] = t[k]; });
    return out;
  }

  function catList(type) { return CATS[type] || CATS.expense; }
  function cat(type, id) {
    var l = catList(type);
    return l.find(function (c) { return c.id === id; }) || l[l.length - 1];
  }
  function theme(id) { return THEMES.find(function (t) { return t.id === id; }) || THEMES[0]; }
  function product(id) {
    return PRODUCTS.find(function (p) { return p.id === id; }) || PRODUCTS[0];
  }
  function applyProduct(id) {
    var p = product(id);
    state.settings.product = id;
    if (id !== 'custom') {
      state.settings.rate = p.rate;
      state.settings.years = p.years;
      state.settings.ltv = p.ltv;
      state.settings.dsr = p.dsr;
      state.settings.maxLoan = p.maxLoan;
    }
    touchSettings();
    return p;
  }

  function exportJSON() { return JSON.stringify(state, null, 2); }
  function importJSON(text) {
    var p = JSON.parse(text);
    if (!p || typeof p !== 'object') throw new Error('형식 오류');
    var keepSync = state && state.sync;
    state = migrate(p);
    if (keepSync && !(p.sync && p.sync.repo)) state.sync = keepSync;
    sortTx();
    save();
  }
  function reset() {
    var keepSync = state && state.sync;
    state = defaults();
    if (keepSync) state.sync = keepSync;
    save();
  }

  global.Store = {
    KEY: KEY, VERSION: VERSION, CATS: CATS, THEMES: THEMES, PRODUCTS: PRODUCTS,
    uid: uid, now: now, todayISO: todayISO,
    load: load, save: save, reset: reset,
    get state() { return state; },
    addTx: addTx, updateTx: updateTx, removeTx: removeTx,
    goalsSorted: goalsSorted, addGoal: addGoal, removeGoal: removeGoal,
    activeGoal: activeGoal, touchGoal: touchGoal, touchSettings: touchSettings,
    addMember: addMember, removeMember: removeMember, member: member, meMember: meMember,
    sharedPayload: sharedPayload, mergeRemote: mergeRemote,
    catList: catList, cat: cat, theme: theme, product: product, applyProduct: applyProduct,
    exportJSON: exportJSON, importJSON: importJSON
  };
})(window);
