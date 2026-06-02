// 恒久強化の定義。npc はどの施設で買えるか。costs[level] が次レベルの費用。
// currency: 'magatama'（勾玉）or 'kakera'（神具の欠片）。
// computeStats() は純粋関数（PDS非依存）→ Lua テーブルへ直訳しやすい。

export const UPGRADE_DEFS = {
  maxHp: {
    label: '体力の護符', npc: 'shrine', currency: 'magatama',
    costs: [20, 40, 80], desc: '最大HP +20',
  },
  dodge: {
    label: '韋駄天', npc: 'shrine', currency: 'magatama',
    costs: [35], desc: '回避の再使用 -20%',
  },
  attack: {
    label: '刃の研ぎ', npc: 'kajiya', currency: 'magatama',
    costs: [25, 50, 100], desc: '攻撃力 +15%',
  },
  ofudaPower: {
    label: '霊力増幅', npc: 'fudaya', currency: 'magatama',
    costs: [25, 50], desc: 'お札ダメージ +25%',
  },
  ofudaCd: {
    label: '早駆けの札', npc: 'fudaya', currency: 'magatama',
    costs: [30, 60], desc: 'お札クールダウン -15%',
  },
};

export const NPC_UPGRADES = {
  shrine: ['maxHp', 'dodge'],
  kajiya: ['attack'],
  fudaya: ['ofudaPower', 'ofudaCd'],
};

export const NPC_LABEL = {
  shrine: '星見神社',
  kajiya: '鍛冶屋・火月',
  fudaya: '札屋・紙月',
};

export function upgradeMaxLevel(id) {
  return UPGRADE_DEFS[id]?.costs.length ?? 0;
}

// 次レベルの費用。最大なら null。
export function upgradeCost(id, currentLevel) {
  const costs = UPGRADE_DEFS[id]?.costs ?? [];
  return currentLevel < costs.length ? costs[currentLevel] : null;
}

// 強化レベル群から実効ステータスを計算する純粋関数。
export function computeStats(levels = {}) {
  const lv = (k) => levels[k] ?? 0;
  return {
    maxHp:          100 + lv('maxHp') * 20,
    attackMult:     1 + lv('attack') * 0.15,
    ofudaPowerMult: 1 + lv('ofudaPower') * 0.25,
    ofudaCdMult:    1 - lv('ofudaCd') * 0.15,
    dodgeCdMult:    1 - lv('dodge') * 0.20,
  };
}
