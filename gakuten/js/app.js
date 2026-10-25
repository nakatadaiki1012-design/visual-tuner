/* =========================================================
   楽典ラボ：画面（ホーム・授業・演習・テスト・さわる・課題）
   ========================================================= */
(function () {
  'use strict';
  var GK = window.GK, M = GK.M, F = GK.F, $ = GK.$, $$ = GK.$$, esc = GK.esc, S = GK.S, RW = GK.RW;
  var V = GK.view;
  var keyFn = null; // いまの画面の キーボード操作
  document.addEventListener('keydown', function (e) {
    if (e.target.closest('input,textarea,select') || GK.dlg.open) return;
    if (keyFn) keyFn(e);
  });
  GK.onKey = function (fn) { keyFn = fn; };
  GK.onLeave(function () { keyFn = null; });

  /* =========================================================
     問題を 1 問 描く（演習・テスト・ゲームで共通）
     o = { top: 上の行の HTML, onPick(i), noFb: true（解説を出さない）, next: function, nextLabel }
     ========================================================= */
  GK.drawQ = function (el, q, o) {
    o = o || {};
    el.innerHTML = '<div class="qtop">' + (o.top || '') + '<span class="stars">' + '★★★'.slice(0, q.st) + '<span style="opacity:.25">' + '★★★'.slice(q.st) + '</span></span><span class="cat">' + esc(GK.UNIT[q.u].title) + '</span><span class="r">' + (q.play && !q.ear ? '<button type="button" class="btn sm" data-qa="play">🔊</button>' : '') + '</span></div>' +
      '<p class="qq">' + GK.symfix(q.q) + '</p><div class="qfig"></div><div class="ch n' + q.ch.length + '"></div><div class="fb" hidden></div>';
    var fig = $('.qfig', el), ch = $('.ch', el);
    el.q = q;
    el.classList.toggle('nofig', !q.fig && !q.ear);
    if (q.ear) {
      fig.innerHTML = '<div class="ear"><button type="button" data-qa="play" aria-label="もう一度聴く">🔊</button><p class="note">何度でも聴けます</p></div>';
      setTimeout(function () { if (el.isConnected) GK.playQ(q); }, 250);
    } else if (q.fig) F.render(fig, q.fig);
    q.ch.forEach(function (c, i) {
      var b = document.createElement('button'); b.type = 'button'; b.dataset.i = i;
      b.innerHTML = '<span class="kn">' + (i + 1) + '</span>';
      if (c && c.fig) { b.className = 'fg'; var d = document.createElement('div'); b.appendChild(d); ch.appendChild(b); F.render(d, c.fig); }
      else { b.insertAdjacentHTML('beforeend', '<span>' + c + '</span>'); ch.appendChild(b); }
    });
    var done = false;
    el.onclick = function (e) {
      var a = e.target.closest('[data-qa]');
      if (a && a.dataset.qa === 'play') { GK.playQ(q); return; }
      if (a && a.dataset.qa === 'next') { o.next && o.next(); return; }
      var b = e.target.closest('.ch button'); if (!b || done) return;
      pick(+b.dataset.i);
    };
    function pick(i) {
      if (done) return; done = true;
      var ok = i === q.a;
      $$('.ch button', el).forEach(function (b, j) { b.disabled = true; if (j === q.a) b.classList.add('ok'); else if (j === i) b.classList.add('ng'); else b.classList.add('dim'); });
      GK.fx(ok ? 'ok' : 'ng');
      if (!o.noFb) GK.showFb(el, q, ok, o);
      o.onPick && o.onPick(i, ok);
    }
    el.pick = function (i) { if (i >= 0 && i < q.ch.length) pick(i); };
    el.isDone = function () { return done; };
    return el;
  };
  GK.playQ = function (q) {
    if (!q.play) return;
    if (typeof q.play === 'function') q.play(); else M.play(q.play, 90);
  };
  GK.showFb = function (el, q, ok, o) {
    o = o || {};
    var fb = $('.fb', el);
    fb.hidden = false;
    fb.innerHTML = '<span class="mk ' + (ok ? 'ok' : 'ng') + '">' + (ok == null ? '📖' : ok ? '○' : '✕') + '</span><div class="ex">' + (o.noEx ? (ok ? '正解！' : '正解は ' + (q.ch[q.a].fig ? (q.a + 1) + ' 番' : '<b>' + q.ch[q.a] + '</b>')) : q.ex) + '</div>' +
      (o.next ? '<button type="button" class="btn main" data-qa="next">' + (o.nextLabel || '次へ ▶') + '</button>' : '');
    if (!o.noEx && (q.exFig || q.ear)) {
      var fig = $('.qfig', el); el.classList.remove('nofig');
      F.render(fig, q.exFig || q.fig || { html: '' });
      if (q.ear && q.play) { var b = document.createElement('button'); b.type = 'button'; b.className = 'btn sm playb'; b.dataset.qa = 'play'; b.textContent = '🔊 もう一度'; fig.firstChild && fig.firstChild.appendChild(b); }
    }
  };
  // 問題中のキー：1〜4 で選ぶ、Enter で次へ
  function quizKeys(get) {
    GK.onKey(function (e) {
      var el = get(); if (!el) return;
      if (/^[1-4]$/.test(e.key) && el.pick && !el.isDone()) { el.pick(+e.key - 1); e.preventDefault(); }
      else if ((e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') && el.isDone && el.isDone()) { var n = $('[data-qa="next"]', el); if (n) { n.click(); e.preventDefault(); } }
    });
  }
  GK.quizKeys = quizKeys;

  // 苦手の記録（種類ごと）
  function noteMiss(t, ok) {
    var w = GK.store.get('weak', {});
    w[t] = Math.max(0, (w[t] || 0) + (ok ? -1 : 2));
    if (!w[t]) delete w[t];
    GK.store.set('weak', w);
  }

  /* =========================================================
     いくつかの問題を 順に解く（演習・テスト）
     o = { qs, mode: 'prac' | 'test', title, onEnd(res), back }
     ========================================================= */
  GK.runSet = function (box, o) {
    var i = 0, res = [];
    box.innerHTML = '<section class="panel qz"></section>';
    var el = $('.qz', box);
    quizKeys(function () { return el; });
    function prog() {
      return '<span class="prog">' + o.qs.map(function (_, j) { return '<i class="' + (j < res.length ? (res[j].ok ? 'ok' : 'ng') : j === i ? 'cur' : '') + '"></i>'; }).join('') + '</span><span>' + (i + 1) + ' / ' + o.qs.length + '</span>';
    }
    function show() {
      var q = o.qs[i];
      GK.drawQ(el, q, {
        top: prog(), noEx: o.mode === 'test',
        onPick: function (k, ok) {
          res.push({ q: q, pick: k, ok: ok });
          if (o.mode === 'prac') { noteMiss(q.t, ok); if (ok) { RW.drillOk++; if (q.ear) RW.earOk++; GK.earn(5); } }
          var p = $('.prog', el); if (p) p.outerHTML = prog().replace(/<span>.*$/, '');
        },
        next: function () { i++; if (i < o.qs.length) show(); else end(); },
        nextLabel: i === o.qs.length - 1 ? '結果を見る ▶' : '次へ ▶'
      });
    }
    function end() {
      var n = res.filter(function (r) { return r.ok; }).length;
      GK.onKey(null);
      o.onEnd(res, n);
    }
    show();
  };
  // 解説を 1 問ずつ見る
  GK.review = function (box, res, back) {
    var list = res.filter(function (r) { return !r.ok; }), all = false, i = 0;
    if (!list.length) { list = res; all = true; }
    box.innerHTML = '<section class="panel qz"></section>';
    var el = $('.qz', box);
    quizKeys(function () { return el; });
    function show() {
      var r = list[i];
      GK.drawQ(el, r.q, { top: '<span>📖 ' + (all ? '全部' : 'まちがえた問題') + ' ' + (i + 1) + ' / ' + list.length + '</span>', noFb: true });
      $$('.ch button', el).forEach(function (b, j) { b.disabled = true; if (j === r.q.a) b.classList.add('ok'); else if (j === r.pick) b.classList.add('ng'); else b.classList.add('dim'); });
      GK.showFb(el, r.q, r.ok, { next: function () { i++; if (i < list.length) show(); else back(); }, nextLabel: i === list.length - 1 ? 'おわり ▶' : '次へ ▶' });
      el.isDone = function () { return true; };
    }
    show();
  };

  /* =========================================================
     ホーム
     ========================================================= */
  GK.route(/^home$/, function () {
    var pass = GK.passCount(), seen = GK.UNITS.filter(function (u) { return GK.prog(u.id).seen; }).length;
    var next = GK.UNITS.filter(function (u) { return !GK.prog(u.id).pass; })[0] || GK.UNITS[0];
    var task = GK.store.get('task', null);
    V.innerHTML = '<div class="home"><aside class="panel hero">' +
      '<h2 class="cname">楽典</h2><p class="cdesc">音名・リズム・音程・音階・調・和音・記号を、楽譜と図で 見て・聴いて・解いて 身につける</p>' +
      '<div class="stats"><div class="stat"><b>' + pass + '<small>/' + GK.UNITS.length + '</small></b><small>合格した単元</small></div><div class="stat"><b>' + GK.fmtN(RW.drillOk) + '</b><small>演習の正解</small></div><div class="stat"><b>' + GK.levelOf(RW.coins).name + '</b><small>段位</small></div></div>' +
      (task ? '<div class="taskbox">📮 <span>課題 <b>' + task.units.filter(function (u) { return GK.prog(u).pass; }).length + '/' + task.units.length + '</b> 合格</span><button type="button" class="btn" data-go="#task">見る</button></div>' : '') +
      '<div class="acts"><button type="button" class="btn main" data-go="#' + next.id + '">▶ ' + (seen ? 'つづき' : 'はじめる') + '：' + esc(next.title) + '</button>' +
      '<button type="button" class="btn" data-go="#drill">💪 まとめて演習・苦手</button>' +
      '<button type="button" class="btn" data-go="#game">🎮 タイムアタック・クラス対戦</button></div>' +
      '<div class="heromini"><h3>1 単元 ＝ 3 ステップ</h3><div class="cycle"><ol><li><b>💡</b><b>ポイント</b><span>図と音で わかる</span></li><li><b>💪</b><b>演習</b><span>10 問。毎回ちがう問題</span></li><li><b>🏁</b><b>テスト</b><span>5 問中 4 問で 合格</span></li></ol></div>' +
      '<h3 style="margin-top:10px">🎹 さわって確かめる</h3><div class="cycle"><ol><li><b>🎹</b><b>鍵盤と五線</b><span>おすと 楽譜に出る</span></li><li><b>⭕</b><b>五度圏</b><span>調と調号</span></li><li><b>🎶</b><b>和音・音程</b><span>組み立てて 鳴らす</span></li></ol></div></div>' +
      '</aside><section class="grid">' +
      GK.UNITS.map(function (u) {
        var p = GK.prog(u.id);
        return '<button type="button" class="tile" data-go="#' + u.id + '"><span class="no">' + u.no + '</span><span class="tg">' + u.sym + '</span><b>' + esc(u.title) + '</b><small>' + esc(u.en) + '</small><div class="gl">' + esc(u.goal) + '</div>' +
          '<div class="pips"><i class="' + (p.seen ? 'on' : '') + '"></i><i class="' + (p.prac >= 7 ? 'on' : '') + '"></i><i class="' + (p.pass ? 'on' : '') + '"></i></div>' + (p.pass ? '<span class="stamp">合格</span>' : '') + '</button>';
      }).join('') +
      '<button type="button" class="tile tool" data-go="#tools/kbd"><span class="no">🎹</span><b>鍵盤と五線</b><small>Keyboard</small><div class="gl">おした鍵盤が 楽譜になる</div></button>' +
      '<button type="button" class="tile tool" data-go="#tools/circle"><span class="no">⭕</span><b>五度圏と調号</b><small>Circle of Fifths</small><div class="gl">調をえらんで 音階を聴く</div></button>' +
      '<button type="button" class="tile tool" data-go="#tools/chord"><span class="no">🎶</span><b>和音・音程ビルダー</b><small>Chord Builder</small><div class="gl">根音と種類で 組み立てる</div></button>' +
      '</section></div>';
  });

  /* =========================================================
     単元：💡 ポイント ／ 💪 演習 ／ 🏁 テスト
     ========================================================= */
  GK.route(/^(u\d\d)(?:\/(p|x|t))?(?:\/(\d+))?$/, function (m) {
    var u = GK.UNIT[m[1]]; if (!u) { GK.go('#home'); return; }
    var step = m[2] || 'p', p = GK.prog(u.id);
    V.innerHTML = '<div class="uhead"><button type="button" class="btn back" data-go="#home">◀ 一覧</button><div class="ut"><small>楽典ラボ・' + u.no + '・' + esc(u.en) + '</small><h2>' + esc(u.title) + '</h2></div>' +
      '<nav class="steps">' + [['p', '💡 ポイント', p.seen], ['x', '💪 演習', p.prac >= 7], ['t', '🏁 テスト', p.pass]].map(function (s) { return '<button type="button" data-go="#' + u.id + '/' + s[0] + '" aria-current="' + (s[0] === step) + '">' + s[1] + (s[2] ? '<span class="ck">✓</span>' : '') + '</button>'; }).join('') + '</nav></div><div class="stage" id="stage"></div>';
    var st = $('#stage');
    if (step === 'p') lesson(u, st, m[3] != null ? +m[3] : p.card || 0);
    else if (step === 'x') practice(u, st);
    else testU(u, st);
  });

  function lesson(u, st, idx) {
    var cards = u.cards.concat([{ sum: true }]);
    idx = Math.max(0, Math.min(cards.length - 1, idx));
    st.innerHTML = '<section class="panel card" id="card"></section><div class="foot"><button type="button" class="btn ghost" id="prev" aria-label="前へ">◀</button><div class="dots">' + cards.map(function (_, i) { return '<i data-i="' + i + '"></i>'; }).join('') + '</div><span class="kh">← → で移動</span><button type="button" class="btn main" id="next">次へ ▶</button></div>';
    function show(i) {
      idx = i; GK.setProg(u.id, { card: i });
      if (i === cards.length - 1) GK.setProg(u.id, { seen: true });
      var c = cards[i], el = $('#card');
      $$('.dots i', st).forEach(function (d, j) { d.classList.toggle('on', j === i); });
      $('#prev').disabled = i === 0;
      $('#next').textContent = i === cards.length - 1 ? '💪 演習へ ▶' : '次へ ▶';
      if (c.sum) {
        el.className = 'panel card wide';
        el.innerHTML = '<div class="txt"><div class="kick"><span>📌 まとめ</span>' + esc(u.title) + '</div><h3>🎯 ' + esc(u.goal) + '</h3></div>' +
          '<div class="figw" style="justify-content:center"><ol class="sumlist">' + u.sum.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol><div class="acts" style="margin-top:14px;justify-content:center"><button type="button" class="btn main big" data-go="#' + u.id + '/x">💪 演習 10 問</button><button type="button" class="btn big" data-go="#' + u.id + '/t">🏁 確認テスト</button></div></div>';
        return;
      }
      var fig = typeof c.fig === 'function' ? c.fig() : c.fig;
      el.className = 'panel card' + (c.wide ? ' wide' : '');
      el.innerHTML = '<div class="txt"><div class="kick"><span>' + esc(c.k) + '</span>' + (i === 0 ? '🎯 ' + esc(u.goal) : '') + '</div><h3>' + c.h + '</h3><p class="body">' + GK.symfix(c.b) + '</p>' + (c.pts ? '<ul class="pts">' + c.pts.map(function (x) { return '<li>' + GK.symfix(x) + '</li>'; }).join('') + '</ul>' : '') + '</div><div class="figw" id="figw"></div>';
      requestAnimationFrame(function () { F.render($('#figw'), fig); });
    }
    st.addEventListener('click', function (e) {
      if (e.target.closest('#prev')) show(Math.max(0, idx - 1));
      else if (e.target.closest('#next')) { if (idx === cards.length - 1) GK.go('#' + u.id + '/x'); else show(idx + 1); }
      else if (e.target.closest('.dots i')) show(+e.target.closest('.dots i').dataset.i);
    });
    GK.onKey(function (e) { if (e.key === 'ArrowRight') { $('#next').click(); } else if (e.key === 'ArrowLeft') { $('#prev').click(); } });
    // スワイプでめくる
    var sx = null;
    st.addEventListener('touchstart', function (e) { if (e.target.closest('svg.kbd,.cof,button')) { sx = null; return; } sx = e.touches[0].clientX; }, { passive: true });
    st.addEventListener('touchend', function (e) { if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 60) show(Math.max(0, Math.min(cards.length - 1, idx + (dx < 0 ? 1 : -1)))); sx = null; }, { passive: true });
    show(idx);
  }

  function practice(u, st) {
    var R = GK.rng(Math.floor(Math.random() * 1e9));
    var qs = GK.Q.set([u.id], 10, R, { ramp: true });
    GK.runSet(st, {
      qs: qs, mode: 'prac', onEnd: function (res, n) {
        var p = GK.prog(u.id); GK.setProg(u.id, { prac: Math.max(p.prac, n), pracN: (p.pracN || 0) + 1 });
        GK.checkBadges();
        st.innerHTML = '<section class="panel res"><div class="big">' + n + '<small> / ' + qs.length + '</small></div><p class="msg">' + (n >= 9 ? '🎉 すばらしい！ テストに進もう' : n >= 7 ? '👍 よくできました' : 'もう 1 セットで 定着させよう') + '</p>' +
          '<div class="acts"><button type="button" class="btn" id="rv">📖 ' + (n < qs.length ? 'まちがえた ' + (qs.length - n) + ' 問の解説' : '解説を見る') + '</button><button type="button" class="btn main" id="again">💪 もう 1 セット</button><button type="button" class="btn warm" data-go="#' + u.id + '/t">🏁 確認テストへ</button></div>' +
          '<p class="note">演習の問題は 毎回 ちがいます（数字・音・調が かわる）</p></section>';
        $('#again').onclick = function () { practice(u, st); };
        $('#rv').onclick = function () { GK.review(st, res, function () { practice(u, st); }); };
      }
    });
  }

  function testU(u, st) {
    var p = GK.prog(u.id);
    st.innerHTML = '<section class="panel res"><div class="big">🏁 確認テスト</div><p class="msg">' + esc(u.title) + '：5 問・ヒントなし・1 回勝負。<b>4 問以上で 合格</b></p>' +
      (p.test >= 0 ? '<p class="note">これまでの最高：' + p.test + ' / 5' + (p.pass ? '（合格 ' + esc(p.pass) + '）' : '') + '</p>' : '') +
      '<div class="acts"><button type="button" class="btn main big" id="go">▶ はじめる</button><button type="button" class="btn" data-go="#' + u.id + '/x">💪 先に演習</button></div></section>';
    $('#go').onclick = run;
    GK.onKey(function (e) { if (e.key === 'Enter') run(); });
    function run() {
      var R = GK.rng(Math.floor(Math.random() * 1e9));
      var qs = GK.Q.set([u.id], 5, R, { noEar: true, ramp: true });
      GK.runSet(st, {
        qs: qs, mode: 'test', onEnd: function (res, n) {
          var pass = n >= GK.PASS, first = pass && !GK.prog(u.id).pass;
          GK.setProg(u.id, { test: Math.max(GK.prog(u.id).test, n) });
          if (pass && first) GK.setProg(u.id, { pass: GK.today() });
          if (pass) { GK.earn(first ? 150 : 50); GK.confetti(first ? 80 : 30); GK.fx('fanfare'); }
          st.innerHTML = '<section class="panel res">' + (pass ? '<div class="stampbig">合格</div>' : '') + '<div class="big">' + n + '<small> / 5</small></div><p class="msg">' + (pass ? (first ? '🎉 はじめての合格！ +150 コイン' : '合格！ +50 コイン') : 'あと ' + (GK.PASS - n) + ' 問。解説を見て もう一度') + '</p>' +
            '<div class="acts"><button type="button" class="btn" id="rv">📖 ' + (n < 5 ? 'まちがえた問題の解説' : '解説を見る') + '</button><button type="button" class="btn ' + (pass ? '' : 'main') + '" id="again">🔁 もう一度（新しい問題）</button>' + (pass ? nextBtn(u) : '') + '</div></section>';
          $('#again').onclick = run;
          $('#rv').onclick = function () { GK.review(st, res, function () { testU(u, st); }); };
        }
      });
    }
  }
  function nextBtn(u) {
    var i = GK.UNITS.indexOf(u), n = GK.UNITS[i + 1];
    return n ? '<button type="button" class="btn main" data-go="#' + n.id + '">▶ 次の単元：' + esc(n.title) + '</button>' : '<button type="button" class="btn main" data-go="#game">🎮 ゲームで腕だめし</button>';
  }

  /* =========================================================
     💪 まとめて演習
     ========================================================= */
  var DR = GK.store.get('drillSel', { us: ['u01'], n: 10, st: 0, mode: 'mix' });
  GK.route(/^drill(?:\/(run))?$/, function (m) {
    var weak = GK.store.get('weak', {}), wk = Object.keys(weak).filter(function (k) { return GK.Q.T[k]; }).sort(function (a, b) { return weak[b] - weak[a]; });
    V.innerHTML = '<div class="split"><aside class="panel side">' +
      '<h3>演習</h3>' +
      [['mix', '単元をえらぶ', '好きな単元を まぜて 出題'], ['weak', '🔁 苦手をやり直す', wk.length ? wk.length + ' 種類の 苦手な問題' : 'まちがえた問題が ここにたまる'], ['ear', '👂 聴いて答える', '音程・和音・長調／短調'], ['all', '🎲 全単元ミックス', 'すべての範囲から']].map(function (x) { return '<button type="button" class="it" data-dm="' + x[0] + '" aria-current="' + (DR.mode === x[0]) + '"><b>' + x[1] + '</b><small>' + x[2] + '</small></button>'; }).join('') +
      '<h3 style="margin-top:auto">記録</h3><p class="note" style="padding:0 4px">演習で 正解 <b>' + GK.fmtN(RW.drillOk) + '</b> 問<br>聴く問題 正解 <b>' + RW.earOk + '</b> 問</p>' +
      '</aside><section class="panel main"><div class="mhead"><h2 class="ttl">💪 まとめて演習</h2></div><div class="mbody" id="dbody"></div></section></div>';
    var body = $('#dbody');
    function draw() {
      var html = '';
      if (DR.mode === 'mix') html += '<div class="frow"><span>単元</span><button type="button" class="btn ghost sm" data-dx="allu">全部</button><button type="button" class="btn ghost sm" data-dx="noneu">はずす</button></div><div class="upick">' + GK.UNITS.map(function (u) { return '<button type="button" data-du="' + u.id + '" aria-pressed="' + (DR.us.indexOf(u.id) >= 0) + '"><i>' + u.no + '</i>' + esc(u.title) + '</button>'; }).join('') + '</div>';
      if (DR.mode === 'weak') html += wk.length ? '<p>まちがえた回数が多い 問題の種類から 出します。正解すると 少しずつ へります。</p><div class="upick">' + wk.slice(0, 12).map(function (k) { return '<button type="button" disabled style="opacity:1"><i>' + GK.UNIT[GK.Q.T[k].u].no + '</i>' + esc(GK.UNIT[GK.Q.T[k].u].title) + ' <small style="color:var(--warm)">×' + weak[k] + '</small></button>'; }).join('') + '</div>' : '<p>まだ 苦手な問題は ありません。演習で まちがえると ここに たまります。</p>';
      if (DR.mode === 'ear') html += '<p>🔊 音を聴いて答える問題だけを出します（音程・長音階／短音階・長調／短調・長三和音／短三和音）。音が出る環境で どうぞ。</p>';
      if (DR.mode === 'all') html += '<p>13 単元 すべてから 出題します。</p>';
      html += '<div class="frow"><span>問題の数</span><div class="seg">' + [10, 20, 30].map(function (n) { return '<button type="button" data-dn="' + n + '" aria-pressed="' + (DR.n === n) + '">' + n + ' 問</button>'; }).join('') + '</div></div>' +
        '<div class="frow"><span>むずかしさ</span><div class="seg">' + [[0, 'だんだん'], [1, '★ やさしい'], [2, '★★ ふつう'], [3, '★★★ 挑戦']].map(function (x) { return '<button type="button" data-ds="' + x[0] + '" aria-pressed="' + (DR.st === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
        '<div class="frow" style="margin-top:auto"><button type="button" class="btn main big" id="dgo">▶ スタート</button></div>';
      body.innerHTML = html;
      $('#dgo').disabled = (DR.mode === 'mix' && !DR.us.length) || (DR.mode === 'weak' && !wk.length);
    }
    V.onclick = function (e) {
      var b = e.target.closest('[data-dm],[data-du],[data-dn],[data-ds],[data-dx],#dgo'); if (!b) return;
      if (b.dataset.dm) { DR.mode = b.dataset.dm; $$('[data-dm]').forEach(function (x) { x.setAttribute('aria-current', x === b); }); }
      if (b.dataset.du) { var i = DR.us.indexOf(b.dataset.du); if (i >= 0) DR.us.splice(i, 1); else DR.us.push(b.dataset.du); }
      if (b.dataset.dx === 'allu') DR.us = GK.UNITS.map(function (u) { return u.id; });
      if (b.dataset.dx === 'noneu') DR.us = [];
      if (b.dataset.dn) DR.n = +b.dataset.dn;
      if (b.dataset.ds) DR.st = +b.dataset.ds;
      GK.store.set('drillSel', DR);
      if (b.id === 'dgo') { start(); return; }
      draw();
    };
    function start() {
      var R = GK.rng(Math.floor(Math.random() * 1e9)), us = GK.UNITS.map(function (u) { return u.id; }), o = { ramp: !DR.st, st: DR.st || null };
      if (DR.mode === 'mix') us = DR.us.slice();
      if (DR.mode === 'weak') o.types = wk.slice(0, 8);
      if (DR.mode === 'ear') o.types = Object.keys(GK.Q.T).filter(function (k) { return GK.Q.T[k].ear; });
      var qs = GK.Q.set(us, DR.n, R, o);
      var main = $('.main', V); main.innerHTML = '';
      main.style.cssText = 'background:transparent;border:0';
      GK.runSet(main, {
        qs: qs, mode: 'prac', onEnd: function (res, n) {
          GK.checkBadges();
          main.innerHTML = '<section class="panel res"><div class="big">' + n + '<small> / ' + qs.length + '</small></div><p class="msg">' + (n / qs.length >= 0.9 ? '🎉 すばらしい！' : n / qs.length >= 0.7 ? '👍 よくできました' : 'まちがえた問題は「🔁 苦手」に たまっています') + '</p><div class="acts"><button type="button" class="btn" id="rv">📖 解説を見る</button><button type="button" class="btn main" id="again">💪 もう 1 セット</button><button type="button" class="btn" data-go="#drill">◀ 演習のトップ</button></div></section>';
          $('#again').onclick = start;
          $('#rv').onclick = function () { GK.review(main, res, function () { GK.render(); }); };
        }
      });
    }
    draw();
  });

  /* =========================================================
     🎹 さわって確かめる
     ========================================================= */
  GK.route(/^tools(?:\/(kbd|circle|chord))?$/, function (m) {
    var tab = m[1] || 'kbd';
    V.innerHTML = '<div class="split"><aside class="panel side"><h3>さわって確かめる</h3>' +
      [['kbd', '🎹 鍵盤と五線', 'おした鍵盤が 楽譜に出る'], ['circle', '⭕ 五度圏と調号', '調をえらぶと 調号と音階'], ['chord', '🎶 和音・音程ビルダー', '根音と種類で 組み立てる']].map(function (x) { return '<button type="button" class="it" data-go="#tools/' + x[0] + '" aria-current="' + (tab === x[0]) + '"><b>' + x[1] + '</b><small>' + x[2] + '</small></button>'; }).join('') +
      '</aside><section class="panel main"><div class="mbody" id="tbody"></div></section></div>';
    var body = $('#tbody');
    if (tab === 'kbd') { body.innerHTML = '<div class="toolw" id="tw"></div>'; F.render($('#tw'), { c: 'staffKbd', a: { clefs: true }, cap: '鍵盤をタップ（黒鍵は ♯ と ♭ の 2 つの名前を表示）' }); }
    else if (tab === 'circle') circleTool(body);
    else chordTool(body);
  });

  function circleTool(body) {
    var f = 0, minor = false;
    body.innerHTML = '<div class="toolw"><div class="ctl"><div class="seg"><button type="button" data-mm="0" aria-pressed="true">長調</button><button type="button" data-mm="1" aria-pressed="false">短調</button></div><button type="button" class="btn sm" id="pl">🔊 音階を聴く</button><button type="button" class="btn sm" id="pc">🔊 Ⅰ‐Ⅳ‐Ⅴ‐Ⅰ</button></div>' +
      '<div class="out" id="co"></div><div class="twin"><div class="fig" id="cc"></div><div style="display:flex;flex-direction:column;gap:8px;min-height:0"><div class="fig" id="cs"></div><div class="fig" id="cr"></div></div></div></div>';
    F.render($('#cc'), { c: 'circle', a: { tap: true, sel: 0, onSel: function (x) { f = x; upd(); } } });
    function upd() {
      var t = M.keyTonic(f, minor), sc = M.scale(t, minor ? 'harmonic' : 'major');
      $('#co').innerHTML = '<b>' + M.keyName(f, minor) + '</b><span>' + M.keyName(f, minor, 'en') + '</span><span>調号：' + (f === 0 ? 'なし' : f > 0 ? '♯ ' + f + ' つ' : '♭ ' + (-f) + ' つ') + '</span><span>' + (minor ? '平行調：' + M.keyName(f) : '平行調：' + M.keyName(f, true)) + '</span>';
      F.render($('#cs'), { score: { clef: 'treble', key: f, minor: minor, notes: sc.map(function (p, i) { return { k: M.str(p), d: 'q', lab: GK.nm(p), c: i === 0 || i === 7 ? M.COL.red : null }; }), sp: 34, ls: 12 }, ttl: '音階' + (minor ? '（和声短音階）' : '') });
      F.render($('#cr'), { c: 'related', a: { f: f } });
    }
    body.onclick = function (e) {
      var b = e.target.closest('[data-mm]');
      if (b) { minor = b.dataset.mm === '1'; $$('[data-mm]', body).forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); upd(); }
      if (e.target.closest('#pl')) M.playNotes(M.scale(M.keyTonic(f, minor), minor ? 'harmonic' : 'major').map(M.str), { beat: 0.5, bpm: 110 });
      if (e.target.closest('#pc')) M.play([1, 4, 5, 1].map(function (d) { return [M.diatonic(f, minor, d).map(function (p) { return { l: p.l, a: p.a, o: p.o - 1 }; }), 1]; }), 80);
    };
    upd();
  }

  function chordTool(body) {
    var root = 'C4', mode = 'chord', ty = 'maj', iv = ['M', 3], inv = 0;
    var IVS = [['m', 2], ['M', 2], ['m', 3], ['M', 3], ['P', 4], ['A', 4], ['d', 5], ['P', 5], ['m', 6], ['M', 6], ['m', 7], ['M', 7], ['P', 8]];
    var TYS = ['maj', 'min', 'aug', 'dim', 'sus4', 'dom7', 'maj7', 'min7', 'hdim7', 'dim7'];
    function draw() {
      var ps = mode === 'chord' ? M.inv(M.chord(root, ty), ty.length && inv) : [M.p(root), M.up(root, iv[1], iv[0])];
      var mk = {}; ps.forEach(function (p, i) { mk[M.midi(p)] = { c: i === 0 && (mode !== 'chord' || inv === 0) ? M.COL.red : 'var(--gold)', t: GK.nm(p) }; });
      var lo = Math.min.apply(null, ps.map(M.midi)), hi = Math.max.apply(null, ps.map(M.midi));
      body.innerHTML = '<div class="toolw"><div class="ctl"><div class="seg"><button type="button" data-cm="chord" aria-pressed="' + (mode === 'chord') + '">和音</button><button type="button" data-cm="iv" aria-pressed="' + (mode === 'iv') + '">音程</button></div>' +
        '<div class="seg">' + (mode === 'chord' ? TYS.map(function (t) { return '<button type="button" data-ty="' + t + '" aria-pressed="' + (t === ty) + '">' + (M.CH_SFX[t] || 'M') + '</button>'; }).join('') : IVS.map(function (x) { return '<button type="button" data-iv="' + x.join('') + '" aria-pressed="' + (x[0] === iv[0] && x[1] === iv[1]) + '">' + M.ivName(x[1], x[0]) + '</button>'; }).join('')) + '</div>' +
        (mode === 'chord' ? '<div class="seg">' + ['基本形', '第1転回', '第2転回'].map(function (t, i) { return '<button type="button" data-inv="' + i + '" aria-pressed="' + (i === inv) + '">' + t + '</button>'; }).join('') + '</div>' : '') +
        '<button type="button" class="btn sm main" id="cp">🔊 鳴らす</button></div>' +
        '<div class="out"><b>' + (mode === 'chord' ? M.chordName(M.p(root), ty) : M.ivName(iv[1], iv[0])) + '</b><span>' + (mode === 'chord' ? M.CH_JP[ty] : '半音 ' + M.interval(ps[0], ps[1]).semis + ' 個') + '</span><span>' + ps.map(GK.nm).join('・') + '</span><span class="note">下の鍵盤で 根音（いちばん下の音）をえらぶ</span></div>' +
        '<div class="twin" style="grid-template-columns:minmax(0,1fr)"><div class="fig" id="bs"></div><div class="fig" id="bk" style="max-height:170px"></div></div></div>';
      F.render($('#bs'), { score: { clef: 'treble', notes: mode === 'chord' ? [{ k: ps.map(M.str), d: 'w' }] : [{ k: M.str(ps[0]), d: 'w', lab: GK.nm(ps[0]) }, { k: M.str(ps[1]), d: 'w', lab: GK.nm(ps[1]) }, { k: ps.map(M.str), d: 'w' }], sp: 70, minBar: 100 } });
      $('#bk').innerHTML = '<div class="sc" style="flex:1">' + M.keyboard({ from: 'C4', to: hi > 83 ? 'B6' : 'B5', mark: mk, names: true, h: 90 }) + '</div>';
      $('#bk svg').classList.add('tap');
    }
    var black = { 1: [0, 1], 3: [1, 1], 6: [3, 1], 8: [4, 1], 10: [5, 1] }, white = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };
    body.onclick = function (e) {
      var b = e.target.closest('[data-cm],[data-ty],[data-iv],[data-inv],#cp,rect[data-m]'); if (!b) return;
      if (b.dataset.cm) mode = b.dataset.cm;
      if (b.dataset.ty) ty = b.dataset.ty;
      if (b.dataset.inv) inv = +b.dataset.inv;
      if (b.dataset.iv) iv = [b.dataset.iv.replace(/\d/g, ''), +b.dataset.iv.replace(/\D/g, '')];
      if (b.dataset.m) { var mm = +b.dataset.m, pc = mm % 12, o = Math.floor(mm / 12) - 1; root = M.str(pc in white ? { l: white[pc], a: 0, o: o } : { l: black[pc][0], a: 1, o: o }); if (o >= 5) root = M.str(Object.assign(M.p(root), { o: 4 })); }
      if (b.id !== 'cp') draw();
      var ps = mode === 'chord' ? M.inv(M.chord(root, ty), inv) : [M.p(root), M.up(root, iv[1], iv[0])];
      if (mode === 'chord') M.playChord(ps.map(M.str), true); else M.play([[ps[0], 0.8], [ps[1], 0.8], [ps, 1.8]], 90);
    };
    draw();
  }

  /* =========================================================
     📮 課題（先生 → 生徒 → 先生）
     ========================================================= */
  GK.route(/^task(?:=(.*))?$/, function (m) {
    if (m[1]) { // 生徒がリンクを開いた
      var parts = m[1].split('~'), units = parts[0].split('.').filter(function (u) { return GK.UNIT[u]; });
      if (units.length) GK.store.set('task', { units: units, due: parts[1] || '', msg: parts[2] || '', at: GK.today(), t0: Date.now() });
      history.replaceState(null, '', '#task'); GK.render(); return;
    }
    var task = GK.store.get('task', null), sel = GK.store.get('taskSel', []);
    V.innerHTML = '<div class="split"><aside class="panel side"><h3>課題</h3><button type="button" class="it" data-tt="me" aria-current="true"><b>📮 今日の課題</b><small>先生から届いた課題</small></button><h3>先生用</h3><button type="button" class="it" data-tt="make"><b>✏️ 課題をつくる</b><small>リンクを送るだけ</small></button></aside><section class="panel main"><div class="mbody" id="kb"></div></section></div>';
    var body = $('#kb');
    function me() {
      if (!task) { body.innerHTML = '<h2 class="ttl">📮 今日の課題</h2><p>まだ課題はありません。先生から届いたリンクを開くと、ここに出ます。</p>'; return; }
      var done = task.units.filter(function (u) { return GK.prog(u).pass; }).length;
      body.innerHTML = '<h2 class="ttl">📮 今日の課題 <small style="font-size:14px;color:var(--muted)">' + done + ' / ' + task.units.length + ' 合格' + (task.due ? '・しめきり ' + esc(task.due) : '') + '</small></h2>' + (task.msg ? '<p class="taskbox">💬 ' + esc(task.msg) + '</p>' : '') +
        '<div class="upick" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">' + task.units.map(function (u, i) {
          var p = GK.prog(u), nx = !p.pass && task.units.slice(0, i).every(function (v) { return GK.prog(v).pass; });
          return '<button type="button" data-go="#' + u + (p.seen ? '/t' : '') + '" style="' + (nx ? 'border-color:var(--warm);box-shadow:2px 2px 0 var(--warm)' : '') + '"><i>' + GK.UNIT[u].no + '</i>' + esc(GK.UNIT[u].title) + '<span style="margin-left:auto;font-size:12px">' + (p.seen ? '💡✓' : '💡') + ' ' + (p.pass ? '🏁 ' + p.test + '/5 合格' : p.test >= 0 ? '🏁 ' + p.test + '/5' : '🏁 −') + (nx ? ' ▶ 次' : '') + '</span></button>';
        }).join('') + '</div>' +
        '<div class="frow" style="margin-top:auto"><input type="text" id="nm" class="in" placeholder="名前" value="' + esc(S.nick || '') + '" style="border:1px solid var(--line);border-radius:4px;padding:6px 8px;background:var(--bg)"><button type="button" class="btn main" id="send">📤 先生に結果を送る</button><button type="button" class="btn ghost sm" id="clr">課題を消す</button></div>';
      $('#send').onclick = function () {
        var nm = $('#nm').value.trim(); if (!nm) { GK.toast('名前を入れてください'); return; }
        S.nick = nm; GK.saveS();
        var lines = ['【楽典ラボ 課題の結果】', '名前：' + nm, '合格：' + done + ' / ' + task.units.length, ''].concat(task.units.map(function (u) { var p = GK.prog(u); return (p.pass ? '✅ ' : '⬜ ') + GK.UNIT[u].no + ' ' + GK.UNIT[u].title + '　授業' + (p.seen ? '✓' : '−') + '・演習 ' + (p.prac || 0) + '/10・テスト ' + (p.test >= 0 ? p.test + '/5' : '−') + (p.pass ? '（' + p.pass + ' 合格）' : ''); })).concat(['', '演習の正解 合計：' + RW.drillOk + ' 問', '送った日：' + GK.today()]);
        share(lines.join('\n'));
      };
      $('#clr').onclick = function () { if (confirm('課題を消しますか？（記録は消えません）')) { GK.store.set('task', null); GK.render(); } };
    }
    function make() {
      body.innerHTML = '<h2 class="ttl">✏️ 課題をつくる</h2><p class="note">やってほしい単元をえらぶと リンクができます。LINE やメールで 生徒に送ってください。生徒は「授業 → 演習 → 確認テスト」と進み、結果の文章を送り返せます。</p>' +
        '<div class="upick">' + GK.UNITS.map(function (u) { return '<button type="button" data-ku="' + u.id + '" aria-pressed="' + (sel.indexOf(u.id) >= 0) + '"><i>' + u.no + '</i>' + esc(u.title) + '</button>'; }).join('') + '</div>' +
        '<div class="frow"><span>しめきり</span><input type="text" id="due" placeholder="例：5/20（金）" style="border:1px solid var(--line);border-radius:4px;padding:5px 8px;background:var(--bg)"></div>' +
        '<div class="frow"><span>ひとこと</span><input type="text" id="msg" placeholder="例：テスト前の復習です" style="flex:1;border:1px solid var(--line);border-radius:4px;padding:5px 8px;background:var(--bg)"></div>' +
        '<div class="frow" style="margin-top:auto"><button type="button" class="btn main" id="mk">🔗 リンクをつくる</button></div>';
      body.onclick = function (e) {
        var b = e.target.closest('[data-ku]');
        if (b) { var i = sel.indexOf(b.dataset.ku); if (i >= 0) sel.splice(i, 1); else sel.push(b.dataset.ku); sel.sort(); GK.store.set('taskSel', sel); b.setAttribute('aria-pressed', i < 0); }
        if (e.target.closest('#mk')) {
          if (!sel.length) { GK.toast('単元をえらんでください'); return; }
          var url = location.origin + location.pathname + '#task=' + sel.join('.') + '~' + encodeURIComponent($('#due').value.trim()) + '~' + encodeURIComponent($('#msg').value.trim());
          share('【楽典ラボ】課題です。リンクを開いて「授業 → 演習 → 確認テスト」の順にやってください。\n' + url);
        }
      };
    }
    $$('[data-tt]').forEach(function (b) { b.onclick = function () { $$('[data-tt]').forEach(function (x) { x.setAttribute('aria-current', x === b); }); body.onclick = null; (b.dataset.tt === 'me' ? me : make)(); }; });
    me();
  });
  // 文章を送る（スマホは共有、パソコンはコピー）
  function share(text) {
    if (navigator.share && /iPhone|iPad|Android/i.test(navigator.userAgent)) { navigator.share({ text: text }).catch(function () { }); return; }
    var ok = function () { GK.toast('📋 コピーしました。LINE やメールに はりつけて送ってください'); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok, function () { showText(text); });
    else showText(text);
  }
  function showText(text) { GK.openDlg('<h3>この文章を送ってください<button type="button" class="btn ghost sm x" data-d="close">とじる</button></h3><textarea readonly>' + esc(text) + '</textarea>'); }
  GK.share = share;

  /* ---------- はじめに（ゲームの画面も登録されてから） ---------- */
  GK.coinChip();
  document.addEventListener('DOMContentLoaded', GK.render);
})();
