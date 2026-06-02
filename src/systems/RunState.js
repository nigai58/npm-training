// 1回の潜入（ラン）中だけ有効な一時強化を保持する。
// ご利益(Blessing)で積み上げ、潜入開始・死亡・帰還でリセットする。
// Player / OfudaSystem / 報酬処理が参照する単一の読み取り口。
// Roblox 転用時はサーバー側のプレイヤーごとのランテーブルに対応。

class RunState {
  constructor() { this.reset(); }

  reset() {
    this.damageReduction = 0;      // 被ダメージ軽減（加算, 上限0.6）
    this.speedMult = 1;            // 移動速度倍率
    this.magatamaMult = 1;         // 勾玉ドロップ倍率
    this.ofudaCdMult = 1;          // お札クールダウン倍率
    this.comboFinisherMult = 1;    // コンボ3段目ダメージ倍率
    this.lifestealOnKill = 0;      // 敵撃破時の回復量
    this.ofudaDamageMult = { fire: 1, wind: 1, seal: 1 };
    this.ofudaRadiusMult = { fire: 1, wind: 1, seal: 1 };
    this.taken = [];               // 取得済みご利益id（表示用）
    this.enemyHpMult = 1;          // 輪廻の階層スケーリング
    this.enemyDamageMult = 1;
  }

  applyMagatama(n) {
    return Math.max(0, Math.round(n * this.magatamaMult));
  }
}

export const Run = new RunState();
