export const DIALOGUES = {

  // ─── プロローグ ───────────────────────────────
  prologue: [
    { speaker: 'ナレーション', portrait: null,
      text: '山と海のあいだにある小さな町、星見町。\n流星祭の前の夜——' },
    { speaker: 'ナレーション', portrait: null,
      text: '空にあるはずの一番星が、ふっと消えてしまった。' },
    { speaker: 'ナレーション', portrait: null,
      text: '神社の奥から大きな音がする。\nかけつけると、古い神具が割れて光を失っていた。' },
    { speaker: 'こはく', portrait: 'kohaku',
      text: 'あ、きみ……気がついてたんだ。\n……よかった。わしにしか見えないかと思ってた' },
    { speaker: 'こはく', portrait: 'kohaku',
      text: '星が消えた。神具も砕けた。\nこのままじゃ、星見町がまよい町にのみこまれちゃう' },
    { speaker: 'こはく', portrait: 'kohaku',
      text: 'これ、受け取って。先代の札使いが残したお札だ。\nまよい町の声を聞けるのは……たぶん、きみだけだから' },
    { speaker: 'こはく', portrait: 'kohaku',
      text: 'べ、別にこわくなんかないぞ！\nわしは神社の使いだからな。案内するって決めたんだ' },
    { speaker: 'ナレーション', portrait: null,
      text: '見習い札使いと白狐こはくの\n星をめぐる冒険が、はじまった。' },
  ],

  // ─── こはく 町 ─────────────────────────────────
  kohaku_town_first: [
    { speaker: 'こはく', portrait: 'kohaku',
      text: 'ここが星見町の神社だ。\n昔は毎晩、灯籠に火が灯ってたんだけどなあ……' },
    { speaker: 'こはく', portrait: 'kohaku',
      text: '神社の鳥居の前に行ってみて。\nまよい町への入口が見えるはずだから' },
  ],
  kohaku_town_return: [
    { speaker: 'こはく', portrait: 'kohaku',
      text: 'おかえり！ふふ、ちゃんと戻ってきたな' },
    { speaker: 'こはく', portrait: 'kohaku',
      text: 'もののけたち、鎮められたか？\nよかった。あの子たちも、ほんとうはここに居たくなかったはずだから' },
  ],

  // クリア後に町へ戻ったとき（神具1つ目）
  kohaku_town_cleared: [
    { speaker: 'こはく', portrait: 'kohaku',
      text: '見て！神社の灯籠に火が戻った……！\nきみがもののけを鎮めてくれたおかげだ' },
    { speaker: 'こはく', portrait: 'kohaku',
      text: '星灯りの神具は、ぜんぶで五つ。\nまだ旅は続くぞ' },
    { speaker: 'こはく', portrait: 'kohaku',
      text: '勾玉や神具の欠片は、札屋や鍛冶屋で力にできる。\n少し休んだら、また次の異界へ行こう' },
  ],

  // 迷い宿クリア後に町へ戻ったとき（神具2つ目・新ダンジョン解放）
  kohaku_town_cleared2: [
    { speaker: 'こはく', portrait: 'kohaku',
      text: '神具がふたつ揃った……！\n川の水も、少し澄んできた気がする' },
    { speaker: 'こはく', portrait: 'kohaku',
      text: 'まだ見ぬ異界が、町のあちこちで口を開けてる。\n駅、山道、夜市……次はどこへ行こうか' },
  ],
  kohaku_before_dungeon: [
    { speaker: 'こはく', portrait: 'kohaku',
      text: 'この鳥居の向こうがまよい町だ。\n気をつけろよ……って、わしも一緒に行くけどな！' },
    { speaker: 'こはく', portrait: 'kohaku',
      text: 'お札は三種類。火・風・封印。\nダンジョンのなかで上手く使うんだぞ' },
  ],

  // 輪廻の鳥居（エンドレス）導入
  kohaku_rinne: [
    { speaker: 'こはく', portrait: 'kohaku',
      text: 'これが輪廻の鳥居……。\n潜るほど深く、もののけも強くなっていく場所だ' },
    { speaker: 'こはく', portrait: 'kohaku',
      text: '無理は禁物だぞ。集めた勾玉はその都度ちゃんと残る。\nどこまで行けるか……いっしょに試そう！' },
  ],

  // ─── 札屋 ──────────────────────────────────────
  fudaya_1: [
    { speaker: '札屋・紙月さん', portrait: 'fudaya',
      text: 'おや、見習い札使いかい？\n顔つきはまだ子どもだけど、目に光があるね' },
    { speaker: '札屋・紙月さん', portrait: 'fudaya',
      text: 'お札ってのはな、力じゃなくて"気持ち"なんだよ。\n怒りで使うと的外れになる。落ち着いて、ちゃんと狙えよ' },
  ],
  fudaya_2: [
    { speaker: '札屋・紙月さん', portrait: 'fudaya',
      text: 'まよい町のもののけはな、ぜんぶ元は普通のものなんだ。\n黒いモヤに包まれて、心が見えなくなっちゃっただけ' },
    { speaker: '札屋・紙月さん', portrait: 'fudaya',
      text: '鎮めてやりな。戦うんじゃなくてよ。\nそのためのお札だから' },
  ],
  fudaya_after_clear: [
    { speaker: '札屋・紙月さん', portrait: 'fudaya',
      text: 'やるじゃないか。荒れ狛犬を鎮めたのか。\nあの子が元に戻れたなら……よかった' },
    { speaker: '札屋・紙月さん', portrait: 'fudaya',
      text: '神具の欠片があれば、もっと強いお札を作れるかもしれない。\n集めてきたら、また来な' },
  ],

  // ─── 鍛冶屋 ────────────────────────────────────
  kajiya_1: [
    { speaker: '鍛冶屋・火月さん', portrait: 'kajiya',
      text: 'その木刀、星見神社の御神木だろ。\nまだ力が宿ってる。いい材料だよ' },
    { speaker: '鍛冶屋・火月さん', portrait: 'kajiya',
      text: '神具の欠片を持ってきたら強化してやるよ。\n今はまだ…ちゃんと振れてるか、まず体で覚えな' },
  ],
  kajiya_2: [
    { speaker: '鍛冶屋・火月さん', portrait: 'kajiya',
      text: 'まよい町の武具はな、怨念が染みてることがあるんだよ。\n持ち帰ったらすぐ持ってきな。きれいにしてやるから' },
  ],

  // ─── こはく ダンジョン内 ────────────────────────
  kohaku_dungeon_start: [
    { speaker: 'こはく', portrait: 'kohaku',
      text: 'ここが朱鳥居の迷宮だ。\n……霧が深いな。気をつけて進め' },
  ],
  kohaku_dungeon_battle: [
    { speaker: 'こはく', portrait: 'kohaku',
      text: 'もののけがいるぞ！\n全部鎮めると扉が開く' },
  ],
  kohaku_dungeon_battle2: [
    { speaker: 'こはく', portrait: 'kohaku',
      text: '狐火は近づくと逃げるぞ。\n封印札で止めてから斬りかかれ！' },
  ],
  kohaku_dungeon_treasure: [
    { speaker: 'こはく', portrait: 'kohaku',
      text: 'おっ、宝箱がある！\nまよい町に置き忘れられた誰かの宝だな' },
  ],
  kohaku_dungeon_puzzle: [
    { speaker: 'こはく', portrait: 'kohaku',
      text: '結界が張ってある。封印札を使えば解けるはずだ！\n封印札は「C」キーだぞ' },
  ],
  kohaku_dungeon_heal: [
    { speaker: 'こはく', portrait: 'kohaku',
      text: 'あ、ここ……神社の分社じゃないか。\nまよい町の中でも守られてる場所なんだな。休んでいけ' },
  ],
  kohaku_dungeon_boss: [
    { speaker: 'こはく', portrait: 'kohaku',
      text: 'こ、ここが……ボス部屋だ。\nわし、ちょっとだけこわい。ちょっとだけな！' },
    { speaker: 'こはく', portrait: 'kohaku',
      text: '荒れ狛犬……本当はずっとこの神社を守ってたんだ。\n鎮めてやって。元の姿に戻してあげて' },
  ],

  // ─── ボス撃破後（朱鳥居の迷宮）────────────────────
  boss_defeated: [
    { speaker: 'こはく', portrait: 'kohaku',
      text: '……モヤが晴れた。\n荒れ狛犬が、元の姿に戻っていく' },
    { speaker: '荒れ狛犬', portrait: 'komainu',
      text: '……ありがとう、札使い。\n長い夢から、ようやく覚めた気がする' },
    { speaker: '荒れ狛犬', portrait: 'komainu',
      text: 'これを持って行きなさい。星灯りの神具のかけら……\n火の勾玉だ。町へ戻る道を照らしてくれるはず' },
    { speaker: 'こはく', portrait: 'kohaku',
      text: '神具の欠片……！\nこれを集めれば、神具が元に戻るかもしれない！' },
  ],

  // ─── 迷い宿 ──────────────────────────────────
  kohaku_mayoiyado_start: [
    { speaker: 'こはく', portrait: 'kohaku',
      text: 'ここが迷い宿……。\n廊下がどこまでも続いてる。はぐれるなよ' },
    { speaker: 'こはく', portrait: 'kohaku',
      text: '水の匂いがする。鏡に映るものには気をつけろ' },
  ],
  kohaku_mayoiyado_boss: [
    { speaker: 'こはく', portrait: 'kohaku',
      text: 'この奥に、宿を惑わせてる「水鏡の主」がいる' },
    { speaker: 'こはく', portrait: 'kohaku',
      text: '水鏡の主・鏡花……。\n映した者の姿を真似るらしい。落ち着いていけ！' },
  ],
  boss_defeated_kyouka: [
    { speaker: 'こはく', portrait: 'kohaku',
      text: '……水鏡が、静かになっていく' },
    { speaker: '鏡花', portrait: 'komainu',
      text: '…………わたくしは、ただ誰かを映していたかっただけ。\nありがとう、本当の自分を思い出せました' },
    { speaker: '鏡花', portrait: 'komainu',
      text: 'これを。星灯りの神具のひとつ――水の鏡。\nまことを映す力が、あなたを助けるでしょう' },
    { speaker: 'こはく', portrait: 'kohaku',
      text: '神具がふたつ目だ……！\n星見町の朝が、また少し近づいたな' },
  ],
};
