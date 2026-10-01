/* ===== 데이터 저장소 ===== */
(function (global) {
  'use strict';

  var KEY = 'phb.v1';
  var VERSION = 5;
  /* 배포 번호 : sw.js 의 CACHE 버전과 함께 올린다.
     원격 파일이 더 새 번호로 저장돼 있으면 이 기기는 옛 코드이므로 올리지 않고 새로고침한다. */
  var BUILD = 44;

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

  /* 보유 자산 유형 */
  var ASSET_TYPES = [
    { id: 'cash', name: '현금·입출금', spr: 'coin' },
    { id: 'deposit', name: '예금', spr: 'bag' },
    { id: 'savings', name: '적금', spr: 'piggy' },
    { id: 'housing', name: '주택청약', spr: 'house' },
    { id: 'stock', name: '주식', spr: 'chart' },
    { id: 'fund', name: '펀드·ETF', spr: 'graph' },
    { id: 'pension', name: '연금·IRP', spr: 'safe' },
    { id: 'crypto', name: '가상자산', spr: 'star' },
    { id: 'insurance', name: '저축보험', spr: 'doc' },
    { id: 'lend', name: '받을 돈', spr: 'mail' },
    { id: 'other', name: '기타', spr: 'box' }
  ];

  /* 지출 결제수단 — 셋 다 이번 달 용돈(예산)에서 차감된다 */
  var METHODS = [
    { id: 'cash', name: '현금', short: '현금', spr: 'coin' },
    { id: 'credit', name: '신용카드', short: '신용', spr: 'cardc' },
    { id: 'debit', name: '체크카드', short: '체크', spr: 'cardd' }
  ];

  function pick() {
    for (var i = 0; i < arguments.length; i++) {
      if (arguments[i] != null) return arguments[i];
    }
    return null;
  }

  /* 기본값은 모두 비워 둔다. 상품을 고르거나 직접 입력해야 값이 생긴다. */
  function defaultLoan() {
    return {
      product: '', ltv: 0, rate: 0, years: 0,
      dsr: 0, maxLoan: 0, extraRate: 0
    };
  }

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
    /* updatedAt 0 = "아직 손대지 않은 기본값".
       동기화 병합에서 원격 데이터에 밀려야 하므로 현재 시각을 넣지 않는다. */
    return {
      v: VERSION,
      members: [{ id: 'm1', name: '', color: MEMBER_COLORS[0], updatedAt: 0 }],
      me: 'm1',
      /* 이 기기를 쓰는 사람을 직접 골랐는지 (기기별 값, 동기화하지 않음) */
      meSet: false,
      goals: [{
        id: uid(), rank: 1, name: '', price: 0,
        region: '', size: '', shape: 'tower', floors: 12, theme: 'brick', memo: '',
        updatedAt: 0
      }],
      activeGoal: null,
      tx: [],
      tomb: {},
      goalTomb: {},
      memberTomb: {},
      itemTomb: {},
      settings: {
        assets: [],
        haveMode: 'both',
        /* 목표 방식 : house(내 집 마련 · 기본) | saving(목표 금액만 모으기) */
        goalMode: 'house',
        annualIncome: 0,
        manualSaving: 0,
        fixed: [],
        loan: defaultLoan(),
        updatedAt: 0
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
    var st0 = splitTombs(s);
    s.tomb = st0.tx;
    s.memberTomb = st0.mem;
    s.itemTomb = st0.item;
    /* 멤버가 1명뿐이면 고를 필요가 없다 */
    if (s.members.length < 2) s.meSet = true;

    /* v1 → v2 : 형태/소유자/타임스탬프 보강 */
    var old = p && p.settings ? p.settings : {};
    s.goals.forEach(function (g) {
      if (!g.shape) g.shape = 'tower';
      g.floors = global.Pixel ? Pixel.clampFloors(g.shape, g.floors) : (g.floors || 10);
      /* updatedAt 0 은 "손대지 않은 기본값" 표시라 그대로 둔다.
         (불러올 때마다 현재 시각을 넣으면 빈 목표가 원격 목표 사이에 끼어든다) */
      if (g.updatedAt == null) g.updatedAt = now();
    });
    /* 용돈은 사람별로 멤버 정보에 둔다 (각자 자기 것만 고치므로 동기화 충돌이 없다).
       예전의 공용 용돈은 첫 번째 멤버(저장소를 만든 사람)의 용돈으로 옮긴다.
       어느 기기에서 옮겨도 같은 결과가 나오도록 updatedAt 은 건드리지 않는다. */
    var oldBase = Number(s.settings.monthlyBudget) || 0;
    var oldMonths = s.settings.budgets || {};
    if ((oldBase > 0 || Object.keys(oldMonths).length) && s.members[0].budget == null) {
      s.members[0].budget = oldBase;
      s.members[0].budgets = Object.assign({}, oldMonths);
    }
    delete s.settings.monthlyBudget;
    delete s.settings.budgets;
    s.settings.fixed = Array.isArray(s.settings.fixed) ? s.settings.fixed : [];
    s.settings.assets = Array.isArray(s.settings.assets) ? s.settings.assets : [];
    s.settings.haveMode = s.settings.haveMode === 'assets' ? 'assets' : 'both';
    s.settings.goalMode = s.settings.goalMode === 'saving' ? 'saving' : 'house';

    /* v4 → v5 : 단일 시드머니를 자산 항목 하나로 옮긴다 */
    if (Number(old.seed) > 0 && !s.settings.assets.length) {
      s.settings.assets = [{
        id: uid(), name: '기존 시드머니', type: 'cash',
        amount: Math.round(Number(old.seed)), memo: '', updatedAt: now()
      }];
    }
    delete s.settings.seed;

    /* 대출 조건은 전역 1벌로 관리한다.
       v2(전역 필드) / v3(목표별 loan) 어느 쪽에서 와도 하나로 모은다. */
    if (!s.settings.loan) {
      var d = defaultLoan();
      var fromGoal = (s.goals.find(function (g) { return g.loan; }) || {}).loan || {};
      s.settings.loan = {
        product: fromGoal.product || old.product || d.product,
        ltv: pick(fromGoal.ltv, old.ltv, d.ltv),
        rate: pick(fromGoal.rate, old.rate, d.rate),
        years: pick(fromGoal.years, old.years, d.years),
        dsr: pick(fromGoal.dsr, old.dsr, d.dsr),
        maxLoan: pick(fromGoal.maxLoan, old.maxLoan, d.maxLoan),
        extraRate: pick(fromGoal.extraRate, old.extraRate, d.extraRate)
      };
    }
    s.goals.forEach(function (g) { delete g.loan; });

    /* 이미 쓰던 기기라면 설정에 타임스탬프를 부여해 기본값으로 오인되지 않게 한다 */
    var hasLocalData = s.tx.length > 0 ||
      s.goals.some(function (g) { return (Number(g.price) > 0) || g.name; }) ||
      s.settings.assets.length > 0 || s.settings.fixed.length > 0;
    if (hasLocalData && !s.settings.updatedAt) s.settings.updatedAt = now();
    ['product', 'ltv', 'rate', 'years', 'dsr', 'maxLoan', 'extraRate'].forEach(function (k) {
      delete s.settings[k];
    });
    s.tx.forEach(function (t) {
      if (!t.by) t.by = s.me;
      if (t.type === 'expense' && !t.method) t.method = 'cash';
      if (t.updatedAt == null) t.updatedAt = now();
    });
    s.settings.fixed.forEach(function (f) { if (f.updatedAt == null) f.updatedAt = 0; });
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

  /* ---- 목표 ----
     목표는 방식별로 따로 둔다 (mode : house | saving, 없으면 house).
     화면·계산은 현재 방식의 목표만 본다 → 집 목표와 비상금 목표가 섞이지 않는다. */
  function goalModeOf(g) { return g && g.mode === 'saving' ? 'saving' : 'house'; }
  function curGoalMode() { return state.settings.goalMode === 'saving' ? 'saving' : 'house'; }
  function modeGoals() {
    var m = curGoalMode();
    return state.goals.filter(function (g) { return goalModeOf(g) === m; });
  }
  function goalsSorted() {
    var list = modeGoals();
    if (!list.length) { ensureModeGoal(); list = modeGoals(); }
    return list.slice().sort(function (a, b) { return a.rank - b.rank; });
  }
  /* 현재 방식의 목표가 하나도 없으면 빈 목표 하나를 만든다.
     목표 저축의 첫 목표는 id 를 고정해, 두 기기가 각자 만들어도 동기화 때 하나로 합쳐진다.
     updatedAt 0 = 손대지 않은 기본값 (상대 기기에서 입력한 값에 밀린다) */
  function ensureModeGoal() {
    var m = curGoalMode();
    if (modeGoals().length) return;
    var id = m === 'saving' ? 'save-1' : uid();
    if (state.goals.some(function (g) { return g.id === id; })) id = uid();
    state.goals.push({
      id: id, rank: 1, name: '', price: 0, mode: m,
      region: '', size: '', shape: 'tower', floors: 12, theme: 'brick', memo: '',
      updatedAt: 0
    });
    save();
  }
  function addGoal() {
    var list = modeGoals();
    if (list.length >= 3) return null;
    var used = list.map(function (g) { return g.rank; });
    var rank = 1;
    while (used.indexOf(rank) >= 0) rank++;
    var g = {
      id: uid(), rank: rank, name: '', price: 0, mode: curGoalMode(),
      region: '', size: '', shape: 'tower', floors: 12,
      theme: THEMES[list.length % THEMES.length].id, memo: '',
      updatedAt: now()
    };
    state.goals.push(g);
    save();
    return g;
  }
  function removeGoal(id) {
    if (modeGoals().length <= 1) return false;
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
    var m = { id: uid(), name: name || '', color: MEMBER_COLORS[state.members.length] || MEMBER_COLORS[1], updatedAt: now() };
    state.members.push(m);
    /* 추가하는 사람이 곧 이 기기의 주인이다 */
    state.meSet = true;
    save();
    return m;
  }
  function removeMember(id) {
    if (state.members.length <= 1) return false;
    state.members = state.members.filter(function (m) { return m.id !== id; });
    /* 묘비를 남겨야 다른 기기에 남은 사본이 다음 동기화 때 되살아나지 않는다 */
    state.memberTomb[id] = now();
    if (state.me === id) state.me = state.members[0].id;
    if (state.members.length < 2) state.meSet = true;
    save();
    return true;
  }
  function member(id) {
    return state.members.find(function (m) { return m.id === id; }) ||
      { id: id, name: '알 수 없음', color: '#c2bfbb' };
  }
  function meMember() { return member(state.me); }
  function setMe(id) {
    if (!state.members.some(function (m) { return m.id === id; })) return;
    state.me = id;
    state.meSet = true;
    save();
  }
  /* 둘이 쓰는데 이 기기가 누구 것인지 아직 고르지 않았다 */
  function needsMe() { return state.members.length > 1 && !state.meSet; }

  /* 멤버는 최대 2명. 두 기기에서 각자 추가해 3명 이상이 되면
     어느 기기에서 병합하든 같은 결과가 나오도록 결정적으로 고른다
     (내역이 많은 사람 → 기본 멤버 m1 → id 순) */
  function capMembers(list) {
    if (list.length <= 2) return list;
    var cnt = {};
    state.tx.forEach(function (t) { cnt[t.by] = (cnt[t.by] || 0) + 1; });
    return list.slice().sort(function (a, b) {
      return (cnt[b.id] || 0) - (cnt[a.id] || 0) ||
        (a.id === 'm1' ? -1 : b.id === 'm1' ? 1 : 0) ||
        (a.id < b.id ? -1 : 1);
    }).slice(0, 2);
  }

  /* ---- 동기화용 : 공유 데이터만 추출 ----
     멤버·자산/고정지출 묘비는 tomb 안에도 접두어를 붙여 함께 싣는다.
     구버전 앱은 모르는 필드(memberTomb 등)를 지운 채 올리지만 tomb 은 합쳐서 보존하므로,
     구버전 기기가 섞여 있어도 삭제 기록이 사라지지 않는다. */
  var MT = 'member:', IT = 'item:';

  function packTombs() {
    var out = Object.assign({}, state.tomb);
    Object.keys(state.memberTomb || {}).forEach(function (k) { out[MT + k] = state.memberTomb[k]; });
    Object.keys(state.itemTomb || {}).forEach(function (k) { out[IT + k] = state.itemTomb[k]; });
    return out;
  }

  /* tomb 에 섞인 접두어 묘비를 종류별로 나눈다 (별도 필드와 합침) */
  function splitTombs(src) {
    var tx = {}, mem = Object.assign({}, src.memberTomb || {}), item = Object.assign({}, src.itemTomb || {});
    Object.keys(src.tomb || {}).forEach(function (k) {
      var v = src.tomb[k];
      if (k.indexOf(MT) === 0) { k = k.slice(MT.length); mem[k] = Math.max(mem[k] || 0, v); }
      else if (k.indexOf(IT) === 0) { k = k.slice(IT.length); item[k] = Math.max(item[k] || 0, v); }
      else tx[k] = v;
    });
    return { tx: tx, mem: mem, item: item };
  }

  function alive(list, tombs) {
    return (list || []).filter(function (x) {
      var t = x && tombs[x.id];
      return !(t && t >= (x.updatedAt || 0));
    });
  }

  /* 원격 파일의 멤버 명단 (삭제 기록 반영) — 참여 화면용 */
  function remoteMembers(remote) {
    return alive((remote && remote.members) || [], splitTombs(remote || {}).mem).slice(0, 2);
  }

  function sharedPayload() {
    return {
      v: VERSION,
      build: BUILD,
      members: state.members,
      goals: state.goals,
      tx: state.tx,
      tomb: packTombs(),
      goalTomb: state.goalTomb,
      memberTomb: state.memberTomb,
      itemTomb: state.itemTomb,
      settings: state.settings,
      savedAt: now()
    };
  }

  function pickById(list) {
    var m = {};
    (list || []).forEach(function (x) { if (x && x.id) m[x.id] = x; });
    return m;
  }

  /* 아직 아무것도 입력하지 않은 "새 기기" 상태인가 */
  function isPristine() {
    if (state.tx.length) return false;
    if (Object.keys(state.tomb || {}).length) return false;
    if (Object.keys(state.goalTomb || {}).length) return false;
    if (Number(state.settings.updatedAt) > 0) return false;
    if ((state.settings.assets || []).length) return false;
    if ((state.settings.fixed || []).length) return false;
    if (state.goals.length !== 1) return false;
    return !(Number(state.goals[0].updatedAt) > 0);
  }

  /* 로컬 ↔ 원격 병합 : id 기준 합집합, updatedAt 큰 쪽 채택, 삭제 묘비 적용 */
  function mergeRemote(remote) {
    if (!remote || typeof remote !== 'object') throw new Error('원격 데이터 형식 오류');
    var report = { tx: 0, goals: 0, members: 0, settings: false, adopted: false };

    /* 새 기기라면 병합하지 말고 원격을 그대로 받아온다.
       (빈 기본값이 상대방 데이터를 덮어쓰는 것을 막는다) */
    if (isPristine() && Array.isArray(remote.goals) && remote.goals.length) {
      var keepMe = state.me;
      var rt0 = splitTombs(remote);
      state.goals = remote.goals;
      state.activeGoal = remote.activeGoal || null;
      /* 구버전 기기가 되살려 올린 항목이 있을 수 있어 묘비로 한 번 거른다 */
      var rMembers = alive(remote.members, rt0.mem);
      state.members = (rMembers.length ? rMembers : state.members).slice(0, 2);
      state.tx = alive(remote.tx, rt0.tx);
      state.tomb = rt0.tx;
      state.goalTomb = remote.goalTomb || {};
      state.memberTomb = rt0.mem;
      state.itemTomb = rt0.item;
      var localTheme0 = state.theme;
      state.settings = Object.assign(defaults().settings, remote.settings || {});
      state.settings.assets = alive(state.settings.assets, rt0.item);
      state.settings.fixed = alive(state.settings.fixed, rt0.item);
      delete state.settings.theme;
      state.theme = localTheme0;
      if (!state.members.some(function (m) { return m.id === keepMe; })) state.me = state.members[0].id;
      /* 둘이 쓰는 저장소를 새 기기가 받으면 "나"를 직접 고르게 한다.
         (기본값 m1 로 두면 상대방 기기의 기록이 전부 내 이름으로 저장된다) */
      state.meSet = state.members.length < 2;
      sortTx();
      save();
      return { tx: state.tx.length, goals: state.goals.length, members: 0, settings: true, adopted: true };
    }

    function joinTomb(a, b) {
      var out = Object.assign({}, a || {});
      Object.keys(b || {}).forEach(function (k) { out[k] = Math.max(out[k] || 0, b[k]); });
      return out;
    }
    var rt = splitTombs(remote);
    var tomb = joinTomb(rt.tx, state.tomb);
    var gTomb = joinTomb(remote.goalTomb, state.goalTomb);
    var mTomb = joinTomb(rt.mem, state.memberTomb);
    var iTomb = joinTomb(rt.item, state.itemTomb);

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

    var rm = unify(state.members, remote.members, mTomb);
    state.members = capMembers(rm.list.length ? rm.list : defaults().members);
    report.members = rm.added;
    if (!state.members.some(function (m) { return m.id === state.me; })) {
      state.me = state.members[0].id;
      state.meSet = false;
    }
    if (state.members.length < 2) state.meSet = true;

    /* 설정 : 단일 값은 더 최근에 저장한 쪽, 자산·고정지출은 항목별로 합친다.
       (통째로 덮어쓰면 한쪽 기기에서 추가한 자산·고정지출이 사라진다) */
    var rs = remote.settings || null;
    var localSet = state.settings;
    var nextSet = localSet;
    if (rs && (rs.updatedAt || 0) > (localSet.updatedAt || 0)) {
      nextSet = Object.assign(defaults().settings, rs);
      delete nextSet.theme;
      report.settings = true;
    }
    if (rs) {
      nextSet.assets = unify(localSet.assets, rs.assets, iTomb).list;
      nextSet.fixed = unify(localSet.fixed, rs.fixed, iTomb).list;
    }
    state.settings = nextSet;

    state.tomb = prune(tomb);
    state.goalTomb = prune(gTomb);
    state.memberTomb = prune(mTomb);
    state.itemTomb = prune(iTomb);
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
  function method(id) {
    return METHODS.find(function (m) { return m.id === id; }) || METHODS[0];
  }
  function product(id) {
    /* 아직 고르지 않았으면 '직접 입력'으로 본다 (임의 상품 조건을 끼워 넣지 않는다) */
    return PRODUCTS.find(function (p) { return p.id === id; }) || PRODUCTS[PRODUCTS.length - 1];
  }
  /* 목표 방식 : 집 마련이 아니면 대출·건물 관련 계산과 화면을 모두 끈다.
     입력해 둔 집 정보·대출 조건은 지우지 않으므로 다시 켜면 그대로 돌아온다. */
  function isHouse() { return state.settings.goalMode !== 'saving'; }
  function setGoalMode(m) {
    state.settings.goalMode = m === 'saving' ? 'saving' : 'house';
    touchSettings();
    ensureModeGoal();
  }

  /* 대출 조건 : 목표와 무관하게 전역 1벌 */
  function loanCond() {
    if (!state.settings.loan) state.settings.loan = defaultLoan();
    return state.settings.loan;
  }

  function applyProduct(id) {
    var p = product(id);
    var L = loanCond();
    L.product = id;
    if (id !== 'custom') {
      L.rate = p.rate;
      L.years = p.years;
      L.ltv = p.ltv;
      L.dsr = p.dsr;
      L.maxLoan = p.maxLoan;
    }
    touchSettings();
    return p;
  }

  /* ---- 월별 용돈 ---- */
  function monthKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }
  /* 사람별 용돈 : 기본값(budget) + 달마다 따로 정한 값(budgets[ym]). mid 생략 시 나 */
  function budgetFor(ym, mid) {
    var m = member(mid || state.me);
    var b = m.budgets || {};
    return b[ym] != null ? Number(b[ym]) : Number(m.budget) || 0;
  }
  function hasOwnBudget(ym, mid) {
    return (member(mid || state.me).budgets || {})[ym] != null;
  }
  function baseBudget(mid) { return Number(member(mid || state.me).budget) || 0; }

  /* 내 용돈만 고칠 수 있다 */
  function myMemberObj() {
    return state.members.find(function (m) { return m.id === state.me; });
  }
  function setBudget(ym, amount) {
    var m = myMemberObj();
    if (!m) return;
    m.budgets = Object.assign({}, m.budgets);
    if (amount === null) delete m.budgets[ym];
    else m.budgets[ym] = Math.max(0, Math.round(Number(amount) || 0));
    m.updatedAt = now();
    save();
  }
  /* 내 용돈을 상대에게 보여줄지 (기본 : 숨김). 내 멤버 정보에 저장 → 각자 따로 정한다 */
  function sharesBudget(mid) { return !!member(mid || state.me).shareBudget; }
  function setShareBudget(on) {
    var m = myMemberObj();
    if (!m) return;
    m.shareBudget = !!on;
    m.updatedAt = now();
    save();
  }
  function setBaseBudget(amount) {
    var m = myMemberObj();
    if (!m) return;
    m.budget = Math.max(0, Math.round(Number(amount) || 0));
    m.updatedAt = now();
    save();
  }

  /* ---- 보이는 내역 ----
     비공개(private) 내역은 작성자에게만 보인다 (화면에서만 숨김 — 동기화 파일에는 그대로 있다).
     가계부 필터 : all | me(내 개인) | other(상대 개인) | shared(공동) */
  var txFilter = 'all';
  function setTxFilter(f) { txFilter = f || 'all'; }
  function visibleTx() {
    var me = state.me;
    return state.tx.filter(function (t) { return !t.private || t.by === me; });
  }
  function viewTx() {
    var me = state.me, list = visibleTx();
    if (txFilter === 'me') return list.filter(function (t) { return !t.shared && t.by === me; });
    if (txFilter === 'other') return list.filter(function (t) { return !t.shared && t.by !== me; });
    if (txFilter === 'shared') return list.filter(function (t) { return !!t.shared; });
    return list;
  }

  /* ---- 보유 자산 ---- */
  function assetTypes() { return ASSET_TYPES; }
  function assetType(id) {
    return ASSET_TYPES.find(function (t) { return t.id === id; }) || ASSET_TYPES[ASSET_TYPES.length - 1];
  }
  function assetList() {
    return Array.isArray(state.settings.assets) ? state.settings.assets : [];
  }
  function addAsset(item) {
    if (!state.settings.assets) state.settings.assets = [];
    item.id = item.id || uid();
    item.amount = Math.round(Number(item.amount) || 0);
    item.updatedAt = now();
    state.settings.assets.push(item);
    touchSettings();
    return item;
  }
  function updateAsset(id, patch) {
    var a = assetList().find(function (x) { return x.id === id; });
    if (!a) return null;
    Object.assign(a, patch);
    a.amount = Math.round(Number(a.amount) || 0);
    a.updatedAt = now();
    touchSettings();
    return a;
  }
  function removeAsset(id) {
    state.settings.assets = assetList().filter(function (x) { return x.id !== id; });
    state.itemTomb[id] = now();
    touchSettings();
  }
  function assetTotal() {
    return assetList().reduce(function (a, x) { return a + (Number(x.amount) || 0); }, 0);
  }
  /* 유형별 합계 (큰 순) */
  function assetByType() {
    var acc = {};
    assetList().forEach(function (a) {
      acc[a.type] = (acc[a.type] || 0) + (Number(a.amount) || 0);
    });
    return Object.keys(acc).map(function (k) {
      return { type: k, meta: assetType(k), amount: acc[k] };
    }).sort(function (a, b) { return b.amount - a.amount; });
  }

  /* ---- 고정지출 ---- */
  function fixedList() {
    return Array.isArray(state.settings.fixed) ? state.settings.fixed : [];
  }
  function addFixed(item) {
    if (!state.settings.fixed) state.settings.fixed = [];
    item.id = item.id || uid();
    item.amount = Math.round(Number(item.amount) || 0);
    item.day = Math.min(28, Math.max(1, Math.round(Number(item.day) || 1)));
    item.updatedAt = now();
    state.settings.fixed.push(item);
    touchSettings();
    return item;
  }
  function updateFixed(id, patch) {
    var f = fixedList().find(function (x) { return x.id === id; });
    if (!f) return null;
    Object.assign(f, patch);
    f.amount = Math.round(Number(f.amount) || 0);
    f.day = Math.min(28, Math.max(1, Math.round(Number(f.day) || 1)));
    f.updatedAt = now();
    touchSettings();
    return f;
  }
  function removeFixed(id) {
    state.settings.fixed = fixedList().filter(function (x) { return x.id !== id; });
    state.itemTomb[id] = now();
    touchSettings();
  }
  function fixedTotal() {
    return fixedList().reduce(function (a, f) { return a + (Number(f.amount) || 0); }, 0);
  }
  /* 해당 월에 이미 기록된 고정지출 id 목록 */
  function fixedDone(ym) {
    var done = {};
    state.tx.forEach(function (t) {
      if (t.fixedId && t.date.slice(0, 7) === ym) done[t.fixedId] = t.id;
    });
    return done;
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
  /* 초기화
     scope     : 'tx'(내역만) | 'all'(전체)
     propagate : true 면 삭제 묘비를 남겨 동기화된 다른 기기에서도 지워진다.
                 false 면 묘비를 비워 이 기기에서만 지운다(다음 동기화 때 원격 데이터가 다시 내려온다). */
  function resetData(opts) {
    opts = opts || {};
    var scope = opts.scope === 'all' ? 'all' : 'tx';
    var t = now();

    if (opts.propagate) {
      state.tx.forEach(function (x) { state.tomb[x.id] = t; });
      if (scope === 'all') {
        state.goals.forEach(function (g) { state.goalTomb[g.id] = t; });
        state.members.forEach(function (m) { if (m.id !== 'm1') state.memberTomb[m.id] = t; });
        assetList().concat(fixedList()).forEach(function (x) { state.itemTomb[x.id] = t; });
      }
    } else {
      state.tomb = {};
      state.goalTomb = {};
      state.memberTomb = {};
      state.itemTomb = {};
    }

    state.tx = [];

    if (scope === 'all') {
      var d = defaults();
      state.goals = d.goals;
      state.activeGoal = null;
      state.members = d.members;
      state.me = state.members[0].id;
      state.meSet = true;
      state.settings = d.settings;
      /* 이 기기만 지울 때는 0 으로 둬서 다음 동기화 때 원격 설정이 다시 내려오게 한다 */
      state.settings.updatedAt = opts.propagate ? t : 0;
    }
    save();
    return { scope: scope, propagate: !!opts.propagate };
  }

  function reset() { return resetData({ scope: 'all', propagate: false }); }

  global.Store = {
    KEY: KEY, VERSION: VERSION, BUILD: BUILD, CATS: CATS, THEMES: THEMES, PRODUCTS: PRODUCTS, METHODS: METHODS,
    uid: uid, now: now, todayISO: todayISO,
    load: load, save: save, reset: reset, resetData: resetData,
    get state() { return state; },
    addTx: addTx, updateTx: updateTx, removeTx: removeTx,
    goalsSorted: goalsSorted, addGoal: addGoal, removeGoal: removeGoal,
    activeGoal: activeGoal, touchGoal: touchGoal, touchSettings: touchSettings,
    addMember: addMember, removeMember: removeMember, member: member, meMember: meMember,
    setMe: setMe, needsMe: needsMe, remoteMembers: remoteMembers,
    sharedPayload: sharedPayload, mergeRemote: mergeRemote, isPristine: isPristine,
    catList: catList, cat: cat, theme: theme, method: method, product: product,
    applyProduct: applyProduct, loanCond: loanCond, defaultLoan: defaultLoan,
    isHouse: isHouse, setGoalMode: setGoalMode,
    monthKey: monthKey, budgetFor: budgetFor, hasOwnBudget: hasOwnBudget, setBudget: setBudget,
    baseBudget: baseBudget, setBaseBudget: setBaseBudget,
    sharesBudget: sharesBudget, setShareBudget: setShareBudget,
    setTxFilter: setTxFilter, visibleTx: visibleTx, viewTx: viewTx,
    get txFilter() { return txFilter; },
    ASSET_TYPES: ASSET_TYPES, assetTypes: assetTypes, assetType: assetType,
    assetList: assetList, addAsset: addAsset, updateAsset: updateAsset, removeAsset: removeAsset,
    assetTotal: assetTotal, assetByType: assetByType,
    fixedList: fixedList, addFixed: addFixed, updateFixed: updateFixed, removeFixed: removeFixed,
    fixedTotal: fixedTotal, fixedDone: fixedDone,
    exportJSON: exportJSON, importJSON: importJSON
  };
})(window);
