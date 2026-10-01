/* ===== 포맷 & 계산 ===== */
(function (global) {
  'use strict';

  var DAY = 86400000;
  var MONTH_DAYS = 30.4375;

  function fmt(n) {
    n = Math.round(Number(n) || 0);
    return n.toLocaleString('ko-KR');
  }
  function won(n) { return fmt(n) + '원'; }

  /* 6억 2,300만원 형태 */
  function kor(n) {
    n = Math.round(Number(n) || 0);
    var neg = n < 0; n = Math.abs(n);
    if (n === 0) return '0원';
    var eok = Math.floor(n / 100000000);
    var man = Math.floor((n % 100000000) / 10000);
    var rest = n % 10000;
    var s = '';
    if (eok) s += fmt(eok) + '억';
    if (man) s += (s ? ' ' : '') + fmt(man) + '만';
    if (!eok && !man) s = fmt(rest);
    else if (rest && !eok) s += ' ' + fmt(rest);
    return (neg ? '-' : '') + s + '원';
  }

  function parseDate(iso) {
    var p = String(iso).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  function iso(d) { return Store.todayISO(d); }
  function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
  function diffDays(a, b) {
    return Math.round((parseDate(b) - parseDate(a)) / DAY);
  }
  function weekStart(d) {
    var x = new Date(d.getTime());
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - x.getDay()); /* 일요일 시작 */
    return x;
  }

  /* 기간 합계 : from~to (ISO, 포함) */
  function sums(from, to, list) {
    var tx = list || Store.viewTx();
    var r = { expense: 0, income: 0, save: 0, count: 0 };
    for (var i = 0; i < tx.length; i++) {
      var t = tx[i];
      if (from && t.date < from) continue;
      if (to && t.date > to) continue;
      if (r[t.type] === undefined) continue;
      r[t.type] += t.amount;
      r.count++;
    }
    r.net = r.income - r.expense;
    r.gain = gainOf(r);
    return r;
  }

  /* 모은 돈 증가분 = 저축 + 남은 현금(양수일 때) : 이중 계산 방지 */
  function gainOf(r) {
    return r.save + Math.max(0, r.income - r.expense - r.save);
  }

  function allSums() { return sums(null, null); }

  /* 현재 자기자본(모은 돈)
     both   : 보유 자산 + 기록으로 모은 순저축 (기본)
     assets : 보유 자산 합계만 (자산 금액을 직접 최신화하는 경우) */
  function have() {
    var base = Store.assetTotal();
    if (Store.state.settings.haveMode === 'assets') return Math.max(0, base);
    return Math.max(0, base + allSums().gain);
  }

  function firstTxDate() {
    var tx = Store.viewTx();
    if (!tx.length) return null;
    return tx[tx.length - 1].date;
  }

  /* 월 저축 속도 */
  function pace() {
    var st = Store.state.settings;
    if (Number(st.manualSaving) > 0) {
      return { monthly: Number(st.manualSaving), basis: '직접 입력한 월 저축액' };
    }
    var today = new Date();
    var toI = iso(today);
    var fromI = iso(addDays(today, -89));
    var w = sums(fromI, toI);
    if (!w.count) return { monthly: 0, basis: '최근 3개월 기록 없음' };

    var first = firstTxDate();
    var spanFrom = first && first > fromI ? first : fromI;
    var span = Math.max(30, Math.min(90, diffDays(spanFrom, toI) + 1));
    var monthly = w.gain / span * MONTH_DAYS;
    var basis = w.save > 0 && w.income === 0
      ? '최근 저축 기록 평균'
      : '최근 ' + (span >= 85 ? '3개월' : span + '일') + ' 평균';
    return { monthly: Math.max(0, Math.round(monthly)), basis: basis };
  }

  /* 대출 한도 계산 : LTV · DSR · 상품 한도 중 가장 낮은 값 */
  function loan(goal) {
    var st = Store.state.settings;
    var L = Store.loanCond();
    var prod = Store.product(L.product);
    var price = Number(goal && goal.price) || 0;
    var i = (Number(L.rate) || 0) / 100 / 12;
    var n = Math.max(1, Math.round((Number(L.years) || 0) * 12));
    var f;
    if (i > 0) {
      var q = Math.pow(1 + i, n);
      f = i * q / (q - 1);
    } else {
      f = 1 / n;
    }

    var caps = [{ k: 'LTV ' + (Number(L.ltv) || 0) + '%', v: price * (Number(L.ltv) || 0) / 100 }];
    var dsrPct = Number(L.dsr) || 0;
    var dsrLimit = 0;
    if (dsrPct > 0) {
      var monthlyCap = (Number(st.annualIncome) || 0) * dsrPct / 100 / 12;
      dsrLimit = f > 0 ? monthlyCap / f : 0;
      caps.push({ k: 'DSR ' + dsrPct + '%', v: dsrLimit });
    }
    var maxLoan = Number(L.maxLoan) || 0;
    if (maxLoan > 0) caps.push({ k: '상품 한도', v: maxLoan });

    var best = caps[0];
    caps.forEach(function (c) { if (c.v < best.v) best = c; });
    var amount = Math.max(0, best.v);
    caps.forEach(function (c) { c.active = (c === best); c.v = Math.round(c.v); });

    var totalCost = price * (1 + (Number(L.extraRate) || 0) / 100);
    var needCash = Math.max(0, totalCost - amount);

    /* 자격 요건 체크 */
    var warnings = [];
    if (prod.priceCap > 0 && price > prod.priceCap) {
      warnings.push(prod.name + '은 주택가격 ' + kor(prod.priceCap) + ' 이하만 가능해요 (현재 ' + kor(price) + ')');
    }
    if (prod.incomeCap > 0 && (Number(st.annualIncome) || 0) > prod.incomeCap) {
      warnings.push(prod.name + '은 연소득 ' + kor(prod.incomeCap) + ' 이하만 가능해요');
    }

    return {
      price: price,
      product: prod,
      cond: L,
      amount: Math.round(amount),
      monthlyPayment: Math.round(amount * f),
      ltvLimit: Math.round(price * (Number(L.ltv) || 0) / 100),
      dsrLimit: Math.round(dsrLimit),
      extra: Math.round(totalCost - price),
      totalCost: Math.round(totalCost),
      needCash: Math.round(needCash),
      capBy: best.k,
      caps: caps,
      factor: f,
      warnings: warnings
    };
  }

  /* 남은 금액과 월 저축액으로 달성 시점을 계산 */
  function etaFor(short, monthly) {
    if (short <= 0) return { done: true };
    if (!(monthly > 0)) return null;
    var months = short / monthly;
    if (months > 600) return { done: false, tooLong: true, monthsR: Math.ceil(months) };
    var days = Math.ceil(months * MONTH_DAYS);
    return {
      done: false,
      months: months,
      monthsR: Math.ceil(months),
      weeks: Math.ceil(days / 7),
      days: days,
      date: iso(addDays(new Date(), days))
    };
  }

  /* 목표별 진행 상황 */
  function progress(goal) {
    var L = loan(goal);
    var h = have();
    /* 목표 금액이 없으면 진행률을 계산하지 않는다 (0원을 달성으로 오인하지 않도록) */
    if (!L.price) {
      return { goal: goal, loan: L, have: h, short: 0, ratio: 0, pace: pace(), eta: null, noPrice: true };
    }
    var short = Math.max(0, L.needCash - h);
    var p = L.needCash > 0 ? Math.min(1, h / L.needCash) : 1;
    var pc = pace();
    var e = etaFor(short, pc.monthly);
    return {
      goal: goal, loan: L, have: h, short: short,
      ratio: p, pace: pc, eta: e
    };
  }

  /* 달력용 : 해당 월의 날짜별 합계 */
  function monthMap(y, m) {
    var pre = y + '-' + String(m + 1).padStart(2, '0');
    var map = {};
    var tx = Store.viewTx();
    for (var i = 0; i < tx.length; i++) {
      var t = tx[i];
      if (t.date.slice(0, 7) !== pre) continue;
      var k = t.date;
      if (!map[k]) map[k] = { expense: 0, income: 0, save: 0, items: [] };
      if (map[k][t.type] !== undefined) map[k][t.type] += t.amount;
      map[k].items.push(t);
    }
    return map;
  }

  function byDate(dateISO) {
    return Store.viewTx().filter(function (t) { return t.date === dateISO; });
  }

  /* 멤버별 개인 지출 합계 + 공동 지출 (둘이 쓸 때만) */
  var SHARED_MEMBER = { id: 'shared', name: '공동', color: '#c2bfbb' };
  function byMember(from, to) {
    if (Store.state.members.length < 2) return [];
    var tx = Store.viewTx(), acc = {}, shared = 0;
    for (var i = 0; i < tx.length; i++) {
      var t = tx[i];
      if (t.type !== 'expense') continue;
      if (from && t.date < from) continue;
      if (to && t.date > to) continue;
      if (t.shared) { shared += t.amount; continue; }
      var k = t.by || 'm1';
      acc[k] = (acc[k] || 0) + t.amount;
    }
    var out = Store.state.members.map(function (m) {
      return { member: m, amount: acc[m.id] || 0 };
    });
    if (shared > 0) out.push({ member: SHARED_MEMBER, amount: shared });
    return out;
  }

  /* 해당 연도의 월별 합계 */
  function yearMonths(year) {
    var out = [];
    for (var m = 0; m < 12; m++) {
      var a = new Date(year, m, 1), b = new Date(year, m + 1, 0);
      out.push({ month: m + 1, key: iso(a), s: sums(iso(a), iso(b)) });
    }
    return out;
  }

  /* 결제수단별 지출 합계 (현금·신용·체크 모두 용돈에서 차감) */
  function byMethod(from, to) {
    var tx = Store.viewTx(), acc = {};
    for (var i = 0; i < tx.length; i++) {
      var t = tx[i];
      if (t.type !== 'expense') continue;
      if (from && t.date < from) continue;
      if (to && t.date > to) continue;
      acc[t.method || 'cash'] = (acc[t.method || 'cash'] || 0) + t.amount;
    }
    var list = Store.METHODS || [{ id: 'cash', name: '현금', short: '현금', spr: 'coin' }];
    return list.map(function (m) {
      return { method: m, amount: acc[m.id] || 0 };
    });
  }

  /* 해당 월 "내" 용돈 현황 (월별 지정값 > 기본값)
     내 개인 지출만 차감한다. 공동 지출은 누구 용돈에서도 빠지지 않는다. */
  function budget(from, to, ym) {
    ym = ym || String(from || '').slice(0, 7);
    var me = Store.state.me;
    var limit = Store.budgetFor(ym);
    var vis = Store.visibleTx();
    var used = sums(from, to, vis.filter(function (t) { return t.by === me && !t.shared; })).expense;
    var sharedUsed = sums(from, to, vis.filter(function (t) { return !!t.shared; })).expense;
    var fixedPlan = Store.fixedTotal();
    var done = Store.fixedDone(ym);
    var fixedLeft = Store.fixedList().reduce(function (a, f) {
      return a + (done[f.id] ? 0 : (Number(f.amount) || 0));
    }, 0);
    return {
      ym: ym,
      limit: limit,
      custom: Store.hasOwnBudget(ym),
      used: used,
      sharedUsed: sharedUsed,
      left: limit - used,
      ratio: limit > 0 ? used / limit : 0,
      byMethod: byMethod(from, to),
      fixedPlan: fixedPlan,
      fixedLeft: fixedLeft,
      leftAfterFixed: limit - used - fixedLeft
    };
  }

  /* 카테고리별 합계 */
  function byCategory(type, from, to) {
    var tx = Store.viewTx(), acc = {};
    for (var i = 0; i < tx.length; i++) {
      var t = tx[i];
      if (t.type !== type) continue;
      if (from && t.date < from) continue;
      if (to && t.date > to) continue;
      acc[t.cat] = (acc[t.cat] || 0) + t.amount;
    }
    return Object.keys(acc).map(function (k) {
      return { cat: k, amount: acc[k], meta: Store.cat(type, k) };
    }).sort(function (a, b) { return b.amount - a.amount; });
  }

  /* 무지출 데이 수 (해당 월, 오늘까지) */
  function noSpendDays(y, m) {
    var map = monthMap(y, m);
    var last = new Date(y, m + 1, 0).getDate();
    var todayI = Store.todayISO();
    var cnt = 0, total = 0;
    for (var d = 1; d <= last; d++) {
      var k = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      if (k > todayI) break;
      total++;
      if (!map[k] || map[k].expense === 0) cnt++;
    }
    return { count: cnt, total: total };
  }

  /* 연속 무지출 기록 (오늘 기준 역순) */
  function noSpendStreak() {
    var first = firstTxDate();
    if (!first) return 0;
    var d = new Date(), streak = 0;
    for (var i = 0; i < 400; i++) {
      var k = iso(addDays(d, -i));
      if (k < first) break;
      var list = byDate(k);
      var exp = list.reduce(function (s, t) { return s + (t.type === 'expense' ? t.amount : 0); }, 0);
      if (i === 0 && exp > 0) return 0;
      if (exp > 0) break;
      streak++;
    }
    return streak;
  }

  /* 기간 시리즈 (막대 그래프용) */
  function series(mode, count) {
    var out = [], today = new Date(), i;
    if (mode === 'day') {
      for (i = count - 1; i >= 0; i--) {
        var d = addDays(today, -i);
        var k = iso(d);
        var s = sums(k, k);
        out.push({ label: (d.getMonth() + 1) + '/' + d.getDate(), key: k, s: s });
      }
    } else if (mode === 'week') {
      var ws = weekStart(today);
      for (i = count - 1; i >= 0; i--) {
        var a = addDays(ws, -7 * i);
        var b = addDays(a, 6);
        out.push({
          label: (a.getMonth() + 1) + '/' + a.getDate(),
          key: iso(a), s: sums(iso(a), iso(b))
        });
      }
    } else {
      for (i = count - 1; i >= 0; i--) {
        var dt = new Date(today.getFullYear(), today.getMonth() - i, 1);
        var end = new Date(dt.getFullYear(), dt.getMonth() + 1, 0);
        out.push({
          label: (dt.getMonth() + 1) + '월',
          key: iso(dt), s: sums(iso(dt), iso(end))
        });
      }
    }
    return out;
  }

  global.Calc = {
    DAY: DAY, MONTH_DAYS: MONTH_DAYS,
    fmt: fmt, won: won, kor: kor,
    iso: iso, parseDate: parseDate, addDays: addDays, diffDays: diffDays, weekStart: weekStart,
    sums: sums, allSums: allSums, have: have, pace: pace, etaFor: etaFor,
    loan: loan, progress: progress,
    monthMap: monthMap, byDate: byDate, byCategory: byCategory, byMember: byMember,
    byMethod: byMethod, budget: budget, yearMonths: yearMonths,
    noSpendDays: noSpendDays, noSpendStreak: noSpendStreak, series: series
  };
})(window);
