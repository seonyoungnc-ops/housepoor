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
      'Authorization': 'Bearer ' + String(cfg().token || '').replace(/\s+/g, ''),
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
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

  /* 연결 확인 : 저장소 접근이 본질이므로 그것부터 확인하고,
     404일 때만 /user 로 계정 불일치 여부를 보조 진단한다. */
  function test() {
    var c = cfg();
    if (!c.repo || !c.token) { UI.toast('저장소와 토큰을 모두 입력해 주세요'); return; }

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
        if (res.status === 404) return whoAmI().then(function (who) {
          var owner = repo.split('/')[0];
          if (who && who.toLowerCase() !== owner.toLowerCase()) {
            throw new Error('토큰 주인은 ' + who + '인데 저장소는 ' + owner + ' 소유예요');
          }
          throw new Error('토큰에 ' + repo + ' 권한이 없어요. Repository access에 이 저장소를 추가하세요 (404)');
        });
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
      .catch(function (e) { UI.toast(e.message || '연결 실패'); });
  }

  /* 보조 진단용. 실패해도 무시한다 (fine-grained 토큰은 막혀 있을 수 있음) */
  function whoAmI() {
    return fetch(API + '/user', { headers: headers(), cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (u) { return u && u.login; })
      .catch(function () { return null; });
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
