const W = 800, H = 560;

// 部屋タイプの並び（全ダンジョン共通の骨格）
export const SEQUENCE = [
  'start',
  'battle', 'battle', 'battle',
  'treasure',
  'puzzle',
  'battle', 'battle',
  'heal',
  'boss',
  'end',
];

// 部屋タイプごとの扉構成
const DOORS = {
  start:    { south: true },
  battle:   { north: true, south: true },
  treasure: { north: true, south: true },
  puzzle:   { north: true, south: true },
  heal:     { north: true, south: true },
  boss:     { north: true },
  end:      { north: true },
};

// 五つの神具（図鑑・進捗用）
export const ALL_RELICS = [
  'hi_no_magatama',    // 火の勾玉   朱鳥居の迷宮
  'mizu_no_kagami',    // 水の鏡     迷い宿
  'kaze_no_suzu',      // 風の鈴     天狗山
  'kaminari_no_taiko', // 雷の太鼓   終電の異界
  'kage_no_men',       // 影の面     夜市ダンジョン
];

// ダンジョン定義レジストリ
export const DUNGEONS = {
  shubyori: {
    id: 'shubyori',
    name: '朱鳥居の迷宮',
    theme: 'shrine',
    floor: 0x221830, wall: 0x150f20,
    sequence: SEQUENCE,
    battleRosters: [
      ['kooni', 'kooni', 'kitsunebi'],
      ['kooni', 'lantern', 'kooni'],
    ],
    puzzleEnemies: ['kooni'],
    puzzleNote: '封印札で結界を破れ',
    bossType: 'komainu',
    bossRewards: {
      relic: { id: 'hi_no_magatama', label: '火の勾玉' },
      mamori: { id: 'mamoriseki', label: '狛犬の守り石' },
      clearFlag: 'dungeon1_cleared',
    },
    bossDialogueKey: 'boss_defeated',
    hints: { start: 'kohaku_dungeon_start', boss: 'kohaku_dungeon_boss' },
    unlockFlag: null,            // 最初から入れる
  },

  mayoiyado: {
    id: 'mayoiyado',
    name: '迷い宿',
    theme: 'inn',
    floor: 0x14202a, wall: 0x0a141e,
    sequence: SEQUENCE,
    battleRosters: [
      ['karakasa', 'amefuri', 'karakasa'],
      ['amefuri', 'mizudama', 'karakasa'],
    ],
    puzzleEnemies: ['karakasa'],
    puzzleNote: '封印札で水鏡の結界を割れ',
    bossType: 'kyouka',
    bossRewards: {
      relic: { id: 'mizu_no_kagami', label: '水の鏡' },
      mamori: { id: 'kyouka_mamori', label: '鏡花の守り石' },
      clearFlag: 'dungeon2_cleared',
    },
    bossDialogueKey: 'boss_defeated_kyouka',
    hints: { start: 'kohaku_mayoiyado_start', boss: 'kohaku_mayoiyado_boss' },
    unlockFlag: 'dungeon1_cleared',   // 朱鳥居クリアで解放
  },
};

// 部屋タイプ＋ダンジョン定義から、Room が使うテンプレートを組み立てる
export function buildRoomTemplate(type, def, rng) {
  const t = {
    type,
    width: W, height: H,
    doors: { ...DOORS[type] },
    floorColor: def.floor,
    wallColor: def.wall,
    theme: def.theme,
    enemies: [],
    gimmicks: [],
  };
  switch (type) {
    case 'battle':
      t.enemies = rng.pick(def.battleRosters);
      break;
    case 'puzzle':
      t.enemies = [...def.puzzleEnemies];
      t.gimmicks = [{ tag: 'barrier', x: W / 2, y: H / 2 - 40 }];
      t.puzzleNote = def.puzzleNote;
      break;
    case 'treasure':
      t.gimmicks = [{ tag: 'chest', x: W / 2, y: H / 2 }];
      break;
    case 'heal':
      t.gimmicks = [{ tag: 'shrine', x: W / 2, y: H / 2 }];
      break;
    case 'boss':
      t.enemies = [def.bossType];
      break;
    case 'end':
      t.gimmicks = [{ tag: 'torii', x: W / 2, y: H / 2 }];
      break;
  }
  return t;
}
