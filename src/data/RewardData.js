export const REWARD_DATA = {
  chest_treasure: {
    magatama: { min: 4, max: 7 },
    items: [
      { id: 'kakera',     label: '神具の欠片',   weight: 60 },
      { id: 'ofuda_wind', label: '風札',          weight: 40 },
    ],
  },
  // ボスの基本報酬（勾玉のみ）。神具・守り石・クリアフラグは
  // ダンジョン定義(DS.def.bossRewards)から付与する。
  chest_boss: {
    magatama: { min: 8, max: 14 },
  },
  enemy_kooni:    { magatama: { min: 0, max: 1 } },
  enemy_kitsunebi:{ magatama: { min: 0, max: 2 } },
  enemy_lantern:  { magatama: { min: 1, max: 3 } },
};
