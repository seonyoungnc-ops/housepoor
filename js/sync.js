/* ===== GitHub 저장소 동기화 =====
   비공개 저장소의 JSON 파일 한 개를 공용 저장소로 쓴다.
   pull → 병합 → push 순서로 동작하며, 같은 파일을 보는 기기끼리 내역이 합쳐진다. */
(function (global) {
  'use strict';

  var API = 'https://api.github.com';

  function cfg() { return Store.state.sync || {}; }
  function configured() {
    var c = cfg();
    return !!(c.repo && c.token && /^[^/\s]+\/[^/\s]+$/.test(c.repo.trim()));
  }

  function b64enc(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function b64dec(b64) {
    var bin = atob(String(b64).replace(/\s/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function url() {
    var c = cfg();
    return API + '/repos/' + c.repo.trim() + '/contents/' +
      encodeURIComponent(c.path || 'housepoor.json').replace(/%2F/g, '/');
  }

  /* GitHub 토큰은 영문·숫자·밑줄만 쓴다.
     붙여넣기 과정에서 섞이는 공백·NBSP·제로폭 문자 등은 모두 걷어낸다.
     (헤더 값에 ASCII 밖 문자가 들어가면 fetch 가 TypeError 를 던진다) */
  function cleanToken(raw) {
    return String(raw || '').replace(/[^A-Za-z0-9_]/g, '');
  }

  /* 무엇이 걸러졌는지 코드포인트로 알려준다 (진단용) */
  function tokenStripped(raw) {
    var s = String(raw || ''), out = [];
    for (var i = 0; i < s.length; i++) {
      if (!/[A-Za-z0-9_]/.test(s[i])) {
        out.push('U+' + s.charCodeAt(i).toString(16).toUpperCase());
      }
    }
    return out;
  }

  /* 유형별 표준 길이 — 다르면 복사가 잘린 것이다 */
  var TOKEN_LEN = { 'github_pat_': 93, 'ghp_': 40, 'gho_': 40, 'ghs_': 40, 'ghu_': 40 };

  function tokenPrefix(t) {
    var keys = Object.keys(TOKEN_LEN);
    for (var i = 0; i < keys.length; i++) {
      if (t.indexOf(keys[i]) === 0) return keys[i];
    }
    return null;
  }

  function tokenIssue() {
    var t = cleanToken(cfg().token);
    if (!t) return '토큰이 비어 있어요';
    var pre = tokenPrefix(t);
    if (!pre) return '토큰 형식이 아니에요. github_pat_ 으로 시작하는 값을 넣어주세요';
    var want = TOKEN_LEN[pre];
    if (t.length !== want) {
      return '토큰이 ' + t.length + '자인데 ' + want + '자여야 해요. ' +
        (t.length < want ? (want - t.length) + '자가 빠졌어요 — ' : '') +
        'GitHub에서 복사 아이콘으로 전체를 다시 복사해 주세요';
    }
    return null;
  }

  function headers() {
    return {
      'Authorization': 'Bearer ' + cleanToken(cfg().token),
      'Accept': 'application/vnd.github+json'
    };
  }

  /* fetch 자체가 실패하면 브라우저는 그냥 TypeError 를 던진다.
     원인이 네트워크 차단인지 코드 문제인지 구분해서 알려준다. */
  function errText(e) {
    var m = (e && e.message) || '';
    var isNet = (e && e.name === 'TypeError') || /load failed|failed to fetch|networkerror|network error/i.test(m);
    if (isNet) {
      return 'GitHub에 연결할 수 없어요. 네트워크가 api.github.com 을 막고 있는지 확인해 주세요';
    }
    if (!m) return '연결 실패';
    return (e.name && e.name !== 'Error' ? e.name + ': ' : '') + m;
  }

  /* 인증 없이 GitHub 에 닿는지 확인 → 네트워크 차단과 토큰 문제를 가른다 */
  function reachable() {
    return fetch(API + '/rate_limit', { cache: 'no-store' })
      .then(function (r) { return r.status > 0; })
      .catch(function () { return false; });
  }

  function msg(res) {
    if (res.status === 401) return '토큰이 만료됐거나 잘못됐어요 (401)';
    if (res.status === 403) return '권한이 없어요. 토큰 권한을 확인하세요 (403)';
    /* 비공개 저장소는 권한이 없어도 404를 준다 → 토큰 범위를 먼저 의심 */
    if (res.status === 404) return '토큰이 이 저장소에 접근할 수 없어요. [연결 확인]을 눌러보세요 (404)';
    if (res.status === 409) return '다른 기기가 먼저 저장했어요. 다시 시도해 주세요 (409)';
    if (res.status === 422) return '요청이 거절됐어요. 브랜치 이름을 확인하세요 (422)';
    return 'GitHub 오류 (' + res.status + ')';
  }

  /* 원격 파일 읽기 → {data, sha} / 파일이 없으면 data=null */
  function pull() {
    var c = cfg();
    return fetch(url() + '?ref=' + encodeURIComponent(c.branch || 'main') + '&t=' + Date.now(), {
      headers: headers(), cache: 'no-store'
    }).then(function (res) {
      if (res.status === 404) return { data: null, sha: '' };
      if (!res.ok) throw new Error(msg(res));
      return res.json().then(function (j) {
        var text = b64dec(j.content || '');
        var data = null;
        try { data = JSON.parse(text); } catch (e) { throw new Error('원격 파일이 JSON이 아니에요'); }
        return { data: data, sha: j.sha };
      });
    });
  }

  function push(sha) {
    var c = cfg();
    var body = {
      message: '하우스푸어 동기화 · ' + new Date().toLocaleString('ko-KR'),
      content: b64enc(JSON.stringify(Store.sharedPayload(), null, 2)),
      branch: c.branch || 'main'
    };
    if (sha) body.sha = sha;
    return fetch(url(), {
      method: 'PUT', headers: headers(), body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) throw new Error(msg(res));
      return res.json().then(function (j) {
        return j.content && j.content.sha;
      });
    });
  }

  var running = false;

  /* 전체 동기화 : 받아서 병합하고 다시 올린다 */
  function run(silent) {
    if (!configured()) {
      if (!silent) UI.toast('먼저 저장소와 토큰을 입력해 주세요');
      return Promise.resolve(null);
    }
    if (running) return Promise.resolve(null);
    running = true;
    setBadge('sync');

    return pull().then(function (r) {
      var report = { tx: 0, goals: 0, members: 0, settings: false };
      if (r.data) report = Store.mergeRemote(r.data);
      return push(r.sha).then(function (newSha) {
        Store.state.sync.sha = newSha || '';
        Store.state.sync.lastSync = Date.now();
        Store.save();
        return report;
      });
    }).then(function (report) {
      running = false;
      setBadge('ok');
      /* 입력 중이면 건드리지 않는다 (토큰 붙여넣기가 날아가는 것을 막는다) */
      if (!UI.isTyping()) UI.render();
      if (report && report.adopted) {
        UI.toast('저장소에서 데이터를 불러왔어요 · 내역 ' + report.tx + '건');
      } else if (!silent) {
        var added = report.tx + report.goals;
        UI.toast(added ? '동기화 완료 · 새 항목 ' + added + '건' : '동기화 완료');
      }
      return report;
    }).catch(function (err) {
      running = false;
      setBadge('err');
      if (!silent) report(errText(err));
      return null;
    });
  }

  /* 연결 확인 : 저장소 접근이 본질이므로 그것부터 확인하고,
     404일 때만 /user 로 계정 불일치 여부를 보조 진단한다. */
  function test() {
    var c = cfg();
    if (!c.repo || !c.token) { UI.toast('저장소와 토큰을 모두 입력해 주세요'); return; }
    var bad = tokenIssue();
    if (bad) { report(bad); return; }

    var repo = String(c.repo).trim()
      .replace(/^https?:\/\/github\.com\//i, '')
      .replace(/\.git$/i, '')
      .replace(/\/+$/, '');
    if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) {
      UI.toast('저장소는 "계정/저장소명" 형식이어야 해요');
      return;
    }
    if (repo !== c.repo) { Store.state.sync.repo = repo; Store.save(); }

    fetch(API + '/repos/' + repo, { headers: headers(), cache: 'no-store' })
      .then(function (res) {
        if (res.ok) return res.json();
        if (res.status === 401) {
          throw new Error('토큰 값이 잘못됐어요. 복사가 끊기지 않았는지 확인해 주세요 (401)');
        }
        if (res.status === 404) return diagnose404(repo);
        throw new Error(msg(res));
      })
      .then(function (j) {
        if (!j) return;
        if (!j.private) { UI.toast('⚠ ' + j.full_name + ' 은 공개 저장소예요! 비공개 저장소를 쓰세요'); return; }
        if (!Store.state.sync.branch) Store.state.sync.branch = j.default_branch || 'main';
        Store.save();
        return pull().then(function (r) {
          UI.toast('연결 OK · ' + j.full_name + ' (' +
            (r.data ? '기존 데이터 있음' : '첫 동기화 때 파일 생성') + ')');
          UI.render();
        });
      })
      .catch(function (e) {
        var isNet = (e && e.name === 'TypeError');
        if (!isNet) { report(errText(e)); return; }
        /* 네트워크 실패면 인증 없는 요청도 되는지 확인해서 범인을 특정 */
        reachable().then(function (ok) {
          report(ok
            ? 'GitHub 에는 닿는데 요청이 막혔어요. 보안앱·광고차단·사내 프록시를 확인해 주세요'
            : 'GitHub(api.github.com)에 연결할 수 없어요. 와이파이를 끄고 데이터로 시도하거나 다른 네트워크에서 해보세요');
        });
      });
  }

  function report(text) {
    if (global.UI) {
      UI.toast(text);
      if (UI.errors) { UI.errors.push(text); if (UI.errors.length > 10) UI.errors.shift(); }
    }
  }

  /* 404는 원인이 여러 가지다. 토큰이 실제로 무엇을 볼 수 있는지 조회해 범인을 특정한다. */
  function diagnose404(repo) {
    var owner = repo.split('/')[0];
    return whoAmI().then(function (who) {
      if (who && who.toLowerCase() !== owner.toLowerCase()) {
        throw new Error('토큰 주인은 ' + who + '인데 저장소는 ' + owner + ' 소유예요');
      }
      return visibleRepos().then(function (list) {
        if (!list) {
          throw new Error('토큰에 ' + repo + ' 권한이 없어요 (404)');
        }
        var priv = list.filter(function (r) { return r.private; });
        if (!priv.length) {
          throw new Error('토큰이 비공개 저장소를 하나도 못 봐요. Repository access를 "Only select repositories"로 바꾸고 ' +
            repo.split('/')[1] + ' 를 선택하세요');
        }
        var names = priv.map(function (r) { return r.full_name; });
        if (names.indexOf(repo) < 0) {
          throw new Error('토큰이 보는 비공개 저장소: ' + names.slice(0, 3).join(', ') +
            ' — 여기에 ' + repo + ' 를 추가하세요');
        }
        throw new Error(repo + ' 는 보이는데 접근이 막혔어요. Contents 권한을 Read and write 로 바꾸세요');
      });
    });
  }

  function whoAmI() {
    return fetch(API + '/user', { headers: headers(), cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (u) { return u && u.login; })
      .catch(function () { return null; });
  }

  function visibleRepos() {
    return fetch(API + '/user/repos?per_page=100&affiliation=owner', { headers: headers(), cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return Array.isArray(j) ? j : null; })
      .catch(function () { return null; });
  }

  /* 단계별 진단 : 어느 지점에서 막히는지 확인한다 */
  function diagnose() {
    var steps = [];
    var repo = String(cfg().repo || '').trim();
    var tok = cleanToken(cfg().token);

    var strip = tokenStripped(cfg().token);
    steps.push(['토큰 형식', tokenIssue() ? '✗ ' + tokenIssue() : '✓ ' + tok.length + '자' +
      (strip.length ? ' (걸러낸 문자 ' + strip.length + '개: ' + strip.slice(0, 6).join(' ') + ')' : '')]);

    function probe(label, url, opt) {
      return fetch(url, opt).then(function (r) {
        var ok = r.status >= 200 && r.status < 300;
        var note = ok ? '' : ' — ' + statusHint(r.status);
        steps.push([label, (ok ? '✓' : '✗') + ' HTTP ' + r.status + note]);
        return ok;
      }).catch(function (e) {
        steps.push([label, '✗ 요청 실패 (' + (e && e.name) + ': ' + (e && e.message) + ')']);
        return false;
      });
    }

    function statusHint(code) {
      if (code === 401) return '토큰이 유효하지 않음';
      if (code === 403) return '권한 부족 또는 요청 제한';
      if (code === 404) return '토큰이 이 저장소를 볼 수 없음';
      return '오류';
    }

    return probe('1. GitHub 도달', API + '/rate_limit', { cache: 'no-store' })
      .then(function () {
        /* 여기서 HTTP 응답이 오면 CORS·사전요청은 통과한 것이다 */
        return probe('2. 토큰 확인', API + '/user', { cache: 'no-store', headers: headers() });
      })
      .then(function () {
        if (!repo) {
          steps.push(['3. 저장소 접근', '- 저장소를 먼저 입력하세요']);
          return;
        }
        return probe('3. 저장소 접근', API + '/repos/' + repo, { cache: 'no-store', headers: headers() });
      })
      .then(function () { return steps; });
  }

  function setBadge(stateName) {
    var el = document.getElementById('syncBtn');
    if (!el) return;
    el.dataset.state = stateName;
    el.textContent = stateName === 'sync' ? '⟳' : (stateName === 'err' ? '!' : '⇅');
  }

  var autoT = null;
  function schedule() {
    if (!configured() || !cfg().auto) return;
    clearTimeout(autoT);
    autoT = setTimeout(function () {
      /* 아직 입력 중이면 더 기다린다 */
      if (UI.isTyping()) { schedule(); return; }
      run(true);
    }, 4000);
  }

  global.Sync = {
    configured: configured, pull: pull, push: push,
    run: run, test: test, diagnose: diagnose, tokenIssue: tokenIssue,
    cleanToken: cleanToken, tokenStripped: tokenStripped,
    schedule: schedule, setBadge: setBadge
  };
})(window);
