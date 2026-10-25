/* =========================================================
   楽典ラボ：図（楽譜・鍵盤・五度圏・音符の木 など）
   fig = { score: spec } | { kbd: opts } | { free: spec } | { html: '...' } | { row: [fig...] } | { col: [fig...] } | { c: '名前', a: 引数 }
         共通：cap（下の説明）, ttl（上の見出し）, play（true = 楽譜を鳴らす / [[音, 拍], ...] / function）, bpm
   ========================================================= */
(function () {
  'use strict';
  var GK = window.GK, M = GK.M, esc = GK.esc;
  var F = GK.F = {};
  var C = M.COL;

  F.render = function (el, fig) {
    el.innerHTML = '';
    if (!fig) return;
    var w = document.createElement('div'); w.className = 'fig'; el.appendChild(w);
    if (fig.ttl) { var t = document.createElement('div'); t.className = 'ttl2'; t.innerHTML = fig.ttl; w.appendChild(t); }
    var box = document.createElement('div');
    if (fig.row || fig.col) {
      box.className = 'row'; if (fig.col) box.style.flexDirection = 'column';
      w.appendChild(box);
      (fig.row || fig.col).forEach(function (f) { var d = document.createElement('div'); d.style.cssText = 'flex:1 1 0;min-width:0;min-height:0;display:flex'; box.appendChild(d); F.render(d, f); });
    } else if (fig.html != null) {
      box.className = 'html'; box.innerHTML = fig.html; w.appendChild(box);
    } else {
      box.className = 'sc'; w.appendChild(box);
      if (fig.score) M.score(box, fig.score);
      else if (fig.free) M.free(box, fig.free);
      else if (fig.kbd) box.innerHTML = M.keyboard(fig.kbd);
      else if (fig.glyph) M.glyph(box, fig.glyph, fig.go);
      else if (fig.c && CUSTOM[fig.c]) CUSTOM[fig.c](box, fig.a || {}, w);
    }
    if (fig.cap || fig.play) {
      var cr = document.createElement('div'); cr.className = 'capr'; w.appendChild(cr);
      if (fig.cap) { var c = document.createElement('div'); c.className = 'cap'; c.innerHTML = fig.cap; cr.appendChild(c); }
      if (fig.play) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'btn sm'; b.innerHTML = '🔊 聴く';
        b.addEventListener('click', function () { F.play(fig); });
        cr.appendChild(b);
      }
    }
    return w;
  };
  F.play = function (fig) {
    if (typeof fig.play === 'function') return fig.play();
    if (Array.isArray(fig.play)) return M.play(fig.play, fig.bpm);
    if (fig.score) return M.playSpec(fig.score, fig.bpm);
  };

  /* ---------- よく使う 小さな楽譜 ---------- */
  F.one = function (k, o) { // 1 音（全音符）
    o = o || {};
    return { clef: o.clef || 'treble', key: o.key || 0, notes: [{ k: k, d: o.d || 'w', c: o.c, lab: o.lab, acc: o.acc }], minBar: o.minBar || 60, sp: 40 };
  };
  F.melody = function (ks, o) { // いくつかの音（全音符を ならべる）
    o = o || {};
    return { clef: o.clef || 'treble', key: o.key || 0, minor: o.minor, notes: ks.map(function (k, i) { return { k: k, d: o.d || 'w', lab: o.labs ? o.labs[i] : null, c: o.cs ? o.cs[i] : null, acc: o.acc }; }), sp: o.sp || 40, end: o.end };
  };
  F.chordSpec = function (ks, o) { o = o || {}; return { clef: o.clef || 'treble', key: o.key || 0, notes: [{ k: ks, d: 'w', lab: o.lab, kc: o.kc }], minBar: 70 }; };
  // 楽譜の音を順に鳴らす
  F.seqOf = function (ks, beat) { return ks.map(function (k) { return [k, beat || 1]; }); };

  /* ---------- 名前つきの図 ---------- */
  var CUSTOM = F.CUSTOM = {};

  // 五線と鍵盤が つながっている（鍵盤をおすと 五線に音が出る）
  CUSTOM.staffKbd = function (box, a, w) {
    box.style.flexDirection = 'column'; box.style.gap = '6px'; box.style.alignItems = 'stretch';
    var clef = a.clef || 'treble', cur = a.start || 'C4';
    var lo = a.from || (clef === 'bass' ? 'C2' : clef === 'grand' ? 'C3' : 'C4'), hi = a.to || (clef === 'bass' ? 'B3' : clef === 'grand' ? 'B5' : 'B5');
    box.innerHTML = (a.clefs ? '<div class="seg" style="justify-content:center;flex:none">' + [['treble', '𝄞 ト音記号'], ['bass', '𝄢 ヘ音記号'], ['alto', '𝄡 ハ音記号'], ['grand', '大譜表']].map(function (c) { return '<button type="button" data-cl="' + c[0] + '" aria-pressed="' + (c[0] === clef) + '">' + c[1] + '</button>'; }).join('') + '</div>' : '') +
      '<div class="sc st" style="flex:1 1 0;min-height:0"></div><div class="nmline" style="flex:none;text-align:center;font-weight:700;font-size:18px"></div><div class="kb" style="flex:1 1 0;min-height:60px;max-height:150px;display:flex"></div>';
    var st = box.querySelector('.st'), kb = box.querySelector('.kb'), nl = box.querySelector('.nmline');
    var black = { 1: [0, 1], 3: [1, 1], 6: [3, 1], 8: [4, 1], 10: [5, 1] }, white = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };
    function pOf(m) {
      var pc = m % 12, o = Math.floor(m / 12) - 1;
      if (pc in white) return { l: white[pc], a: 0, o: o };
      var b = black[pc]; return { l: b[0], a: b[1], o: o };
    }
    function draw() {
      if (clef === 'alto') { lo = 'C3'; hi = 'B4'; } else if (clef === 'bass') { lo = 'C2'; hi = 'B3'; } else if (clef === 'grand') { lo = 'C3'; hi = 'B5'; } else { lo = 'C4'; hi = 'B5'; }
      if (a.from) lo = a.from; if (a.to && clef === (a.clef || 'treble')) hi = a.to;
      var p = M.p(cur), mk = {}; mk[M.midi(p)] = { c: 'var(--gold)' };
      var pp = M.p(cur);
      var flat = { l: pp.a === 1 ? pp.l + 1 : pp.l, a: pp.a === 1 ? -1 : pp.a, o: pp.o }; if (flat.l > 6) { flat.l = 0; flat.o++; }
      var show = pp.a === 1 ? [{ k: cur, d: 'w', c: C.red }, { k: M.str(flat), d: 'w', c: C.blue }] : [{ k: cur, d: 'w', c: C.red }];
      M.score(st, { clef: clef, notes: show, minBar: 90, sp: 54, zoom: 2.4 });
      nl.innerHTML = pp.a === 1 ? '<span style="color:' + C.red + '">' + M.nameAll(p) + '</span>　＝　<span style="color:' + C.blue + '">' + M.nameAll(flat) + '</span>' : M.nameAll(p) + (M.midi(p) === 60 ? '　<small style="color:var(--muted)">（中央のド）</small>' : '');
      kb.innerHTML = M.keyboard({ from: lo, to: hi, mark: mk, names: true, h: 80 });
      kb.querySelector('svg').classList.add('tap');
    }
    kb.addEventListener('click', function (e) {
      var r = e.target.closest('rect[data-m]'); if (!r) return;
      var m = +r.dataset.m; cur = M.str(pOf(m)); M.play([[m, 1.2]]); draw();
    });
    box.addEventListener('click', function (e) { var b = e.target.closest('[data-cl]'); if (!b) return; clef = b.dataset.cl; cur = clef === 'bass' ? 'C3' : clef === 'alto' ? 'C4' : 'C4'; GK.$$('[data-cl]', box).forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); draw(); });
    requestAnimationFrame(draw);
  };

  // 3 つの音部記号と 中央のド
  CUSTOM.clefs3 = function (box) {
    box.style.cssText += ';flex-direction:column;align-items:stretch;gap:4px';
    [['treble', '𝄞 ト音記号', '第2線が ソ（G4）'], ['alto', '𝄡 ハ音記号', '第3線が ド（C4）'], ['bass', '𝄢 ヘ音記号', '第4線が ファ（F3）']].forEach(function (c) {
      var d = document.createElement('div'); d.style.cssText = 'flex:1 1 0;min-height:0;display:flex;align-items:center;gap:10px';
      box.appendChild(d);
      var cap = document.createElement('div'); cap.className = 'cap'; cap.style.cssText = 'flex:0 0 7.5em;text-align:left'; cap.innerHTML = '<b style="font-size:15px">' + c[1] + '</b><br><span style="color:' + C.blue + '">' + c[2] + '</span>'; d.appendChild(cap);
      var s = document.createElement('div'); s.style.cssText = 'flex:1 1 0;min-width:0;height:100%;display:flex;align-items:center'; d.appendChild(s);
      var ref = c[0] === 'treble' ? 'G4' : c[0] === 'bass' ? 'F3' : 'C4';
      var ns = c[0] === 'alto' ? [{ k: 'C4', d: 'w', c: C.red, lab: '中央の' + GK.nm('C4') }] : [{ k: ref, d: 'w', c: C.blue, lab: GK.nm(ref) }, { k: 'C4', d: 'w', c: C.red, lab: '中央の' + GK.nm('C4') }];
      M.score(s, { clef: c[0], notes: ns, minBar: 130, sp: 70, ls: 13, zoom: 2.2, below: 30, above: 26 });
    });
  };

  // 音符の木（全音符 → 2分 → 4分 → 8分 → 16分）
  CUSTOM.noteTree = function (box, a) {
    var rest = a.rest, W = 520, rows = rest ? [['w', 1], ['h', 2], ['q', 4], ['8', 8]] : [['w', 1], ['h', 2], ['q', 4], ['8', 8], ['16', 16]];
    var H = rows.length * 62 + 10, items = [], beams = [], texts = [];
    rows.forEach(function (r, ri) {
      var n = r[1], cw = (W - 150) / n;
      for (var i = 0; i < n; i++) {
        items.push({ s: ri, x: 130 + cw * i + cw / 2 - 6, k: 'B4', d: r[0] + (rest ? 'r' : ''), st: 1, rk: r[0] === 'w' && rest ? 'd/5' : null });
      }
      if (!rest && (r[0] === '8' || r[0] === '16')) {
        var base = items.length - n;
        for (var b = 0; b < n; b += 4) beams.push([base + b, base + b + 1, base + b + 2, base + b + 3].filter(function (x) { return x < items.length; }));
      }
      texts.push({ x: 8, y: ri * 62 + 62, t: (rest ? M.REST_JP : M.DUR_JP)[r[0]], anchor: 'start', size: 14 });
      texts.push({ x: 8, y: ri * 62 + 78, t: (4 / n) + ' 拍', anchor: 'start', size: 12, c: 'var(--muted)', bold: false });
    });
    var staves = rows.map(function (r, ri) { return { x: 120, y: ri * 62 - 18, w: W - 130, hide: true, mid: true }; });
    // 1 本線の「打楽器譜」にのせて 長さを横幅で見せる
    var r = M.free(box, { w: W, h: H + 20, staves: staves, items: items.map(function (it) { return Object.assign(it, { k: 'B4' }); }), beams: rest ? [] : beams, texts: texts });
    if (r) M.fit(r.svg, W, 0, H);
  };

  // 付点：音符 ＋ その半分
  CUSTOM.dotted = function (box) {
    var W = 520, H = 170;
    var r = M.free(box, {
      w: W, h: H, staves: [{ x: 0, y: -10, w: W, lines: 1, hide: true }],
      items: [
        { s: 0, x: 40, k: 'B4', d: 'qd', c: C.red }, { s: 0, x: 170, k: 'B4', d: 'q' }, { s: 0, x: 300, k: 'B4', d: '8', c: C.blue },
        { s: 0, x: 40, k: 'B4', d: 'hd', c: C.red, y: 1 }
      ].slice(0, 3),
      texts: [{ x: 120, y: 60, t: '＝', size: 28 }, { x: 250, y: 60, t: '＋', size: 28 }, { x: 46, y: 110, t: '付点4分音符', size: 14, c: C.red }, { x: 176, y: 110, t: '4分音符（1拍）', size: 14 }, { x: 306, y: 110, t: '8分音符（半拍）', size: 14, c: C.blue },
        { x: 430, y: 60, t: '＝ 1.5 拍', size: 22, c: C.red }, { x: 260, y: 150, t: '点は「すぐ左の音符の 半分」を たす', size: 15, c: 'var(--muted)' }]
    });
    if (r) M.fit(r.svg, W, 0, H);
  };

  // 拍子：強拍・弱拍
  CUSTOM.beats = function (box, a) {
    var time = a.time || '4/4', pat = { '2/4': ['強', '弱'], '3/4': ['強', '弱', '弱'], '4/4': ['強', '弱', '中強', '弱'], '6/8': ['強', '弱', '弱', '中強', '弱', '弱'] }[time];
    var notes = a.notes || { '2/4': [{ k: 'C5', d: 'q' }, { k: 'G4', d: 'q' }], '3/4': [{ k: 'C5', d: 'q' }, { k: 'E4', d: 'q' }, { k: 'G4', d: 'q' }], '4/4': [{ k: 'C5', d: 'q' }, { k: 'G4', d: 'q' }, { k: 'E5', d: 'q' }, { k: 'G4', d: 'q' }], '6/8': [{ k: 'C5', d: '8' }, { k: 'G4', d: '8' }, { k: 'G4', d: '8' }, { k: 'E5', d: '8' }, { k: 'G4', d: '8' }, { k: 'G4', d: '8' }] }[time];
    box.style.flexDirection = 'column';
    var sc = document.createElement('div'); sc.style.cssText = 'flex:1 1 0;min-height:0;width:100%;display:flex;align-items:center;justify-content:center'; box.appendChild(sc);
    var sp = { clef: 'treble', time: time, bars: [notes, notes], end: 'end', sp: 52, after: function (out) {
      out.notes.forEach(function (n, i) {
        var s = pat[i % pat.length], big = s === '強', mid = s === '中強';
        M.svgEl(out.svg, 'circle', { cx: n.x, cy: 150, r: big ? 11 : mid ? 8 : 5, fill: big ? C.red : mid ? C.gold : 'none', stroke: big ? C.red : mid ? C.gold : 'currentColor', 'stroke-width': 1.5 });
        M.svgText(out.svg, n.x, 178, s, { size: 12, c: big ? C.red : mid ? C.gold : 'currentColor' });
      });
    } };
    M.score(sc, sp);
  };

  // 音程の表（半音の数）
  CUSTOM.ivTable = function (box, a) {
    var rows = [['1度', '完全 0'], ['2度', '短 1・長 2'], ['3度', '短 3・長 4'], ['4度', '完全 5（増 6）'], ['5度', '完全 7（減 6）'], ['6度', '短 8・長 9'], ['7度', '短 10・長 11'], ['8度', '完全 12']];
    box.innerHTML = '<table class="ivt" style="border-collapse:collapse;font-size:calc(14px * var(--k));width:100%;max-width:520px">' +
      '<tr><th style="text-align:left;padding:3px 8px;border-bottom:1.5px solid var(--ink)">度数</th><th style="text-align:left;padding:3px 8px;border-bottom:1.5px solid var(--ink)">種類と 半音の数</th><th style="padding:3px 8px;border-bottom:1.5px solid var(--ink)">グループ</th></tr>' +
      rows.map(function (r, i) {
        var perf = [0, 3, 4, 7].indexOf(i) >= 0;
        return '<tr style="background:' + (perf ? 'var(--blue-soft)' : 'transparent') + '"><td style="padding:3px 8px;border-bottom:1px solid var(--line);font-weight:700">' + r[0] + '</td><td style="padding:3px 8px;border-bottom:1px solid var(--line)">' + r[1] + '</td><td style="padding:3px 8px;border-bottom:1px solid var(--line);text-align:center;color:' + (perf ? 'var(--blue)' : 'var(--warm)') + ';font-weight:700">' + (perf ? '完全' : '長・短') + '</td></tr>';
      }).join('') + '</table>';
  };

  // 音程の種類のものさし（減 ← 短 ← 長 → 増 ／ 減 ← 完全 → 増）
  CUSTOM.ivLadder = function (box) {
    var W = 520, H = 190;
    var s = '<svg class="dia" viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:100%;max-width:640px">';
    function lane(y, items, title, col) {
      s += '<text x="10" y="' + (y + 5) + '" font-size="14" font-weight="700" fill="' + col + '">' + title + '</text>';
      s += '<line x1="120" y1="' + y + '" x2="' + (W - 20) + '" y2="' + y + '" stroke="currentColor" stroke-width="1.5"/>';
      items.forEach(function (it, i) {
        var x = 140 + i * ((W - 180) / (items.length - 1));
        s += '<circle cx="' + x + '" cy="' + y + '" r="' + (it[2] ? 24 : 20) + '" fill="' + (it[2] ? col : 'var(--panel)') + '" stroke="' + col + '" stroke-width="2"/>';
        s += '<text x="' + x + '" y="' + (y + 6) + '" text-anchor="middle" font-size="16" font-weight="700" fill="' + (it[2] ? 'var(--panel)' : col) + '">' + it[0] + '</text>';
        if (i < items.length - 1) s += '<text x="' + (x + (W - 180) / (items.length - 1) / 2) + '" y="' + (y - 14) + '" text-anchor="middle" font-size="11" fill="var(--muted)">半音</text>';
      });
    }
    lane(50, [['減'], ['短', 0, 1], ['長', 0, 1], ['増']], '2・3・6・7度', 'var(--warm)');
    lane(140, [['減'], ['完全', 0, 1], ['増']], '1・4・5・8度', 'var(--blue)');
    s += '</svg>';
    box.innerHTML = s;
  };

  // 五度圏
  CUSTOM.circle = function (box, a, w) {
    var sel = a.sel != null ? a.sel : 0, tap = !!a.tap;
    function draw() {
      var R1 = 150, R2 = 104, R3 = 64, cx = 170, cy = 170, s = '<svg class="cof" viewBox="0 0 340 340" style="width:100%;height:100%">';
      for (var i = 0; i < 12; i++) {
        var f = i <= 6 ? i : i - 12; // 0..6 ♯, -5..-1 ♭
        var a0 = (i - 0.5) / 12 * Math.PI * 2 - Math.PI / 2, a1 = (i + 0.5) / 12 * Math.PI * 2 - Math.PI / 2;
        var p = function (r, an) { return (cx + r * Math.cos(an)).toFixed(1) + ' ' + (cy + r * Math.sin(an)).toFixed(1); };
        var cls = 'seg' + (f === sel ? ' on' : '') + (f === sel + 1 || f === sel - 1 || (sel === 6 && f === -5) || (sel === -5 && f === 6) ? ' dom' : '');
        s += '<g class="' + cls + '" data-f="' + f + '"><path d="M' + p(R1, a0) + ' A' + R1 + ' ' + R1 + ' 0 0 1 ' + p(R1, a1) + ' L' + p(R3, a1) + ' A' + R3 + ' ' + R3 + ' 0 0 0 ' + p(R3, a0) + ' Z"/>';
        var am = (a0 + a1) / 2, x1 = cx + (R1 + R2) / 2 * Math.cos(am), y1 = cy + (R1 + R2) / 2 * Math.sin(am), x2 = cx + (R2 + R3) / 2 * Math.cos(am), y2 = cy + (R2 + R3) / 2 * Math.sin(am);
        var mj = M.keyTonic(f), mn = M.keyTonic(f, true);
        var alt = f === 6 ? ' ' : '';
        s += '<text x="' + x1 + '" y="' + (y1 - 2) + '" text-anchor="middle" font-size="15" font-weight="700" fill="currentColor">' + M.name(mj, 'jp') + '</text>';
        s += '<text x="' + x1 + '" y="' + (y1 + 13) + '" text-anchor="middle" font-size="10" fill="var(--muted)">' + (f === 0 ? '♯♭0' : f > 0 ? '♯' + f : '♭' + (-f)) + '</text>';
        s += '<text x="' + x2 + '" y="' + (y2 + 4) + '" text-anchor="middle" font-size="11.5" fill="var(--accent)" font-weight="700">' + M.name(mn, 'jp').replace(/^(.+)$/, '$1') + '</text>';
        s += '</g>';
        s += '<line x1="' + p(R1, a0).split(' ')[0] + '" y1="' + p(R1, a0).split(' ')[1] + '" x2="' + p(R3, a0).split(' ')[0] + '" y2="' + p(R3, a0).split(' ')[1] + '" stroke="var(--line)"/>';
      }
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R2) + '" fill="none" stroke="var(--line)" stroke-dasharray="3 3"/>';
      s += '<text x="' + cx + '" y="' + (cy - 6) + '" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">外：長調</text>';
      s += '<text x="' + cx + '" y="' + (cy + 12) + '" text-anchor="middle" font-size="13" font-weight="700" fill="var(--accent)">内：短調</text>';
      s += '</svg>';
      box.innerHTML = s;
    }
    draw();
    if (tap) box.addEventListener('click', function (e) {
      var g = e.target.closest('[data-f]'); if (!g) return;
      sel = +g.dataset.f; draw(); a.onSel && a.onSel(sel);
    });
    box._set = function (f) { sel = f; draw(); };
  };

  // 調号の並び（♯：ファドソレラミシ／♭：シミラレソドファ）
  CUSTOM.keyOrder = function (box, a) {
    var sharp = a.sharp !== false;
    var ks = sharp ? ['F5', 'C5', 'G5', 'D5', 'A4', 'E5', 'B4'] : ['B4', 'E5', 'A4', 'D5', 'G4', 'C5', 'F4'];
    var nm = sharp ? ['ファ', 'ド', 'ソ', 'レ', 'ラ', 'ミ', 'シ'] : ['シ', 'ミ', 'ラ', 'レ', 'ソ', 'ド', 'ファ'];
    M.score(box, { clef: 'treble', notes: ks.map(function (k, i) { var p = M.p(k); p.a = sharp ? 1 : -1; return { k: M.str(p), d: 'q', st: 1, lab: nm[i], acc: 'show', c: i === 0 ? C.red : null }; }), beam: false, sp: 44 });
  };

  // 繰り返し記号の流れ
  CUSTOM.repeat = function (box, a) {
    var kind = a.kind || 'basic', bars, order;
    var mk = function (lab, k) { return [{ k: k, d: 'w', lab: lab }]; };
    if (kind === 'basic') { bars = [mk('A', 'C5'), mk('B', 'D5'), mk('C', 'E5'), mk('D', 'F5')]; bars[0].endBar = 'single'; bars[2].endBar = 'repeat'; bars[1].beg = 'repeat'; order = 'A → B → C → <b>B → C</b> → D'; }
    else if (kind === 'volta') { bars = [mk('A', 'C5'), mk('B', 'D5'), mk('C', 'E5'), mk('D', 'F5')]; bars[0].beg = 'repeat'; bars[1].volta = ['begin', '1.']; bars[1].endBar = 'repeat'; bars[2].volta = ['begin', '2.']; order = 'A → B →（もどる）→ A → <b>C</b> → D（2回目は 1番カッコを とばす）'; }
    else if (kind === 'dc') { bars = [mk('A', 'C5'), mk('B', 'D5'), mk('C', 'E5'), mk('D', 'F5')]; bars[1].top = 'Fine'; bars[1].endBar = 'double'; bars[3].rep = 'DC_AL_FINE'; order = 'A → B → C → D →（最初へ）→ A → B（Fine で 終わり）'; }
    else { bars = [mk('A', 'C5'), mk('B', 'D5'), mk('C', 'E5'), mk('D', 'F5')]; bars[1].repL = 'SEGNO_LEFT'; bars[3].rep = 'DS'; order = 'A → B → C → D →（𝄋 へ）→ B → C → D'; }
    bars.forEach(function (b) { b.forEach(function (n) { n.top = b.top; }); });
    var sp = { clef: 'treble', bars: bars, end: 'end', minBar: 92, sp: 40 };
    box.style.flexDirection = 'column';
    var s = document.createElement('div'); s.style.cssText = 'flex:1 1 0;min-height:0;width:100%;display:flex;align-items:center'; box.appendChild(s);
    var o = document.createElement('div'); o.className = 'cap'; o.style.fontSize = '15px'; o.innerHTML = '演奏する順：' + GK.symfix(order); box.appendChild(o);
    M.score(s, sp);
  };

  // 調の関係（平行調・同主調・属調・下属調）
  CUSTOM.related = function (box, a) {
    var f = a.f || 0;
    var k = function (ff, mi) { return M.keyName(ff, mi); };
    var cell = function (t, n, col, sub) { return '<div style="border:1.5px solid ' + col + ';border-radius:6px;padding:6px 10px;text-align:center;background:var(--panel)"><small style="color:' + col + ';font-weight:700">' + t + '</small><br><b style="font-size:19px">' + n + '</b>' + (sub ? '<br><small style="color:var(--muted)">' + sub + '</small>' : '') + '</div>'; };
    box.innerHTML = '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;align-items:center;width:100%;max-width:560px">' +
      cell('下属調（♭が1つ多い）', k(f - 1), 'var(--blue)', '主音が 完全4度 上') +
      cell('もとの調', k(f), 'var(--warm)', M.keyTonic(f) && (f === 0 ? '調号なし' : f > 0 ? '♯' + f : '♭' + (-f))) +
      cell('属調（♯が1つ多い）', k(f + 1), 'var(--blue)', '主音が 完全5度 上') +
      '<div></div>' + cell('平行調（調号が同じ）', k(f, true), 'var(--accent)', '主音が 短3度 下') + '<div></div>' +
      '<div></div>' + cell('同主調（主音が同じ）', M.name(M.keyTonic(f), 'jp') + '短調', 'var(--gold)', '調号が ♭3つ分 ちがう') + '<div></div></div>';
  };

  // 和音の 半音の積み重ね
  CUSTOM.triads = function (box, a) {
    var root = a.root || 'C4', types = a.types || ['maj', 'min', 'aug', 'dim'];
    box.style.gap = '8px'; box.style.alignItems = 'stretch';
    types.forEach(function (t) {
      var ch = M.chord(root, t), d = document.createElement('div');
      d.style.cssText = 'flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;cursor:pointer';
      d.title = '鳴らす';
      var s = document.createElement('div'); s.style.cssText = 'flex:1 1 0;min-height:0;width:100%;display:flex;align-items:center'; d.appendChild(s);
      var i1 = M.interval(ch[0], ch[1]), i2 = M.interval(ch[1], ch[2]);
      var cap = document.createElement('div'); cap.className = 'cap';
      cap.innerHTML = '<b>' + M.CH_JP[t] + '</b><br>' + M.chordName(ch[0], t) + '<br><small>下から ' + i1.name.replace('度', '') + '＋' + i2.name.replace('度', '') + '</small>';
      d.appendChild(cap); box.appendChild(d);
      M.score(s, { clef: 'treble', notes: [{ k: ch.map(M.str), d: 'w', kc: [C.red, t === 'min' || t === 'dim' ? C.blue : null, t === 'aug' || t === 'dim' ? C.blue : null] }], minBar: 60, noClef: false });
      d.addEventListener('click', function () { M.playChord(ch.map(M.str), true); });
    });
  };
})();
