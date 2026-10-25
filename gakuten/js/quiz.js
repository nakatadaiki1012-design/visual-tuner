/* =========================================================
   楽典ラボ：問題を作る（同じ乱数なら 全員 同じ問題 → クラス対戦）
   gen(R) → { q: 問題文, fig: 図, ch: [文字 | { fig }], a: 正解の番号, ex: 解説, exFig: 解説の図, play: 鳴らすもの, ear: 聴く問題 }
   ※ 乱数は 必ず R を使う（Math.random は使わない）
   ========================================================= */
(function () {
  'use strict';
  var GK = window.GK, M = GK.M, F = GK.F, C = M.COL;
  var N = function (p) { return GK.nm(p); };
  var pick = function (a, R) { return a[Math.floor(R() * a.length)]; };
  var ri = function (a, b, R) { return a + Math.floor(R() * (b - a + 1)); };
  var shuffle = GK.shuffle;
  var T = {}; // 問題の種類

  // 正解 1 つ ＋ まちがい（key が同じものは 1 つに）
  function mc(R, right, wrongs, n) {
    n = n || 4;
    var seen = {}, list = [];
    seen[right.k] = 1;
    shuffle(wrongs.slice(), R).forEach(function (w) { if (list.length < n - 1 && !seen[w.k]) { seen[w.k] = 1; list.push(w); } });
    var all = shuffle([right].concat(list), R);
    return { ch: all.map(function (x) { return x.fig ? { fig: x.fig, k: x.k } : x.t; }), a: all.indexOf(right) };
  }
  var tx = function (t, k) { return { k: k == null ? t : k, t: t }; };
  var pn = function (p) { p = M.p(p); return { k: M.str({ l: p.l, a: p.a, o: 4 }), t: N(p) }; }; // 音名の選択肢（オクターブなし）
  function nat(lo, hi) { var r = [], a = M.dia(lo), b = M.dia(hi); for (var d = a; d <= b; d++) r.push({ l: d % 7, a: 0, o: Math.floor(d / 7) }); return r; }
  function posTxt(p, clef) { // 五線の どこか
    var bottom = { treble: 'E4', bass: 'G2', alto: 'F3' }[clef], d = M.dia(p) - M.dia(bottom);
    if (d >= 0 && d <= 8) return d % 2 === 0 ? '第' + (d / 2 + 1) + '線' : '第' + ((d + 1) / 2) + '間';
    if (d < 0) { var k = -d; return k % 2 === 0 ? '下第' + (k / 2) + '線' : (k === 1 ? '第1線の下' : '下第' + ((k - 1) / 2) + '線の下'); }
    var u = d - 8; return u % 2 === 0 ? '上第' + (u / 2) + '線' : (u === 1 ? '第5線の上' : '上第' + ((u - 1) / 2) + '線の上');
  }
  var one = function (p, clef, o) { return { score: F.one(M.str(p), Object.assign({ clef: clef }, o || {})) }; };
  var lens = function (b) { return b === Math.floor(b) ? b + '' : b === 0.5 ? '0.5' : (Math.round(b * 100) / 100) + ''; };
  // 音符の長さの名前
  var DN = { w: '全音符', h: '2分音符', q: '4分音符', '8': '8分音符', '16': '16分音符', hd: '付点2分音符', qd: '付点4分音符', '8d': '付点8分音符', wd: '付点全音符' };
  var RN = { wr: '全休符', hr: '2分休符', qr: '4分休符', '8r': '8分休符', '16r': '16分休符', qdr: '付点4分休符' };
  var noteFig = function (d, o) { o = o || {}; return { score: { clef: 'treble', notes: [{ k: o.k || 'B4', d: d, c: o.c, st: 1 }], minBar: o.w || 56, sp: 30, noClef: true, rhythm: true, above: 30, below: 22 } }; };
  // 足し算の図：音符 ＋ 音符
  function sumFig(ds, op) {
    var items = [], texts = [], x = 30, W = 70 + ds.length * 90;
    ds.forEach(function (d, i) {
      items.push({ s: 0, x: x, k: 'B4', d: d, st: 1 });
      if (i < ds.length - 1) texts.push({ x: x + 58, y: 64, t: op || '＋', size: 26 });
      x += 90;
    });
    return { free: { w: W - 30, h: 110, staves: [{ x: 0, y: -10, w: W, hide: true }], items: items, texts: texts } };
  }

  /* =================== 01 五線と音名 =================== */
  function readGen(clef, poolE, poolH, refTxt) {
    return function (R, st) {
      var p = pick(st >= 2 ? poolH : poolE, R);
      var wr = [-1, 1, -2, 2, 3, -3].map(function (k) { return pn(M.P(p.l + k, 0, p.o)); });
      var m = mc(R, pn(p), wr);
      return { q: 'この音の音名は？', fig: one(p, clef), ch: m.ch, a: m.a, ex: refTxt + '。この音は <b>' + posTxt(p, clef) + '</b> なので <b>' + N(p) + '</b>。', exFig: { score: F.one(M.str(p), { clef: clef, lab: N(p), c: C.red }) }, play: [[p, 1.5]] };
    };
  }
  T.readT = { u: 'u01', st: 1, gen: readGen('treble', nat('C4', 'A5'), nat('G3', 'C6'), 'ト音記号は 第2線が ソ') };
  T.readB = { u: 'u01', st: 2, gen: readGen('bass', nat('E2', 'C4'), nat('C2', 'E4'), 'ヘ音記号は 第4線が ファ') };
  T.readA = { u: 'u01', st: 3, gen: readGen('alto', nat('E3', 'C5'), nat('C3', 'E5'), 'ハ音記号（アルト）は 第3線が ド') };
  T.findNote = {
    u: 'u01', st: 1, gen: function (R) {
      var pool = nat('C4', 'G5'), p = pick(pool, R);
      var wr = [-1, 1, -2, 2, 3].map(function (k) { var x = M.P(p.l + k, 0, p.o); return { k: M.str(x), fig: one(x, 'treble') }; });
      var m = mc(R, { k: M.str(p), fig: one(p, 'treble') }, wr);
      return { q: 'ト音記号で「<b>' + N(p) + '</b>」はどれ？', fig: null, ch: m.ch, a: m.a, ex: '<b>' + N(p) + '</b> は ' + posTxt(p, 'treble') + '。', exFig: { score: F.one(M.str(p), { lab: N(p), c: C.red }) } };
    }
  };
  T.nameSys = {
    u: 'u01', st: 1, gen: function (R) {
      var sys = [['doremi', 'ドレミ'], ['jp', '日本音名'], ['en', '英語音名']], a = pick(sys, R), b = pick(sys.filter(function (s) { return s !== a; }), R);
      var p = { l: ri(0, 6, R), a: 0, o: 4 };
      var wr = [1, 2, 3, 4, 5, 6].map(function (k) { var x = M.P(p.l + k, 0, 4); return tx(M.name(x, b[0]), M.str(x)); });
      var m = mc(R, tx(M.name(p, b[0]), M.str(p)), wr);
      return { q: a[1] + 'の「<b>' + M.name(p, a[0]) + '</b>」は ' + b[1] + 'で？', fig: { html: '<table style="border-collapse:collapse;font-size:15px"><tr>' + ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ'].map(function (x, i) { return '<td style="padding:3px 9px;border:1px solid var(--line);' + (i === p.l && a[0] === 'doremi' ? 'background:var(--gold-soft)' : '') + '">' + (a[0] === 'doremi' ? x : '?') + '</td>'; }).join('') + '</tr></table>' }, ch: m.ch, a: m.a, ex: M.name(p, 'doremi') + '＝' + M.name(p, 'jp') + '＝' + M.name(p, 'en') + '（ド・レ・ミ… ＝ ハ・ニ・ホ・ヘ・ト・イ・ロ ＝ C・D・E・F・G・A・B）' };
    }
  };
  T.grandSame = {
    u: 'u01', st: 3, gen: function (R) {
      var p = pick(nat('A3', 'E4'), R);
      var wr = [-1, 1, -2, 2].map(function (k) { var x = M.P(p.l + k, 0, p.o); return { k: M.str(x), fig: one(x, 'treble') }; });
      var m = mc(R, { k: M.str(p), fig: one(p, 'treble') }, wr);
      return { q: 'ヘ音記号の この音と 同じ高さを ト音記号で書いたのは？', fig: one(p, 'bass'), ch: m.ch, a: m.a, ex: 'この音は <b>' + N(p) + '</b>（' + M.str(p) + '）。中央のド（C4）は どちらの記号でも 加線1本。', exFig: { score: { clef: 'grand', notes: [{ k: M.str(p), d: 'w', staff: 2, c: C.red }, { k: M.str(p), d: 'w', staff: 1, c: C.red, lab: N(p) }], sp: 50 } }, play: [[p, 1.5]] };
    }
  };

  /* =================== 02 音符と休符 =================== */
  T.durName = {
    u: 'u02', st: 1, gen: function (R, st) {
      var ds = st >= 2 ? ['hd', 'qd', '8d', 'h', 'q', '8', '16'] : ['w', 'h', 'q', '8', '16'];
      var d = pick(ds, R), wr = Object.keys(DN).map(function (k) { return tx(DN[k]); });
      var m = mc(R, tx(DN[d]), wr);
      return { q: 'この音符の名前は？', fig: noteFig(d, { w: 70 }), ch: m.ch, a: m.a, ex: '<b>' + DN[d] + '</b>：4分音符を1拍とすると <b>' + lens(M.len(d)) + ' 拍</b>。' };
    }
  };
  T.restName = {
    u: 'u02', st: 1, gen: function (R) {
      var ds = ['wr', 'hr', 'qr', '8r', '16r'], d = pick(ds, R);
      var m = mc(R, tx(RN[d]), ds.map(function (k) { return tx(RN[k]); }));
      return { q: 'この休符の名前は？', fig: { score: { clef: 'treble', notes: [{ d: d }], minBar: 70, noClef: true, zoom: 1.6 } }, ch: m.ch, a: m.a, ex: '<b>' + RN[d] + '</b>（' + lens(M.len(d.replace('r', ''))) + ' 拍）。全休符は 線から<b>ぶら下がる</b>、2分休符は 線に<b>のる</b>。', exFig: { c: 'noteTree', a: { rest: true } } };
    }
  };
  T.durCount = {
    u: 'u02', st: 2, gen: function (R) {
      var pairs = [['w', 'q'], ['w', '8'], ['h', '8'], ['hd', 'q'], ['hd', '8'], ['qd', '8'], ['qd', '16'], ['q', '16'], ['h', '16'], ['8d', '16'], ['wd', 'h']];
      var pr = pick(pairs, R), n = M.len(pr[0]) / M.len(pr[1]);
      var wr = [n - 1, n + 1, n * 2, n / 2, n + 2, n - 2].filter(function (x) { return x > 0 && x === Math.floor(x); }).map(function (x) { return tx(x + ' つ'); });
      var m = mc(R, tx(n + ' つ'), wr);
      return { q: '<b>' + DN[pr[0]] + '</b> は <b>' + DN[pr[1]] + '</b> いくつ分？', fig: sumFig([pr[0], pr[1]], '＝ ? ×'), ch: m.ch, a: m.a, ex: DN[pr[0]] + ' ＝ ' + lens(M.len(pr[0])) + ' 拍、' + DN[pr[1]] + ' ＝ ' + lens(M.len(pr[1])) + ' 拍。' + lens(M.len(pr[0])) + ' ÷ ' + lens(M.len(pr[1])) + ' ＝ <b>' + n + '</b>。' };
    }
  };
  T.durSum = {
    u: 'u02', st: 2, gen: function (R) {
      var sums = [[['q', '8'], 'qd'], [['h', 'q'], 'hd'], [['q', 'q'], 'h'], [['8', '8'], 'q'], [['h', 'h'], 'w'], [['8', '16'], '8d'], [['hd', 'q'], 'w'], [['qd', '8'], 'h'], [['16', '16'], '8'], [['q', '8', '8'], 'h']];
      var s = pick(sums, R), all = ['w', 'hd', 'h', 'qd', 'q', '8d', '8'];
      var m = mc(R, { k: s[1], fig: noteFig(s[1]) }, all.map(function (d) { return { k: d, fig: noteFig(d) }; }));
      var tot = s[0].reduce(function (a, d) { return a + M.len(d); }, 0);
      return { q: 'たすと どの音符と 同じ長さ？', fig: sumFig(s[0]), ch: m.ch, a: m.a, ex: s[0].map(function (d) { return lens(M.len(d)); }).join(' ＋ ') + ' ＝ <b>' + lens(tot) + ' 拍</b> ＝ ' + DN[s[1]] + '。' };
    }
  };
  T.longest = {
    u: 'u02', st: 1, gen: function (R) {
      var all = shuffle(['w', 'hd', 'h', 'qd', 'q', '8', '16'], R).slice(0, 4);
      var best = all.slice().sort(function (a, b) { return M.len(b) - M.len(a); })[0];
      var ch = all.map(function (d) { return { k: d, fig: noteFig(d) }; });
      return { q: 'いちばん 長い音符は？', ch: ch.map(function (x) { return { fig: x.fig, k: x.k }; }), a: all.indexOf(best), ex: all.map(function (d) { return DN[d] + ' ' + lens(M.len(d)) + '拍'; }).join('、') + '。いちばん長いのは <b>' + DN[best] + '</b>。' };
    }
  };

  /* =================== 03 拍子と小節 =================== */
  var FILL = {
    '2/4': [['q', 'q'], ['h'], ['8', '8', 'q'], ['qd', '8'], ['q', '8', '8'], ['8', '8', '8', '8']],
    '3/4': [['q', 'q', 'q'], ['h', 'q'], ['hd'], ['qd', '8', 'q'], ['q', 'h'], ['8', '8', 'q', 'q'], ['q', '8', '8', 'q']],
    '4/4': [['h', 'h'], ['q', 'q', 'h'], ['hd', 'q'], ['qd', '8', 'h'], ['w'], ['q', 'q', 'q', 'q'], ['8', '8', 'q', 'h'], ['q', 'hd']],
    '5/4': [['hd', 'h'], ['q', 'q', 'q', 'h'], ['h', 'q', 'h'], ['qd', '8', 'q', 'h']],
    '6/8': [['qd', 'qd'], ['q', '8', 'qd'], ['8', '8', '8', 'qd'], ['qd', 'q', '8'], ['hd'], ['8', '8', '8', '8', '8', '8']]
  };
  var melk = function (R) { return pick(['C5', 'B4', 'A4', 'G4', 'D5', 'E5', 'F4'], R); };
  T.timeFit = {
    u: 'u03', st: 2, gen: function (R) {
      var ts = ['2/4', '3/4', '4/4', '5/4', '6/8'], t = pick(ts, R), f = pick(FILL[t], R);
      var opts = t === '6/8' ? ['2/4', '6/8', '4/4', '5/4'] : ['2/4', '3/4', '4/4', '5/4'];
      var m = mc(R, tx(t), opts.map(function (o) { return tx(o); }));
      var beats = f.reduce(function (a, d) { return a + M.len(d); }, 0);
      return { q: 'この小節に合う 拍子記号は？', fig: { score: { clef: 'treble', notes: f.map(function (d) { return { k: melk(R), d: d }; }), end: 'end', sp: 40, bg: t === '6/8' ? '3/8' : null } }, ch: m.ch, a: m.a, ex: '音符をたすと 4分音符 <b>' + lens(beats) + ' 拍</b> 分。' + (t === '6/8' ? '8分音符6つ分で、3つずつ まとまっているので <b>6/8</b>。' : '→ <b>' + t + '</b>。'), play: function () { M.playSpec({ notes: f.map(function (d) { return { k: 'A4', d: d }; }) }, 100); } };
    }
  };
  T.missing = {
    u: 'u03', st: 2, gen: function (R) {
      var t = pick(['2/4', '3/4', '4/4'], R), f = pick(FILL[t].filter(function (x) { return x.length >= 2; }), R).slice();
      var last = f.pop(), rest = R() < 0.4;
      var ans = rest ? last + 'r' : last;
      var all = ['h', 'q', '8', 'qd', 'hd', 'w', 'hr', 'qr', '8r'];
      var m = mc(R, { k: ans, fig: noteFig(ans) }, all.filter(function (d) { return M.len(d.replace('r', '')) !== M.len(last); }).map(function (d) { return { k: d, fig: noteFig(d) }; }));
      var have = f.reduce(function (a, d) { return a + M.len(d); }, 0), need = parseInt(t, 10);
      return { q: t + '拍子。<b>？</b> に入れると ちょうど1小節になるのは？', fig: { score: { clef: 'treble', time: t, notes: f.map(function (d) { return { k: melk(R), d: d }; }).concat([{ k: 'B4', d: ans, c: 'transparent', lab: '？', lc: C.red }]), end: 'end', sp: 44 } }, ch: m.ch, a: m.a, ex: '1小節は ' + need + ' 拍。いまは ' + lens(have) + ' 拍なので あと <b>' + lens(need - have) + ' 拍</b>（' + (rest ? RN[ans] : DN[ans]) + '）。' };
    }
  };
  T.timeKind = {
    u: 'u03', st: 2, gen: function (R) {
      var L = [['2/4', '単純2拍子'], ['3/4', '単純3拍子'], ['4/4', '単純4拍子'], ['6/8', '複合2拍子'], ['9/8', '複合3拍子'], ['12/8', '複合4拍子']];
      var x = pick(L, R);
      var m = mc(R, tx(x[1]), L.map(function (y) { return tx(y[1]); }));
      var comp = /8$/.test(x[0]);
      return { q: '<b>' + x[0] + '</b> 拍子は？', fig: { score: { clef: 'treble', time: x[0], notes: [], minBar: 30 } }, ch: m.ch, a: m.a, ex: comp ? '8分音符が ' + parseInt(x[0], 10) + ' つ。3つずつ まとまって 付点4分音符 ' + parseInt(x[0], 10) / 3 + ' 拍 → <b>' + x[1] + '</b>。' : '4分音符が ' + parseInt(x[0], 10) + ' つ → <b>' + x[1] + '</b>。' };
    }
  };
  T.eighthCount = {
    u: 'u03', st: 1, gen: function (R) {
      var t = pick(['2/4', '3/4', '4/4', '6/8', '3/8', '2/2'], R), u = pick(['8', '16'], R);
      var top = parseInt(t, 10), bot = +t.split('/')[1], n = top * (u === '8' ? 8 : 16) / bot;
      var m = mc(R, tx(n + ' つ'), [n - 1, n + 1, n * 2, n / 2, n + 2, top].filter(function (x) { return x > 0 && x === Math.floor(x); }).map(function (x) { return tx(x + ' つ'); }));
      return { q: '<b>' + t + '</b> 拍子の1小節に <b>' + DN[u] + '</b> は いくつ入る？', fig: sumFig([u]), ch: m.ch, a: m.a, ex: t + ' は ' + bot + '分音符が ' + top + ' つ。' + bot + '分音符 1 つ ＝ ' + DN[u] + ' ' + ((u === '8' ? 8 : 16) / bot) + ' つ → ' + top + ' × ' + ((u === '8' ? 8 : 16) / bot) + ' ＝ <b>' + n + '</b>。' };
    }
  };
  T.strong = {
    u: 'u03', st: 1, gen: function (R) {
      var L = [['2/4', '強・弱'], ['3/4', '強・弱・弱'], ['4/4', '強・弱・中強・弱']], x = pick(L, R);
      var wr = ['強・弱・弱', '強・弱', '強・弱・中強・弱', '弱・強・弱', '強・強・弱', '弱・強・弱・強', '強・中強・弱'].map(function (s) { return tx(s); });
      var m = mc(R, tx(x[1]), wr);
      return { q: '<b>' + x[0] + '</b> 拍子の 拍の強さは？', fig: null, ch: m.ch, a: m.a, ex: '1拍目が いつも 強拍。' + x[0] + ' は <b>' + x[1] + '</b>。', exFig: { c: 'beats', a: { time: x[0] } } };
    }
  };

  /* =================== 04 リズム =================== */
  T.tieLen = {
    u: 'u04', st: 2, gen: function (R) {
      var cands = [['h', 'q'], ['q', '8'], ['h', 'h'], ['hd', 'q'], ['q', 'q', 'q'], ['h', '8'], ['qd', 'q'], ['w', 'h']];
      var ds = pick(cands, R), k = melk(R), tot = ds.reduce(function (a, d) { return a + M.len(d); }, 0);
      var wr = [tot - 1, tot + 1, tot - 0.5, tot + 0.5, M.len(ds[0]), tot * 2].filter(function (x) { return x > 0; }).map(function (x) { return tx(lens(x) + ' 拍'); });
      var m = mc(R, tx(lens(tot) + ' 拍'), wr);
      return { q: 'タイでつながった音は 何拍のばす？（4分音符＝1拍）', fig: { score: { clef: 'treble', notes: ds.map(function (d, i) { return { k: k, d: d, tie: i < ds.length - 1, c: C.red }; }), sp: 50 } }, ch: m.ch, a: m.a, ex: ds.map(function (d) { return lens(M.len(d)); }).join(' ＋ ') + ' ＝ <b>' + lens(tot) + ' 拍</b>。タイは 長さをたす。', play: function () { M.play([[k, tot]], 90); } };
    }
  };
  T.tripletQ = {
    u: 'u04', st: 2, gen: function (R) {
      var v = pick([['8', '4分音符 1つ分', '8分音符 2つ分の長さに 3つ'], ['q', '2分音符 1つ分', '4分音符 2つ分の長さに 3つ'], ['16', '8分音符 1つ分', '16分音符 2つ分の長さに 3つ']], R);
      var wr = ['4分音符 1つ分', '2分音符 1つ分', '8分音符 1つ分', '付点4分音符 1つ分', '付点2分音符 1つ分'].map(function (s) { return tx(s); });
      var m = mc(R, tx(v[1]), wr);
      return { q: 'この3連符（3つ全部）の長さは？', fig: { score: { clef: 'treble', notes: [0, 1, 2].map(function (i) { return { k: ['C5', 'D5', 'E5'][i], d: v[0], t3: true }; }), sp: 46, minBar: 100 } }, ch: m.ch, a: m.a, ex: '3連符は 2つ分を 3等分。' + v[2] + ' → <b>' + v[1] + '</b>。' };
    }
  };
  T.synco = {
    u: 'u04', st: 2, gen: function (R) {
      var good = pick([[['8', 'q', '8'], '2/4'], [['16', '8', '16', 'q'], '2/4'], [['8', 'q', 'q', 'q', '8'], '4/4']], R);
      var bad = shuffle([[['q', 'q'], '2/4'], [['8', '8', 'q'], '2/4'], [['q', '8', '8'], '2/4'], [['qd', '8'], '2/4'], [['16', '16', '8', 'q'], '2/4']], R).slice(0, 3);
      var fig = function (x) { return { score: { clef: 'treble', notes: x[0].map(function (d) { return { k: 'B4', d: d, st: 1 }; }), noClef: true, sp: 26, minBar: 60, rhythm: true, above: 30, below: 22 } }; };
      var m = mc(R, { k: 'g', fig: fig(good) }, bad.map(function (b, i) { return { k: 'b' + i, fig: fig(b) }; }));
      return { q: 'シンコペーションに なっているのは？', ch: m.ch, a: m.a, ex: '弱い拍（拍のうら）の音が 次の拍まで のびると、強弱の位置がずれる＝<b>シンコペーション</b>。', exFig: { score: { clef: 'treble', time: good[1], notes: good[0].map(function (d, i) { return { k: 'B4', d: d, c: d === 'q' && i > 0 ? C.red : null }; }), sp: 40 }, play: true } };
    }
  };
  T.pickup = {
    u: 'u04', st: 2, gen: function (R) {
      var t = pick([3, 4, 2], R), p = ri(1, t - 1, R), last = t - p;
      var m = mc(R, tx(last + ' 拍'), [1, 2, 3, 4].map(function (x) { return tx(x + ' 拍'); }));
      return { q: '<b>' + t + '/4</b> 拍子の曲が <b>' + p + ' 拍分</b> の弱起で始まる。最後の小節は ふつう何拍？', fig: null, ch: m.ch, a: m.a, ex: '最初と最後で 1小節になるように書く。' + t + ' − ' + p + ' ＝ <b>' + last + ' 拍</b>。' };
    }
  };
  T.beatCount = {
    u: 'u04', st: 1, gen: function (R, st) {
      var pool = st >= 2 ? ['hd', 'qd', '8', 'q', 'qr', 'h', '8r', '16'] : ['h', 'q', '8', 'qr', 'w', 'hr'];
      var n = ri(2, 4, R), ds = [], tot = 0;
      for (var i = 0; i < n; i++) { var d = pick(pool, R); if (tot + M.len(d.replace('r', '')) > 6) d = 'q'; ds.push(d); tot += M.len(d.replace('r', '')); }
      if (ds.filter(function (d) { return d === '8'; }).length % 2) { ds.push('8'); tot += 0.5; }
      var wr = [tot - 1, tot + 1, tot - 0.5, tot + 0.5, tot + 2].filter(function (x) { return x > 0; }).map(function (x) { return tx(lens(x) + ' 拍'); });
      var m = mc(R, tx(lens(tot) + ' 拍'), wr);
      return { q: 'ぜんぶで 何拍分？（4分音符＝1拍、休符も数える）', fig: { score: { clef: 'treble', notes: ds.map(function (d) { return { k: melk(R), d: d }; }), sp: 40 } }, ch: m.ch, a: m.a, ex: ds.map(function (d) { return lens(M.len(d.replace('r', ''))); }).join(' ＋ ') + ' ＝ <b>' + lens(tot) + ' 拍</b>。' };
    }
  };

  /* =================== 05 変化記号 =================== */
  T.accName = {
    u: 'u05', st: 1, gen: function (R) {
      var p = pick(nat('D4', 'F5'), R); p.a = R() < 0.5 ? 1 : -1;
      var wr = [{ l: p.l, a: -p.a, o: 4 }, { l: p.l, a: 0, o: 4 }, M.P(p.l + 1, p.a, 4), M.P(p.l - 1, p.a, 4), M.P(p.l + 1, -p.a, 4)].map(pn);
      var m = mc(R, pn(p), wr);
      return { q: 'この音の音名は？', fig: one(p, 'treble'), ch: m.ch, a: m.a, ex: '<b>' + N({ l: p.l, a: 0, o: 4 }) + '</b> に ' + (p.a > 0 ? '♯（半音上げ）' : '♭（半音下げ）') + ' → <b>' + N(p) + '</b>（' + M.nameAll(p) + '）。', play: [[p, 1.5]] };
    }
  };
  T.halfWhole = {
    u: 'u05', st: 1, gen: function (R) {
      var p = pick(nat('C4', 'B4'), R); p.a = pick([0, 0, 1, -1], R);
      var q = M.P(p.l + 1, pick([0, 0, 1, -1], R), p.o);
      var s = M.midi(q) - M.midi(p);
      if (s !== 1 && s !== 2) { q.a += s < 1 ? 1 - s : 2 - s; q.a = Math.max(-1, Math.min(1, q.a)); s = M.midi(q) - M.midi(p); }
      if (s !== 1 && s !== 2) { p = { l: 2, a: 0, o: 4 }; q = { l: 3, a: 0, o: 4 }; s = 1; }
      var ans = s === 1 ? '半音' : '全音';
      var mk = {}; mk[M.midi(p)] = { c: C.red }; mk[M.midi(q)] = { c: C.red };
      return { q: '2つの音の へだたりは？', fig: { score: { clef: 'treble', notes: [{ k: M.str(p), d: 'w' }, { k: M.str(q), d: 'w' }], sp: 60 } }, ch: ['半音', '全音'], a: ans === '半音' ? 0 : 1, ex: N(p) + ' と ' + N(q) + ' の間は 鍵盤で <b>' + (s === 1 ? 'となり（半音）' : '1つとばし（全音）') + '</b>。', exFig: { kbd: { from: 'C4', to: 'B5', mark: mk, steps: [[M.midi(p), M.midi(q), ans, C.red]], h: 70 } }, play: [[p, 1], [q, 1]] };
    }
  };
  T.enharm = {
    u: 'u05', st: 2, gen: function (R) {
      var pairs = [['C#4', 'Db4'], ['D#4', 'Eb4'], ['F#4', 'Gb4'], ['G#4', 'Ab4'], ['A#4', 'Bb4'], ['E#4', 'F4'], ['B#3', 'C4'], ['Cb4', 'B3'], ['Fb4', 'E4']];
      var pr = pick(pairs, R), sw = R() < 0.5, a = M.p(sw ? pr[1] : pr[0]), b = M.p(sw ? pr[0] : pr[1]);
      var wr = [M.P(b.l, b.a + (b.a >= 0 ? 1 : -1), b.o), M.P(a.l, -a.a, a.o), M.P(b.l + 1, b.a, b.o), M.P(b.l - 1, b.a, b.o), M.P(a.l + 2, 0, a.o)].filter(function (x) { return M.midi(x) % 12 !== M.midi(a) % 12; }).map(pn);
      var m = mc(R, pn(b), wr);
      var mk = {}; mk[M.midi(a)] = { c: C.red };
      return { q: '<b>' + N(a) + '</b> と 同じ鍵盤の音（異名同音）は？', fig: { kbd: { from: 'C4', to: 'B4', h: 80 } }, ch: m.ch, a: m.a, ex: '<b>' + N(a) + '</b> ＝ <b>' + N(b) + '</b>。名前はちがうが 同じ鍵盤。', exFig: { kbd: { from: 'C4', to: 'B4', mark: mk, h: 80 } } };
    }
  };
  T.accRule = {
    u: 'u05', st: 3, gen: function (R) {
      var base = pick(nat('D4', 'E5'), R), acc = pick([1, -1], R), sameBar = R() < 0.5;
      var A = { l: base.l, a: acc, o: base.o }, other = M.P(base.l + 2, 0, base.o);
      var target = sameBar ? A : { l: base.l, a: 0, o: base.o };
      var bars = sameBar ? [[{ k: M.str(A), d: 'q' }, { k: M.str(other), d: 'q' }, { k: M.str(target), d: 'h', c: C.red, lab: '★' }]] : [[{ k: M.str(A), d: 'q' }, { k: M.str(other), d: 'q' }, { k: M.str(other), d: 'h' }], [{ k: M.str(target), d: 'h', c: C.red, lab: '★' }, { k: M.str(other), d: 'h' }]];
      var wr = [{ l: base.l, a: acc, o: 4 }, { l: base.l, a: 0, o: 4 }, { l: base.l, a: -acc, o: 4 }, M.P(base.l + 1, 0, 4)].map(pn);
      var m = mc(R, pn(target), wr);
      return { q: '★の音は？', fig: { score: { clef: 'treble', time: sameBar ? '4/4' : '4/4', bars: bars, end: 'end', sp: 46 } }, ch: m.ch, a: m.a, ex: sameBar ? '臨時記号は <b>同じ小節</b>の 同じ高さの音に 効きつづける → <b>' + N(target) + '</b>。' : '小節線をこえると 臨時記号の効き目は なくなる → <b>' + N(target) + '</b>。' };
    }
  };
  T.kbdName = {
    u: 'u05', st: 1, gen: function (R) {
      var bl = pick([[61, 'C#4', 'Db4'], [63, 'D#4', 'Eb4'], [66, 'F#4', 'Gb4'], [68, 'G#4', 'Ab4'], [70, 'A#4', 'Bb4']], R);
      var right = M.p(R() < 0.5 ? bl[1] : bl[2]);
      var wr = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C#4', 'D#4', 'F#4', 'G#4', 'A#4', 'Db4', 'Eb4', 'Gb4', 'Ab4', 'Bb4'].map(M.p).filter(function (p) { return M.midi(p) !== bl[0]; }).filter(function (p) { return Math.abs(M.midi(p) - bl[0]) <= 2; }).map(pn);
      var m = mc(R, pn(right), wr);
      var mk = {}; mk[bl[0]] = { c: C.red, t: '★' };
      return { q: '★の 黒鍵の音名は？', fig: { kbd: { from: 'C4', to: 'B4', mark: mk, h: 100 } }, ch: m.ch, a: m.a, ex: '★は <b>' + N(bl[1]) + '</b> とも <b>' + N(bl[2]) + '</b> ともいう（左の白鍵の♯／右の白鍵の♭）。' };
    }
  };

  /* =================== 06 音程 =================== */
  var IVS_EASY = [['m', 2], ['M', 2], ['m', 3], ['M', 3], ['P', 4], ['P', 5], ['m', 6], ['M', 6], ['m', 7], ['M', 7], ['P', 8]];
  var IVS_HARD = IVS_EASY.concat([['A', 4], ['d', 5], ['A', 2], ['d', 7], ['A', 5], ['d', 4], ['A', 6], ['d', 3]]);
  function ivWrongs(deg, q) {
    var r = [], perf = [1, 4, 5, 8].indexOf(deg) >= 0;
    (perf ? ['P', 'A', 'd'] : ['M', 'm', 'A', 'd']).forEach(function (x) { if (x !== q) r.push(M.ivName(deg, x)); });
    [deg - 1, deg + 1].forEach(function (d) { if (d >= 1 && d <= 8) r.push(M.ivName(d, [1, 4, 5, 8].indexOf(d) >= 0 ? 'P' : q === 'P' ? 'M' : q)); });
    return r.map(function (s) { return tx(s); });
  }
  function ivPair(R, hard) {
    for (var t = 0; t < 30; t++) {
      var iv = pick(hard ? IVS_HARD : IVS_EASY, R), a = pick(nat('C4', 'G5'), R);
      if (hard) a.a = pick([0, 0, 1, -1], R);
      var b = M.up(a, iv[1], iv[0]);
      if (Math.abs(b.a) <= 1 && M.midi(b) <= 86) return [a, b, iv];
    }
    return [M.p('C4'), M.p('E4'), ['M', 3]];
  }
  T.ivDeg = {
    u: 'u06', st: 1, gen: function (R) {
      var a = pick(nat('C4', 'E5'), R), d = ri(2, 8, R), b = M.P(a.l + d - 1, 0, a.o);
      var m = mc(R, tx(d + '度'), [d - 1, d + 1, d - 2, d + 2].filter(function (x) { return x >= 1 && x <= 9; }).map(function (x) { return tx(x + '度'); }));
      var labs = []; for (var i = 0; i < d; i++) labs.push(M.str(M.P(a.l + i, 0, a.o)));
      return { q: '2つの音の音程は 何度？', fig: { score: { clef: 'treble', notes: [{ k: M.str(a), d: 'w' }, { k: M.str(b), d: 'w' }], sp: 60 } }, ch: m.ch, a: m.a, ex: '下の音も 上の音も 数に入れる：' + labs.map(function (k) { return N(k); }).join('・') + ' → <b>' + d + '度</b>。', exFig: { score: { clef: 'treble', notes: labs.map(function (k, i) { return { k: k, d: 'q', lab: (i + 1) + '', c: i === 0 || i === labs.length - 1 ? C.red : C.gray }; }), sp: 34 } } };
    }
  };
  T.ivName = {
    u: 'u06', st: 2, gen: function (R, st) {
      var pr = ivPair(R, st >= 3), a = pr[0], b = pr[1], iv = M.interval(a, b), harm = R() < 0.5;
      var m = mc(R, tx(iv.name), ivWrongs(iv.deg, iv.q));
      var mk = {}; mk[M.midi(a)] = { c: C.red }; mk[M.midi(b)] = { c: C.red };
      return { q: '2つの音の音程は？', fig: { score: { clef: 'treble', notes: harm ? [{ k: [M.str(a), M.str(b)], d: 'w' }] : [{ k: M.str(a), d: 'w' }, { k: M.str(b), d: 'w' }], sp: 60, minBar: 80 } }, ch: m.ch, a: m.a, ex: N(a) + '〜' + N(b) + '：<b>' + iv.deg + '度</b>で 半音 <b>' + iv.semis + ' 個</b> → <b>' + iv.name + '</b>。', exFig: { kbd: { from: M.midi(a) < 60 ? 'C3' : 'C4', to: M.midi(b) > 83 ? 'B6' : 'B5', mark: mk, steps: [[M.midi(a), M.midi(b), '半音' + iv.semis, C.red]], h: 70 } }, play: harm ? [[[a, b], 2]] : [[a, 1], [b, 1.5]] };
    }
  };
  T.ivBuild = {
    u: 'u06', st: 2, gen: function (R) {
      var pr = ivPair(R, false), a = pr[0], iv = pr[2], b = pr[1];
      var wr = [M.up(a, iv[1], iv[0] === 'M' ? 'm' : iv[0] === 'm' ? 'M' : 'A'), M.up(a, iv[1] + 1, [1, 4, 5, 8].indexOf(iv[1] + 1) >= 0 ? 'P' : 'M'), M.up(a, iv[1] - 1 || 1, [1, 4, 5, 8].indexOf(iv[1] - 1) >= 0 ? 'P' : 'm'), M.up(a, iv[1], iv[0], true)].filter(function (x) { return Math.abs(x.a) <= 1; }).map(pn);
      var m = mc(R, pn(b), wr);
      return { q: '<b>' + N(a) + '</b> の <b>' + M.ivName(iv[1], iv[0]) + ' 上</b> の音は？', fig: one(a, 'treble'), ch: m.ch, a: m.a, ex: N(a) + ' から ' + iv[1] + '度上は ' + N({ l: b.l, a: 0, o: 4 }) + ' のなかま。半音 ' + M.interval(a, b).semis + ' 個にするため <b>' + N(b) + '</b>。', exFig: { score: { clef: 'treble', notes: [{ k: M.str(a), d: 'w', lab: N(a) }, { k: M.str(b), d: 'w', lab: N(b), c: C.red }], sp: 60 } }, play: [[a, 1], [b, 1.5]] };
    }
  };
  T.ivInv = {
    u: 'u06', st: 2, gen: function (R) {
      var iv = pick(IVS_EASY.filter(function (x) { return x[1] < 8; }).concat([['A', 4], ['d', 5]]), R), d2 = 9 - iv[1], q2 = M.invQ[iv[0]];
      var m = mc(R, tx(M.ivName(d2, q2)), ivWrongs(d2, q2).concat([tx(M.ivName(iv[1], iv[0]))]));
      var a = M.p('C4'), b = M.up(a, iv[1], iv[0]);
      return { q: '<b>' + M.ivName(iv[1], iv[0]) + '</b> を 転回すると？', fig: { score: { clef: 'treble', notes: [{ k: [M.str(a), M.str(b)], d: 'w', lab: M.ivName(iv[1], iv[0]) }, { k: [M.str(b), 'C5'], d: 'w', lab: '？', kc: [null, C.red] }], sp: 70 } }, ch: m.ch, a: m.a, ex: '度数は 9 − ' + iv[1] + ' ＝ ' + d2 + '。' + M.QN[iv[0]] + ' は <b>' + M.QN[q2] + '</b> に → <b>' + M.ivName(d2, q2) + '</b>。' };
    }
  };
  T.ivEar = {
    u: 'u06', st: 2, ear: true, gen: function (R) {
      var set = [['m', 2], ['M', 2], ['m', 3], ['M', 3], ['P', 4], ['P', 5], ['P', 8]];
      var iv = pick(set, R), a = pick(nat('C4', 'G4'), R), b = M.up(a, iv[1], iv[0]);
      var m = mc(R, tx(M.ivName(iv[1], iv[0])), set.map(function (x) { return tx(M.ivName(x[1], x[0])); }));
      return { q: '🔊 聴いて答えよう：何の音程？', ear: true, ch: m.ch, a: m.a, ex: '<b>' + M.ivName(iv[1], iv[0]) + '</b>（' + N(a) + '〜' + N(b) + '）。長3度は明るく、短3度は少し暗い。完全5度・8度は よくとける。', exFig: { score: { clef: 'treble', notes: [{ k: M.str(a), d: 'h' }, { k: M.str(b), d: 'h' }, { k: [M.str(a), M.str(b)], d: 'w' }], sp: 50 } }, play: [[a, 1], [b, 1], [[a, b], 2]] };
    }
  };

  /* =================== 07 長音階 =================== */
  T.majPattern = {
    u: 'u07', st: 1, gen: function (R) {
      if (R() < 0.5) {
        var m = mc(R, tx('全・全・半・全・全・全・半'), ['全・半・全・全・半・全・全', '全・全・全・半・全・全・半', '半・全・全・全・半・全・全', '全・全・半・全・全・半・全'].map(function (s) { return tx(s); }));
        return { q: '長音階の 全音・半音の ならびは？', ch: m.ch, a: m.a, ex: '長音階は <b>全・全・半・全・全・全・半</b>（3〜4番目と 7〜8番目が 半音）。', exFig: { kbd: { from: 'C4', to: 'C5', steps: [[60, 62, '全'], [62, 64, '全'], [64, 65, '半', C.red], [65, 67, '全'], [67, 69, '全'], [69, 71, '全'], [71, 72, '半', C.red]], h: 70 } } };
      }
      var m2 = mc(R, tx('3〜4番目 と 7〜8番目'), ['2〜3番目 と 5〜6番目', '3〜4番目 と 6〜7番目', '4〜5番目 と 7〜8番目', '1〜2番目 と 5〜6番目'].map(function (s) { return tx(s); }));
      return { q: '長音階で <b>半音</b> になるのは どこ？', ch: m2.ch, a: m2.a, ex: '長音階は 全・全・<b>半</b>・全・全・全・<b>半</b>。ハ長調なら ミ‐ファ と シ‐ド。' };
    }
  };
  T.majWrong = {
    u: 'u07', st: 2, gen: function (R) {
      var f = ri(-3, 3, R), sc = M.scale(M.keyTonic(f), 'major').map(function (p) { return M.p(M.str(p)); });
      var i = ri(1, 6, R), w = sc[i];
      sc[i] = { l: w.l, a: w.a + (w.a >= 1 ? -1 : w.a <= -1 ? 1 : pick([1, -1], R)), o: w.o };
      var nums = [i, i - 1, i + 1, i + 2, i - 2].filter(function (x) { return x >= 1 && x <= 6; });
      var m = mc(R, tx((i + 1) + ' 番目', i), nums.map(function (x) { return tx((x + 1) + ' 番目', x); }));
      return { q: M.keyName(f) + 'の 長音階。まちがっている音は？', fig: { score: { clef: 'treble', notes: sc.map(function (p, j) { return { k: M.str(p), d: 'q', lab: (j + 1) + '' }; }), sp: 40, beam: false } }, ch: m.ch, a: m.a, ex: '正しくは <b>' + N(w) + '</b>。全・全・半・全・全・全・半 の ならびに 合わない。', exFig: { score: { clef: 'treble', key: f, notes: M.scale(M.keyTonic(f), 'major').map(function (p, j) { return { k: M.str(p), d: 'q', c: j === i ? C.red : null, lab: j === i ? N(p) : null }; }), sp: 36 } } };
    }
  };
  T.degreeName = {
    u: 'u07', st: 2, gen: function (R) {
      if (R() < 0.35) {
        var dI = pick([0, 3, 4, 6], R);
        var m0 = mc(R, tx(M.DEG[dI]), M.DEG.map(function (s) { return tx(s); }));
        return { q: '音階の <b>' + (dI + 1) + ' 番目</b>（' + M.ROMAN[dI] + '）の音の名前は？', ch: m0.ch, a: m0.a, ex: 'Ⅰ主音・Ⅱ上主音・Ⅲ中音・Ⅳ下属音・Ⅴ属音・Ⅵ下中音・Ⅶ導音。<b>' + M.ROMAN[dI] + '＝' + M.DEG[dI] + '</b>。' };
      }
      var f = ri(-4, 4, R), d = pick([4, 3, 6], R), sc = M.scale(M.keyTonic(f), 'major'), p = sc[d];
      var wr = sc.slice(0, 7).map(pn).concat([pn({ l: p.l, a: p.a === 0 ? 1 : 0, o: 4 })]);
      var m = mc(R, pn(p), wr);
      return { q: '<b>' + M.keyName(f) + '</b> の <b>' + M.DEG[d] + '</b> は？', fig: { score: { clef: 'treble', key: f, notes: [{ k: M.str(sc[0]), d: 'w', lab: '主音' }], minBar: 60 } }, ch: m.ch, a: m.a, ex: M.DEG[d] + 'は 音階の ' + (d + 1) + ' 番目 → <b>' + N(p) + '</b>。', exFig: { score: { clef: 'treble', key: f, notes: sc.map(function (q, j) { return { k: M.str(q), d: 'q', c: j === d ? C.red : null, lab: j === d ? N(q) : M.ROMAN[j % 7] }; }), sp: 36 } } };
    }
  };
  T.scaleName = {
    u: 'u07', st: 2, gen: function (R) {
      var f = ri(-5, 5, R), sc = M.scale(M.keyTonic(f), 'major');
      var wr = [f - 1, f + 1, f + 2, f - 2, -f].filter(function (x) { return x >= -7 && x <= 7; }).map(function (x) { return tx(M.keyName(x), x); });
      var m = mc(R, tx(M.keyName(f), f), wr);
      return { q: '何長調の 音階？', fig: { score: { clef: 'treble', notes: sc.map(function (p) { return { k: M.str(p), d: 'q' }; }), sp: 36, beam: false } }, ch: m.ch, a: m.a, ex: '始まりの音（主音）は <b>' + M.name(sc[0], 'jp') + '</b> → <b>' + M.keyName(f) + '</b>。', play: function () { M.playNotes(sc.map(M.str), { beat: 0.5, bpm: 100 }); } };
    }
  };

  /* =================== 08 短音階 =================== */
  T.minType = {
    u: 'u08', st: 2, gen: function (R) {
      var tn = pick(['A4', 'E4', 'D4', 'G4', 'C4', 'B4'], R), ty = pick(['natural', 'harmonic', 'melodic', 'major'], R);
      var sc = M.scale(tn, ty);
      var all = ['natural', 'harmonic', 'melodic', 'major'];
      var m = mc(R, tx(M.SCALE_NAME[ty], ty), all.map(function (t) { return tx(M.SCALE_NAME[t], t); }));
      var why = { natural: '3・6・7番目が 長音階より半音低い まま', harmonic: '7番目だけ 半音上がっている（導音）', melodic: '6・7番目が 半音上がっている（上り）', major: '3番目が 主音の長3度上（明るい）' }[ty];
      return { q: '<b>' + M.name(M.p(tn), 'jp') + '</b> から始まる この音階は？', fig: { score: { clef: 'treble', notes: sc.map(function (p) { return { k: M.str(p), d: 'q' }; }), sp: 36, beam: false } }, ch: m.ch, a: m.a, ex: '<b>' + M.SCALE_NAME[ty] + '</b>：' + why + '。', play: function () { M.playNotes(sc.map(M.str), { beat: 0.5, bpm: 100 }); } };
    }
  };
  T.minLead = {
    u: 'u08', st: 2, gen: function (R) {
      var f = ri(-3, 3, R), tn = M.keyTonic(f, true), sc = M.scale(tn, 'natural'), sev = sc[6], up = M.up(sev, 1, 'A');
      var wr = [sev, sc[5], M.up(sc[5], 1, 'A'), sc[4], M.up(sc[2], 1, 'A')].map(pn);
      var m = mc(R, pn(up), wr);
      return { q: '<b>' + M.keyName(f, true) + '</b> の 和声短音階で 半音上げる音は？', fig: { score: { clef: 'treble', key: f, minor: true, notes: sc.map(function (p) { return { k: M.str(p), d: 'q' }; }), sp: 34, beam: false } }, ch: m.ch, a: m.a, ex: '第7音（' + N(sev) + '）を半音上げて 導音を作る → <b>' + N(up) + '</b>。', exFig: { score: { clef: 'treble', key: f, minor: true, notes: M.scale(tn, 'harmonic').map(function (p, j) { return { k: M.str(p), d: 'q', c: j === 6 ? C.red : null, lab: j === 6 ? N(p) : null }; }), sp: 34 } } };
    }
  };
  T.minEar = {
    u: 'u08', st: 1, ear: true, gen: function (R) {
      var tn = pick(['C4', 'D4', 'E4', 'G4', 'A3'], R), mj = R() < 0.5, sc = M.scale(tn, mj ? 'major' : pick(['natural', 'harmonic'], R));
      return { q: '🔊 聴いて答えよう：長音階？ 短音階？', ear: true, ch: ['長音階（明るい）', '短音階（暗い）'], a: mj ? 0 : 1, ex: '<b>' + (mj ? '長音階' : '短音階') + '</b>。3番目の音が 主音から長3度なら 明るく、短3度なら 暗く聞こえる。', play: function () { M.playNotes(sc.map(M.str), { beat: 0.5, bpm: 110 }); }, exFig: { score: { clef: 'treble', notes: sc.map(function (p, j) { return { k: M.str(p), d: 'q', c: j === 2 ? C.red : null }; }), sp: 34 } } };
    }
  };
  T.majMinEar = {
    u: 'u08', st: 1, ear: true, gen: function (R) {
      var mj = R() < 0.5, f = 0, seq = [1, 4, 5, 1].map(function (d) { return [M.diatonic(mj ? 0 : 0, !mj, d).map(function (p) { return M.str({ l: p.l, a: p.a, o: p.o - (mj ? 0 : 1) }); }), 1]; });
      return { q: '🔊 聴いて答えよう：長調？ 短調？', ear: true, ch: ['長調', '短調'], a: mj ? 0 : 1, ex: '<b>' + (mj ? 'ハ長調' : 'イ短調') + '</b> の Ⅰ‐Ⅳ‐Ⅴ‐Ⅰ。短調は Ⅰ が短三和音なので 暗く聞こえる。', play: function () { M.play(seq, 80); } };
    }
  };

  /* =================== 09 調と調号 =================== */
  var ksig = function (f, minor) { return { score: { clef: 'treble', key: f, minor: minor, notes: [], minBar: 30 } }; };
  T.keyMaj = {
    u: 'u09', st: 1, gen: function (R, st) {
      var f = st >= 2 ? pick([-7, -6, -5, -4, 4, 5, 6, 7, -3, 3], R) : ri(-3, 3, R);
      var wr = [f - 1, f + 1, -f, f + 2, f - 2].filter(function (x) { return x >= -7 && x <= 7; }).map(function (x) { return tx(M.keyName(x), x); }).concat([tx(M.keyName(f, true), 'm')]);
      var m = mc(R, tx(M.keyName(f), f), wr);
      var how = f === 0 ? '調号なしは ハ長調' : f > 0 ? 'いちばん右の♯（' + N({ l: M.SHARPS[f - 1], a: 1, o: 4 }) + '）の 半音上' : f === -1 ? '♭1つは ヘ長調' : '右から2番目の♭（' + N({ l: M.FLATS[-f - 2], a: -1, o: 4 }) + '）';
      return { q: 'この調号の <b>長調</b> は？', fig: ksig(f), ch: m.ch, a: m.a, ex: how + ' → <b>' + M.keyName(f) + '</b>。', exFig: { score: { clef: 'treble', key: f, notes: [{ k: M.str(M.keyTonic(f)), d: 'w', c: C.red, lab: '主音' }], minBar: 60 } } };
    }
  };
  T.keyMin = {
    u: 'u09', st: 2, gen: function (R) {
      var f = ri(-4, 4, R);
      var wr = [tx(M.keyName(f), 'M')].concat([f - 1, f + 1, -f, f + 3].filter(function (x) { return x >= -7 && x <= 7; }).map(function (x) { return tx(M.keyName(x, true), x); }));
      var m = mc(R, tx(M.keyName(f, true), f), wr);
      return { q: 'この調号の <b>短調</b> は？', fig: ksig(f, true), ch: m.ch, a: m.a, ex: '長調は ' + M.keyName(f) + '。その主音の <b>短3度下</b> → <b>' + M.keyName(f, true) + '</b>（平行調）。', exFig: { score: { clef: 'treble', key: f, notes: [{ k: M.str(M.keyTonic(f)), d: 'w', lab: '長調の主音' }, { k: M.str(M.up(M.keyTonic(f), 3, 'm', true)), d: 'w', c: C.red, lab: '短調の主音' }], sp: 70, ls: 12 } } };
    }
  };
  T.keySig = {
    u: 'u09', st: 2, gen: function (R) {
      var minor = R() < 0.3, f = ri(-5, 5, R); if (f === 0) f = pick([2, -2], R);
      var fig = function (x) { return { score: { clef: 'treble', key: x, minor: minor, notes: [], minBar: 20 } }; };
      var wr = [f - 1, f + 1, -f, f + 2, f - 2].filter(function (x) { return x >= -7 && x <= 7 && x !== 0; }).map(function (x) { return { k: x, fig: fig(x) }; });
      var m = mc(R, { k: f, fig: fig(f) }, wr);
      return { q: '<b>' + M.keyName(f, minor) + '</b> の 調号は？', ch: m.ch, a: m.a, ex: M.keyName(f, minor) + ' は <b>' + (f > 0 ? '♯ ' + f + ' つ' : '♭ ' + (-f) + ' つ') + '</b>。' + (minor ? '平行調の ' + M.keyName(f) + ' と同じ。' : '') };
    }
  };
  T.related = {
    u: 'u09', st: 3, gen: function (R) {
      var f = ri(-3, 3, R), kind = pick(['平行調', '同主調', '属調', '下属調'], R);
      var ans = { '平行調': M.keyName(f, true), '同主調': M.name(M.keyTonic(f), 'jp') + '短調', '属調': M.keyName(f + 1), '下属調': M.keyName(f - 1) }[kind];
      var wr = [M.keyName(f, true), M.name(M.keyTonic(f), 'jp') + '短調', M.keyName(f + 1), M.keyName(f - 1), M.keyName(f + 1, true), M.keyName(f - 3)].map(function (s) { return tx(s); });
      var m = mc(R, tx(ans), wr);
      var why = { '平行調': '調号が同じ短調（主音が短3度下）', '同主調': '主音が同じ短調', '属調': '♯が1つ多い（主音が完全5度上）', '下属調': '♭が1つ多い（主音が完全4度上）' }[kind];
      return { q: '<b>' + M.keyName(f) + '</b> の <b>' + kind + '</b> は？', ch: m.ch, a: m.a, ex: kind + '＝' + why + ' → <b>' + ans + '</b>。', exFig: { c: 'related', a: { f: f } } };
    }
  };
  T.keyOrderQ = {
    u: 'u09', st: 1, gen: function (R) {
      var sh = R() < 0.5, n = ri(1, 7, R), L = sh ? M.SHARPS : M.FLATS, p = { l: L[n - 1], a: sh ? 1 : -1, o: 4 };
      var wr = L.map(function (l) { return pn({ l: l, a: sh ? 1 : -1, o: 4 }); });
      var m = mc(R, pn(p), wr);
      return { q: (sh ? '♯' : '♭') + ' の調号で <b>' + n + ' 番目</b> に つくのは？', ch: m.ch, a: m.a, ex: (sh ? '♯は ファ・ド・ソ・レ・ラ・ミ・シ' : '♭は シ・ミ・ラ・レ・ソ・ド・ファ') + ' の順 → <b>' + N(p) + '</b>。', exFig: { c: 'keyOrder', a: { sharp: sh } } };
    }
  };

  /* =================== 10 和音 =================== */
  var TRI = ['maj', 'min', 'aug', 'dim'];
  function chordFig(ps, o) { o = o || {}; return { score: { clef: 'treble', key: o.key || 0, notes: [{ k: ps.map(M.str), d: 'w', kc: o.kc }], minBar: o.w || 70, noClef: o.noClef } }; }
  T.triadType = {
    u: 'u10', st: 1, gen: function (R, st) {
      var root, ty;
      if (st >= 2) { root = pick(nat('C4', 'A4'), R); root.a = pick([0, 0, 1, -1], R); ty = pick(TRI, R); }
      else { var d = ri(1, 7, R), ch0 = M.diatonic(0, false, d); root = ch0[0]; ty = M.chordType(ch0); }
      var ps = M.chord(root, ty);
      var m = mc(R, tx(M.CH_JP[ty], ty), TRI.map(function (t) { return tx(M.CH_JP[t], t); }));
      var i1 = M.interval(ps[0], ps[1]).name, i2 = M.interval(ps[1], ps[2]).name;
      return { q: 'この三和音の 種類は？', fig: chordFig(ps), ch: m.ch, a: m.a, ex: '下から <b>' + i1 + '</b> ＋ <b>' + i2 + '</b> → <b>' + M.CH_JP[ty] + '</b>。', play: [[ps, 2]] };
    }
  };
  T.triadBuild = {
    u: 'u10', st: 2, gen: function (R) {
      var root = pick(nat('C4', 'A4'), R); root.a = pick([0, 0, 0, 1, -1], R);
      var ty = pick(['maj', 'min', 'dim', 'aug'], R);
      var m = mc(R, { k: ty, fig: chordFig(M.chord(root, ty), { noClef: false, w: 50 }) }, TRI.map(function (t) { return { k: t, fig: chordFig(M.chord(root, t), { w: 50 }) }; }));
      return { q: '<b>' + N(root) + '</b> を根音とする <b>' + M.CH_JP[ty] + '</b> は？', ch: m.ch, a: m.a, ex: M.CH_JP[ty] + '＝' + { maj: '長3度＋短3度', min: '短3度＋長3度', aug: '長3度＋長3度', dim: '短3度＋短3度' }[ty] + ' → <b>' + M.chord(root, ty).map(N).join('・') + '</b>。', play: [[M.chord(root, ty), 2]] };
    }
  };
  T.inversion = {
    u: 'u10', st: 2, gen: function (R) {
      var d = ri(1, 7, R), ch0 = M.diatonic(0, false, d).map(function (p) { return { l: p.l, a: p.a, o: 4 }; }), n = ri(0, 2, R);
      var base = M.chord(ch0[0], M.chordType(M.diatonic(0, false, d)));
      var ps = M.inv(base, n);
      var names = ['基本形', '第1転回形', '第2転回形'];
      return { q: 'この和音は？（根音は <b>' + N(base[0]) + '</b>）', fig: chordFig(ps), ch: names, a: n, ex: 'いちばん下が ' + ['根音', '第3音', '第5音'][n] + '（' + N(ps[0]) + '）→ <b>' + names[n] + '</b>。', play: [[ps, 2]] };
    }
  };
  T.seventh = {
    u: 'u10', st: 3, gen: function (R) {
      var ts = ['dom7', 'maj7', 'min7', 'hdim7', 'dim7'], ty = pick(ts, R), root = pick(nat('C4', 'G4'), R);
      var ps = M.chord(root, ty);
      var m = mc(R, tx(M.CH_JP[ty], ty), ts.map(function (t) { return tx(M.CH_JP[t], t); }));
      var why = { dom7: '長三和音＋短7度', maj7: '長三和音＋長7度', min7: '短三和音＋短7度', hdim7: '減三和音＋短7度', dim7: '減三和音＋減7度' }[ty];
      return { q: 'この 七の和音の 種類は？', fig: chordFig(ps), ch: m.ch, a: m.a, ex: '<b>' + why + '</b> → ' + M.CH_JP[ty] + '（' + M.chordName(root, ty) + '）。', play: [[ps, 2]] };
    }
  };
  T.chordEar = {
    u: 'u10', st: 2, ear: true, gen: function (R) {
      var ty = pick(['maj', 'min'], R), root = pick(nat('C4', 'G4'), R), ps = M.chord(root, ty);
      return { q: '🔊 聴いて答えよう：何の三和音？', ear: true, ch: ['長三和音（明るい）', '短三和音（暗い）'], a: ty === 'maj' ? 0 : 1, ex: '<b>' + M.CH_JP[ty] + '</b>（' + ps.map(N).join('・') + '）。', exFig: chordFig(ps), play: function () { M.playChord(ps.map(M.str), true); } };
    }
  };

  /* =================== 11 和音の働き・コードネーム =================== */
  var CNT = ['maj', 'min', 'dom7', 'maj7', 'min7', 'dim', 'aug', 'sus4'];
  T.chordName = {
    u: 'u11', st: 2, gen: function (R, st) {
      var root = pick(nat('C4', 'A4'), R); if (st >= 3) root.a = pick([0, 1, -1], R);
      var ty = pick(st >= 3 ? CNT : ['maj', 'min', 'dom7', 'maj7', 'min7'], R), ps = M.chord(root, ty);
      var wr = CNT.map(function (t) { return tx(M.chordName(root, t)); }).concat([tx(M.chordName(M.P(root.l + 2, 0, 4), ty)), tx(M.chordName(M.P(root.l + 5, 0, 4), ty))]);
      var m = mc(R, tx(M.chordName(root, ty)), wr);
      return { q: 'この和音の コードネームは？', fig: chordFig(ps), ch: m.ch, a: m.a, ex: '根音は ' + M.name(root, 'en') + '、' + M.CH_JP[ty] + ' → <b>' + M.chordName(root, ty) + '</b>。', play: [[ps, 2]] };
    }
  };
  T.roman = {
    u: 'u11', st: 2, gen: function (R) {
      var f = ri(-2, 2, R), d = ri(1, 7, R), ps = M.diatonic(f, false, d).map(function (p) { return { l: p.l, a: p.a, o: p.o > 5 ? 4 : p.o }; });
      while (M.midi(ps[2]) > 79) ps = ps.map(function (p) { return { l: p.l, a: p.a, o: p.o - 1 }; });
      var m = mc(R, tx(M.ROMAN[d - 1]), M.ROMAN.map(function (r) { return tx(r); }));
      return { q: '<b>' + M.keyName(f) + '</b> で この和音は 何の和音？', fig: { score: { clef: 'treble', key: f, notes: [{ k: ps.map(M.str), d: 'w' }], minBar: 60 } }, ch: m.ch, a: m.a, ex: '根音 ' + N(ps[0]) + ' は ' + M.keyName(f) + 'の ' + d + ' 番目の音 → <b>' + M.ROMAN[d - 1] + '</b>。', play: [[ps, 2]] };
    }
  };
  T.func = {
    u: 'u11', st: 1, gen: function (R) {
      var L = [['Ⅰ', 'トニック'], ['Ⅳ', 'サブドミナント'], ['Ⅴ', 'ドミナント'], ['Ⅴ7', 'ドミナント']], x = pick(L, R);
      if (R() < 0.4) {
        var y = pick([['トニック', 'Ⅰ'], ['ドミナント', 'Ⅴ'], ['サブドミナント', 'Ⅳ']], R);
        return { q: '主要三和音で <b>' + y[0] + '</b> の働きをするのは？', ch: ['Ⅰ', 'Ⅳ', 'Ⅴ'], a: ['Ⅰ', 'Ⅳ', 'Ⅴ'].indexOf(y[1]), ex: 'Ⅰ＝トニック（安定）、Ⅳ＝サブドミナント、Ⅴ＝ドミナント（Ⅰに進みたい）。' };
      }
      return { q: '<b>' + x[0] + '</b> の和音の 働きは？', ch: ['トニック', 'サブドミナント', 'ドミナント'], a: ['トニック', 'サブドミナント', 'ドミナント'].indexOf(x[1]), ex: x[0] + ' は <b>' + x[1] + '</b>。' + { 'トニック': '安定して 落ち着く「帰る場所」。', 'サブドミナント': 'Ⅰから少し はなれる。', 'ドミナント': 'Ⅰへ 進みたくなる 緊張。' }[x[1]] };
    }
  };
  T.cadence = {
    u: 'u11', st: 2, gen: function (R) {
      var L = [['Ⅴ', 'Ⅰ', '完全終止', 'しっかり終わる'], ['Ⅳ', 'Ⅰ', '変終止', 'アーメン終止。やわらかく終わる'], ['Ⅰ', 'Ⅴ', '半終止', 'Ⅴで止まり まだ続く感じ'], ['Ⅴ', 'Ⅵ', '偽終止', 'Ⅰのかわりに Ⅵへ。だまされた感じ']];
      var x = pick(L, R), d = function (r) { return M.ROMAN.indexOf(r) + 1; };
      var c1 = M.diatonic(0, false, d(x[0])), c2 = M.diatonic(0, false, d(x[1]));
      var m = mc(R, tx(x[2]), L.map(function (y) { return tx(y[2]); }));
      return { q: '和音が <b>' + x[0] + ' → ' + x[1] + '</b> と進む 終わり方は？', fig: { score: { clef: 'treble', notes: [{ k: c1.map(M.str), d: 'h', lab: x[0] }, { k: c2.map(M.str), d: 'h', lab: x[1] }], sp: 60 }, play: [[c1, 1.5], [c2, 2.5]] }, ch: m.ch, a: m.a, ex: x[0] + '→' + x[1] + ' は <b>' + x[2] + '</b>：' + x[3] + '。', play: [[c1, 1.5], [c2, 2.5]] };
    }
  };
  T.nameToChord = {
    u: 'u11', st: 2, gen: function (R) {
      var root = pick(nat('C4', 'A4'), R), ty = pick(['maj', 'min', 'dom7'], R), ps = M.chord(root, ty);
      var j = function (a) { return a.map(N).join('・'); };
      var wr = ['maj', 'min', 'dom7', 'maj7', 'dim'].filter(function (t) { return t !== ty; }).map(function (t) { return tx(j(M.chord(root, t))); }).concat([tx(j(M.chord(M.P(root.l + 1, 0, 4), ty)))]);
      var m = mc(R, tx(j(ps)), wr);
      return { q: 'コードネーム <b class="en">' + M.chordName(root, ty) + '</b> の 構成音は？', ch: m.ch, a: m.a, ex: M.chordName(root, ty) + '＝' + M.CH_JP[ty] + ' → <b>' + j(ps) + '</b>。', exFig: chordFig(ps), play: [[ps, 2]] };
    }
  };

  /* =================== 12 移調 =================== */
  T.transNote = {
    u: 'u12', st: 2, gen: function (R) {
      var f = pick([1, 2, -1, -2, 3, -3], R), deg = ri(0, 6, R), from = M.scale('C4', 'major')[deg], to = M.scale(M.keyTonic(f), 'major')[deg];
      var wr = [{ l: to.l, a: to.a === 0 ? 1 : 0, o: 4 }, M.P(to.l + 1, 0, 4), M.P(to.l - 1, to.a, 4), from, { l: to.l, a: to.a === 0 ? -1 : 0, o: 4 }].map(pn);
      var m = mc(R, pn(to), wr);
      return { q: 'ハ長調の <b>' + N(from) + '</b> を <b>' + M.keyName(f) + '</b> に移調すると？', ch: m.ch, a: m.a, ex: N(from) + ' は ハ長調の ' + (deg + 1) + ' 番目（' + M.ROMAN[deg] + '）。' + M.keyName(f) + 'の ' + (deg + 1) + ' 番目は <b>' + N(to) + '</b>。', exFig: { score: { clef: 'treble', key: f, notes: M.scale(M.keyTonic(f), 'major').slice(0, 7).map(function (p, j) { return { k: M.str(p), d: 'q', lab: M.ROMAN[j], c: j === deg ? C.red : null }; }), sp: 34 } } };
    }
  };
  T.transMelody = {
    u: 'u12', st: 3, gen: function (R) {
      var f = pick([1, 2, -1, -2], R), degs = [0, ri(1, 4, R), ri(2, 5, R), ri(0, 4, R)];
      var cs = M.scale('C4', 'major'), ts = M.scale(M.keyTonic(f), 'major');
      var src = degs.map(function (d) { return cs[d]; }), dst = degs.map(function (d) { return ts[d]; });
      var fig = function (ps, key) { return { score: { clef: 'treble', key: key, notes: ps.map(function (p) { return { k: M.str(p), d: 'q' }; }), sp: 26, minBar: 60 } }; };
      var w1 = dst.map(function (p) { return M.P(p.l + 1, 0, p.o); }); // 1 度ずれ
      var w2 = dst.slice(); w2[2] = M.P(dst[2].l + 1, dst[2].a, dst[2].o); // 1 音まちがい
      var w3 = degs.map(function (d) { return M.scale(M.keyTonic(f), 'major')[d]; }).map(function (p) { return M.P(p.l - 1, 0, p.o); });
      var m = mc(R, { k: 'ok', fig: fig(dst, f) }, [{ k: 'w1', fig: fig(w1, f) }, { k: 'w2', fig: fig(w2, f) }, { k: 'w3', fig: fig(w3, f) }]);
      return { q: 'このメロディーを <b>' + M.keyName(f) + '</b> に移調したのは？', fig: fig(src, 0), ch: m.ch, a: m.a, ex: '主音 ' + N(cs[0]) + ' → ' + N(ts[0]) + '。全部の音を 同じだけずらして、' + dst.map(N).join('・') + '。', play: function () { M.playNotes(src.map(M.str), { beat: 0.6 }); } };
    }
  };
  T.transInterval = {
    u: 'u12', st: 2, gen: function (R) {
      var f = pick([1, 2, 3, 4, -1, -2, -3], R), t = M.keyTonic(f);
      var tt = { l: t.l, a: t.a, o: 4 }; if (M.midi(tt) < 60) tt.o = 5;
      var iv = M.interval('C4', tt);
      var all = ['長2度', '短3度', '長3度', '完全4度', '完全5度', '長6度', '短6度', '長7度', '短7度', '短2度'].map(function (s) { return tx(s); });
      var m = mc(R, tx(iv.name), all);
      return { q: 'ハ長調 → <b>' + M.keyName(f) + '</b>。何度 上に 移調する？', ch: m.ch, a: m.a, ex: '主音 ' + N('C4') + ' → ' + N(tt) + ' は <b>' + iv.name + '</b>。' };
    }
  };
  T.transKey = {
    u: 'u12', st: 3, gen: function (R) {
      var f = pick([0, -1, -2, 1, -3], R), w = f + 2;
      var m = mc(R, tx(M.keyName(w), w), [f, f + 1, f - 2, f + 3, f - 1].filter(function (x) { return x >= -7 && x <= 7; }).map(function (x) { return tx(M.keyName(x), x); }));
      return { q: 'B♭クラリネットで <b>' + M.keyName(f) + '</b> の音を鳴らしたい。楽譜は 何調で書く？', ch: m.ch, a: m.a, ex: 'B♭管は 書いた音より 長2度低く鳴る → 楽譜は <b>長2度上</b>の <b>' + M.keyName(w) + '</b>。' };
    }
  };

  /* =================== 13 楽語と記号 =================== */
  var DYN = [['pp', 'ごく弱く'], ['p', '弱く'], ['mp', 'やや弱く'], ['mf', 'やや強く'], ['f', '強く'], ['ff', 'ごく強く']];
  T.dyn = {
    u: 'u13', st: 1, gen: function (R) {
      var x = pick(DYN, R);
      var m = mc(R, tx(x[1]), DYN.map(function (y) { return tx(y[1]); }));
      return { q: 'この強弱記号の 意味は？', fig: { c: 'dyn', a: { list: [x[0]], labs: [''] } }, ch: m.ch, a: m.a, ex: '<b>' + x[0] + '</b>＝' + x[1] + '。p は弱く、f は強く、m は「やや」。', exFig: { c: 'dyn' } };
    }
  };
  T.dynOrder = {
    u: 'u13', st: 2, gen: function (R) {
      var s = 'pp ＜ p ＜ mp ＜ mf ＜ f ＜ ff';
      var wr = ['p ＜ pp ＜ mp ＜ mf ＜ f ＜ ff', 'pp ＜ p ＜ mf ＜ mp ＜ f ＜ ff', 'pp ＜ mp ＜ p ＜ mf ＜ ff ＜ f', 'ff ＜ f ＜ mf ＜ mp ＜ p ＜ pp'].map(function (x) { return tx(x); });
      var m = mc(R, tx(s), wr);
      return { q: '弱い → 強い の順に 正しく並んでいるのは？', ch: m.ch, a: m.a, ex: '<b>' + s + '</b>。', exFig: { c: 'dyn' } };
    }
  };
  var TEMPO = [['Largo', '幅広く ゆるやかに'], ['Adagio', 'ゆるやかに'], ['Andante', '歩くような速さで'], ['Moderato', '中くらいの速さで'], ['Allegro', '速く'], ['Presto', '急速に'], ['Allegretto', 'やや速く'], ['Lento', 'ゆるやかに（おそく）']];
  T.tempo = {
    u: 'u13', st: 1, gen: function (R) {
      var x = pick(TEMPO.slice(0, 6), R);
      var m = mc(R, tx(x[1]), TEMPO.filter(function (y) { return y[0] !== 'Lento'; }).map(function (y) { return tx(y[1]); }));
      return { q: '<b class="en" style="font-style:italic">' + x[0] + '</b> の意味は？', ch: m.ch, a: m.a, ex: '<b>' + x[0] + '</b>＝' + x[1] + '。', exFig: { c: 'tempo' } };
    }
  };
  var TCH = [['rit.', 'だんだん遅く'], ['accel.', 'だんだん速く'], ['a tempo', 'もとの速さで'], ['rall.', 'だんだんゆるやかに'], ['Tempo I', '最初の速さで'], ['cresc.', 'だんだん強く'], ['dim.', 'だんだん弱く'], ['poco a poco', '少しずつ']];
  T.tempoChange = {
    u: 'u13', st: 2, gen: function (R) {
      var x = pick(TCH, R);
      var m = mc(R, tx(x[1]), TCH.map(function (y) { return tx(y[1]); }));
      return { q: '<b class="en" style="font-style:italic">' + x[0] + '</b> の意味は？', ch: m.ch, a: m.a, ex: '<b>' + x[0] + '</b>＝' + x[1] + '。' };
    }
  };
  var ART = [['a.', 'スタッカート', '音を短く切って'], ['a-', 'テヌート', '音の長さを十分に保って'], ['a>', 'アクセント', 'その音を目立たせて強く'], ['a@a', 'フェルマータ', 'その音を ほどよく のばす']];
  T.artic = {
    u: 'u13', st: 1, gen: function (R) {
      var x = pick(ART, R), byName = R() < 0.5;
      var m = byName ? mc(R, tx(x[1]), ART.map(function (y) { return tx(y[1]); }).concat([tx('スラー'), tx('タイ')])) : mc(R, tx(x[2]), ART.map(function (y) { return tx(y[2]); }));
      return { q: '赤い記号の ' + (byName ? '名前' : '意味') + 'は？', fig: { score: { clef: 'treble', notes: [{ k: 'G4', d: 'q', art: x[0], c: C.red }, { k: 'A4', d: 'q' }], sp: 60, noClef: false } }, ch: m.ch, a: m.a, ex: '<b>' + x[1] + '</b>：' + x[2] + '。' };
    }
  };
  var EXP = [['dolce', '甘く やわらかに'], ['cantabile', '歌うように'], ['espressivo', '表情豊かに'], ['legato', 'なめらかに'], ['maestoso', '荘厳に'], ['grazioso', '優雅に'], ['con brio', '生き生きと'], ['leggiero', '軽く'], ['tranquillo', '静かに'], ['agitato', '激しく']];
  T.express = {
    u: 'u13', st: 2, gen: function (R) {
      var x = pick(EXP, R);
      var m = mc(R, tx(x[1]), EXP.map(function (y) { return tx(y[1]); }));
      return { q: '<b class="en" style="font-style:italic">' + x[0] + '</b> の意味は？', ch: m.ch, a: m.a, ex: '<b>' + x[0] + '</b>＝' + x[1] + '。' };
    }
  };
  T.repeatOrder = {
    u: 'u13', st: 3, gen: function (R) {
      var L = [['basic', 'A B C B C D', ['A B C D', 'A B C A B C D', 'A B B C C D', 'A B C D B C']], ['volta', 'A B A C D', ['A B C D', 'A B A B C D', 'A B C A C D', 'A A B C D']], ['dc', 'A B C D A B', ['A B C D A B C D', 'A B C D', 'A B A B C D', 'A B C D C D']], ['ds', 'A B C D B C D', ['A B C D A B C D', 'A B C D', 'A B C D C D', 'A B C B C D']]];
      var x = pick(L, R);
      var m = mc(R, tx(x[1].split(' ').join('→')), x[2].map(function (s) { return tx(s.split(' ').join('→')); }));
      return { q: 'この楽譜を 演奏する順は？', fig: { c: 'repeatQ', a: { kind: x[0] } }, ch: m.ch, a: m.a, ex: { basic: '𝄆〜𝄇 の間（B・C）を くり返す。', volta: '2回目は 1番カッコ（B）をとばして 2番カッコ（C）へ。', dc: 'D.C. で 始めにもどり、Fine で終わる。', ds: 'D.S. で 𝄋 にもどる。' }[x[0]] + ' → <b>' + x[1].split(' ').join('→') + '</b>。' };
    }
  };
  // 問題用：順番を書かない 反復の図
  F.CUSTOM.repeatQ = function (box, a) {
    var mk = function (lab, k) { return [{ k: k, d: 'w', lab: lab }]; };
    var bars = [mk('A', 'C5'), mk('B', 'D5'), mk('C', 'E5'), mk('D', 'F5')];
    if (a.kind === 'basic') { bars[1].beg = 'repeat'; bars[2].endBar = 'repeat'; }
    else if (a.kind === 'volta') { bars[0].beg = 'repeat'; bars[1].volta = ['begin', '1.']; bars[1].endBar = 'repeat'; bars[2].volta = ['begin', '2.']; }
    else if (a.kind === 'dc') { bars[1][0].top = 'Fine'; bars[1].endBar = 'double'; bars[3].rep = 'DC_AL_FINE'; }
    else { bars[1].repL = 'SEGNO_LEFT'; bars[3].rep = 'DS'; }
    M.score(box, { clef: 'treble', bars: bars, end: 'end', minBar: 92, sp: 40 });
  };

  /* =========================================================
     出題
     ========================================================= */
  GK.Q = { T: T };
  Object.keys(T).forEach(function (k) { T[k].id = k; });
  // 1 問つくる
  GK.Q.make = function (id, R, st) {
    var t = T[id], s = st || t.st;
    var q = t.gen(R, s);
    q.t = id; q.u = t.u; q.st = Math.max(t.st, Math.min(3, s)); q.ear = !!(t.ear || q.ear);
    return q;
  };
  GK.Q.typesOf = function (uids, noEar) {
    var r = [];
    uids.forEach(function (u) { (GK.UNIT[u].types || []).forEach(function (id) { if (T[id] && !(noEar && T[id].ear)) r.push(id); }); });
    return r;
  };
  // n 問：種類を まんべんなく、だんだん むずかしく
  GK.Q.set = function (uids, n, R, o) {
    o = o || {};
    var types = GK.Q.typesOf(uids, o.noEar), bag = [], out = [], last = null, err = 0;
    if (o.types) types = o.types.slice();
    for (var i = 0; i < n; i++) {
      if (!bag.length) bag = shuffle(types.slice(), R);
      var id = bag.pop(); if (id === last && bag.length) { bag.unshift(id); id = bag.pop(); }
      last = id;
      var st = o.stFn ? o.stFn(i) : o.st || (o.ramp ? Math.min(3, 1 + Math.floor(i * 3 / n)) : T[id].st);
      try { out.push(GK.Q.make(id, R, Math.max(T[id].st, st))); } catch (e) { console.error(id, e); if (++err < 50) i--; }
    }
    return out;
  };
})();
