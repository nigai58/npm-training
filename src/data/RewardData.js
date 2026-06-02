export const REWARD_DATA = {
  chest_treasure: {
    magatama: { min: 4, max: 7 },
    items: [
      { id: 'kakera',     label: '神具の欠片',   weight: 60 },
      { id: 'ofuda_wind', label: '風札',          weight: 40 },
    ],
  },
  chest_boss: {
    magatama: { min: 8, max: 14 },
    items: [
      { id: 'hi_no_magatama', label: '火の勾玉',      weight: 100 },
      { id: 'mamoriseki',     label: '狛犬の守り石',   weight: 80 },
    ],
    flags: ['ofuda_seal_unlocked'],
  },
  enemy_kooni:    { magatama: { min: 0, max: 1 } },
  enemy_kitsunebi:{ magatama: { min: 0, max: 2 } },
  enemy_lantern:  { magatama: { min: 1, max: 3 } },
};
