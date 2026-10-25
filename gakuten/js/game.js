/* =========================================================
   楽典ラボ：🎮 ゲーム（⏱ タイムアタック ／ 🏆 クラス対戦）
   クラス対戦は Firebase Realtime Database の REST ＋ ストリーム（論理表現ラボ・数学Aラボと同じしくみ）
   rooms/g{code} = { cfg: { m, us, t }, state: lobby|play|end, round, seed, startAt, host, players: { pid: { n, s, c, k, w, r, d, b } } }
   ========================================================= */
(function () {
  'use strict';
  var GK = window.GK, M = GK.M, $ = GK.$, $$ = GK.$$, esc = GK.esc, S = GK.S, RW = GK.RW;
  var V = GK.view, api = GK.api;
  var ROOM = function (c) { return 'rooms/g' + c; };
  var OFF = 0; // サーバーとの 時計のずれ
  var now = function () { return Date.now() + OFF; };

  /* ---------- 範囲 ---------- */
  var GR = [['all', '全範囲', null], ['a', '音名・リズム', ['u01', 'u02', 'u03', 'u04']], ['b', '音程・音階', ['u05', 'u06', 'u07', 'u08']], ['c', '調・和音', ['u09', 'u10', 'u11', 'u12']], ['d', '楽語・記号', ['u13']], ['units', '単元をえらぶ', null]];
  var unitsOf = function (cfg) {
    if (cfg.m === 'units') { var us = (cfg.us || '').split(',').filter(function (u) { return GK.UNIT[u]; }); if (us.length) return us; }
    var g = GR.filter(function (x) { return x[0] === cfg.m; })[0];
    return g && g[2] ? g[2] : GK.UNITS.map(function (u) { return u.id; });
  };
  var rangeName = function (cfg) {
    if (cfg.m === 'units') { var us = unitsOf(cfg); return us.length > 3 ? us.length + ' 単元' : us.map(function (u) { return GK.UNIT[u].title; }).join('・'); }
    return (GR.filter(function (x) { return x[0] === cfg.m; })[0] || GR[0])[1];
  };
  /* ---------- ルール（数学Aラボと同じ） ---------- */
  var BONUS = { 1: 6, 2: 12, 3: 20 }, PENALTY = 2, COMBO_BONUS = 3;
  var bonusSec = function (st, ok) { return Math.round(BONUS[st] * Math.max(0.2, Math.pow(0.96, ok)) * 10) / 10; };
  var mult = function (k) { return k >= 40 ? 3 : k >= 30 ? 2.5 : k >= 20 ? 2 : k >= 10 ? 1.5 : 1; };
  var RULER = [[0, 'ウォーミングアップ中'], [5, '小テスト 1 回分'], [10, '楽典ドリル 1 ページ分'], [20, '定期テストの楽典 1 回分'], [30, '楽典検定 1 回分'], [45, '音大入試の楽典 1 回分'], [60, '楽典の問題集 1 冊分']];
  var ruler = function (n) { var r = RULER[0][1]; RULER.forEach(function (x) { if (n >= x[0]) r = x[1]; }); return r; };
  function makeQs(cfg, seed) {
    var R = GK.rng(seed);
    return GK.Q.set(unitsOf(cfg), 120, R, { noEar: true, stFn: function (i) { return i < 8 ? 1 : i < 22 ? 2 : 3; } });
  }

  /* =========================================================
     ゲームのトップ
     ========================================================= */
  var TA = GK.store.get('taSel', { m: 'all', us: '', t: 90 });
  GK.route(/^game$/, function () { top(); });
  GK.route(/^join=(\d{4})$/, function (m) { top(m[1]); });
  function top(code) {
    var lv = GK.levelOf(RW.coins);
    V.innerHTML = '<div class="gcards">' +
      '<section class="panel gcard"><h3>⏱ タイムアタック</h3><p class="note">時間がなくなるまで 何問とけるか。正解すると 時間がもどる（★が多い問題ほど たくさん）。続けて正解すると コンボで 点数アップ。</p>' +
      '<div class="frow"><span>範囲</span><div class="seg">' + GR.map(function (g) { return '<button type="button" data-tm="' + g[0] + '" aria-pressed="' + (TA.m === g[0]) + '">' + g[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="frow" id="tus"' + (TA.m === 'units' ? '' : ' hidden') + '><div class="upick" style="width:100%">' + GK.UNITS.map(function (u) { return '<button type="button" data-tu="' + u.id + '" aria-pressed="' + (TA.us.split(',').indexOf(u.id) >= 0) + '"><i>' + u.no + '</i>' + esc(u.title) + '</button>'; }).join('') + '</div></div>' +
      '<div class="frow"><span>持ち時間</span><div class="seg">' + [60, 90, 120, 180].map(function (t) { return '<button type="button" data-tt="' + t + '" aria-pressed="' + (TA.t === t) + '">' + t + ' 秒</button>'; }).join('') + '</div></div>' +
      '<div class="frow" style="margin-top:auto"><button type="button" class="btn main big" id="taGo">▶ スタート</button><span class="note">ベスト <b style="font-family:var(--font-en);font-size:20px;color:var(--ink)">' + GK.fmtN(RW.best[TA.m] || 0) + '</b> 点</span></div></section>' +
      '<section class="panel gcard"><h3>🏆 クラス対戦</h3><p class="note">先生の合図で 全員いっせいにスタート。先生の画面で ランキングが リアルタイムに動きます。</p>' +
      '<input class="in" id="jcode" inputmode="numeric" maxlength="4" placeholder="部屋番号" value="' + esc(code || '') + '">' +
      '<input class="in" id="jnick" maxlength="12" placeholder="ニックネーム" value="' + esc(S.nick || '') + '">' +
      '<div class="frow"><button type="button" class="btn main" id="jGo">参加する ▶</button></div>' +
      '<div class="frow" style="margin-top:auto;border-top:1px dashed var(--line);padding-top:10px"><span>先生</span><button type="button" class="btn" id="mkRoom">🏫 部屋をつくる</button><button type="button" class="btn ghost" id="rwB">🏅 ' + lv.name + '・バッジ ' + Object.keys(RW.badges).length + '/' + GK.BADGES.length + '</button></div></section></div>';
    V.onclick = function (e) {
      var b = e.target.closest('[data-tm],[data-tt],[data-tu],#taGo,#jGo,#mkRoom,#rwB'); if (!b) return;
      if (b.dataset.tm) { TA.m = b.dataset.tm; $$('[data-tm]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); $('#tus').hidden = TA.m !== 'units'; }
      if (b.dataset.tt) { TA.t = +b.dataset.tt; $$('[data-tt]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); }
      if (b.dataset.tu) { var us = TA.us ? TA.us.split(',') : [], i = us.indexOf(b.dataset.tu); if (i >= 0) us.splice(i, 1); else us.push(b.dataset.tu); TA.us = us.join(','); b.setAttribute('aria-pressed', i < 0); }
      GK.store.set('taSel', TA);
      if (b.id === 'taGo') { if (TA.m === 'units' && !TA.us) { GK.toast('単元をえらんでください'); return; } GK.go('#ta'); }
      if (b.id === 'jGo') join($('#jcode').value.trim(), $('#jnick').value.trim());
      if (b.id === 'mkRoom') makeRoom();
      if (b.id === 'rwB') GK.openDlg('<h3>🏅 段位・バッジ<button type="button" class="btn ghost sm x" data-d="close">とじる</button></h3>' + GK.rewardsHTML());
    };
    if (code) setTimeout(function () { $('#jnick') && $('#jnick').focus(); }, 50);
  }

  /* =========================================================
     ゲーム本体（ひとり・対戦で共通）
     ========================================================= */
  var G = null;
  function newGame(box, cfg, seed, mode, startAt, hooks) {
    stopGame();
    G = { cfg: cfg, qs: makeQs(cfg, seed), i: 0, mode: mode, startAt: startAt, score: 0, combo: 0, maxCombo: 0, ok: 0, ng: 0, res: [], over: false, hooks: hooks || {}, box: box,
      left: cfg.t * 1000, last: startAt };
    box.innerHTML = '<section class="panel qz" style="position:relative"><div class="ta-top"><span class="tm" id="gtm"></span><div class="tbar" id="gbar"><i></i></div><span class="cb" id="gcb"></span><span class="sc" id="gsc">0<small> 点</small></span>' + (mode === 'battle' ? '<span class="rank" id="grk">−</span>' : '') + '</div><div id="gq" style="flex:1;min-height:0;display:flex;flex-direction:column"></div></section>';
    G.timer = setInterval(tick, 100);
    GK.quizKeys(function () { return G && G.qel; });
    tick();
  }
  function stopGame() { if (G) { clearInterval(G.timer); G.dead = true; } }
  GK.onLeave(function () { stopGame(); G = null; });
  function timeLeft() {
    if (G.mode === 'battle') return Math.max(0, G.startAt + G.cfg.t * 1000 - now());
    return Math.max(0, G.left - Math.max(0, now() - G.last));
  }
  function tick() {
    if (!G || G.dead) return;
    var t = now(), gq = $('#gq', G.box);
    if (!gq) { stopGame(); return; }
    if (t < G.startAt) {
      var n = Math.ceil((G.startAt - t) / 1000);
      if (G.cd !== n) { G.cd = n; gq.innerHTML = '<div class="count">' + n + '</div>'; GK.fx('count'); }
      return;
    }
    if (!G.started) { G.started = true; G.last = now(); GK.fx('go'); showQ(); }
    var left = timeLeft(), max = G.mode === 'battle' ? G.cfg.t * 1000 : Math.max(G.cfg.t * 1000, 1);
    var bar = $('#gbar', G.box); if (bar) { bar.firstChild.style.width = Math.min(100, left / max * 100) + '%'; bar.classList.toggle('low', left < 10000); }
    var tm = $('#gtm', G.box); if (tm) tm.textContent = Math.ceil(left / 1000) + '秒';
    if (left <= 0 && !G.over) { G.over = true; clearInterval(G.timer); G.dur = (now() - G.startAt) / 1000; GK.fx('whistle'); G.hooks.end && G.hooks.end(G); }
  }
  function showQ() {
    var gq = $('#gq', G.box), q = G.qs[G.i % G.qs.length];
    gq.innerHTML = '<div class="qz" style="padding:6px 0 0"></div>';
    G.qel = gq.firstChild;
    G.qstart = now();
    GK.drawQ(G.qel, q, {
      top: '<span>第 ' + (G.i + 1) + ' 問</span>', noFb: true,
      onPick: function (k, ok) {
        if (G.over) return;
        G.res.push({ q: q, pick: k, ok: ok });
        var pop = '';
        if (ok) {
          G.combo++; G.ok++; G.maxCombo = Math.max(G.maxCombo, G.combo);
          var pts = Math.round(q.st * 30 * mult(G.combo));
          G.score += pts; pop = '+' + pts;
          if (G.mode !== 'battle') {
            var b = bonusSec(q.st, G.ok - 1) + (G.combo % 5 === 0 ? COMBO_BONUS : 0);
            G.left = Math.min(Math.max(G.cfg.t * 1000, timeLeft()), timeLeft() + b * 1000); G.last = now();
            pop += '　+' + b + '秒';
          }
          if (G.combo % 10 === 0) { GK.fx('combo'); }
          G.qel.classList.add('flash-ok');
        } else {
          G.combo = 0; G.ng++; pop = '✕';
          if (G.mode !== 'battle') { G.left = timeLeft() - PENALTY * 1000; G.last = now(); pop += '　−' + PENALTY + '秒'; }
          G.qel.classList.add('flash-ng');
        }
        popup(pop, !ok);
        $('#gsc', G.box).innerHTML = GK.fmtN(G.score) + '<small> 点</small>';
        $('#gcb', G.box).textContent = G.combo >= 3 ? '🔥 ' + G.combo + ' コンボ' + (mult(G.combo) > 1 ? ' ×' + mult(G.combo) : '') : '';
        G.hooks.answer && G.hooks.answer(G);
        setTimeout(function () { if (G && !G.over && !G.dead) { G.i++; showQ(); } }, ok ? 380 : 1100);
      }
    });
  }
  function popup(t, ng) {
    var p = document.createElement('div'); p.className = 'pop' + (ng ? ' ng' : ''); p.textContent = t;
    var sc = $('#gsc', G.box); if (!sc) return;
    p.style.right = '16px'; p.style.top = '44px';
    G.box.firstChild.appendChild(p); setTimeout(function () { p.remove(); }, 800);
  }

  /* ---------- ⏱ タイムアタック ---------- */
  GK.route(/^ta$/, function () {
    var cfg = { m: TA.m, us: TA.us, t: TA.t };
    newGame(V, cfg, Math.floor(Math.random() * 1e9), 'solo', now() + 3000, { end: soloEnd });
  });
  function soloEnd(g) {
    var best = RW.best[g.cfg.m] || 0, nb = g.score > best;
    if (nb) RW.best[g.cfg.m] = g.score;
    RW.taBest = Math.max(RW.taBest, g.score); RW.maxCombo = Math.max(RW.maxCombo, g.maxCombo);
    GK.rwSave(); GK.earn(Math.floor(g.score / 20)); GK.checkBadges();
    if (nb && g.score > 0) GK.confetti(60);
    var mm = Math.floor(g.dur / 60), ss = Math.round(g.dur % 60);
    V.innerHTML = '<section class="panel res"><p class="note">' + esc(rangeName(g.cfg)) + '・⏱ ' + (mm ? mm + ' 分 ' : '') + ss + ' 秒 つづいた</p><div class="big">' + GK.fmtN(g.score) + '<small> 点</small></div>' +
      '<p class="msg">' + (nb ? '🎉 ベスト更新！' : 'ベスト ' + GK.fmtN(best) + ' 点') + '　正解 ' + g.ok + ' 問・最大 ' + g.maxCombo + ' コンボ</p><p>📏 <b>' + g.ok + ' 問正解 ≒ ' + ruler(g.ok) + '</b></p>' +
      '<div class="acts">' + (g.res.length ? '<button type="button" class="btn" id="rv">📖 ' + (g.ng ? 'まちがえた ' + g.ng + ' 問の解説' : '解説を見る') + '</button>' : '') + '<button type="button" class="btn" id="brag">📣 自慢する</button><button type="button" class="btn main" data-go="#ta">▶ もう一度</button><button type="button" class="btn ghost" data-go="#game">◀ ゲームのトップ</button></div></section>';
    $('#brag').onclick = function () { GK.share('🎼 楽典ラボ タイムアタック（' + rangeName(g.cfg) + '）で ' + GK.fmtN(g.score) + ' 点！ ' + g.ok + ' 問正解・最大 ' + g.maxCombo + ' コンボ（' + ruler(g.ok) + '）\n' + location.origin + location.pathname); };
    var rv = $('#rv'); if (rv) rv.onclick = function () { GK.review(V, g.res, function () { GK.go('#game'); }); };
  }

  /* =========================================================
     🏆 クラス対戦：つなぐ道具
     ========================================================= */
  function pid() { if (!S.pid) { S.pid = 'p' + Math.random().toString(36).slice(2, 10); GK.saveS(); } return S.pid; }
  function listen(path, cb) {
    var tree = null, es = null, poll = null, closed = false;
    function setAt(p, val) {
      var keys = p.split('/').filter(Boolean);
      if (!keys.length) { tree = val; return; }
      if (tree === null || typeof tree !== 'object') tree = {};
      var o = tree;
      for (var i = 0; i < keys.length - 1; i++) { if (o[keys[i]] == null || typeof o[keys[i]] !== 'object') o[keys[i]] = {}; o = o[keys[i]]; }
      if (val === null) delete o[keys[keys.length - 1]]; else o[keys[keys.length - 1]] = val;
    }
    function startPoll() {
      if (poll || closed) return;
      poll = setInterval(function () { api('GET', path).then(function (v) { tree = v; cb(tree); }, function () { }); }, 1500);
    }
    try {
      es = new EventSource(GK.dbBase() + '/' + path + '.json');
      es.addEventListener('put', function (e) { var d = JSON.parse(e.data); setAt(d.path, d.data); cb(tree); });
      es.addEventListener('patch', function (e) { var d = JSON.parse(e.data), p = d.path.replace(/\/$/, ''); Object.keys(d.data || {}).forEach(function (k) { setAt(p + '/' + k, d.data[k]); }); cb(tree); });
      es.onerror = function () { if (es.readyState === 2) startPoll(); };
    } catch (e) { startPoll(); }
    return function () { closed = true; if (es) es.close(); clearInterval(poll); };
  }
  function syncClock(code) {
    var t0 = Date.now(), p = ROOM(code) + '/clock/' + pid();
    return api('PUT', p, { '.sv': 'timestamp' }).then(function (ts) {
      var t1 = Date.now();
      if (typeof ts === 'number') OFF = ts - (t0 + t1) / 2;
      api('DELETE', p).catch(function () { });
    }, function () { });
  }
  function joinUrl(code) {
    var u = location.origin + location.pathname + '#join=' + code;
    return u;
  }
  function playersOf(room, round) {
    var ps = room && room.players || {};
    return Object.keys(ps).map(function (k) { var p = ps[k]; p.id = k; return p; })
      .filter(function (p) { return p && p.n && (round == null || p.r === round); })
      .sort(function (a, b) { return round == null ? (b.b || 0) - (a.b || 0) : (b.s || 0) - (a.s || 0) || (b.c || 0) - (a.c || 0); });
  }
  var qrLib = null;
  function drawQR(el, url) {
    var put = function () { if (!el.isConnected || !window.qrcode) return; var q = window.qrcode(0, 'M'); q.addData(url); q.make(); el.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); };
    if (window.qrcode) { put(); return; }
    if (!qrLib) { qrLib = document.createElement('script'); qrLib.src = 'js/vendor/qrcode.js'; document.head.appendChild(qrLib); } // qrcode-generator（MIT）
    qrLib.addEventListener('load', put);
  }

  /* ---------- 先生：部屋 ---------- */
  function makeRoom() {
    var cfg = { m: TA.m === 'units' && !TA.us ? 'all' : TA.m, us: TA.us || '', t: 90 };
    var tryOne = function (n) {
      var code = String(1000 + Math.floor(Math.random() * 9000));
      return api('GET', ROOM(code)).then(function (v) {
        if (v && n < 6) return tryOne(n + 1);
        return api('PUT', ROOM(code), { cfg: cfg, state: 'lobby', round: 0, seed: 0, startAt: 0, host: pid(), created: { '.sv': 'timestamp' } })
          .then(function () { GK.go('#host/' + code); });
      });
    };
    tryOne(0).catch(function (e) { GK.toast('部屋をつくれませんでした（' + e.message + '）。⚙ 設定を確認してください'); });
  }
  var H = null;
  GK.route(/^host\/(\d{4})$/, function (m) {
    var code = m[1];
    H = { code: code, room: null, tab: 'now', ending: false };
    V.innerHTML = '<div class="host"><aside class="panel hostL" id="hostL"></aside><section class="panel board" id="board"><div class="count" style="font-size:30px">つないでいます…</div></section></div>';
    syncClock(code).then(function () {
      if (!H || H.code !== code) return;
      H.stop = listen(ROOM(code), function (room) {
        if (!H) return;
        if (!room) { GK.toast('この部屋は閉じられました'); GK.go('#game'); return; }
        var prev = H.st; H.room = room; H.st = room.state + '|' + room.round;
        if (prev && prev === 'play|' + room.round && room.state === 'end') setTimeout(function () { if (H && H.room) podium(H.room); }, 300);
        drawHostL(); drawBoard();
      });
      H.timer = setInterval(function () {
        if (!H || !H.room) return;
        var r = H.room;
        if (r.state === 'play' && now() > r.startAt + r.cfg.t * 1000 + 2500 && !H.ending) {
          H.ending = true; api('PATCH', ROOM(code), { state: 'end' }).then(function () { if (H) H.ending = false; });
        }
        if (r.state === 'play') drawBoard();
      }, 250);
    });
  });
  GK.onLeave(function () { if (H) { H.stop && H.stop(); clearInterval(H.timer); H = null; } });
  function drawHostL() {
    var r = H.room, el = $('#hostL'); if (!el) return;
    var cfg = r.cfg, busy = r.state === 'play', key = JSON.stringify(cfg) + busy + playersOf(r).length + r.round;
    if (H.lkey === key) return; H.lkey = key;
    var hadQR = $('#qr', el) && $('#qr', el).innerHTML;
    el.innerHTML = '<div class="roomhd"><small>部屋番号</small><div class="code">' + H.code + '</div></div><div class="qr" id="qr">' + (hadQR || '') + '</div>' +
      '<p class="note joinhow" style="text-align:center">楽典ラボ → 🎮 → 部屋番号を入力<br>または QR を読みとる</p>' +
      '<div class="hsum"><p><span>📚</span><b>' + esc(rangeName(cfg)) + '</b></p><p><span>⏱</span><b>' + cfg.t + ' 秒</b></p>' +
      '<div class="seg">' + GR.filter(function (g) { return g[0] !== 'units'; }).map(function (g) { return '<button type="button" data-hm="' + g[0] + '" aria-pressed="' + (cfg.m === g[0]) + '"' + (busy ? ' disabled' : '') + '>' + g[1] + '</button>'; }).join('') + '</div>' +
      '<div class="seg">' + [60, 90, 120, 180].map(function (t) { return '<button type="button" data-ht="' + t + '" aria-pressed="' + (cfg.t === t) + '"' + (busy ? ' disabled' : '') + '>' + t + '秒</button>'; }).join('') + '</div></div>' +
      '<div class="hbtns"><span class="ppl">👥 <b>' + playersOf(r).length + '</b> 人</span><button type="button" class="btn main big" id="hGo"' + (busy ? ' disabled' : '') + '>' + (r.round ? '▶ 第' + (r.round + 1) + '回戦' : '▶ スタート') + '</button></div>' +
      '<div class="hbtns"><button type="button" class="btn ghost sm" id="hCopy">🔗 参加リンク</button><button type="button" class="btn ghost sm" id="hClose">部屋を閉じる</button></div>';
    if (!hadQR) drawQR($('#qr', el), joinUrl(H.code));
    el.onclick = function (e) {
      var b = e.target.closest('[data-hm],[data-ht],#hGo,#hCopy,#hClose'); if (!b) return;
      if (b.dataset.hm) api('PATCH', ROOM(H.code) + '/cfg', { m: b.dataset.hm });
      if (b.dataset.ht) api('PATCH', ROOM(H.code) + '/cfg', { t: +b.dataset.ht });
      if (b.id === 'hGo') { H.tab = 'now'; api('PATCH', ROOM(H.code), { state: 'play', round: (r.round || 0) + 1, seed: Math.floor(Math.random() * 1e9), startAt: Math.round(now() + 5000) }).catch(function () { GK.toast('スタートできませんでした'); }); }
      if (b.id === 'hCopy') GK.share('【楽典ラボ クラス対戦】部屋 ' + H.code + '\n' + joinUrl(H.code));
      if (b.id === 'hClose' && confirm('部屋 ' + H.code + ' を閉じますか？（ランキングも消えます）')) { var c = H.code; api('DELETE', ROOM(c)).then(function () { GK.go('#game'); }, function () { GK.go('#game'); }); }
    };
  }
  function rows(list, live) {
    var cols = list.length > 24 ? 3 : list.length > 12 ? 2 : 1, max = cols * 14, more = list.length - max;
    var html = '<div class="bbody" style="grid-template-columns:repeat(' + cols + ',minmax(0,1fr))">' + list.slice(0, max).map(function (p, i) {
      return '<div class="prow' + (i < 3 ? ' r' + (i + 1) : '') + '"><span class="rk">' + (i < 3 ? ['🥇', '🥈', '🥉'][i] : (i + 1)) + '</span><span class="nm">' + esc(p.n) + (live && p.k >= 3 ? '<span class="fire">🔥' + p.k + '</span>' : '') + (live && p.d ? '<span class="done">おわり</span>' : '') + '</span><span class="pt">' + GK.fmtN(live === 'best' ? p.b || 0 : p.s || 0) + '</span></div>';
    }).join('') + '</div>';
    return html + (more > 0 ? '<p class="note">…ほか ' + more + ' 人</p>' : '');
  }
  function drawBoard() {
    var r = H.room, el = $('#board'); if (!el) return;
    if ($('.podium', el)) return;
    var t = now(), head = '', body = '';
    var tabs = '<div class="tabs seg"><button type="button" data-tab="now" aria-pressed="' + (H.tab === 'now') + '">いまの回</button><button type="button" data-tab="best" aria-pressed="' + (H.tab === 'best') + '">🏆 ハイスコア</button></div>';
    if (H.tab === 'best') { head = '<span class="st">🏆 ハイスコア</span>' + tabs; body = rows(playersOf(r), 'best'); }
    else if (r.state === 'lobby' || !r.round) {
      var ps = playersOf(r);
      head = '<span class="st">参加者を待っています</span>' + tabs;
      body = ps.length ? '<div class="names">' + ps.map(function (p) { return '<span>' + esc(p.n) + '</span>'; }).join('') + '</div>' : '<p class="note">生徒が 部屋番号を入れると ここに名前が出ます</p>';
    } else if (r.state === 'play' && t < r.startAt) {
      head = '<span class="st">第' + r.round + '回戦</span>' + tabs;
      body = '<div class="count">' + Math.max(1, Math.ceil((r.startAt - t) / 1000)) + '</div>';
    } else {
      var end = r.state === 'end', left = Math.max(0, r.startAt + r.cfg.t * 1000 - t), lst = playersOf(r, r.round);
      head = '<span class="st">' + (end ? '🎉 結果発表' : '第' + r.round + '回戦') + '</span>' + tabs + (end ? '<button type="button" class="btn sm" id="again">🎉 表彰式をもう一度</button>' : '<button type="button" class="btn sm ghost" id="stopNow">⏹ ここで結果発表</button><span class="tm">' + Math.ceil(left / 1000) + '</span>');
      body = rows(lst, !end);
    }
    if (r.state === 'play' && t >= r.startAt && H.goR !== r.round) { H.goR = r.round; GK.fx('go'); }
    var key = head + body;
    if (H.bkey === key) return; H.bkey = key;
    el.innerHTML = '<div class="bhead">' + head + '</div>' + body;
    el.onclick = function (e) {
      var b = e.target.closest('[data-tab],#again,#stopNow'); if (!b) return;
      if (b.id === 'stopNow' && confirm('ここで終わりにして 結果発表しますか？')) api('PATCH', ROOM(H.code), { state: 'end' });
      if (b.dataset.tab) { H.tab = b.dataset.tab; H.bkey = null; drawBoard(); }
      if (b.id === 'again') podium(H.room);
    };
  }
  function podium(r) {
    var el = $('#board'); if (!el) return;
    var lst = playersOf(r, r.round).slice(0, 3);
    var d = document.createElement('div'); d.className = 'podium';
    d.innerHTML = '<h2 class="ttl" style="font-size:30px">🎉 第' + r.round + '回戦 表彰式</h2><div class="pods">' + [1, 0, 2].map(function (i) { var p = lst[i]; return p ? '<div class="pod p' + (i + 1) + '" data-i="' + i + '"><b>' + esc(p.n) + '</b><span class="pt">' + GK.fmtN(p.s || 0) + ' 点</span><div class="blk">' + (i + 1) + '</div></div>' : ''; }).join('') + '</div><button type="button" class="btn" id="pclose">ランキングを見る</button>';
    el.appendChild(d);
    GK.fx('drum');
    [2, 1, 0].forEach(function (i, k) { setTimeout(function () { var p = $('.pod[data-i="' + i + '"]', d); if (p) { p.classList.add('on'); GK.fx(i === 0 ? 'fanfare' : 'ok'); if (i === 0) GK.confetti(90); } }, 1300 + k * 1100); });
    $('#pclose', d).onclick = function () { d.remove(); H.bkey = null; drawBoard(); };
  }

  /* ---------- 生徒：参加 ---------- */
  var B = null;
  function join(code, name) {
    if (!/^\d{4}$/.test(code)) { GK.toast('部屋番号（4 けた）を入れてください'); return; }
    if (!name) { GK.toast('ニックネームを入れてください'); return; }
    S.nick = name; GK.saveS();
    var me = ROOM(code) + '/players/' + pid();
    api('GET', ROOM(code) + '/state').then(function (st) {
      if (st == null) throw new Error('部屋が見つかりません');
      return api('GET', me);
    }).then(function (old) {
      return api('PATCH', me, { n: name, s: old && old.s || 0, b: old && old.b || 0, r: old && old.r || 0, k: 0 });
    }).then(function () {
      RW.battles++; GK.rwSave(); GK.earn(20);
      GK.go('#battle/' + code);
    }).catch(function (e) { GK.toast('参加できませんでした（' + e.message + '）'); });
  }
  GK.route(/^battle\/(\d{4})$/, function (m) {
    var code = m[1];
    B = { code: code, played: 0, awarded: {}, room: null };
    V.innerHTML = '<section class="panel res" id="bwait"><div class="big" style="font-size:28px">つないでいます…</div></section>';
    syncClock(code).then(function () { if (B && B.code === code) B.stop = listen(ROOM(code), onRoom); });
  });
  GK.onLeave(function () { if (B) { B.stop && B.stop(); B = null; } });
  function onRoom(room) {
    if (!B) return;
    if (!room) { GK.toast('部屋が閉じられました'); GK.go('#game'); return; }
    B.room = room;
    var me = (room.players || {})[pid()] || {};
    if (room.state === 'play' && room.round !== B.played && now() < room.startAt + room.cfg.t * 1000 - 3000) {
      B.played = room.round; B.lastPush = 0;
      api('PATCH', ROOM(B.code) + '/players/' + pid(), { s: 0, c: 0, k: 0, r: room.round, d: 0 }).catch(function () { });
      newGame(V, room.cfg, room.seed, 'battle', room.startAt, {
        answer: function () { push(false); },
        end: function () { push(true); waitEnd(); }
      });
      return;
    }
    if (G && G.mode === 'battle' && !G.over && room.state === 'end' && B.played === room.round) { // 先生が 結果発表
      G.over = true; clearInterval(G.timer); GK.fx('whistle'); push(true);
    }
    if (G && G.mode === 'battle' && !G.over) { // プレイ中：自分の順位
      var lst = playersOf(room, room.round), rk = lst.map(function (p) { return p.id; }).indexOf(pid());
      var el = $('#grk'); if (el && rk >= 0) el.textContent = (rk + 1) + ' 位 / ' + lst.length;
      return;
    }
    if (room.state === 'end' && B.played === room.round) {
      if (B.awarded[room.round]) return; // 結果・解説を見ている間は そのまま
      B.awarded[room.round] = 1;
      var l2 = playersOf(room, room.round), r2 = l2.map(function (p) { return p.id; }).indexOf(pid()) + 1;
      if (r2 >= 1 && r2 <= 3) { RW.top3++; GK.rwSave(); GK.earn(50); GK.confetti(r2 === 1 ? 90 : 40); }
      if (G) { RW.maxCombo = Math.max(RW.maxCombo, G.maxCombo); GK.rwSave(); GK.earn(Math.floor(G.score / 20)); }
      GK.checkBadges();
      showBattleEnd(room, r2, l2.length);
      return;
    }
    if (!G || G.over) lobby(room, me);
  }
  function push(final) {
    if (!B || !G) return;
    var t = Date.now(); if (!final && t - B.lastPush < 700) { clearTimeout(B.pt); B.pt = setTimeout(function () { push(false); }, 700); return; }
    B.lastPush = t;
    var me = (B.room.players || {})[pid()] || {};
    api('PATCH', ROOM(B.code) + '/players/' + pid(), { s: G.score, c: G.ok, k: G.combo, r: B.played, b: Math.max(me.b || 0, G.score), d: final ? 1 : 0 }).catch(function () { });
  }
  function waitEnd() {
    V.innerHTML = '<section class="panel res"><div class="big">' + GK.fmtN(G.score) + '<small> 点</small></div><p class="msg">そこまで！ 結果発表を待っています…</p><p class="note">正解 ' + G.ok + ' 問・最大 ' + G.maxCombo + ' コンボ</p></section>';
  }
  function lobby(room, me) {
    if (G && G.over && room.state === 'play' && B.played === room.round) return; // 結果待ち
    var n = playersOf(room).length;
    var mid = room.state === 'play' && room.round !== B.played ? '<p class="msg">いま 第' + room.round + '回戦の最中です。次の回から参加できます</p>' : '<p class="msg">先生のスタートを 待っています</p>';
    V.innerHTML = '<section class="panel res"><p class="note">部屋 ' + B.code + '・' + esc(rangeName(room.cfg)) + '・' + room.cfg.t + ' 秒</p><div class="big" style="font-size:34px">' + esc(me.n || S.nick) + '</div>' + mid + '<p class="note">👥 ' + n + ' 人が参加中</p><div class="acts"><button type="button" class="btn ghost" data-go="#game">ぬける</button></div></section>';
  }
  function showBattleEnd(room, rank, n) {
    var g = G;
    V.innerHTML = '<section class="panel res">' + (rank === 1 ? '<div class="stampbig">優勝</div>' : '') + '<div class="big">' + (rank ? rank + '<small> 位 / ' + n + ' 人</small>' : '−') + '</div>' +
      '<p class="msg">' + (rank === 1 ? '👑 優勝！' : rank === 2 ? '🥈 2 位！' : rank === 3 ? '🥉 3 位！' : 'おつかれさま！') + '　' + GK.fmtN(g ? g.score : 0) + ' 点' + (g ? '・正解 ' + g.ok + ' 問' : '') + '</p>' +
      '<div class="acts">' + (g && g.res.length ? '<button type="button" class="btn" id="rv">📖 ' + (g.ng ? 'まちがえた ' + g.ng + ' 問の解説' : '解説を見る') + '</button>' : '') + '</div><p class="note">次の回が始まると 自動で切りかわります</p></section>';
    var rv = $('#rv'); if (rv) rv.onclick = function () { GK.review(V, g.res, function () { showBattleEnd(room, rank, n); }); };
  }
})();
