/* =========================================================
   楽典ラボ：音のしくみ（音名・音程・音階・調・和音）と 楽譜・鍵盤の描画・音
   音は { l: 0〜6（C D E F G A B）, a: 変化（-2〜2）, o: オクターブ（中央のドは 4） }
   ========================================================= */
window.GK = window.GK || {};
(function () {
  'use strict';
  var M = GK.M = {};
  var STEP = M.STEP = [0, 2, 4, 5, 7, 9, 11];
  var LET = M.LET = 'CDEFGAB';
  var DO = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ'];
  var JP = ['ハ', 'ニ', 'ホ', 'ヘ', 'ト', 'イ', 'ロ'];

  /* ---------- 音 ---------- */
  // 'C4' 'F#5' 'Bb3' 'Ebb4' 'Fx4' / 'F##4'
  M.p = function (s) {
    if (typeof s !== 'string') return s;
    var m = /^([A-Ga-g])(##|x|#|bb|b|n)?(-?\d)$/.exec(s.trim());
    if (!m) throw new Error('bad pitch ' + s);
    var a = { '#': 1, '##': 2, x: 2, b: -1, bb: -2, n: 0 }[m[2]] || 0;
    return { l: LET.indexOf(m[1].toUpperCase()), a: a, o: +m[3] };
  };
  M.P = function (l, a, o) { return { l: ((l % 7) + 7) % 7, a: a || 0, o: o + Math.floor(l / 7) }; };
  M.midi = function (p) { p = M.p(p); return 12 * (p.o + 1) + STEP[p.l] + p.a; };
  M.dia = function (p) { p = M.p(p); return p.o * 7 + p.l; }; // 白鍵の番号（五線の上下）
  M.str = function (p) { p = M.p(p); return LET[p.l] + ['bb', 'b', '', '#', '##'][p.a + 2] + p.o; };
  M.vf = function (p) { p = M.p(p); return LET[p.l].toLowerCase() + ['bb', 'b', '', '#', '##'][p.a + 2] + '/' + p.o; };
  M.same = function (a, b) { a = M.p(a); b = M.p(b); return a.l === b.l && a.a === b.a; };
  M.eq = function (a, b) { return M.str(a) === M.str(b); };
  M.ACC = { '-2': '𝄫', '-1': '♭', '0': '', '1': '♯', '2': '𝄪' };
  M.accTxt = function (a) { return M.ACC[a]; };

  // 音名。sys: doremi（ド♯）・jp（嬰ハ）・en（C♯）
  M.name = function (p, sys) {
    p = M.p(p);
    if (sys === 'en') return LET[p.l] + M.ACC[p.a];
    if (sys === 'jp') return ({ '-2': '重変', '-1': '変', '0': '', '1': '嬰', '2': '重嬰' })[p.a] + JP[p.l];
    return DO[p.l] + M.ACC[p.a];
  };
  M.nameAll = function (p) { return M.name(p, 'doremi') + '・' + M.name(p, 'jp') + '・' + M.name(p, 'en'); };

  /* ---------- 音程 ---------- */
  var PERF = [true, false, false, true, true, false, false];
  var QN = { P: '完全', M: '長', m: '短', A: '増', d: '減', AA: '重増', dd: '重減' };
  M.QN = QN;
  M.KANJI = ['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15'];
  // a → b（b が上でも下でも、低い音から数える）
  M.interval = function (a, b) {
    a = M.p(a); b = M.p(b);
    if (M.dia(b) < M.dia(a) || (M.dia(b) === M.dia(a) && M.midi(b) < M.midi(a))) { var t = a; a = b; b = t; }
    var deg = M.dia(b) - M.dia(a) + 1, semis = M.midi(b) - M.midi(a);
    var d0 = (deg - 1) % 7, base = STEP[d0] + 12 * Math.floor((deg - 1) / 7), diff = semis - base, q;
    if (PERF[d0]) q = { '-2': 'dd', '-1': 'd', '0': 'P', '1': 'A', '2': 'AA' }[diff];
    else q = { '-3': 'dd', '-2': 'd', '-1': 'm', '0': 'M', '1': 'A', '2': 'AA' }[diff];
    return { deg: deg, q: q || '?', semis: semis, name: (QN[q] || '?') + deg + '度' };
  };
  // p から 上（down なら下）に deg 度・q の音
  M.up = function (p, deg, q, down) {
    p = M.p(p);
    var sgn = down ? -1 : 1, d = (deg - 1) * sgn;
    var r = M.P(p.l + d, 0, p.o);
    var d0 = (deg - 1) % 7, base = STEP[d0] + 12 * Math.floor((deg - 1) / 7);
    var diff = PERF[d0] ? { dd: -2, d: -1, P: 0, A: 1, AA: 2 }[q] : { dd: -3, d: -2, m: -1, M: 0, A: 1, AA: 2 }[q];
    var want = M.midi(p) + sgn * (base + diff);
    r.a = want - M.midi(r);
    return r;
  };
  M.invQ = { P: 'P', M: 'm', m: 'M', A: 'd', d: 'A', AA: 'dd', dd: 'AA' };
  M.ivName = function (deg, q) { return QN[q] + deg + '度'; };

  /* ---------- 調・音階 ---------- */
  // 五度圏の番号（♯ の数はプラス、♭ の数はマイナス）から 長調の主音
  M.keyTonic = function (f, minor) {
    var c = { l: 0, a: 0, o: 4 }, t = c;
    for (var i = 0; i < Math.abs(f); i++) t = f > 0 ? M.up(t, 5, 'P') : M.up(t, 4, 'P');
    t = { l: t.l, a: t.a, o: 4 };
    if (minor) { t = M.up(t, 3, 'm', true); t.o = 4; }
    return t;
  };
  M.keyName = function (f, minor, sys) {
    var t = M.keyTonic(f, minor);
    if (sys === 'en') return M.name(t, 'en') + (minor ? ' minor' : ' major');
    return M.name(t, 'jp') + (minor ? '短調' : '長調');
  };
  M.keyVF = function (f, minor) { // VexFlow の調号の書き方
    var t = M.keyTonic(f, minor);
    return LET[t.l] + ['bb', 'b', '', '#', '##'][t.a + 2] + (minor ? 'm' : '');
  };
  // 調号で変わる音（文字 → 変化）
  M.SHARPS = [3, 0, 4, 1, 5, 2, 6]; // F C G D A E B
  M.FLATS = [6, 2, 5, 1, 4, 0, 3];  // B E A D G C F
  M.keyAcc = function (f) {
    var m = [0, 0, 0, 0, 0, 0, 0];
    for (var i = 0; i < Math.abs(f); i++) { if (f > 0) m[M.SHARPS[i]] = 1; else m[M.FLATS[i]] = -1; }
    return m;
  };
  M.fifthsOf = function (tonic, minor) {
    for (var f = -7; f <= 7; f++) if (M.same(M.keyTonic(f, minor), tonic)) return f;
    return null;
  };
  var PAT = {
    major: ['M', 2, 'M', 3, 'P', 4, 'P', 5, 'M', 6, 'M', 7],
    natural: ['M', 2, 'm', 3, 'P', 4, 'P', 5, 'm', 6, 'm', 7],
    harmonic: ['M', 2, 'm', 3, 'P', 4, 'P', 5, 'm', 6, 'M', 7],
    melodic: ['M', 2, 'm', 3, 'P', 4, 'P', 5, 'M', 6, 'M', 7]
  };
  M.SCALE_NAME = { major: '長音階', natural: '自然短音階', harmonic: '和声短音階', melodic: '旋律短音階' };
  M.scale = function (tonic, type) {
    tonic = M.p(tonic);
    var pat = PAT[type || 'major'], r = [tonic];
    for (var i = 0; i < pat.length; i += 2) r.push(M.up(tonic, pat[i + 1], pat[i]));
    r.push(M.up(tonic, 8, 'P'));
    return r;
  };
  M.DEG = ['主音', '上主音', '中音', '下属音', '属音', '下中音', '導音'];

  /* ---------- 和音 ---------- */
  var CH = {
    maj: [['M', 3], ['P', 5]], min: [['m', 3], ['P', 5]], aug: [['M', 3], ['A', 5]], dim: [['m', 3], ['d', 5]],
    dom7: [['M', 3], ['P', 5], ['m', 7]], maj7: [['M', 3], ['P', 5], ['M', 7]], min7: [['m', 3], ['P', 5], ['m', 7]],
    hdim7: [['m', 3], ['d', 5], ['m', 7]], dim7: [['m', 3], ['d', 5], ['d', 7]], sus4: [['P', 4], ['P', 5]], m6: [['m', 3], ['P', 5], ['M', 6]], six: [['M', 3], ['P', 5], ['M', 6]]
  };
  M.CH_JP = { maj: '長三和音', min: '短三和音', aug: '増三和音', dim: '減三和音', dom7: '属七の和音', maj7: '長七の和音', min7: '短七の和音', hdim7: '減五短七の和音', dim7: '減七の和音', sus4: 'サスフォー', six: 'シックス', m6: 'マイナーシックス' };
  M.CH_SFX = { maj: '', min: 'm', aug: 'aug', dim: 'dim', dom7: '7', maj7: 'M7', min7: 'm7', hdim7: 'm7(♭5)', dim7: 'dim7', sus4: 'sus4', six: '6', m6: 'm6' };
  M.chord = function (root, type) {
    root = M.p(root);
    return [root].concat(CH[type].map(function (x) { return M.up(root, x[1], x[0]); }));
  };
  M.chordName = function (root, type) { return M.name(root, 'en') + M.CH_SFX[type]; };
  M.inv = function (notes, n) { // 転回（n 回 いちばん下を1オクターブ上へ）
    var r = notes.map(function (x) { return M.p(M.str(x)); });
    for (var i = 0; i < n; i++) { var b = r.shift(); r.push({ l: b.l, a: b.a, o: b.o + 1 }); }
    return r;
  };
  // 調の中の 三和音（度数 1〜7）
  M.diatonic = function (f, minor, deg, seventh) {
    var sc = M.scale(M.keyTonic(f, minor), minor ? 'harmonic' : 'major').slice(0, 7);
    sc = sc.concat(sc.map(function (p) { return { l: p.l, a: p.a, o: p.o + 1 }; }));
    var r = [sc[deg - 1], sc[deg + 1], sc[deg + 3]];
    if (seventh) r.push(sc[deg + 5]);
    return r;
  };
  M.chordType = function (notes) {
    var keys = Object.keys(CH);
    for (var i = 0; i < keys.length; i++) {
      var t = M.chord(notes[0], keys[i]);
      if (t.length === notes.length && t.every(function (p, j) { return M.same(p, notes[j]); })) return keys[i];
    }
    return null;
  };
  M.ROMAN = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ'];

  /* ---------- 長さ ---------- */
  // 4分音符 = 1 拍
  M.DUR = { w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25, '32': 0.125 };
  M.DUR_JP = { w: '全音符', h: '2分音符', q: '4分音符', '8': '8分音符', '16': '16分音符', '32': '32分音符' };
  M.REST_JP = { w: '全休符', h: '2分休符', q: '4分休符', '8': '8分休符', '16': '16分休符', '32': '32分休符' };
  M.len = function (d) { // 'qd' 'hdd' '8r' など
    var m = /^(w|h|q|8|16|32)(d*)/.exec(d), b = M.DUR[m[1]], t = b;
    for (var i = 0; i < m[2].length; i++) { b /= 2; t += b; }
    return t;
  };

  /* =========================================================
     楽譜（VexFlow 4）
     spec = {
       clef: 'treble' | 'bass' | 'alto' | 'tenor' | 'grand', key: 2（♯2つ）/ -3（♭3つ）, minor, time: '3/4',
       bars: [[note, ...], ...] または notes: [note, ...],
       w: 横の長さ（省略すると自動）, end: 'end'|'single'|'none'|'repeat', begin: 'repeat',
       noKeyAcc: true（調号を書かない）
     }
     note = { k: 'C4' | ['C4','E4','G4'], d: 'q' | 'hd' | '8r', c: 色, kc: [色...], lab: '下の文字', top: '上の文字',
              tie: true（次とタイ）, acc: 'auto' | 'show' | 'none', art: 'a.', t3: true（3連符）, bar: 色帯 }
     ========================================================= */
  var VF = function () { return window.Vex && Vex.Flow; };
  var INK = 'currentColor';
  M.COL = { red: '#c4452a', blue: '#2f6bb8', green: '#2c8a5c', gold: '#c08a0e', purple: '#7d4fb0', gray: '#9a968b' };

  function restKey(clef, d) {
    var w = /^w/.test(d), h = /^h/.test(d);
    if (clef === 'bass') return w ? 'f/3' : 'd/3';
    if (clef === 'alto') return w ? 'e/4' : 'c/4';
    return w ? 'd/5' : 'b/4';
  }
  function asArr(k) { return Array.isArray(k) ? k : [k]; }
  function clefOf(spec) { return spec.clef === 'grand' ? 'treble' : (spec.clef || 'treble'); }

  function makeNote(n, clef, accState, opts) {
    var V = VF(), rest = /r/.test(n.d), dur = n.d.replace(/d+/, '').replace('r', ''), dots = (/^\w+?(d+)/.exec(n.d.replace('r', '')) || ['', ''])[1].length;
    var keys = rest ? [n.rk || restKey(clef, n.d)] : asArr(n.k).map(M.vf);
    var sn = new V.StaveNote({ clef: clef, keys: keys, duration: dur + (dots ? 'd'.repeat(dots) : '') + (rest ? 'r' : ''), auto_stem: n.st == null, stem_direction: n.st || 1, align_center: rest && n.center });
    if (dots) V.Dot.buildAndAttach([sn], { all: true });
    if (!rest) {
      var ps = asArr(n.k).map(M.p);
      // 和音の中の順番（VexFlow は下から並べ直す）
      var order = ps.map(function (p, i) { return { p: p, i: i }; }).sort(function (a, b) { return M.dia(a.p) - M.dia(b.p) || M.midi(a.p) - M.midi(b.p); });
      order.forEach(function (o, j) {
        var p = o.p, show = false, key = p.l + ':' + p.o;
        var mode = n.acc || (opts && opts.acc) || 'auto';
        if (mode === 'show') show = true;
        else if (mode === 'auto') {
          var cur = key in accState ? accState[key] : accState.key[p.l];
          show = cur !== p.a;
          accState[key] = p.a;
        }
        if (show && mode !== 'none') {
          var acc = new V.Accidental({ '-2': 'bb', '-1': 'b', '0': 'n', '1': '#', '2': '##' }[p.a]);
          if (n.ac || (n.kc && n.kc[o.i])) acc.setStyle({ fillStyle: n.ac || n.kc[o.i], strokeStyle: n.ac || n.kc[o.i] });
          if (n.cauto) acc.setAsCautionary();
          sn.addModifier(acc, j);
        }
        if (n.kc && n.kc[o.i]) sn.setKeyStyle(j, { fillStyle: n.kc[o.i], strokeStyle: n.kc[o.i] });
      });
    }
    if (n.c) sn.setStyle({ fillStyle: n.c, strokeStyle: n.c });
    if (n.art) asArr(n.art).forEach(function (a) {
      var ar = new V.Articulation(a); ar.setPosition(/^a@a|^a>|^a\^/.test(a) || (n.artUp) ? V.Modifier.Position.ABOVE : V.Modifier.Position.BELOW);
      if (a === 'a@a') ar.setPosition(V.Modifier.Position.ABOVE);
      sn.addModifier(ar, 0);
    });
    sn._gk = n;
    return sn;
  }

  function post(svg) {
    svg.querySelectorAll('[fill="black"],[fill="#000"],[fill="#000000"],[fill="#999999"]').forEach(function (e) { e.setAttribute('fill', INK); });
    svg.querySelectorAll('[stroke="black"],[stroke="#000"],[stroke="#000000"],[stroke="#999999"]').forEach(function (e) { e.setAttribute('stroke', INK); });
  }
  function svgText(svg, x, y, t, o) {
    o = o || {};
    var e = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    e.setAttribute('x', x); e.setAttribute('y', y); e.setAttribute('text-anchor', o.anchor || 'middle');
    e.setAttribute('font-size', o.size || 14); e.setAttribute('font-weight', o.bold === false ? 400 : 700);
    e.setAttribute('fill', o.c || INK); e.setAttribute('class', 'sl' + (o.cls ? ' ' + o.cls : ''));
    if (o.font) e.setAttribute('font-family', o.font);
    if (o.italic) e.setAttribute('font-style', 'italic');
    e.textContent = t; svg.appendChild(e); return e;
  }
  M.svgText = svgText;
  function svgEl(svg, tag, at) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in at) e.setAttribute(k, at[k]);
    svg.appendChild(e); return e;
  }
  M.svgEl = svgEl;

  // 横は W、縦は 中身が全部入るように（最低でも五線の上下に 余白）
  function sizeSvg(svg, W, H, zoom) {
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.removeAttribute('width'); svg.removeAttribute('height');
    svg.setAttribute('class', 'vf');
    svg.style.width = ''; svg.style.height = ''; // VexFlow が書いた大きさを消して CSS にまかせる
    svg.style.maxWidth = Math.round(W * (zoom || 2.2)) + 'px';
    svg.dataset.w = W;
  }
  function fit(svg, W, y0, y1) {
    var bb = null;
    try { bb = svg.getBBox(); } catch (e) { }
    if (!bb || !bb.height) return;
    var a = Math.min(bb.y - 6, y0 - 24), b = Math.max(bb.y + bb.height + 6, y1 + 24);
    svg.setAttribute('viewBox', '0 ' + a + ' ' + W + ' ' + (b - a));
  }
  M.fit = fit;
  // 楽譜を el の中に描く。戻り値：{ svg, notes: [{ x, ys, n, sn }], staves }
  M.score = function (el, spec) {
    var V = VF();
    el.innerHTML = '';
    if (!V) { el.textContent = '（楽譜の部品を読みこめませんでした）'; return null; }
    var bars = spec.bars || [spec.notes || []];
    var grand = spec.clef === 'grand', clef = clefOf(spec);
    var key = spec.key || 0, keyAcc = M.keyAcc(key);
    // 五線のいちばん上の線が above、下に below の余白。VexFlow の Stave(y) は y+40 から線を引く
    var above = spec.above != null ? spec.above : 40, below = spec.below != null ? spec.below : 44, gap = 100;
    var top = above - 40, hh = above + 40 + (grand ? gap : 0) + below;
    var pad = spec.pad || 10;
    var widths = [], firstExtra = 0, x = pad;
    // 1 小節めの頭（音部記号・調号・拍子）の幅を 下書きで はかる
    var probe = new V.Stave(0, 0, 500);
    if (!spec.noClef) probe.addClef(clef);
    if (key && !spec.noKeyAcc) probe.addKeySignature(M.keyVF(key, spec.minor));
    if (spec.time) probe.addTimeSignature(spec.time);
    probe.format && probe.format();
    firstExtra = probe.getNoteStartX() - 0;
    bars.forEach(function (b, i) {
      var cnt = 0; b.forEach(function (n) { cnt += Math.max(1, asArr(n.k || 'x').length > 2 ? 1.2 : 1); if (n.lab && n.lab.length > 3) cnt += (n.lab.length - 3) * 0.18; });
      var base = Math.max(spec.minBar || 70, cnt * (spec.sp || 38) + 26);
      widths.push((i === 0 ? firstExtra : (spec.repeatCourtesy ? 30 : 12)) + base);
    });
    var total = widths.reduce(function (a, b) { return a + b; }, 0) + pad * 2;
    var W = spec.w || total;
    if (spec.w) { var k = (spec.w - pad * 2 - firstExtra) / (total - pad * 2 - firstExtra); widths = widths.map(function (w, i) { return i === 0 ? firstExtra + (w - firstExtra) * k : w * k; }); }
    var r = new V.Renderer(el, V.Renderer.Backends.SVG);
    r.resize(W, hh);
    var ctx = r.getContext();
    ctx.setFillStyle(INK); ctx.setStrokeStyle(INK);
    var svg = el.querySelector('svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + hh);
    svg.removeAttribute('width'); svg.removeAttribute('height');
    sizeSvg(svg, W, hh, spec.zoom);

    var out = { svg: svg, notes: [], staves: [], W: W, H: hh };
    var all = [], allB = [];
    var accState = { key: keyAcc };
    bars.forEach(function (b, bi) {
      var w = widths[bi];
      var st = new V.Stave(x, top, w, { fill_style: INK }), st2 = null;
      if (bi === 0) {
        if (!spec.noClef) st.addClef(clef);
        if (key && !spec.noKeyAcc) st.addKeySignature(M.keyVF(key, spec.minor));
        if (spec.time) st.addTimeSignature(spec.time);
        if (!grand && spec.begin !== 'repeat') st.setBegBarType(V.Barline.type.NONE);
      } else st.setBegBarType(V.Barline.type.NONE);
      if ((bi === 0 && spec.begin === 'repeat') || b.beg === 'repeat') st.setBegBarType(V.Barline.type.REPEAT_BEGIN);
      var endT = bi === bars.length - 1 ? (spec.end || (spec.rhythm ? 'none' : 'single')) : 'single';
      if (b.endBar) endT = b.endBar;
      st.setEndBarType({ end: V.Barline.type.END, single: V.Barline.type.SINGLE, none: V.Barline.type.NONE, repeat: V.Barline.type.REPEAT_END, double: V.Barline.type.DOUBLE }[endT]);
      if (b.volta) st.setVoltaType(b.volta[0] === 'begin' ? V.Volta.type.BEGIN : b.volta[0] === 'end' ? V.Volta.type.END : V.Volta.type.BEGIN_END, b.volta[1], 6);
      if (b.rep) st.setRepetitionType(V.Repetition.type[b.rep], 4);
      if (b.repL) st.setRepetitionType(V.Repetition.type[b.repL], 4);
      if (grand) {
        st2 = new V.Stave(x, top + gap, w, { fill_style: INK });
        if (bi === 0) { st2.addClef('bass'); if (key) st2.addKeySignature(M.keyVF(key, spec.minor)); if (spec.time) st2.addTimeSignature(spec.time); }
        st2.setBegBarType(V.Barline.type.NONE);
        st2.setEndBarType(endT === 'end' ? V.Barline.type.END : endT === 'none' ? V.Barline.type.NONE : V.Barline.type.SINGLE);
      }
      if (spec.rhythm) st.setConfigForLines([0, 1, 2, 3, 4].map(function (i) { return { visible: i === 2 }; })); // リズムだけ：1 本線
      st.setContext(ctx).draw(); if (st2) st2.setContext(ctx).draw();
      if (grand && bi === 0) {
        new V.StaveConnector(st, st2).setType('brace').setContext(ctx).draw();
        new V.StaveConnector(st, st2).setType('singleLeft').setContext(ctx).draw();
      }
      if (grand) {
        var conn = new V.StaveConnector(st, st2).setType(endT === 'end' ? 'boldDoubleRight' : 'singleRight');
        if (endT !== 'none') conn.setContext(ctx).draw();
      }
      out.staves.push(st);
      // 小節ごとに臨時記号の効き目をリセット
      accState = { key: keyAcc };
      var acc2 = { key: keyAcc };
      var notes = [], notes2 = [];
      b.forEach(function (n) {
        if (grand) {
          var ks = asArr(n.k || []), hi = [], lo = [];
          ks.forEach(function (k) { (n.staff === 2 || (n.staff == null && M.midi(k) < 60) ? lo : hi).push(k); });
          var isRest = /r/.test(n.d);
          var a = hi.length || (isRest && n.staff !== 2) ? makeNote(Object.assign({}, n, { k: hi }), 'treble', accState, spec) : new V.GhostNote(n.d.replace('r', ''));
          var c = lo.length || (isRest && n.staff === 2) ? makeNote(Object.assign({}, n, { k: lo, lab: null }), 'bass', acc2, spec) : new V.GhostNote(n.d.replace('r', ''));
          if (!hi.length && !isRest) a._gk = n;
          notes.push(a); notes2.push(c);
        } else notes.push(makeNote(n, clef, accState, spec));
      });
      // 3連符
      var tups = [], grp = [];
      notes.forEach(function (sn) { if (sn._gk && sn._gk.t3) { grp.push(sn); if (grp.length === 3) { tups.push(new V.Tuplet(grp, { location: V.Tuplet.LOCATION_TOP })); grp = []; } } else grp = []; });
      var vo = new V.Voice({ num_beats: 4, beat_value: 4 }).setMode(V.Voice.Mode.SOFT).addTickables(notes);
      var vs = [vo];
      if (grand) vs.push(new V.Voice({ num_beats: 4, beat_value: 4 }).setMode(V.Voice.Mode.SOFT).addTickables(notes2));
      var beams = [];
      if (spec.beam !== false) {
        var grpF = spec.time && /\/8$/.test(spec.time) && +spec.time.split('/')[0] % 3 === 0 ? [new V.Fraction(3, 8)] : [new V.Fraction(2, 8)];
        if (spec.time === '2/2' || spec.time === 'C|') grpF = [new V.Fraction(4, 8)];
        if (spec.bg) grpF = [new V.Fraction(+spec.bg.split('/')[0], +spec.bg.split('/')[1])];
        // nb（連桁にしない）の音で 区切って 連桁をつける
        var runs = [[]];
        notes.forEach(function (sn) { if (sn._gk && sn._gk.nb) runs.push([]); else runs[runs.length - 1].push(sn); });
        runs.forEach(function (rn) { if (rn.length > 1) beams = beams.concat(V.Beam.generateBeams(rn, { groups: grpF, beam_rests: false, maintain_stem_directions: false })); });
        if (grand) beams = beams.concat(V.Beam.generateBeams(notes2, { groups: grpF }));
      }
      if (notes.length) {
        var fm = new V.Formatter();
        fm.joinVoices([vo]); if (grand) fm.joinVoices([vs[1]]);
        var avail = st.getNoteEndX() - st.getNoteStartX() - 14;
        fm.format(vs, Math.max(20, avail), { align_rests: false });
        vo.draw(ctx, st); if (grand) vs[1].draw(ctx, st2);
      }
      beams.forEach(function (bm) { bm.setContext(ctx).draw(); });
      tups.forEach(function (t) { t.setContext(ctx).draw(); });
      notes.forEach(function (sn, i) { all.push(sn); allB.push(notes2[i] || null); });
      x += w;
    });
    // タイ
    for (var i = 0; i < all.length - 1; i++) {
      var g = all[i]._gk;
      if (g && g.tie && !(all[i] instanceof V.GhostNote)) {
        var n0 = all[i], n1 = all[i + 1];
        var idx = n0.getKeys().map(function (_, j) { return j; });
        new V.StaveTie({ first_note: n0, last_note: n1, first_indices: idx, last_indices: idx }).setContext(ctx).draw();
      }
      var b0 = allB[i];
      if (g && g.tie && b0 && !(b0 instanceof V.GhostNote) && allB[i + 1]) {
        var idb = b0.getKeys().map(function (_, j) { return j; });
        new V.StaveTie({ first_note: b0, last_note: allB[i + 1], first_indices: idb, last_indices: idb }).setContext(ctx).draw();
      }
    }
    // スラー（sl: 何個先の音まで）
    all.forEach(function (sn, i) {
      var g = sn._gk; if (!g || !g.sl || !all[i + g.sl]) return;
      new V.Curve(sn, all[i + g.sl], { cps: [{ x: 0, y: 12 }, { x: 0, y: 12 }] }).setContext(ctx).draw();
    });
    post(svg);
    // 文字（音名など）と 色の帯
    var stB = top + 80, labY = grand ? top + gap + 80 + 30 : stB + 30;
    all.forEach(function (sn, i) {
      var g = sn._gk; if (!g) return;
      var xx = sn.getAbsoluteX() + (sn.getGlyphWidth ? sn.getGlyphWidth() / 2 : 6);
      if (sn instanceof V.GhostNote && allB[i]) xx = allB[i].getAbsoluteX() + 6;
      var ys = sn.getYs ? sn.getYs() : [top + 20];
      if (sn instanceof V.GhostNote && allB[i] && allB[i].getYs) ys = allB[i].getYs();
      out.notes.push({ x: xx, ys: ys, n: g, sn: sn });
      if (g.lab) {
        var ly = Math.max(labY, Math.max.apply(null, ys) + 26);
        if (spec.labY) ly = spec.labY;
        if (grand && allB[i] && !(allB[i] instanceof V.GhostNote)) ly = Math.max(labY, Math.max.apply(null, allB[i].getYs()) + 26);
        svgText(svg, xx, ly, g.lab, { c: g.lc || g.c || INK, size: g.ls || spec.ls || 14 });
      }
      if (g.top) svgText(svg, xx, Math.min(top - 6, Math.min.apply(null, ys) - 18), g.top, { c: g.tc || g.c || INK, size: 13 });
    });
    if (spec.after) spec.after(out, ctx, V);
    fit(svg, W, above, above + 40 + (grand ? gap : 0));
    return out;
  };

  // 音符・記号を 自由な場所に置く（音符の木・リズムの計算など）
  // spec = { w, h, staves: [{ x, y, w, clef, lines }], items: [{ s: 段, x, k, d, c, lab }], glyphs: [{ x, y, code, size, c }] }
  M.free = function (el, spec) {
    var V = VF();
    el.innerHTML = '';
    if (!V) { el.textContent = '（楽譜の部品を読みこめませんでした）'; return null; }
    var r = new V.Renderer(el, V.Renderer.Backends.SVG);
    r.resize(spec.w, spec.h);
    var ctx = r.getContext(); ctx.setFillStyle(INK); ctx.setStrokeStyle(INK);
    var svg = el.querySelector('svg');
    sizeSvg(svg, spec.w, spec.h, spec.zoom);
    var sts = (spec.staves || []).map(function (s) {
      var st = new V.Stave(s.x || 0, s.y, s.w || spec.w, { fill_style: INK, num_lines: s.lines == null ? 5 : s.lines });
      if (s.clef) st.addClef(s.clef);
      st.setBegBarType(V.Barline.type.NONE); st.setEndBarType(s.end ? V.Barline.type.SINGLE : V.Barline.type.NONE);
      if (!s.hide) st.setContext(ctx).draw();
      if (s.mid) ctx.fillRect(s.x || 0, st.getYForLine(2) - 0.6, s.w || spec.w, 1.2); // 1 本線
      return st;
    });
    var outN = [];
    (spec.items || []).forEach(function (it) {
      var st = sts[it.s || 0];
      var sn = makeNote(it, (spec.staves[it.s || 0] || {}).clef || 'treble', { key: [0, 0, 0, 0, 0, 0, 0] });
      if (it.st) sn.setStemDirection(it.st);
      var tc = new V.TickContext(); tc.addTickable(sn).preFormat().setX(it.x - st.getNoteStartX());
      sn.setStave(st); sn.setContext(ctx).draw();
      outN.push(sn);
      if (it.lab) svgText(svg, it.x + 6 + (it.lx || 0), it.ly || ((spec.staves[it.s || 0] || {}).y + 76), it.lab, { c: it.lc || it.c || INK, size: it.ls || 13 });
    });
    // 連桁
    (spec.beams || []).forEach(function (ix) { new V.Beam(ix.map(function (i) { return outN[i]; })).setContext(ctx).draw(); });
    (spec.ties || []).forEach(function (ix) { new V.StaveTie({ first_note: outN[ix[0]], last_note: outN[ix[1]], first_indices: [0], last_indices: [0] }).setContext(ctx).draw(); });
    (spec.glyphs || []).forEach(function (g) {
      ctx.save(); ctx.setFillStyle(g.c || INK);
      V.Glyph.renderGlyph(ctx, g.x, g.y, g.size || 40, g.code, { category: g.cat });
      ctx.restore();
    });
    post(svg);
    (spec.texts || []).forEach(function (t) { svgText(svg, t.x, t.y, t.t, t); });
    return { svg: svg, notes: outN, staves: sts };
  };

  // 記号1つ（強弱・反復記号など）
  M.glyph = function (el, codes, o) {
    o = o || {};
    var w = o.w || 120, h = o.h || 70;
    return M.free(el, { w: w, h: h, glyphs: asArr(codes).map(function (c, i) { return { x: (o.x || 14) + i * (o.dx || 26), y: o.y || 48, code: c, size: o.size || 44, c: o.c }; }) });
  };

  /* ---------- 鍵盤（SVG の文字列） ----------
     o = { from: 'C4', to: 'B5', mark: { midi: { c: 色, t: '文字' } }, steps: [[m1, m2, '半音', 色]], h, tap: true, names: true } */
  M.keyboard = function (o) {
    o = o || {};
    var a = M.midi(o.from || 'C4'), b = M.midi(o.to || 'B5');
    // 印や矢印の音が はみ出すときは 鍵盤を広げる
    var used = Object.keys(o.mark || {}).map(Number);
    (o.steps || []).forEach(function (st) { used.push(st[0], st[1]); });
    used.forEach(function (m) { if (m < a) a = m - m % 12; if (m > b) b = m - m % 12 + 11; });
    var WW = 26, WH = o.h || 92, BW = 16, BH = WH * 0.62;
    var whites = [], blacks = [];
    for (var m = a; m <= b; m++) ([1, 3, 6, 8, 10].indexOf(m % 12) >= 0 ? blacks : whites).push(m);
    var W = whites.length * WW, xs = {};
    whites.forEach(function (m, i) { xs[m] = i * WW; });
    blacks.forEach(function (m) { xs[m] = (xs[m - 1] != null ? xs[m - 1] + WW : -WW) - BW / 2; });
    var mk = o.mark || {}, top = o.steps && o.steps.length ? 26 : 4, H = top + WH + (o.names ? 20 : 4);
    var s = '<svg class="kbd" viewBox="-1 0 ' + (W + 2) + ' ' + H + '" role="img" aria-label="鍵盤">';
    whites.forEach(function (m) {
      var k = mk[m];
      s += '<rect data-m="' + m + '" class="wk' + (k ? ' on' : '') + '" x="' + xs[m] + '" y="' + top + '" width="' + WW + '" height="' + WH + '" rx="3"' + (k && k.c ? ' style="fill:' + k.c + '"' : '') + '/>';
      if (k && k.t) s += '<text class="kt" x="' + (xs[m] + WW / 2) + '" y="' + (top + WH - 9) + '">' + k.t + '</text>';
      if (o.names && m % 12 === 0) s += '<text class="kn" x="' + (xs[m] + WW / 2) + '" y="' + (top + WH + 15) + '">C' + (Math.floor(m / 12) - 1) + '</text>';
    });
    blacks.forEach(function (m) {
      var k = mk[m];
      s += '<rect data-m="' + m + '" class="bk' + (k ? ' on' : '') + '" x="' + xs[m] + '" y="' + top + '" width="' + BW + '" height="' + BH + '" rx="2"' + (k && k.c ? ' style="fill:' + k.c + '"' : '') + '/>';
      if (k && k.t) s += '<text class="kt b" x="' + (xs[m] + BW / 2) + '" y="' + (top + BH - 7) + '">' + k.t + '</text>';
    });
    (o.steps || []).forEach(function (st) {
      var cx = function (m) { return xs[m] + ([1, 3, 6, 8, 10].indexOf(m % 12) >= 0 ? BW / 2 : WW / 2); };
      var x1 = cx(st[0]), x2 = cx(st[1]), c = st[3] || 'var(--warm)';
      s += '<path d="M' + x1 + ' ' + (top - 2) + ' Q' + (x1 + x2) / 2 + ' ' + (top - 20) + ' ' + x2 + ' ' + (top - 2) + '" fill="none" stroke="' + c + '" stroke-width="2"/>';
      if (st[2]) s += '<text class="ks" x="' + (x1 + x2) / 2 + '" y="' + (top - 13) + '" style="fill:' + c + '">' + st[2] + '</text>';
    });
    return s + '</svg>';
  };

  /* =========================================================
     音（ピアノに近い音を その場で作る）
     ========================================================= */
  var AC = null, master = null;
  M.audio = function () {
    if (!AC) {
      var C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      AC = new C(); master = AC.createGain(); master.gain.value = 0.5;
      var comp = AC.createDynamicsCompressor(); master.connect(comp); comp.connect(AC.destination);
    }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  };
  function tone(midi, t, dur, vol) {
    var f = 440 * Math.pow(2, (midi - 69) / 12);
    var g = AC.createGain(), lp = AC.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(Math.min(9000, f * 9), t); lp.frequency.exponentialRampToValueAtTime(Math.max(400, f * 2.2), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6);
    g.connect(lp); lp.connect(master);
    [[1, 1], [2, 0.42], [3, 0.2], [4, 0.11], [5, 0.05]].forEach(function (h) {
      var o = AC.createOscillator(), gg = AC.createGain();
      o.type = h[0] === 1 ? 'triangle' : 'sine'; o.frequency.value = f * h[0] * (1 + (h[0] - 1) * 0.0007);
      gg.gain.value = h[1]; o.connect(gg); gg.connect(g); o.start(t); o.stop(t + dur + 0.7);
    });
  }
  // seq: [[ 'C4' | ['C4','E4'], 拍 ], ...]  bpm
  M.play = function (seq, bpm) {
    var ac = M.audio(); if (!ac) return 0;
    var t = ac.currentTime + 0.05, beat = 60 / (bpm || 92), tot = 0;
    seq.forEach(function (s) {
      var ks = s[0] == null ? [] : asArr(s[0]), d = (s[1] || 1) * beat;
      ks.forEach(function (k) { tone(typeof k === 'number' ? k : M.midi(k), t, Math.max(0.25, d * 0.95), 0.32 / Math.sqrt(ks.length || 1)); });
      t += d; tot += d;
    });
    return tot;
  };
  M.playNotes = function (ps, o) { o = o || {}; return M.play(ps.map(function (p) { return [p, o.beat || 1]; }), o.bpm || 100); };
  M.playChord = function (ps, arp) {
    if (arp) return M.play(ps.map(function (p) { return [p, 0.5]; }).concat([[ps, 2]]), 110);
    return M.play([[ps, 2]], 80);
  };
  // 楽譜の spec をそのまま鳴らす
  M.playSpec = function (spec, bpm) {
    var seq = [], bars = spec.bars || [spec.notes || []], tieHold = null;
    bars.forEach(function (b) {
      b.forEach(function (n) {
        var d = M.len(n.d.replace('r', '')) * (n.t3 ? 2 / 3 : 1);
        var ks = /r/.test(n.d) ? null : asArr(n.k);
        if (tieHold) { tieHold[1] += d; if (!n.tie) tieHold = null; return; }
        var it = [ks, d]; seq.push(it);
        if (n.tie) tieHold = it;
      });
    });
    return M.play(seq, bpm || 88);
  };
})();
