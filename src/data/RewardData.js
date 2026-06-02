export const REWARD_DATA = {
  chest_treasure: {
    magatama: { min: 3, max: 6 },
    items: [
      { id: 'kakera', label: '神具の欠片', weight: 70 },
      { id: 'ofuda_wind', label: '風札', weight: 30 },
    ],
  },
  chest_boss: {
    magatama: { min: 8, max: 12 },
    items: [
      { id: 'mamoriseki', label: '狛犬の守り石', weight: 100 },
    ],
    flags: ['ofuda_seal_unlocked'],
  },
  enemy_kooni:    { magatama: { min: 0, max: 1 } },
  enemy_kitsunebi:{ magatama: { min: 0, max: 2 } },
  enemy_lantern:  { magatama: { min: 1, max: 3 } },
};
