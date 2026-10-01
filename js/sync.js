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

  function headers() {
    return {
      'Authorization': 'Bearer ' + cfg().token.trim(),
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
  }

  function msg(res) {
    if (res.status === 401) return '토큰이 올바르지 않아요 (401)';
    if (res.status === 403) return '권한이 없어요. 토큰 범위를 확인하세요 (403)';
    if (res.status === 404) return '저장소나 경로를 찾을 수 없어요 (404)';
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
      if (UI.view === 'settings') UI.render();
      else UI.render();
      if (!silent) {
        var added = report.tx + report.goals;
        UI.toast(added ? '동기화 완료 · 새 항목 ' + added + '건' : '동기화 완료');
      }
      return report;
    }).catch(function (err) {
      running = false;
      setBadge('err');
      if (!silent) UI.toast(err.message || '동기화 실패');
      return null;
    });
  }

  function test() {
    if (!configured()) { UI.toast('저장소와 토큰을 입력해 주세요'); return; }
    var c = cfg();
    fetch(API + '/repos/' + c.repo.trim(), { headers: headers(), cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error(msg(res));
        return res.json();
      })
      .then(function (j) {
        UI.toast((j.private ? '비공개' : '⚠ 공개') + ' 저장소 ' + j.full_name + ' 연결 OK');
      })
      .catch(function (e) { UI.toast(e.message || '연결 실패'); });
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
    autoT = setTimeout(function () { run(true); }, 4000);
  }

  global.Sync = {
    configured: configured, pull: pull, push: push,
    run: run, test: test, schedule: schedule, setBadge: setBadge
  };
})(window);
