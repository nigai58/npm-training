export const ROOM_SEQUENCE = [
  'start',
  'battle', 'battle', 'battle',
  'treasure',
  'puzzle',
  'battle', 'battle',
  'heal',
  'boss',
  'end',
];

const W = 800, H = 560;

export const ROOM_TEMPLATES = {
  Room_Start: {
    type: 'start',
    width: W, height: H,
    enemies: [],
    doors: { south: true },
    spawnX: W / 2, spawnY: H * 0.25,
    gimmicks: [],
    floorColor: 0x2a2040,
    wallColor: 0x1a1030,
  },
  Room_Battle_A: {
    type: 'battle',
    width: W, height: H,
    enemies: ['kooni', 'kooni', 'kitsunebi'],
    doors: { north: true, south: true },
    gimmicks: [],
    floorColor: 0x221830,
    wallColor: 0x150f20,
  },
  Room_Battle_B: {
    type: 'battle',
    width: W, height: H,
    enemies: ['kooni', 'lantern', 'kooni'],
    doors: { north: true, south: true },
    gimmicks: [],
    floorColor: 0x1e2030,
    wallColor: 0x12141e,
  },
  Room_Treasure_A: {
    type: 'treasure',
    width: W, height: H,
    enemies: [],
    doors: { north: true, south: true },
    gimmicks: [{ tag: 'chest', x: W / 2, y: H / 2 }],
    floorColor: 0x1a2820,
    wallColor: 0x101a14,
  },
  Room_Puzzle_A: {
    type: 'puzzle',
    width: W, height: H,
    enemies: ['kooni'],
    doors: { north: true, south: true },
    gimmicks: [{ tag: 'barrier', x: W / 2, y: H / 2 - 40 }],
    floorColor: 0x20182a,
    wallColor: 0x14101a,
    puzzleNote: '封印札で結界を破れ',
  },
  Room_Heal_A: {
    type: 'heal',
    width: W, height: H,
    enemies: [],
    doors: { north: true, south: true },
    gimmicks: [{ tag: 'shrine', x: W / 2, y: H / 2 }],
    floorColor: 0x182020,
    wallColor: 0x101414,
  },
  Room_Boss_A: {
    type: 'boss',
    width: W, height: H,
    enemies: ['komainu'],
    doors: { north: true },
    gimmicks: [],
    floorColor: 0x28100a,
    wallColor: 0x1a0804,
  },
  Room_End: {
    type: 'end',
    width: W, height: H,
    enemies: [],
    doors: { north: true },
    gimmicks: [{ tag: 'torii', x: W / 2, y: H / 2 }],
    floorColor: 0x1a2010,
    wallColor: 0x101408,
  },
};

export const BATTLE_TEMPLATES = ['Room_Battle_A', 'Room_Battle_B'];

export const TYPE_TO_TEMPLATE = {
  start:    () => 'Room_Start',
  battle:   (rng) => rng.pick(BATTLE_TEMPLATES),
  treasure: () => 'Room_Treasure_A',
  puzzle:   () => 'Room_Puzzle_A',
  heal:     () => 'Room_Heal_A',
  boss:     () => 'Room_Boss_A',
  end:      () => 'Room_End',
};
