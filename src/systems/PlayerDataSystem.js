import { Bus } from '../utils/EventBus.js';
import { computeStats } from '../data/UpgradeData.js';

const SAVE_KEY = 'wafuu_save_v1';

// 持続データ（localStorage に保存）
const META_DEFAULTS = () => ({
  magatama: 0,
  kakera: 0,              // 神具の欠片（強化素材）
  upgrades: {},           // 恒久強化レベル
  inventory: [],          // 物語アイテム（火の勾玉・守り石など）
  ofudaUnlocked: ['fire', 'wind', 'seal'],
  flags: {},
  weapon: 'bokuto',
  maxDepth: 0,            // 輪廻の最深到達記録
});

class PlayerDataSystem {
  constructor() {
    this.meta = META_DEFAULTS();
    this.run = { hp: 100, bonusMaxHp: 0 };  // ラン中データ（保存しない）
  }

  // ─── 永続化 ─────────────────────────────
  load() {
    try {
      const raw = (typeof localStorage !== 'undefined') && localStorage.getItem(SAVE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        this.meta = { ...META_DEFAULTS(), ...d, upgrades: { ...(d.upgrades || {}) } };
      }
    } catch (e) { /* セーブ破損時は初期値 */ }
    this.run.bonusMaxHp = 0;
    this.run.hp = this.getMaxHp();
  }

  save() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SAVE_KEY, JSON.stringify(this.meta));
      }
    } catch (e) { /* 保存失敗は無視 */ }
  }

  hardReset() {
    this.meta = META_DEFAULTS();
    this.run = { hp: this.getMaxHp(), bonusMaxHp: 0 };
    this.save();
  }

  // ─── ステータス ──────────────────────────
  getStats() { return computeStats(this.meta.upgrades); }
  getMaxHp() { return this.getStats().maxHp + this.run.bonusMaxHp; }
  getHp() { return this.run.hp; }
  getMagatama() { return this.meta.magatama; }
  getKakera() { return this.meta.kakera; }
  getUpgradeLevel(id) { return this.meta.upgrades[id] ?? 0; }
  getMaxDepth() { return this.meta.maxDepth ?? 0; }
  recordDepth(d) {
    if (d > (this.meta.maxDepth ?? 0)) { this.meta.maxDepth = d; this.save(); }
  }
  getInventory() { return this.meta.inventory; }
  getOfuda() { return this.meta.ofudaUnlocked; }
  getWeapon() { return this.meta.weapon; }
  hasFlag(f) { return !!this.meta.flags[f]; }

  // ─── ラン管理 ───────────────────────────
  startRun() {
    this.run.bonusMaxHp = 0;
    this.run.hp = this.getMaxHp();
    Bus.emit('player:hp', this.run.hp, this.getMaxHp());
  }

  addRunMaxHp(n) {
    this.run.bonusMaxHp += n;
    this.run.hp += n;
    Bus.emit('player:hp', this.run.hp, this.getMaxHp());
  }

  setHp(val) {
    const max = this.getMaxHp();
    this.run.hp = Math.max(0, Math.min(max, val));
    Bus.emit('player:hp', this.run.hp, max);
    if (this.run.hp <= 0) Bus.emit('player:dead');
  }
  heal(amount) { this.setHp(this.run.hp + amount); }
  takeDamage(amount) { this.setHp(this.run.hp - amount); Bus.emit('player:damaged', amount); }

  // ─── 通貨・素材 ──────────────────────────
  addMagatama(n) { this.meta.magatama += n; Bus.emit('player:magatama', this.meta.magatama); this.save(); }
  spendMagatama(n) {
    if (this.meta.magatama < n) return false;
    this.meta.magatama -= n; Bus.emit('player:magatama', this.meta.magatama); this.save(); return true;
  }
  addKakera(n) { this.meta.kakera += n; Bus.emit('player:kakera', this.meta.kakera); this.save(); }
  spendKakera(n) {
    if (this.meta.kakera < n) return false;
    this.meta.kakera -= n; Bus.emit('player:kakera', this.meta.kakera); this.save(); return true;
  }
  setUpgradeLevel(id, lv) { this.meta.upgrades[id] = lv; this.save(); }

  // ─── アイテム・フラグ ─────────────────────
  addItem(item) { this.meta.inventory.push(item); Bus.emit('player:item', item); this.save(); }
  setFlag(key, val = true) { this.meta.flags[key] = val; this.save(); }
  unlockOfuda(id) {
    if (!this.meta.ofudaUnlocked.includes(id)) {
      this.meta.ofudaUnlocked.push(id);
      Bus.emit('ofuda:unlocked', id);
      this.save();
    }
  }

  applyReward(reward) {
    if (reward.magatama) this.addMagatama(reward.magatama);
    if (reward.items) reward.items.forEach(i => (i.id === 'kakera' ? this.addKakera(1) : this.addItem(i)));
    if (reward.flags) reward.flags.forEach(f => this.setFlag(f));
  }
}

export const PDS = new PlayerDataSystem();
