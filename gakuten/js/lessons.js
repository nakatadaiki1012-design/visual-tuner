/* =========================================================
   楽典ラボ：授業の中身（13 単元）
   unit = { id, title, en, sym, goal, cards: [card...], sum: [3 行], types: [演習の問題の種類] }
   card = { k: 上の小さな見出し, h: 見出し, b: 本文（HTML）, pts: [短い箇条書き], fig: 図 または 図を返す関数, wide: 図を下に大きく }
   本文は 1 枚が スクロールなしで入る量（120 字くらいまで）
   ========================================================= */
(function () {
  'use strict';
  var GK = window.GK, M = GK.M, F = GK.F, C = M.COL;
  var N = function (k) { return GK.nm(k); };
  var nms = function (ks) { return ks.map(N); };
  var CMAJ = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];

  /* ---------- 図の部品 ---------- */
  // 強弱記号（Bravura の文字で）
  F.CUSTOM.dyn = function (box, a) {
    var list = a.list || ['pp', 'p', 'mp', 'mf', 'f', 'ff'], labs = a.labs || ['ごく弱く', '弱く', 'やや弱く', 'やや強く', '強く', 'ごく強く'];
    var GW = { p: 22, m: 30, f: 18, s: 16, z: 18 }, W = list.length * 86 + 20, glyphs = [], texts = [];
    list.forEach(function (d, i) {
      var tw = 0; d.split('').forEach(function (ch) { tw += GW[ch]; });
      var x = 20 + i * 86 + (86 - tw) / 2;
      d.split('').forEach(function (ch) {
        glyphs.push({ x: x, y: 52, code: { p: 'dynamicPiano', m: 'dynamicMezzo', f: 'dynamicForte', s: 'dynamicSforzando', z: 'dynamicZ' }[ch], size: 44 });
        x += GW[ch];
      });
      texts.push({ x: 20 + i * 86 + 43, y: 88, t: labs[i], size: 13 });
      if (a.read) texts.push({ x: 20 + i * 86 + 43, y: 106, t: a.read[i], size: 11, c: 'var(--muted)', bold: false });
    });
    var r = M.free(box, { w: W, h: 116, glyphs: glyphs, texts: texts });
    if (r && a.hair) {
      var y = 20;
      M.svgEl(r.svg, 'path', { d: 'M' + (W * 0.15) + ' ' + y + ' L' + (W * 0.45) + ' ' + (y - 9) + ' M' + (W * 0.15) + ' ' + y + ' L' + (W * 0.45) + ' ' + (y + 9), stroke: 'currentColor', fill: 'none', 'stroke-width': 1.6 });
      M.svgEl(r.svg, 'path', { d: 'M' + (W * 0.55) + ' ' + (y - 9) + ' L' + (W * 0.85) + ' ' + y + ' L' + (W * 0.55) + ' ' + (y + 9), stroke: 'currentColor', fill: 'none', 'stroke-width': 1.6 });
      M.svgText(r.svg, W * 0.3, y - 14, 'cresc.（だんだん強く）', { size: 12, italic: true });
      M.svgText(r.svg, W * 0.7, y - 14, 'dim.（だんだん弱く）', { size: 12, italic: true });
      M.fit(r.svg, W, 0, 110);
    }
  };
  // 速さのものさし
  F.CUSTOM.tempo = function (box) {
    var L = [['Largo', 'ラルゴ', '幅広く ゆるやかに', 46], ['Adagio', 'アダージョ', 'ゆるやかに', 60], ['Andante', 'アンダンテ', '歩くような速さで', 76], ['Moderato', 'モデラート', '中くらいの速さで', 96], ['Allegro', 'アレグロ', '速く', 132], ['Presto', 'プレスト', '急速に', 180]];
    var W = 560, s = '<svg class="dia" viewBox="0 0 ' + W + ' 170" style="width:100%;height:100%;max-width:720px">';
    s += '<defs><linearGradient id="tg" x1="0" x2="1"><stop offset="0" stop-color="var(--blue)"/><stop offset="1" stop-color="var(--warm)"/></linearGradient></defs>';
    s += '<rect x="20" y="70" width="' + (W - 40) + '" height="10" rx="5" fill="url(#tg)"/>';
    s += '<text x="20" y="104" font-size="12" fill="var(--blue)" font-weight="700">← おそい</text><text x="' + (W - 20) + '" y="104" text-anchor="end" font-size="12" fill="var(--warm)" font-weight="700">はやい →</text>';
    L.forEach(function (t, i) {
      var x = 50 + i * (W - 100) / 5;
      s += '<circle cx="' + x + '" cy="75" r="7" fill="var(--panel)" stroke="currentColor" stroke-width="2"/>';
      s += '<text x="' + x + '" y="' + (i % 2 ? 48 : 30) + '" text-anchor="middle" font-size="15" font-weight="700" class="en" font-style="italic" fill="currentColor">' + t[0] + '</text>';
      s += '<text x="' + x + '" y="' + (i % 2 ? 62 : 44) + '" text-anchor="middle" font-size="10" fill="var(--muted)">' + t[1] + '</text>';
      s += '<text x="' + x + '" y="' + (i % 2 ? 140 : 124) + '" text-anchor="middle" font-size="12" fill="currentColor">' + t[2] + '</text>';
      s += '<text x="' + x + '" y="' + (i % 2 ? 156 : 140) + '" text-anchor="middle" font-size="10" fill="var(--muted)">♩≒' + t[3] + '</text>';
    });
    box.innerHTML = s + '</svg>';
  };
  // 表（HTML）
  function table(head, rows, o) {
    o = o || {};
    return '<table style="border-collapse:collapse;font-size:calc(' + (o.fs || 14.5) + 'px * var(--k));width:100%;max-width:' + (o.mw || 540) + 'px">' +
      '<tr>' + head.map(function (h) { return '<th style="text-align:left;padding:3px 8px;border-bottom:1.5px solid var(--ink)">' + h + '</th>'; }).join('') + '</tr>' +
      rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return '<td style="padding:3px 8px;border-bottom:1px solid var(--line);' + (i === 0 ? 'font-weight:700;' : '') + (o.en && i === 0 ? 'font-family:var(--font-en);font-style:italic;font-size:1.1em;' : '') + '">' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
  }

  /* =========================================================
     単元
     ========================================================= */
  GK.UNITS = [
    /* ---------------- 01 ---------------- */
    {
      id: 'u01', title: '五線と音名', en: 'Staff & Note Names', sym: '𝄞', goal: '五線の上の音を すぐに音名で読める',
      cards: [
        { k: '✨ ひとことで言うと', h: '五線は 音の高さの「はしご」', b: '5本の<b>線</b>と 4つの<b>間（かん）</b>に、下から順に音がならぶ。線 → 間 → 線…と <em>1段上がるごとに 1つ高い音</em>。', pts: ['いちばん下の線が 第1線、上へ 第2線…', '線と線のすきまは 第1間・第2間…'], fig: function () { return { score: F.melody(CMAJ, { labs: nms(CMAJ), d: 'q' }), play: true, cap: '🔊 で 下から順に鳴らせます' }; } },
        { k: 'ポイント 1', h: '音名は 3 つの言い方', b: '同じ音でも 言い方が3つある。<b>ドレミ</b>（イタリア語）、<b>ハニホ</b>（日本語：調の名前に使う）、<b>CDE</b>（英語：コードネームに使う）。', fig: function () { return { col: [{ score: F.melody(CMAJ.slice(0, 7), { labs: ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ'], d: 'q' }) }, { html: table(['ドレミ', 'ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ'], [['日本', 'ハ', 'ニ', 'ホ', 'ヘ', 'ト', 'イ', 'ロ'], ['英語', 'C', 'D', 'E', 'F', 'G', 'A', 'B']], { mw: 560 }) }] }; } },
        { k: 'ポイント 2', h: '音部記号が「ものさし」を決める', b: '<b>ト音記号</b>はソ、<b>ヘ音記号</b>はファ、<b>ハ音記号</b>はドの線を決める記号。うずの中心・2つの点・中央のくぼみが その音の線。', pts: ['ト音記号：第2線が ソ（G4）', 'ヘ音記号：第4線が ファ（F3）', 'ハ音記号：まん中の線が ド（ビオラなど）'], fig: { c: 'clefs3' } },
        { k: 'ポイント 3', h: '加線と 大譜表', b: '五線からはみ出る音は 短い線＝<b>加線</b>を足して書く。ト音記号とヘ音記号の五線を｛でつないだものが<b>大譜表</b>（ピアノの楽譜）。<em>中央のド</em>は ちょうど まん中の加線1本。', fig: function () { return { score: { clef: 'grand', notes: [{ k: 'C3', d: 'w', lab: N('C3') }, { k: 'G3', d: 'w', lab: N('G3') }, { k: 'C4', d: 'w', staff: 1, c: C.red, lab: '中央の' + N('C4') }, { k: 'C4', d: 'w', staff: 2, c: C.red, lab: '同じ音' }, { k: 'G4', d: 'w', lab: N('G4') }, { k: 'C5', d: 'w', lab: N('C5') }], sp: 50 }, play: [['C3', 1], ['G3', 1], ['C4', 1], ['C4', 1], ['G4', 1], ['C5', 1]] }; } },
        { k: '🎹 さわってみよう', h: '鍵盤をおすと 五線に出る', b: '鍵盤をタップすると その音が五線に出て 鳴ります。記号を切りかえて、同じ音が どこに書かれるか くらべよう。', wide: true, fig: { c: 'staffKbd', a: { clefs: true } } }
      ],
      sum: ['線と間に 下から順に 音がならぶ', 'ト音記号＝ソ、ヘ音記号＝ファ、ハ音記号＝ド の線', '中央のドは 大譜表の まん中の加線'],
      types: ['readT', 'readB', 'findNote', 'nameSys', 'readA', 'grandSame']
    },
    /* ---------------- 02 ---------------- */
    {
      id: 'u02', title: '音符と休符', en: 'Notes & Rests', sym: '♩', goal: '音符・休符の名前と 長さ（何拍）がわかる',
      cards: [
        { k: '✨ ひとことで言うと', h: '音符は「半分、半分」で できている', b: '<b>全音符</b>を半分にすると<b>2分音符</b>、さらに半分で<b>4分音符</b>…。4分音符を 1拍 とすると、全音符は 4拍。', fig: { c: 'noteTree' }, wide: true },
        { k: 'ポイント 1', h: '音符の 3 つの部分', b: '<b>たま</b>（符頭）・<b>ぼう</b>（符尾）・<b>はた</b>（符鉤）。<em>はたが 1本ふえるたびに 長さは半分</em>。8分音符がならぶと はたが つながって<b>連桁</b>になる。', pts: ['ぼうは 第3線より上の音なら 下向き', '連桁（れんこう）は 拍のまとまりを 見やすくする'], fig: { score: { clef: 'treble', time: '2/4', bars: [[{ k: 'A4', d: 'q', lab: '4分' }, { k: 'A4', d: '8', lab: '8分', nb: true }, { k: 'A4', d: '16', lab: '16分', nb: true }, { k: 'A4', d: '16', nb: true }], [{ k: 'A4', d: '8', lab: '連桁' }, { k: 'B4', d: '8' }, { k: 'C5', d: '16' }, { k: 'D5', d: '16' }, { k: 'E5', d: '16' }, { k: 'F5', d: '16' }]], end: 'end', sp: 44 }, play: true } },
        { k: 'ポイント 2', h: '休符は「音を出さない長さ」', b: '音符と同じ長さの休符がある。<b>全休符</b>は線から<em>ぶら下がり</em>、<b>2分休符</b>は線の上に<em>のる</em>（帽子のよう）。', fig: { c: 'noteTree', a: { rest: true } }, wide: true },
        { k: 'ポイント 3', h: '付点は「半分を たす」', b: '音符の右の点＝<b>付点</b>。もとの長さの<em>半分</em>が たされる。付点2分音符＝2＋1＝3拍、付点4分音符＝1＋0.5＝1.5拍。', pts: ['点が2つ（複付点）なら さらに その半分も たす', '休符にも 付点がつく'], fig: { c: 'dotted' } }
      ],
      sum: ['全 → 2分 → 4分 → 8分 → 16分 で 半分ずつ', 'はたが1本ふえると 半分', '付点は もとの長さの 半分を たす'],
      types: ['durName', 'restName', 'durCount', 'durSum', 'longest']
    },
    /* ---------------- 03 ---------------- */
    {
      id: 'u03', title: '拍子と小節', en: 'Meter & Measures', sym: '𝄴', goal: '拍子記号を読み、1小節の長さを 計算できる',
      cards: [
        { k: '✨ ひとことで言うと', h: '拍子記号は「何分音符が いくつ」', b: '<b>下の数</b>＝1拍になる音符（4なら4分音符）。<b>上の数</b>＝1小節に いくつ入るか。<em>3/4 は「4分音符が3つ」</em>で 1小節。', fig: { score: { clef: 'treble', time: '3/4', bars: [[{ k: 'C5', d: 'q', lab: '1' }, { k: 'E5', d: 'q', lab: '2' }, { k: 'G5', d: 'q', lab: '3' }], [{ k: 'E5', d: 'h', lab: '1・2' }, { k: 'C5', d: 'q', lab: '3' }], [{ k: 'C5', d: 'hd', lab: '1・2・3' }]], end: 'end', sp: 48 }, play: true, cap: 'どの小節も 4分音符 3つ分' } },
        { k: 'ポイント 1', h: '小節線・複縦線・終止線', b: '拍子のまとまりで区切る線が<b>小節線</b>、区切りの間が<b>小節</b>。曲の区切りは2本線の<b>複縦線</b>、終わりは右が太い<b>終止線</b>。', fig: { score: { clef: 'treble', time: '4/4', bars: [[{ k: 'G4', d: 'h', top: '小節' }, { k: 'A4', d: 'h' }], Object.assign([{ k: 'B4', d: 'w', top: '' }], { endBar: 'double' }), [{ k: 'C5', d: 'w', top: '' }]], end: 'end', sp: 46, after: function (o) { var s = o.staves; M.svgText(o.svg, s[0].getX() + s[0].getWidth(), 112, '小節線', { size: 12 }); M.svgText(o.svg, s[1].getX() + s[1].getWidth(), 112, '複縦線', { size: 12 }); M.svgText(o.svg, s[2].getX() + s[2].getWidth() - 4, 112, '終止線', { size: 12 }); } } } },
        { k: 'ポイント 2', h: '強い拍と 弱い拍', b: '小節の<b>1拍目</b>がいちばん強い（強拍）。2拍子は 強・弱、3拍子は 強・弱・弱、4拍子は 強・弱・<b>中強</b>・弱。', fig: { c: 'beats', a: { time: '4/4' } }, wide: true },
        { k: 'ポイント 3', h: '6/8 は「2拍子」に感じる', b: '6/8 は 8分音符が6つ。でも <em>3つずつ まとまって</em> 付点4分音符×2 の<b>2拍子</b>に感じる。これを<b>複合拍子</b>という（2/4・3/4・4/4 は 単純拍子）。', pts: ['6/8＝複合2拍子、9/8＝複合3拍子、12/8＝複合4拍子'], fig: { c: 'beats', a: { time: '6/8' } }, wide: true },
        { k: 'ポイント 4', h: 'C と ¢ という 拍子記号', b: '<b>C</b> は 4/4（コモンタイム）。たて線の入った <b>¢</b> は 2/2（アラ・ブレーヴェ）で、2分音符を1拍として 2つで数える。', fig: { row: [{ score: { clef: 'treble', time: 'C', notes: [{ k: 'C5', d: 'q' }, { k: 'D5', d: 'q' }, { k: 'E5', d: 'q' }, { k: 'C5', d: 'q' }], end: 'end', sp: 34 }, cap: '<b>C</b> ＝ 4/4' }, { score: { clef: 'treble', time: 'C|', notes: [{ k: 'C5', d: 'h' }, { k: 'G4', d: 'h' }], end: 'end', sp: 40 }, cap: '<b>¢</b> ＝ 2/2' }] } }
      ],
      sum: ['下の数＝1拍の音符、上の数＝1小節の拍の数', '1拍目が強拍。4拍子は 強・弱・中強・弱', '6/8 は 3つずつまとまる 複合2拍子'],
      types: ['timeFit', 'missing', 'timeKind', 'eighthCount', 'strong']
    },
    /* ---------------- 04 ---------------- */
    {
      id: 'u04', title: 'リズムを読む', en: 'Reading Rhythms', sym: '𝄻', goal: 'タイ・3連符・シンコペーション・弱起が読める',
      cards: [
        { k: '✨ ひとことで言うと', h: 'タイは「長さの たし算」', b: '<b>同じ高さ</b>の音を弧でつなぐのが<b>タイ</b>。2つめは弾き直さず、長さを<em>たす</em>。小節をまたぐ長い音も タイで書ける。', fig: { score: { clef: 'treble', time: '4/4', bars: [[{ k: 'G4', d: 'h' }, { k: 'A4', d: 'h', tie: true, c: C.red, lab: '2拍' }], [{ k: 'A4', d: 'q', c: C.red, lab: '＋1拍' }, { k: 'B4', d: 'q' }, { k: 'C5', d: 'h' }]], end: 'end', sp: 46 }, play: true, cap: '赤い音は つないで 3拍 のばす' } },
        { k: 'ポイント 1', h: 'タイと スラーの ちがい', b: '弧が<b>同じ高さ</b>をつなぐ → <b>タイ</b>（長さをたす）。<b>ちがう高さ</b>をつなぐ → <b>スラー</b>（なめらかに演奏する）。形は同じなので 高さを見て区別する。', fig: { row: [{ score: { clef: 'treble', notes: [{ k: 'E5', d: 'h', tie: true }, { k: 'E5', d: 'h' }], sp: 46 }, cap: '<b>タイ</b>：ミを 4拍' }, { score: { clef: 'treble', notes: [{ k: 'C5', d: 'q', sl: 3 }, { k: 'D5', d: 'q' }, { k: 'E5', d: 'q' }, { k: 'F5', d: 'q' }], sp: 40 }, cap: '<b>スラー</b>：なめらかに' }] } },
        { k: 'ポイント 2', h: '3連符は「2つ分を 3等分」', b: '<b>3連符</b>は ふつう2つ入る長さに 3つ入れる。8分音符の3連符3つで <em>4分音符1つ分</em>（1拍）。数字の3が目じるし。', fig: { score: { clef: 'treble', time: '2/4', bars: [[{ k: 'A4', d: '8', lab: 'タ' }, { k: 'A4', d: '8', lab: 'タ' }, { k: 'A4', d: '8', t3: true, lab: 'タ', c: C.red }, { k: 'A4', d: '8', t3: true, lab: 'タ', c: C.red }, { k: 'A4', d: '8', t3: true, lab: 'タ', c: C.red }], [{ k: 'G4', d: 'h' }]], end: 'end', sp: 40 }, play: true, cap: '1拍に 2つ → 1拍に 3つ' } },
        { k: 'ポイント 3', h: 'シンコペーション', b: '弱い拍の音が 次の強い拍まで のびて、<em>強弱の位置がずれる</em>リズム。はずむような感じになる。ポップスでも たくさん使われる。', fig: { score: { clef: 'treble', time: '4/4', bars: [[{ k: 'G4', d: '8' }, { k: 'A4', d: 'q', c: C.red, lab: '←ずれる', nb: true }, { k: 'G4', d: '8' }, { k: 'E4', d: 'q' }, { k: 'E4', d: 'q' }], [{ k: 'G4', d: '8' }, { k: 'C5', d: '8', tie: true, c: C.red }, { k: 'C5', d: 'q', c: C.red }, { k: 'A4', d: 'h' }]], end: 'end', sp: 38 }, play: true, bpm: 96 } },
        { k: 'ポイント 4', h: '弱起（アウフタクト）', b: '曲が 1拍目以外から始まること。<b>最初の小節</b>は拍が足りない。そのぶん<b>最後の小節</b>も短く、<em>2つ合わせて1小節</em>になる。', fig: { score: { clef: 'treble', time: '3/4', bars: [[{ k: 'G4', d: 'q', c: C.red, lab: '3拍目から' }], [{ k: 'C5', d: 'h' }, { k: 'B4', d: 'q' }], [{ k: 'A4', d: 'q' }, { k: 'G4', d: 'q' }, { k: 'F4', d: 'q' }], [{ k: 'E4', d: 'h', c: C.red, lab: '2拍だけ' }]], end: 'end', sp: 40, minBar: 54 }, play: true, cap: '1拍 ＋ 2拍 ＝ 3拍（1小節分）' } }
      ],
      sum: ['タイ＝同じ高さをつなぎ 長さをたす', '3連符＝2つ分を3等分', '弱起は 最初と最後の小節で 1小節分'],
      types: ['tieLen', 'tripletQ', 'synco', 'pickup', 'beatCount']
    },
    /* ---------------- 05 ---------------- */
    {
      id: 'u05', title: '変化記号と半音', en: 'Accidentals', sym: '♯', goal: '♯・♭・♮ と 全音・半音が 鍵盤で説明できる',
      cards: [
        { k: '✨ ひとことで言うと', h: '♯ は半音上げ、♭ は半音下げ', b: '<b>♯（シャープ）</b>は半音上げる、<b>♭（フラット）</b>は半音下げる、<b>♮（ナチュラル）</b>は もとの高さにもどす。<em>半音＝鍵盤の となり</em>（黒鍵もふくむ）。', fig: function () { return { col: [{ score: { clef: 'treble', notes: [{ k: 'F4', d: 'w', lab: N('F4') }, { k: 'F#4', d: 'w', lab: N('F#4'), c: C.red }, { k: 'F4', d: 'w', lab: 'もどす', acc: 'show' }, { k: 'Bb4', d: 'w', lab: N('Bb4'), c: C.blue }], sp: 46 }, play: [['F4', 1], ['F#4', 1], ['F4', 1], ['Bb4', 1]] }, { kbd: { from: 'C4', to: 'B4', mark: { 65: { t: N('F4') }, 66: { c: C.red, t: '♯' }, 70: { c: C.blue, t: '♭' }, 71: { t: N('B4') } }, h: 70 } }] }; } },
        { k: 'ポイント 1', h: '全音と半音', b: '鍵盤の となりどうし＝<b>半音</b>、半音2つ分＝<b>全音</b>。白鍵でも <em>ミとファ、シとド</em> の間には黒鍵がないので 半音。', fig: function () { return { kbd: { from: 'C4', to: 'C5', mark: { 64: { c: C.red, t: N('E4') }, 65: { c: C.red, t: N('F4') }, 71: { c: C.red, t: N('B4') }, 72: { c: C.red, t: N('C5') } }, steps: [[60, 62, '全'], [62, 64, '全'], [64, 65, '半', C.red], [65, 67, '全'], [67, 69, '全'], [69, 71, '全'], [71, 72, '半', C.red]], h: 110 }, play: [['E4', 1], ['F4', 1], ['B4', 1], ['C5', 1]] }; } },
        { k: 'ポイント 2', h: '異名同音（いめいどうおん）', b: '名前はちがうのに 同じ鍵盤の音。<em>ド♯ と レ♭</em>、ミ♯ と ファ。楽譜では 調や流れに合う方の名前で書く。', fig: { c: 'staffKbd', a: { start: 'C#4', from: 'C4', to: 'B4' } } },
        { k: 'ポイント 3', h: '臨時記号は その小節の中だけ', b: '曲の途中でつく♯♭♮＝<b>臨時記号</b>。<em>同じ小節・同じ高さ</em>の音に ずっと効くが、<b>次の小節で もとにもどる</b>。', fig: function () { return { score: { clef: 'treble', time: '4/4', bars: [[{ k: 'F#4', d: 'q', lab: N('F#4'), c: C.red }, { k: 'A4', d: 'q' }, { k: 'F#4', d: 'q', lab: 'まだ ♯', c: C.red }, { k: 'G4', d: 'q' }], [{ k: 'F4', d: 'q', lab: 'もどる', c: C.blue }, { k: 'A4', d: 'q' }, { k: 'G4', d: 'h' }]], end: 'end', sp: 46 }, play: true }; } },
        { k: 'ポイント 4', h: 'ダブルシャープ・ダブルフラット', b: '<b>𝄪</b>（ダブルシャープ）は 全音（半音2つ）上げ、<b>𝄫</b>（ダブルフラット）は 全音下げ。ファ𝄪 は ソ と同じ鍵盤。', fig: function () { return { score: { clef: 'treble', notes: [{ k: 'F##4', d: 'w', lab: N('F##4'), c: C.red }, { k: 'G4', d: 'w', lab: N('G4') }, { k: 'Bbb4', d: 'w', lab: N('Bbb4'), c: C.blue }, { k: 'A4', d: 'w', lab: N('A4') }], sp: 50 }, play: [['F##4', 1], ['G4', 1], ['Bbb4', 1], ['A4', 1]], cap: '赤と青は となりと 同じ高さ' }; } }
      ],
      sum: ['♯ 半音上げ・♭ 半音下げ・♮ もどす', 'ミ‐ファ と シ‐ド は 白鍵どうしの半音', '臨時記号は その小節の 同じ高さの音だけ'],
      types: ['accName', 'halfWhole', 'enharm', 'accRule', 'kbdName']
    },
    /* ---------------- 06 ---------------- */
    {
      id: 'u06', title: '音程', en: 'Intervals', sym: '⇕', goal: '2つの音の音程を「長3度」のように 名前で言える',
      cards: [
        { k: '✨ ひとことで言うと', h: '音程は「両はしも数える」', b: '2つの音の へだたりを<b>度</b>で表す。<em>同じ音が1度</em>、となりが2度。ドからソは ド・レ・ミ・ファ・ソ と<em>両はしも数えて</em> 5度。', fig: function () { return { score: { clef: 'treble', notes: ['C4', 'D4', 'E4', 'F4', 'G4'].map(function (k, i) { return { k: k, d: 'w', lab: (i + 1) + '', c: i === 0 || i === 4 ? C.red : C.gray, lc: i === 0 || i === 4 ? C.red : C.gray }; }), sp: 46 }, play: [['C4', 1], ['G4', 1], [['C4', 'G4'], 2]], cap: 'ド〜ソ は 5度' }; } },
        { k: 'ポイント 1', h: '同じ「3度」でも 2種類ある', b: 'ド〜ミ と ミ〜ソ は どちらも3度。でも 半音の数は <b>4つ</b> と <b>3つ</b>。広い方を<b>長3度</b>、せまい方を<b>短3度</b>という。', fig: function () { return { col: [{ score: { clef: 'treble', notes: [{ k: ['C4', 'E4'], d: 'w', lab: '長3度', c: C.red }, { k: ['E4', 'G4'], d: 'w', lab: '短3度', c: C.blue }], sp: 70 }, play: [[['C4', 'E4'], 2], [['E4', 'G4'], 2]] }, { kbd: { from: 'C4', to: 'B4', mark: { 60: { c: C.red }, 64: { c: 'var(--gold)' }, 67: { c: C.blue } }, steps: [[60, 64, '半音4つ', C.red], [64, 67, '半音3つ', C.blue]], h: 70 } }] }; } },
        { k: 'ポイント 2', h: '「完全」グループと「長・短」グループ', b: '1・4・5・8度は<b>完全</b>。2・3・6・7度は<b>長</b>と<b>短</b>。どちらも 半音広がると<b>増</b>、半音せまくなると<b>減</b>。', fig: { c: 'ivLadder' } },
        { k: 'ポイント 3', h: '半音の数で 確かめる', b: '迷ったら 鍵盤で<em>半音の数</em>を数える。たとえば ファ〜シ は4度だが 半音6つ → 完全4度（5つ）より広いので<b>増4度</b>。', fig: { c: 'ivTable' } },
        { k: 'ポイント 4', h: '転回音程は「9 から引く」', b: '下の音を1オクターブ上げると<b>転回音程</b>。度数は <em>9 − もとの度数</em>、長と短・増と減が 入れかわり、完全は完全のまま。', pts: ['長3度 → 短6度', '完全4度 → 完全5度', '8度より広い音程は 複音程（9度＝8度＋2度）'], fig: function () { return { score: { clef: 'treble', notes: [{ k: ['C4', 'E4'], d: 'w', lab: '長3度' }, { k: ['E4', 'C5'], d: 'w', lab: '短6度', kc: [null, C.red] }, { k: ['D4', 'G4'], d: 'w', lab: '完全4度' }, { k: ['G4', 'D5'], d: 'w', lab: '完全5度', kc: [null, C.red] }], sp: 58 }, play: [[['C4', 'E4'], 2], [['E4', 'C5'], 2], [['D4', 'G4'], 2], [['G4', 'D5'], 2]] }; } }
      ],
      sum: ['度数は 両はしの音も数える', '1・4・5・8度は完全、2・3・6・7度は長・短', '転回すると 9−度数、長と短が 入れかわる'],
      types: ['ivDeg', 'ivName', 'ivBuild', 'ivInv', 'ivEar']
    },
    /* ---------------- 07 ---------------- */
    {
      id: 'u07', title: '長音階', en: 'Major Scales', sym: '♪', goal: '「全全半全全全半」で 長音階を組み立てられる',
      cards: [
        { k: '✨ ひとことで言うと', h: '長音階は「全 全 半 全 全 全 半」', b: 'ドから白鍵だけで ドまで弾くと<b>ハ長調の長音階</b>。音と音のへだたりは いつも <em>全・全・半・全・全・全・半</em>。明るい響き。', fig: function () { return { col: [{ score: F.melody(CMAJ, { labs: nms(CMAJ), d: 'q' }), play: true }, { kbd: { from: 'C4', to: 'C5', mark: { 60: { c: C.red } , 72: { c: C.red } }, steps: [[60, 62, '全'], [62, 64, '全'], [64, 65, '半', C.red], [65, 67, '全'], [67, 69, '全'], [69, 71, '全'], [71, 72, '半', C.red]], h: 70 } }] }; } },
        { k: 'ポイント 1', h: 'ソから始めると ♯ が1つ必要', b: 'ソから 同じ並びを作ると、7番目と8番目の間を<b>半音</b>にするため <em>ファを ファ♯</em> にしないといけない。これが<b>ト長調</b>。', fig: function () { var g = M.scale('G4', 'major').map(M.str); return { col: [{ score: { clef: 'treble', notes: g.map(function (k, i) { return { k: k, d: 'q', lab: N(k), c: i === 6 ? C.red : null }; }), sp: 40 }, play: true }, { kbd: { from: 'G4', to: 'G5', mark: { 78: { c: C.red, t: '♯' } }, steps: [[67, 69, '全'], [69, 71, '全'], [71, 72, '半'], [72, 74, '全'], [74, 76, '全'], [76, 78, '全', C.red], [78, 79, '半', C.red]], h: 70 } }] }; } },
        { k: 'ポイント 2', h: '音階の音には 役割の名前がある', b: '1番目が<b>主音</b>（その調の中心）、5番目が<b>属音</b>（主音の次に大事）、4番目が<b>下属音</b>、7番目が<b>導音</b>。', pts: ['Ⅰ 主音・Ⅱ 上主音・Ⅲ 中音・Ⅳ 下属音', 'Ⅴ 属音・Ⅵ 下中音・Ⅶ 導音'], fig: { score: { clef: 'treble', notes: CMAJ.slice(0, 7).map(function (k, i) { return { k: k, d: 'w', lab: M.ROMAN[i], c: i === 0 ? C.red : i === 4 ? C.blue : i === 6 ? C.gold : i === 3 ? C.green : null }; }), sp: 44, after: function (o) { var nm = ['主音', '', '', '下属音', '属音', '', '導音']; o.notes.forEach(function (n, i) { if (nm[i]) M.svgText(o.svg, n.x, 152, nm[i], { size: 12, c: [C.red, 0, 0, C.green, C.blue, 0, C.gold][i] }); }); } } } },
        { k: 'ポイント 3', h: '導音は 主音に 進みたがる', b: '<b>導音</b>は 主音の<em>半音下</em>。鳴らすと 主音に解決したくなる。長音階の 明るく 終わった感じは この半音から 生まれる。', fig: function () { return { score: { clef: 'treble', time: '4/4', bars: [[{ k: 'G4', d: 'q' }, { k: 'A4', d: 'q' }, { k: 'B4', d: 'h', c: C.gold, lab: '導音' }], [{ k: 'C5', d: 'w', c: C.red, lab: '主音' }]], end: 'end', sp: 48 }, play: true }; } }
      ],
      sum: ['長音階は 全・全・半・全・全・全・半', '3〜4番目、7〜8番目が 半音', 'Ⅰ主音・Ⅳ下属音・Ⅴ属音・Ⅶ導音'],
      types: ['majPattern', 'majWrong', 'degreeName', 'scaleName']
    },
    /* ---------------- 08 ---------------- */
    {
      id: 'u08', title: '短音階', en: 'Minor Scales', sym: '♭', goal: '短音階の 3 つの種類を 見分けられる',
      cards: [
        { k: '✨ ひとことで言うと', h: '短音階は「全 半 全 全 半 全 全」', b: 'ラから白鍵だけで ラまで弾くと<b>イ短調</b>の<b>自然短音階</b>。2〜3番目、5〜6番目が半音。少し暗く、さみしい響き。', fig: function () { var a = M.scale('A4', 'natural').map(M.str); return { col: [{ score: F.melody(a, { labs: nms(a), d: 'q' }), play: true }, { kbd: { from: 'A4', to: 'A5', steps: [[69, 71, '全'], [71, 72, '半', C.red], [72, 74, '全'], [74, 76, '全'], [76, 77, '半', C.red], [77, 79, '全'], [79, 81, '全']], h: 70 } }] }; } },
        { k: 'ポイント 1', h: '和声短音階：第7音を 半音上げる', b: '自然短音階には 導音（主音の半音下）がない。そこで <em>第7音を半音上げて</em> 導音を作ったものが<b>和声短音階</b>。イ短調なら ソ♯。', fig: function () { var a = M.scale('A4', 'harmonic').map(M.str); return { score: { clef: 'treble', notes: a.map(function (k, i) { return { k: k, d: 'q', lab: N(k), c: i === 6 ? C.red : null }; }), sp: 42 }, play: true, cap: '6〜7番目は 半音3つ分（増2度）に広がる' }; } },
        { k: 'ポイント 2', h: '旋律短音階：上りと下りで ちがう', b: '和声短音階の 増2度を なめらかにするため、<b>上がるとき</b>は 第6・第7音を半音上げる。<b>下がるとき</b>は 自然短音階にもどる。', fig: function () { var up = M.scale('A4', 'melodic').map(M.str), dn = M.scale('A4', 'natural').map(M.str).reverse(); return { score: { clef: 'treble', bars: [up.map(function (k, i) { return { k: k, d: '8', c: i === 5 || i === 6 ? C.red : null, lab: i === 5 || i === 6 ? N(k) : null }; }), dn.map(function (k, i) { return { k: k, d: '8', c: i === 1 || i === 2 ? C.blue : null, lab: i === 1 || i === 2 ? N(k) : null }; })], end: 'end', sp: 30 }, play: true, bpm: 120, cap: '<b style="color:#c4452a">上り</b>：ファ♯・ソ♯　<b style="color:#2f6bb8">下り</b>：ソ♮・ファ♮' }; } },
        { k: 'ポイント 3', h: '長調と短調を 聴きくらべ', b: '同じ<b>ド</b>から始めても、ハ長調は明るく、ハ短調は暗い。ちがいは <em>3番目の音</em>（ミ と ミ♭）が いちばん大きい。', fig: function () { var a = M.scale('C4', 'major').map(M.str), b = M.scale('C4', 'harmonic').map(M.str); return { col: [{ score: { clef: 'treble', notes: a.map(function (k, i) { return { k: k, d: '8', c: i === 2 ? C.red : null }; }), sp: 30 }, play: true, bpm: 120, ttl: 'ハ長調' }, { score: { clef: 'treble', notes: b.map(function (k, i) { return { k: k, d: '8', c: i === 2 || i === 5 ? C.blue : null }; }), sp: 30 }, play: true, bpm: 120, ttl: 'ハ短調（和声短音階）' }] }; } }
      ],
      sum: ['自然短音階は 全・半・全・全・半・全・全', '和声短音階は 第7音を半音上げる（導音）', '旋律短音階は 上り 6・7を上げ、下りは自然'],
      types: ['minType', 'minLead', 'minEar', 'majMinEar']
    },
    /* ---------------- 09 ---------------- */
    {
      id: 'u09', title: '調と調号', en: 'Keys & Key Signatures', sym: '𝄰', goal: '調号を見て 長調・短調の名前を答えられる',
      cards: [
        { k: '✨ ひとことで言うと', h: '調号は「いつも使う ♯♭」のまとめ書き', b: 'ニ長調は ファ♯ と ド♯ をいつも使う。毎回書くかわりに 音部記号のすぐ右に まとめて書く。これが<b>調号</b>。', fig: function () { var d = M.scale('D4', 'major').map(M.str); return { col: [{ score: { clef: 'treble', key: 2, notes: d.map(function (k, i) { return { k: k, d: 'q', c: i === 2 || i === 6 ? C.red : null }; }), sp: 36 }, play: true, ttl: '調号あり（ふつうの書き方）' }, { score: { clef: 'treble', notes: d.map(function (k, i) { return { k: k, d: 'q', c: i === 2 || i === 6 ? C.red : null }; }), sp: 36 }, ttl: '調号なしで書くと' }] }; } },
        { k: 'ポイント 1', h: '♯ と ♭ は つく順番が決まっている', b: '♯は <b>ファ・ド・ソ・レ・ラ・ミ・シ</b> の順。♭は その逆で <b>シ・ミ・ラ・レ・ソ・ド・ファ</b>。調号は いつも この順に 左から書く。', fig: { col: [{ c: 'keyOrder', ttl: '♯ の順' }, { c: 'keyOrder', a: { sharp: false }, ttl: '♭ の順' }] } },
        { k: 'ポイント 2', h: '調号から 調の名前を見つける', b: '<b>♯</b>：いちばん右の♯の<em>半音上</em>が 長調の主音。<b>♭</b>：<em>右から2番目</em>の♭が 長調の主音（♭1つは ヘ長調）。短調は 長調の主音の<b>短3度下</b>。', fig: function () { return { col: [{ score: { clef: 'treble', key: 3, notes: [{ k: 'A4', d: 'w', c: C.red, lab: '長：' + M.keyName(3) }, { k: 'F#4', d: 'w', c: C.accent || C.green, lab: '短：' + M.keyName(3, true) }], sp: 90, ls: 14 }, cap: '最後の♯は ソ♯ → 半音上の <b>ラ</b>' }, { score: { clef: 'treble', key: -3, notes: [{ k: 'Eb4', d: 'w', c: C.red, lab: '長：' + M.keyName(-3) }, { k: 'C4', d: 'w', c: C.green, lab: '短：' + M.keyName(-3, true) }], sp: 90, ls: 14 }, cap: '右から2番目の♭は <b>ミ♭</b>' }] }; } },
        { k: 'ポイント 3', h: '五度圏', b: '長調を 完全5度ずつ上に ならべると 円になる。<em>右回りで ♯が1つずつ増え</em>、左回りで ♭が増える。内側は 同じ調号の 短調。タップしてみよう。', wide: false, fig: { c: 'circle', a: { tap: true } } },
        { k: 'ポイント 4', h: 'となりの調（近親調）', b: '関係の深い調。<b>平行調</b>＝調号が同じ（ハ長調とイ短調）。<b>同主調</b>＝主音が同じ（ハ長調とハ短調）。<b>属調</b>・<b>下属調</b>＝五度圏の となり。', fig: { c: 'related', a: { f: 0 } } }
      ],
      sum: ['♯：ファドソレラミシ、♭：シミラレソドファ', '最後の♯の半音上／右から2番目の♭ が長調の主音', '平行調は短3度下、属調は♯が1つ多い'],
      types: ['keyMaj', 'keyMin', 'keySig', 'related', 'keyOrderQ']
    },
    /* ---------------- 10 ---------------- */
    {
      id: 'u10', title: '和音', en: 'Chords', sym: '𝅗𝅥', goal: '三和音の 4 種類と 転回形を 見分けられる',
      cards: [
        { k: '✨ ひとことで言うと', h: '三和音は「1つおきに 3つ重ねる」', b: 'ある音（<b>根音</b>）の上に 3度・5度の音を重ねたもの。五線では <em>線・線・線</em> か <em>間・間・間</em> と だんごのように重なる。', fig: function () { return { score: { clef: 'treble', notes: [0, 1, 2, 3, 4, 5, 6].map(function (i) { var ch = M.diatonic(0, false, i + 1); return { k: ch.map(M.str), d: 'w', lab: M.ROMAN[i] }; }), sp: 40 }, play: function () { M.play([0, 1, 2, 3, 4, 5, 6].map(function (i) { return [M.diatonic(0, false, i + 1).map(M.str), 1]; }), 100); }, cap: 'ハ長調の 音階の上の 三和音' }; } },
        { k: 'ポイント 1', h: '三和音の 4 つの種類', b: '下の3度と上の3度が 長か短かで決まる。<b>長三和音</b>＝長3＋短3（明るい）、<b>短三和音</b>＝短3＋長3（暗い）、<b>増三和音</b>＝長3＋長3、<b>減三和音</b>＝短3＋短3。', fig: { c: 'triads', a: { root: 'C4' }, cap: 'タップすると 鳴ります' }, wide: true },
        { k: 'ポイント 2', h: '転回形：いちばん下の音で決まる', b: '根音が いちばん下＝<b>基本形</b>。第3音が下＝<b>第1転回形</b>。第5音が下＝<b>第2転回形</b>。音の名前は同じなので 同じ和音。', fig: function () { var c = M.chord('C4', 'maj'); return { score: { clef: 'treble', notes: [0, 1, 2].map(function (n) { var x = M.inv(c, n); return { k: x.map(M.str), d: 'w', lab: ['基本形', '第1転回形', '第2転回形'][n], kc: x.map(function (p) { return p.l === 0 ? C.red : null; }) }; }), sp: 70, ls: 13 }, play: [[M.inv(c, 0).map(M.str), 2], [M.inv(c, 1).map(M.str), 2], [M.inv(c, 2).map(M.str), 2]], cap: '赤が 根音（ド）' }; } },
        { k: 'ポイント 3', h: '七の和音', b: '三和音の上に もう1つ3度（根音から7度）を重ねると<b>七の和音</b>。いちばん大事なのは 属音の上の<b>属七の和音</b>（ハ長調では ソ・シ・レ・ファ ＝ G7）。', fig: { c: 'triads', a: { root: 'G4', types: ['dom7', 'maj7', 'min7', 'hdim7'] }, cap: 'タップすると 鳴ります' }, wide: true }
      ],
      sum: ['三和音＝根音＋3度＋5度', '長・短・増・減 は 3度の重ね方で決まる', 'いちばん下の音で 基本形・第1転回・第2転回'],
      types: ['triadType', 'triadBuild', 'inversion', 'seventh', 'chordEar']
    },
    /* ---------------- 11 ---------------- */
    {
      id: 'u11', title: '和音の働きとコードネーム', en: 'Harmony & Chord Symbols', sym: 'Ⅴ', goal: '主要三和音の働きと コードネームが読める',
      cards: [
        { k: '✨ ひとことで言うと', h: 'Ⅰ・Ⅳ・Ⅴ が 曲の柱', b: '音階の1・4・5番目の音の上の和音＝<b>主要三和音</b>。<em>Ⅰ（トニック）で始まり、Ⅳ や Ⅴ で動いて、Ⅰ に帰る</em>。多くの曲は この3つで伴奏できる。', fig: { score: { clef: 'grand', time: '4/4', bars: [[{ k: ['C3', 'E4', 'G4', 'C5'], d: 'h', lab: 'Ⅰ', top: 'C' }, { k: ['F3', 'F4', 'A4', 'C5'], d: 'h', lab: 'Ⅳ', top: 'F' }], [{ k: ['G3', 'D4', 'G4', 'B4'], d: 'h', lab: 'Ⅴ', top: 'G' }, { k: ['C3', 'E4', 'G4', 'C5'], d: 'h', lab: 'Ⅰ', top: 'C' }]], end: 'end', sp: 60 }, play: true, bpm: 80 } },
        { k: 'ポイント 1', h: '和音の 3 つの働き', b: '<b>トニック（T）</b>＝安定、帰る場所（Ⅰ）。<b>ドミナント（D）</b>＝Ⅰに進みたくなる（Ⅴ・Ⅴ7）。<b>サブドミナント（S）</b>＝少しはなれる（Ⅳ）。', pts: ['Ⅴ→Ⅰ ＝ 完全終止（しっかり終わる）', '〜→Ⅴ ＝ 半終止（まだ続く感じ）', 'Ⅳ→Ⅰ ＝ 変終止（アーメン終止）'], fig: { row: [{ score: { clef: 'treble', notes: [{ k: ['G4', 'B4', 'D5', 'F5'], d: 'h', lab: 'Ⅴ7' }, { k: ['C5', 'E5', 'G5'], d: 'h', lab: 'Ⅰ' }], sp: 50 }, play: [[['G3', 'B3', 'D4', 'F4'], 2], [['C4', 'E4', 'G4'], 3]], cap: '完全終止' }, { score: { clef: 'treble', notes: [{ k: ['F4', 'A4', 'C5'], d: 'h', lab: 'Ⅳ' }, { k: ['E4', 'G4', 'C5'], d: 'h', lab: 'Ⅰ' }], sp: 50 }, play: [[['F3', 'A3', 'C4'], 2], [['E3', 'G3', 'C4'], 3]], cap: '変終止' }] } },
        { k: 'ポイント 2', h: 'コードネームの読み方', b: '<b>大文字</b>が根音の英語音名。何もなし＝長三和音、<b>m</b>＝短三和音、<b>7</b>＝短7度を足す（属七）、<b>M7</b>＝長7度を足す。', fig: { html: table(['書き方', '和音', 'C の場合'], [['C', '長三和音', 'ド・ミ・ソ'], ['Cm', '短三和音', 'ド・ミ♭・ソ'], ['C7', '長三和音＋短7度', 'ド・ミ・ソ・シ♭'], ['CM7', '長三和音＋長7度', 'ド・ミ・ソ・シ'], ['Cdim', '減三和音', 'ド・ミ♭・ソ♭'], ['Caug', '増三和音', 'ド・ミ・ソ♯'], ['Csus4', '3度のかわりに4度', 'ド・ファ・ソ']], { fs: 14 }) } },
        { k: 'ポイント 3', h: '調の中の 7 つの和音', b: '長調では <em>Ⅰ・Ⅳ・Ⅴ が長三和音</em>、Ⅱ・Ⅲ・Ⅵ が短三和音、Ⅶ が減三和音。ハ長調なら C・Dm・Em・F・G・Am・Bdim。', fig: function () { return { score: { clef: 'treble', notes: [1, 2, 3, 4, 5, 6, 7].map(function (d) { var ch = M.diatonic(0, false, d), t = M.chordType(ch); return { k: ch.map(M.str), d: 'w', lab: M.ROMAN[d - 1], top: M.chordName(ch[0], t), c: t === 'maj' ? C.red : t === 'min' ? C.blue : C.gray }; }), sp: 42 }, play: function () { M.play([1, 2, 3, 4, 5, 6, 7].map(function (d) { return [M.diatonic(0, false, d).map(M.str), 1]; }), 100); }, cap: '<b style="color:#c4452a">赤</b>＝長三和音　<b style="color:#2f6bb8">青</b>＝短三和音' }; } }
      ],
      sum: ['Ⅰ＝トニック、Ⅳ＝サブドミナント、Ⅴ＝ドミナント', 'Ⅴ→Ⅰ が完全終止、〜→Ⅴ が半終止', 'm＝短、7＝短7度、M7＝長7度'],
      types: ['chordName', 'roman', 'func', 'cadence', 'nameToChord']
    },
    /* ---------------- 12 ---------------- */
    {
      id: 'u12', title: '移調', en: 'Transposition', sym: '⇅', goal: 'メロディーを ほかの調に 書きかえられる',
      cards: [
        { k: '✨ ひとことで言うと', h: '移調は 高さの「引っこし」', b: 'メロディーの形はそのままに、<em>全部の音を 同じだけ</em> 上げたり下げたりすること。歌いやすい高さにしたり、楽器に合わせたりする。', fig: function () { var mel = ['C4', 'E4', 'G4', 'E4', 'C5', 'G4', 'C4'], d = mel.map(function (k) { return M.str(M.up(k, 2, 'M')); }); var mk = function (ks, key) { return { clef: 'treble', key: key, time: '4/4', bars: [ks.slice(0, 4).map(function (k) { return { k: k, d: 'q' }; }), [{ k: ks[4], d: 'q' }, { k: ks[5], d: 'q' }, { k: ks[6], d: 'h' }]], end: 'end', sp: 36 }; }; return { col: [{ score: mk(mel, 0), play: true, ttl: 'ハ長調' }, { score: mk(d, 2), play: true, ttl: 'ニ長調（長2度上へ）' }] }; } },
        { k: 'ポイント 1', h: '移調の 3 ステップ', b: '<b>①</b> 何度 上げる（下げる）か決める　<b>②</b> 新しい調の<b>調号</b>を書く　<b>③</b> 全部の音を <em>同じ度数だけ</em> ずらして書く。', pts: ['ハ長調 → ト長調：完全5度上（または完全4度下）', '臨時記号は「半音上げた・下げた」関係を 保って書く'], fig: function () { var mel = ['E4', 'F4', 'G4', 'C5'], g = mel.map(function (k) { return M.str(M.up(k, 5, 'P')); }); return { row: [{ score: { clef: 'treble', notes: mel.map(function (k) { return { k: k, d: 'q', lab: N(k) }; }), sp: 40 }, ttl: 'ハ長調', play: true }, { score: { clef: 'treble', key: 1, notes: g.map(function (k) { return { k: k, d: 'q', lab: N(k), c: /#/.test(k) ? C.red : null }; }), sp: 40 }, ttl: 'ト長調（5度上）', play: true }] }; } },
        { k: 'ポイント 2', h: '移調楽器', b: '<b>B♭管</b>のクラリネットやトランペットは、書いた音より<em>長2度低く</em>鳴る。だから楽譜は 長2度高く書く。<b>F管</b>のホルンは 完全5度低く鳴る。', fig: function () { return { row: [{ score: { clef: 'treble', key: 2, notes: [{ k: 'D5', d: 'w', lab: '楽譜：' + N('D5') }], minBar: 80 }, ttl: 'B♭クラリネットの楽譜' }, { score: { clef: 'treble', notes: [{ k: 'C5', d: 'w', lab: '実際：' + N('C5') }], minBar: 80 }, ttl: '鳴る音（ピアノと同じ）', play: [['C5', 2]] }] }; } }
      ],
      sum: ['移調＝全部の音を同じ度数ずらす', '先に新しい調号、次に音', 'B♭管は 長2度高く書く'],
      types: ['transNote', 'transMelody', 'transInterval', 'transKey']
    },
    /* ---------------- 13 ---------------- */
    {
      id: 'u13', title: '楽語と記号', en: 'Terms & Symbols', sym: '𝆑', goal: '強弱・速さ・奏法・反復の記号を 読める',
      cards: [
        { k: '✨ ひとことで言うと', h: '強弱記号は p と f の組み合わせ', b: '<b>p</b>（ピアノ）＝弱く、<b>f</b>（フォルテ）＝強く、<b>m</b>（メッゾ）＝やや。<em>cresc.</em>（だんだん強く）と <em>dim.／decresc.</em>（だんだん弱く）は くさび形でも書く。', fig: { c: 'dyn', a: { hair: true, read: ['ピアニッシモ', 'ピアノ', 'メッゾピアノ', 'メッゾフォルテ', 'フォルテ', 'フォルティッシモ'] } } },
        { k: 'ポイント 1', h: '速さを表す言葉', b: '曲の始めに書く イタリア語。ゆっくり → 速いの順に覚える。途中で変えるときは <b>rit.</b>（だんだん遅く）・<b>accel.</b>（だんだん速く）・<b>a tempo</b>（もとの速さで）。', fig: { c: 'tempo' } },
        { k: 'ポイント 2', h: '奏法の記号', b: '音符につく記号。<b>スタッカート</b>（短く切る）、<b>テヌート</b>（音の長さを十分に保つ）、<b>アクセント</b>（目立たせて強く）、<b>フェルマータ</b>（ほどよく のばす）。', fig: { score: { clef: 'treble', time: '4/4', bars: [[{ k: 'C5', d: 'q', art: 'a.', lab: 'スタッカート' }, { k: 'D5', d: 'q', art: 'a-', lab: 'テヌート' }, { k: 'E5', d: 'q', art: 'a>', lab: 'アクセント' }, { k: 'F5', d: 'q', art: 'a@a', lab: 'フェルマータ' }]], end: 'end', sp: 72, ls: 12 } } },
        { k: 'ポイント 3', h: 'くり返しの記号', b: '<b>𝄆 𝄇</b>（反復記号）の間を くり返す。<b>1番カッコ・2番カッコ</b>は 2回目に 1番カッコをとばす。', fig: { col: [{ c: 'repeat', a: { kind: 'basic' } }, { c: 'repeat', a: { kind: 'volta' } }] } },
        { k: 'ポイント 4', h: 'D.C.・D.S.・Fine・Coda', b: '<b>D.C.</b>（ダ・カーポ）＝始めにもどる。<b>D.S.</b>（ダル・セーニョ）＝𝄋 にもどる。<b>Fine</b>（フィーネ）＝終わり。<b>𝄌 Coda</b>＝コーダへ とぶ。', fig: { col: [{ c: 'repeat', a: { kind: 'dc' } }, { c: 'repeat', a: { kind: 'ds' } }] } },
        { k: 'ポイント 5', h: '発想を表す言葉', b: '曲の気分や表情を表す言葉。速さの言葉と いっしょに書かれることも多い（例：Allegro con brio ＝ 速く 生き生きと）。', fig: { html: table(['言葉', '読み', '意味'], [['dolce', 'ドルチェ', '甘く やわらかに'], ['cantabile', 'カンタービレ', '歌うように'], ['espressivo', 'エスプレッシーヴォ', '表情豊かに'], ['legato', 'レガート', 'なめらかに'], ['maestoso', 'マエストーソ', '荘厳に'], ['grazioso', 'グラツィオーソ', '優雅に'], ['con brio', 'コン・ブリオ', '生き生きと'], ['leggiero', 'レッジェーロ', '軽く']], { en: true, fs: 14 }) } }
      ],
      sum: ['p 弱く・f 強く・m やや', 'Largo〈Adagio〈Andante〈Moderato〈Allegro〈Presto', 'D.C. 始めへ・D.S. 𝄋へ・Fine 終わり'],
      types: ['dyn', 'dynOrder', 'tempo', 'tempoChange', 'artic', 'express', 'repeatOrder']
    }
  ];
  GK.UNIT = {}; GK.UNITS.forEach(function (u, i) { u.no = ('0' + (i + 1)).slice(-2); GK.UNIT[u.id] = u; });
})();
