// ラン内ご利益。apply(run, pds) で RunState（と必要なら PDS）に効果を反映する。
// 同じ効果を複数回取ると積み上がる（乗算/加算）設計。

export const BLESSINGS = [
  { id: 'firewall',  label: '火防の護符', icon: '🛡', desc: '被ダメージ -15%',
    apply: (r) => { r.damageReduction = Math.min(0.6, r.damageReduction + 0.15); } },
  { id: 'idaten',    label: '韋駄天の足', icon: '🌀', desc: '移動速度 +20%',
    apply: (r) => { r.speedMult *= 1.2; } },
  { id: 'fox',       label: '狐の加護',   icon: '🦊', desc: '勾玉ドロップ +50%',
    apply: (r) => { r.magatamaMult *= 1.5; } },
  { id: 'fireheat',  label: '火札の熱',   icon: '🔥', desc: '火札ダメージ +40%',
    apply: (r) => { r.ofudaDamageMult.fire *= 1.4; } },
  { id: 'windread',  label: '風読み',     icon: '💨', desc: '風札の範囲 +40%',
    apply: (r) => { r.ofudaRadiusMult.wind *= 1.4; } },
  { id: 'combo',     label: '破魔の冴え', icon: '⚔', desc: 'コンボ3段目 +50%',
    apply: (r) => { r.comboFinisherMult *= 1.5; } },
  { id: 'jintsu',    label: '神通',       icon: '⛩', desc: 'お札クールダウン -25%',
    apply: (r) => { r.ofudaCdMult *= 0.75; } },
  { id: 'lifesteal', label: '生命の勾玉', icon: '💗', desc: '敵を鎮めるとHP +3',
    apply: (r) => { r.lifestealOnKill += 3; } },
  { id: 'kongo',     label: '金剛の護り', icon: '🟡', desc: 'このランの最大HP +20',
    apply: (r, pds) => { pds?.addRunMaxHp?.(20); } },
];

const BY_ID = Object.fromEntries(BLESSINGS.map(b => [b.id, b]));
export function getBlessing(id) { return BY_ID[id]; }

// n個をランダムに重複なく選ぶ（Fisher–Yates）。
export function pickBlessings(n) {
  const pool = [...BLESSINGS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(n, pool.length));
}
