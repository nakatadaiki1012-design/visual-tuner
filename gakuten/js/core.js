/* =========================================================
   楽典ラボ：共通の道具（保存・設定・効果音・コイン・画面の切りかえ）
   ========================================================= */
(function () {
  'use strict';
  var GK = window.GK, M = GK.M;

  /* ---------- 小さな道具 ---------- */
  GK.$ = function (s, r) { return (r || document).querySelector(s); };
  GK.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  GK.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  // 音楽記号の文字（𝄞 𝄆 𝄋 など）は 楽譜用フォントで
  GK.symfix = function (html) { return String(html).replace(/([\u{1D100}-\u{1D1FF}])/gu, '<span class="sym">$1</span>'); };
  GK.fmtN = function (n) { return Math.round(n).toLocaleString('ja-JP'); };
  GK.view = document.getElementById('view');

  /* ---------- 保存（この端末のブラウザの中） ---------- */
  var PFX = 'gk:';
  GK.store = {
    get: function (k, d) { try { var v = localStorage.getItem(PFX + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(PFX + k, JSON.stringify(v)); } catch (e) { } }
  };
  var S = GK.S = Object.assign({ names: 'doremi', theme: 'auto', size: 1, sound: true, db: '', nick: '' }, GK.store.get('set', {}));
  GK.saveS = function () { GK.store.set('set', S); };
  GK.applyLook = function () {
    var r = document.documentElement;
    if (S.theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', S.theme);
    r.setAttribute('data-size', S.size);
  };
  GK.applyLook();
  // 音名（設定の書き方で）
  GK.nm = function (p) { return M.name(p, S.names); };
  GK.SYS_NAME = { doremi: 'ドレミ', jp: 'ハニホ（日本音名）', en: 'CDE（英語音名）' };

  /* ---------- 乱数（同じ seed なら 同じ問題） ---------- */
  GK.rng = function (seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  GK.shuffle = function (a, R) { R = R || Math.random; for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  GK.pick = function (a, R) { return a[Math.floor((R || Math.random)() * a.length)]; };
  GK.ri = function (a, b, R) { return a + Math.floor((R || Math.random)() * (b - a + 1)); };

  /* ---------- お知らせ ---------- */
  var tt = null;
  GK.toast = function (msg) {
    var el = GK.$('.toast'); if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg; el.hidden = false; clearTimeout(tt); tt = setTimeout(function () { el.hidden = true; }, 2600);
  };
  var cq = [], cbusy = false;
  GK.celebrate = function (t, big) {
    cq.push([t, big]); if (cbusy) return;
    (function nextC() {
      var x = cq.shift(); if (!x) { cbusy = false; return; }
      cbusy = true;
      var d = document.createElement('div'); d.className = 'celebrate';
      d.innerHTML = '<small>' + GK.esc(x[0]) + '</small><b>' + GK.esc(x[1]) + '</b>';
      document.body.appendChild(d); GK.fx('fanfare');
      setTimeout(function () { d.remove(); nextC(); }, 2000);
    })();
  };
  GK.confetti = function (n) {
    var cols = ['#c4452a', '#2c8a5c', '#2f6bb8', '#c08a0e', '#7d4fb0'];
    for (var i = 0; i < (n || 60); i++) {
      var c = document.createElement('i'); c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw'; c.style.background = cols[i % cols.length];
      c.style.animationDuration = (1.6 + Math.random() * 1.6) + 's'; c.style.animationDelay = Math.random() * .6 + 's';
      document.body.appendChild(c); setTimeout(c.remove.bind(c), 4000);
    }
  };

  /* ---------- 効果音（その場で作る） ---------- */
  GK.fx = function (kind) {
    if (!S.sound) return;
    var ac = M.audio(); if (!ac) return;
    var t = ac.currentTime + 0.01;
    function beep(f, at, d, type, v) {
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t + at);
      g.gain.setValueAtTime(0.0001, t + at); g.gain.exponentialRampToValueAtTime(v || 0.12, t + at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + at + d);
      o.connect(g); g.connect(ac.destination); o.start(t + at); o.stop(t + at + d + 0.05);
    }
    if (kind === 'tap') beep(660, 0, 0.06, 'triangle', 0.06);
    else if (kind === 'ok') { beep(880, 0, 0.12, 'triangle'); beep(1320, 0.07, 0.18, 'triangle'); }
    else if (kind === 'ng') { beep(220, 0, 0.18, 'square', 0.06); beep(196, 0.1, 0.22, 'square', 0.06); }
    else if (kind === 'combo') { [988, 1175, 1568].forEach(function (f, i) { beep(f, i * 0.06, 0.14, 'triangle', 0.1); }); }
    else if (kind === 'count') beep(740, 0, 0.12, 'sine', 0.15);
    else if (kind === 'go') beep(1480, 0, 0.35, 'sine', 0.18);
    else if (kind === 'whistle') { beep(2100, 0, 0.5, 'sine', 0.12); beep(2160, 0, 0.5, 'sine', 0.08); }
    else if (kind === 'fanfare') { [523, 659, 784, 1047].forEach(function (f, i) { beep(f, i * 0.11, i === 3 ? 0.5 : 0.14, 'triangle', 0.12); }); }
    else if (kind === 'drum') { for (var i = 0; i < 16; i++) beep(120 + Math.random() * 30, i * 0.07, 0.06, 'square', 0.05); }
  };

  /* ---------- 進みぐあい ---------- */
  GK.prog = function (uid) { return GK.store.get('u:' + uid, { card: 0, seen: false, prac: 0, pracN: 0, test: -1, pass: 0 }); };
  GK.setProg = function (uid, o) { GK.store.set('u:' + uid, Object.assign(GK.prog(uid), o)); };
  GK.PASS = 4; // 確認テスト 5 問中

  /* ---------- ごほうび（コイン・段位・バッジ） ---------- */
  var RANKS = GK.RANKS = [[0, '10級'], [100, '9級'], [250, '8級'], [500, '7級'], [800, '6級'], [1200, '5級'], [1700, '4級'], [2300, '3級'], [3000, '2級'], [4000, '1級'], [5500, '初段'], [7500, '二段'], [10000, '三段'], [13000, '四段'], [17000, '五段'], [22000, '名人']];
  GK.BADGES = [
    { id: 'first', ico: '🌱', name: 'はじめの一歩', how: 'はじめてコインを手に入れる' },
    { id: 'pass1', ico: '💮', name: '初合格', how: '確認テストに 1 つ合格' },
    { id: 'pass7', ico: '🎼', name: '半分クリア', how: '確認テストに 7 つ合格' },
    { id: 'passAll', ico: '👑', name: '楽典マスター', how: '全単元の確認テストに合格' },
    { id: 'drill100', ico: '📝', name: '100 問', how: '演習で 100 問正解' },
    { id: 'drill500', ico: '📚', name: '500 問', how: '演習で 500 問正解' },
    { id: 'day3', ico: '🔥', name: '3日連続', how: '3 日続けて 学習する' },
    { id: 'day7', ico: '🌋', name: '7日連続', how: '7 日続けて 学習する' },
    { id: 'combo10', ico: '⚡', name: '10 コンボ', how: 'タイムアタックで 10 問連続正解' },
    { id: 'combo30', ico: '🌩', name: '30 コンボ', how: 'タイムアタックで 30 問連続正解' },
    { id: 'ta1000', ico: '🎯', name: '1,000 点', how: 'タイムアタックで 1,000 点' },
    { id: 'ta3000', ico: '🚀', name: '3,000 点', how: 'タイムアタックで 3,000 点' },
    { id: 'ear', ico: '👂', name: 'いい耳', how: '聴いて答える問題に 30 問正解' },
    { id: 'battle', ico: '🏆', name: 'クラス対戦デビュー', how: 'クラス対戦に参加する' },
    { id: 'top3', ico: '🥇', name: '表彰台', how: 'クラス対戦で 3 位以内' },
    { id: 'coin5000', ico: '💰', name: '5,000 コイン', how: 'コインを 5,000 枚ためる' }
  ];
  var RW = GK.RW = Object.assign({ coins: 0, streak: 0, lastDay: 0, badges: {}, best: {}, battles: 0, top3: 0, maxCombo: 0, taBest: 0, drillOk: 0, earOk: 0 }, GK.store.get('rw', {}));
  GK.rwSave = function () { GK.store.set('rw', RW); };
  GK.dayNo = function () { return Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5); };
  GK.today = function () { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  GK.levelOf = function (c) {
    var i = 0; while (i + 1 < RANKS.length && c >= RANKS[i + 1][0]) i++;
    var nx = RANKS[i + 1];
    return { i: i, name: RANKS[i][1], from: RANKS[i][0], next: nx ? nx[0] : null, nextName: nx ? nx[1] : null };
  };
  function touchDay() { var d = GK.dayNo(); if (RW.lastDay === d) return; RW.streak = RW.lastDay === d - 1 ? RW.streak + 1 : 1; RW.lastDay = d; }
  GK.passCount = function () { return (GK.UNITS || []).filter(function (u) { return GK.prog(u.id).pass; }).length; };
  function badgeOn(id) {
    var n = (GK.UNITS || []).length || 13;
    switch (id) {
      case 'first': return RW.coins > 0;
      case 'pass1': return GK.passCount() >= 1;
      case 'pass7': return GK.passCount() >= 7;
      case 'passAll': return GK.passCount() >= n;
      case 'drill100': return RW.drillOk >= 100;
      case 'drill500': return RW.drillOk >= 500;
      case 'day3': return RW.streak >= 3;
      case 'day7': return RW.streak >= 7;
      case 'combo10': return RW.maxCombo >= 10;
      case 'combo30': return RW.maxCombo >= 30;
      case 'ta1000': return RW.taBest >= 1000;
      case 'ta3000': return RW.taBest >= 3000;
      case 'ear': return RW.earOk >= 30;
      case 'battle': return RW.battles >= 1;
      case 'top3': return RW.top3 >= 1;
      case 'coin5000': return RW.coins >= 5000;
    }
    return false;
  }
  GK.checkBadges = function () {
    GK.BADGES.forEach(function (b) { if (!RW.badges[b.id] && badgeOn(b.id)) { RW.badges[b.id] = GK.today(); GK.celebrate(b.ico + ' バッジ獲得', b.name); } });
    GK.rwSave();
  };
  GK.earn = function (n) {
    if (!n) return;
    var before = GK.levelOf(RW.coins).i;
    RW.coins += n; touchDay();
    var lv = GK.levelOf(RW.coins);
    if (lv.i > before) { GK.celebrate('🎉 段位アップ！', lv.name); GK.confetti(50); }
    GK.checkBadges(); GK.coinChip(); plusAnim(n);
  };
  GK.coinChip = function () {
    var el = GK.$('#coinBtn'); if (!el) return;
    var lv = GK.levelOf(RW.coins);
    el.innerHTML = '🪙<b>' + GK.fmtN(RW.coins) + '</b><span class="rk">' + lv.name + '</span>';
    el.title = 'コイン ' + GK.fmtN(RW.coins) + '・' + lv.name + '（おすとゲームへ）';
  };
  function plusAnim(n) {
    var el = GK.$('#coinBtn'); if (!el) return;
    var rc = el.getBoundingClientRect(), p = document.createElement('div');
    p.className = 'plus'; p.textContent = '+' + n; p.style.left = rc.left + rc.width / 2 + 'px'; p.style.top = rc.bottom + 'px';
    document.body.appendChild(p); setTimeout(function () { p.remove(); }, 900);
  }
  GK.rewardsHTML = function () {
    var lv = GK.levelOf(RW.coins), pc = lv.next ? (RW.coins - lv.from) / (lv.next - lv.from) * 100 : 100;
    var streak = RW.lastDay >= GK.dayNo() - 1 ? RW.streak : 0;
    return '<div class="lvbox"><div class="lvname">' + lv.name + '</div><div class="bar"><i style="width:' + pc + '%"></i></div>' +
      '<p class="note">' + (lv.next ? '🪙 ' + GK.fmtN(RW.coins) + '　あと ' + GK.fmtN(lv.next - RW.coins) + ' で ' + lv.nextName : '🪙 ' + GK.fmtN(RW.coins) + '　最高位です！') + (streak ? '　🔥 ' + streak + ' 日連続' : '') + '</p></div>' +
      '<div class="bdg">' + GK.BADGES.map(function (b) { return '<div class="bd' + (RW.badges[b.id] ? '' : ' off') + '" title="' + GK.esc(b.how) + '"><span>' + b.ico + '</span><b>' + b.name + '</b><small>' + (RW.badges[b.id] ? RW.badges[b.id] : b.how) + '</small></div>'; }).join('') + '</div>' +
      '<p class="note">コイン：演習で正解 +5、確認テスト合格 +50（はじめては +150）、タイムアタック 20 点ごとに +1、クラス対戦 参加 +20・3 位以内 +50</p>';
  };

  /* ---------- 画面の切りかえ（URL の # で） ---------- */
  var routes = [], leaveFns = [], always = [];
  GK.route = function (re, fn) { routes.push([re, fn]); };
  GK.onLeave = function (fn) { always.push(fn); };      // 画面をはなれるたびに いつも
  GK.onLeaveOnce = function (fn) { leaveFns.push(fn); }; // いまの画面を はなれる時だけ
  GK.go = function (h) { if (location.hash === h) GK.render(); else location.hash = h; };
  GK.render = function () {
    leaveFns.splice(0).concat(always).forEach(function (f) { try { f(); } catch (e) { } });
    GK.view.onclick = null;
    var h = decodeURIComponent(location.hash.slice(1)) || 'home';
    var tab = /^(drill)/.test(h) ? '#drill' : /^(tools)/.test(h) ? '#tools' : /^(game|ta$|host|join|battle)/.test(h) ? '#game' : '#home';
    GK.$$('#cnav button').forEach(function (b) { b.setAttribute('aria-current', b.dataset.go === tab ? 'true' : 'false'); });
    for (var i = 0; i < routes.length; i++) {
      var m = routes[i][0].exec(h);
      if (m) { GK.view.innerHTML = ''; routes[i][1](m); return; }
    }
    GK.go('#home');
  };
  window.addEventListener('hashchange', GK.render);
  document.addEventListener('click', function (e) {
    var g = e.target.closest('[data-go]');
    if (g) { e.preventDefault(); GK.go(g.dataset.go); }
  });
  GK.$('#brand').addEventListener('click', function () { GK.go('#home'); });

  /* ---------- 設定 ---------- */
  var dlg = GK.dlg = document.getElementById('dlg');
  GK.openDlg = function (html, onClick) {
    dlg.innerHTML = '<div class="dlg">' + html + '</div>';
    dlg.onclick = function (e) {
      if (e.target === dlg) { dlg.close(); return; }
      var b = e.target.closest('[data-d]'); if (!b) return;
      if (b.dataset.d === 'close') { dlg.close(); return; }
      onClick && onClick(b.dataset.d, b);
    };
    if (!dlg.open) dlg.showModal();
  };
  function segH(key, opts) {
    return '<div class="seg">' + opts.map(function (o) { return '<button type="button" data-d="' + key + ':' + o[0] + '" aria-pressed="' + (String(S[key]) === String(o[0])) + '">' + o[1] + '</button>'; }).join('') + '</div>';
  }
  GK.openSettings = function () {
    var html = '<h3>⚙ 設定<button type="button" class="btn ghost sm x" data-d="close">とじる</button></h3>' +
      '<div class="frow"><span>音名の書き方</span>' + segH('names', [['doremi', 'ドレミ'], ['jp', 'ハニホ'], ['en', 'CDE']]) + '</div>' +
      '<p class="note">問題の答えや 楽譜の下の文字が この書き方になります（調の名前は いつも「ハ長調」のように 日本音名）。</p>' +
      '<div class="frow"><span>文字の大きさ</span>' + segH('size', [[0, '小'], [1, '中'], [2, '大']]) + '</div>' +
      '<div class="frow"><span>画面</span>' + segH('theme', [['auto', '自動'], ['light', '明るい'], ['dark', '暗い']]) + '</div>' +
      '<div class="frow"><span>効果音</span>' + segH('sound', [[true, 'オン'], [false, 'オフ']]) + '</div>' +
      '<div class="frow"><span>クラス対戦の<br>データベース</span></div>' +
      '<div class="fld"><input type="text" id="dbUrl" placeholder="空なら 共通のデータベース" value="' + GK.esc(S.db || '') + '"><button type="button" class="btn sm" data-d="dbtest">保存して接続テスト</button></div>' +
      '<p class="note" id="dbSt">ふつうは空のままで OK（数学Aラボ・論理表現ラボと同じものにつながります）。</p>' +
      '<div class="frow"><button type="button" class="btn ghost sm" data-d="reset">記録をぜんぶ消す</button></div>';
    GK.openDlg(html, function (v) {
      if (v === 'dbtest') {
        S.db = GK.$('#dbUrl').value.trim(); GK.saveS();
        var st = GK.$('#dbSt'); st.textContent = 'つないでいます…';
        GK.api('GET', 'rooms/g0000/state').then(function () { st.textContent = '✅ つながりました'; }, function (e) { st.textContent = '✕ つながりません（' + e.message + '）'; });
        return;
      }
      if (v === 'reset') {
        if (confirm('進みぐあい・テストの点・コインを ぜんぶ消します。よいですか？')) {
          Object.keys(localStorage).forEach(function (k) { if (k.indexOf(PFX) === 0 && k !== PFX + 'set') localStorage.removeItem(k); });
          location.reload();
        }
        return;
      }
      var kv = v.split(':'), val = kv[1];
      if (kv[0] === 'size') val = +val; if (kv[0] === 'sound') val = val === 'true';
      S[kv[0]] = val; GK.saveS(); GK.applyLook(); GK.openSettings();
      if (kv[0] === 'names' || kv[0] === 'size') GK.render();
    });
  };
  GK.$('#setBtn').addEventListener('click', GK.openSettings);

  /* ---------- クラス対戦のデータベース（Firebase の REST） ---------- */
  GK.dbBase = function () {
    var u = (S.db || (window.GK_CONFIG && GK_CONFIG.db) || '').trim().replace(/\/+$/, '');
    return /^https:\/\/[^\s]+$/.test(u) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(u) ? u : '';
  };
  GK.api = function (method, path, body) {
    var o = { method: method };
    if (body !== undefined) o.body = JSON.stringify(body);
    if (!GK.dbBase()) return Promise.reject(new Error('データベースが未設定'));
    return fetch(GK.dbBase() + '/' + path + '.json', o).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  };
})();
