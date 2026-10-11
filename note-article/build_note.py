#!/usr/bin/env python3
"""note記事の元データ。実行すると次の3つを作ります。
  note_paste.txt … noteにそのまま貼る文章（画像の位置とキャプション入り）
  article.md     … Markdown版
  preview.html   … 画像つきの確認用ページ（ブラウザで開くだけ）
"""
import base64, html, io, os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
URL = '【ここにURLを貼る】'

# ('h2'|'h3'|'p'|'li'|'img'|'hr', 内容) 。imgは (ファイル名, キャプション)
BODY = [
 ('p', '楽器のチューニングや音程の練習って、正直ちょっと地味じゃないですか？'),
 ('p', 'メーターの針をじっと見て、「あと少し高い…低い…」とにらめっこ。大事なことだとわかっていても、なかなか続きません。'),
 ('p', 'そこで、音程がピタッと合った瞬間に、画面がド派手に盛り上がるチューナーを作りました。名前は「VISUAL TUNER（ビジュアルチューナー）」。ブラウザで開くだけで使えて、スマホでもパソコンでも動きます。'),
 ('p', '👉 ' + URL),
 ('hr', ''),

 ('h2', '合った瞬間、世界が変わる'),
 ('p', '使い方はかんたん。「マイクで始める」を押して、楽器や声で音を出すだけです。'),
 ('p', '音程が ±3セント（ほんのわずかなズレ）の中に入ると「PERFECT!」。そこから合わせ続けるほど、コンボが伸びて演出がどんどん激しくなります。'),
 ('img', ('01_before_after.jpg', '左がズレているとき、右がピッタリ合ったとき。ネオンの街にレーザーが飛び交い、画面が一気に弾けます')),
 ('p', '3秒で「NICE!」、5秒で「GREAT!!」、10秒を超えると「FEVER TIME!!」。画面のふちが虹色に光り出して、思わず「もうちょっと伸ばしたい…！」となります。'),

 ('h2', '演出は全部で50種類'),
 ('p', 'ゲーム風、和風、癒し系まで、テーマは全部で50種類。しかも、どのテーマも「練習すると育つ」のがポイントです。合わせ続けた時間がたまると、景色や仲間や道具がどんどん増えていきます。いくつか紹介します。'),

 ('h3', '👾 レトロゲーム：相棒モンスターが進化する'),
 ('img', ('02_pixel.jpg', '合わせた時間だけ経験値がたまり、相棒モンスターがスライム→コウモリ→ゴースト→ゴーレム→ドラゴン→魔王と進化していきます')),

 ('h3', '🌊 ディープ・オーシャン：海の仲間が増えていく'),
 ('img', ('03_ocean.jpg', 'ズレていると海が荒れ、合うと鏡のような凪に。練習を続けると、クラゲ・クマノミ・ウミガメ・マンタ・クジラ…と海の仲間が増えていきます')),

 ('h3', '🎆 花火大会：打ち上がる花火の種類が増える'),
 ('img', ('04_hanabi.jpg', '音程のズレで打ち上げ筒が傾き、合うと大玉が連発。菊・牡丹・柳・土星・ニコちゃん…と増えて、最後は三尺玉まで打ち上がります')),

 ('h3', '🌸 夜桜：若木が育って、お花見の宴へ'),
 ('img', ('05_sakura.jpg', 'つぼみの若木から始まり、提灯・夜店・五重塔・しだれ桜…と、合わせるほど夜桜の景色がにぎやかになります')),

 ('h3', '🎯 アーチェリー：的が遠ざかり、武器が進化'),
 ('img', ('06_archery.jpg', '照準の位置が音程のズレ。レベルが上がると的がどんどん遠くへ。弓矢から始まって、最後は「宇宙ビーム砲」で月の的をねらいます')),

 ('h3', '🔥 焚き火：火起こしから、どんど焼きまで'),
 ('img', ('07_campfire.jpg', '木の棒をこする「火起こし」から始まり、小さな焚き火→キャンプファイヤー→どんど焼きへ。炎の色は、低いと青く、高いと赤くなります')),

 ('h3', '✨ 星座図鑑：本物の星の並びで星座を集める'),
 ('img', ('08_constellation.jpg', '合っている間だけ星と星が線でつながり、星座が完成すると図鑑に登録。実際の星の位置データから描いた15星座を集められます')),

 ('h3', '🖌️ 書道：書き順どおりに筆が動く'),
 ('img', ('09_enso.jpg', '音程が合っている間だけ、筆が書き順どおりに一画ずつ進みます。ズレると薄墨に。書き終わると「安定度」と落款が押されます')),

 ('p', 'ほかにも、鯉の池、オーロラ、ワープトンネル、スロット、ハチミツの巣、スピログラフ…などなど。'),
 ('img', ('10_more_themes.jpg', 'オーガニック・フラワー（左上）、鯉の池（右上）、ワープトンネル（左下）、サイバーパンク・ネオン（右下）。どのテーマも、練習を続けると景色や仲間が増えていきます')),

 ('h2', '「続けたくなる」しかけ'),
 ('p', 'チューナーは毎日使ってこそ。なので、続けたくなるしかけをたくさん入れました。'),

 ('h3', '🔓 テーマは5種類ずつアンロック'),
 ('p', '最初に遊べるのは5種類だけ。その5種類をそれぞれ「テーマLv.3」まで育てると、次の5種類が解放されます。'),
 ('img', ('11_picker.jpg', 'テーマ一覧。まだ遊べないテーマには🔒マーク。上に「あと何種類で次が解放されるか」が表示されます')),

 ('h3', '⭐ ピッタリなほど早く育つ'),
 ('p', '各テーマはLv.1〜10まで育ちます。±1セント以内のピッタリな音程だと2倍の速さで育つので、自然と「より正確に」を目指したくなります。'),

 ('h3', '🏆 記録と実績'),
 ('img', ('12_records.jpg', '記録画面。累計のPERFECT時間・自己ベスト・連続練習日数・12音コレクション・22個の実績バッジなどが見られます')),

 ('h2', 'スマホでも、もちろん使えます'),
 ('img', ('13_phone.jpg', 'スマホでの表示。演出エリアを左右にスワイプすると、テーマを切り替えられます')),
 ('p', 'スマホなら、譜面台に置いてそのまま練習にも使えます。画面のゆれが気になる方は、設定で「弱め」や「なし」にもできます。'),

 ('h2', 'チューナーとしても本気です'),
 ('p', '見た目だけでなく、チューナーとしての中身もしっかり作りました。'),
 ('li', '高精度なピッチ検出：テストでの誤差は0.2セント以下'),
 ('li', '純正律モード／和音ボーナス：ハモり練習用に、長3度（−13.7セント）・完全5度（+2.0セント）など、きれいに響く音程を目標にできます'),
 ('li', '移調楽器に対応：B♭・E♭・F管の表示に切り替え可能'),
 ('li', '基準ピッチ：440Hz / 442Hz / 415Hz（古楽）'),
 ('li', '倍音の表示：音色の「クリアさ」「豊かさ」がわかります'),
 ('p', 'セントメーターの見た目も、6種類から選べます。'),
 ('img', ('14_meter_styles.jpg', 'セントメーターは「バー」「アナログ針」「LED」「ストロボ」「デジタル数字」「丸ダイヤル」の6種類。好みや楽器に合わせて選べます')),

 ('h2', '使い方'),
 ('li', '下のURLを開く（インストール不要）'),
 ('li', '「マイクで始める」を押して、マイクの使用を許可'),
 ('li', '楽器や声で音を出して、真ん中に合わせて「PERFECT!」を目指す'),
 ('p', '👉 ' + URL),
 ('p', '※ マイクの音は端末の中だけで処理され、どこにも送信されません。'),
 ('p', '※ 記録はブラウザに保存されます。'),

 ('h2', 'おわりに'),
 ('p', '「練習が楽しくなる」ことだけを考えて、思いつく限りの演出を詰め込みました。'),
 ('p', 'チューニングの数秒が、ちょっとしたゲームの時間になったらうれしいです。感想や「こんなテーマがほしい！」というリクエストがあれば、ぜひコメントで教えてください🎵'),
 ('p', '#チューナー #楽器練習 #音楽 #吹奏楽 #Webアプリ #個人開発'),
]

TITLE = '練習が楽しくなるビジュアルチューナー「VISUAL TUNER」を作りました｜音程が合うと、画面が弾ける'
HEADER = ('00_header.jpg', '')


def imgs():
    return [HEADER[0]] + [c[0] for k, c in BODY if k == 'img']


def make_txt():
    o = []
    o.append('【使い方】')
    o.append('・タイトルと本文を note の編集画面に貼り付けます（「## 」「### 」の行は見出しにします。貼り付けて見出しにならなかった行は、その行を選んで見出しボタンを押してください）')
    o.append('・「▼画像」の行に来たら、その番号の画像をアップロードし、直後の「キャプション」の文章を画像の下の入力欄に貼ってから、その2行は消します')
    o.append('・見出し画像は 00_header.jpg です（記事の上のカバー画像に設定）')
    o.append('・「【ここにURLを貼る】」はアプリのURLに書き換えてください（2か所）')
    o.append('')
    o.append('==================== ここから下をコピー ====================')
    o.append('')
    o.append('【タイトル】')
    o.append(TITLE)
    o.append('')
    o.append('【本文】')
    o.append('')
    for k, c in BODY:
        if k == 'h2':
            o += ['## ' + c, '']
        elif k == 'h3':
            o += ['### ' + c, '']
        elif k == 'p':
            o += [c, '']
        elif k == 'li':
            o.append('- ' + c)
        elif k == 'hr':
            o += ['---', '']
        elif k == 'img':
            o += ['▼画像 ' + c[0], 'キャプション：' + c[1], '']
        # リストの後ろに空行
        if k == 'li':
            nxt = BODY[BODY.index((k, c)) + 1][0] if BODY.index((k, c)) + 1 < len(BODY) else ''
            if nxt != 'li':
                o.append('')
    o.append('==================== ここまで ====================')
    o.append('')
    o.append('【画像とキャプション一覧】')
    o.append('00_header.jpg … 見出し画像（キャプションなし）')
    for k, c in BODY:
        if k == 'img':
            o.append(f'{c[0]} … {c[1]}')
    return '\n'.join(o) + '\n'


def make_md():
    o = ['# ' + TITLE, '', '<!-- 見出し画像：images/00_header.jpg -->', '']
    prev = ''
    for k, c in BODY:
        if k == 'li' and prev != 'li':
            pass
        if k == 'h2': o += ['## ' + c, '']
        elif k == 'h3': o += ['### ' + c, '']
        elif k == 'p': o += [c, '']
        elif k == 'hr': o += ['---', '']
        elif k == 'li': o.append('- ' + c)
        elif k == 'img': o += [f'![](images/{c[0]})', f'*{c[1]}*', '']
        if prev == 'li' and k != 'li': o.insert(len(o) - 1, '')
        prev = k
    return '\n'.join(o) + '\n'


def b64(fn, w=1100):
    im = Image.open(os.path.join(HERE, 'images', fn)).convert('RGB')
    if im.width > w: im = im.resize((w, round(im.height * w / im.width)))
    b = io.BytesIO(); im.save(b, 'JPEG', quality=80)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()


def make_html():
    e = html.escape
    o = ['<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
         '<title>noteプレビュー</title><style>body{max-width:720px;margin:2rem auto;padding:0 1rem;font-family:"Hiragino Sans","Noto Sans JP",sans-serif;line-height:1.9;color:#222}',
         'h1{font-size:1.6rem;line-height:1.4}h2{font-size:1.4rem;border-bottom:2px solid #ddd;padding-bottom:.2rem;margin-top:2.4rem}h3{font-size:1.15rem;margin-top:2rem}',
         'figure{margin:1.2rem 0}img{width:100%;border-radius:8px}figcaption{font-size:.85rem;color:#666;text-align:center;margin-top:.4rem}',
         '.note{background:#fff7d6;padding:.6rem 1rem;border-radius:8px;font-size:.85rem}</style>',
         '<p class="note">確認用ページです。noteへは「note_paste.txt」の文章を貼り、画像は images フォルダのファイルをアップロードしてください。</p>',
         f'<figure><img src="{b64(HEADER[0])}"><figcaption>（見出し画像）</figcaption></figure>', f'<h1>{e(TITLE)}</h1>']
    inl = False
    for k, c in BODY:
        if k != 'li' and inl: o.append('</ul>'); inl = False
        if k == 'h2': o.append(f'<h2>{e(c)}</h2>')
        elif k == 'h3': o.append(f'<h3>{e(c)}</h3>')
        elif k == 'p': o.append(f'<p>{e(c)}</p>')
        elif k == 'hr': o.append('<hr>')
        elif k == 'li':
            if not inl: o.append('<ul>'); inl = True
            o.append(f'<li>{e(c)}</li>')
        elif k == 'img': o.append(f'<figure><img src="{b64(c[0])}"><figcaption>{e(c[1])}</figcaption></figure>')
    if inl: o.append('</ul>')
    return '\n'.join(o)


if __name__ == '__main__':
    open(os.path.join(HERE, 'note_paste.txt'), 'w').write(make_txt())
    open(os.path.join(HERE, 'article.md'), 'w').write(make_md())
    open(os.path.join(HERE, 'preview.html'), 'w').write(make_html())
    print('ok', len(imgs()), 'images')
