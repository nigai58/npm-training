import { Bus } from '../utils/EventBus.js';

const DEFAULTS = {
  hp: 100,
  maxHp: 100,
  magatama: 0,
  inventory: [],
  ofudaUnlocked: ['fire', 'wind', 'seal'],
  flags: {},
  weapon: 'bokuto',
};

class PlayerDataSystem {
  constructor() {
    this.data = { ...DEFAULTS };
  }

  reset() {
    this.data = { ...DEFAULTS, ofudaUnlocked: [...DEFAULTS.ofudaUnlocked] };
    Bus.emit('player:hp', this.data.hp, this.data.maxHp);
  }

  getHp() { return this.data.hp; }
  getMaxHp() { return this.data.maxHp; }
  getMagatama() { return this.data.magatama; }
  getInventory() { return this.data.inventory; }
  getOfuda() { return this.data.ofudaUnlocked; }
  getWeapon() { return this.data.weapon; }
  hasFlag(f) { return !!this.data.flags[f]; }

  setHp(val) {
    this.data.hp = Math.max(0, Math.min(this.data.maxHp, val));
    Bus.emit('player:hp', this.data.hp, this.data.maxHp);
    if (this.data.hp <= 0) Bus.emit('player:dead');
  }

  heal(amount) { this.setHp(this.data.hp + amount); }

  takeDamage(amount) {
    this.setHp(this.data.hp - amount);
    Bus.emit('player:damaged', amount);
  }

  addMagatama(n) {
    this.data.magatama += n;
    Bus.emit('player:magatama', this.data.magatama);
  }

  addItem(item) {
    this.data.inventory.push(item);
    Bus.emit('player:item', item);
  }

  setFlag(key, val = true) {
    this.data.flags[key] = val;
  }

  unlockOfuda(id) {
    if (!this.data.ofudaUnlocked.includes(id)) {
      this.data.ofudaUnlocked.push(id);
      Bus.emit('ofuda:unlocked', id);
    }
  }

  applyReward(reward) {
    if (reward.magatama) this.addMagatama(reward.magatama);
    if (reward.items) reward.items.forEach(i => this.addItem(i));
    if (reward.flags) reward.flags.forEach(f => this.setFlag(f));
  }
}

export const PDS = new PlayerDataSystem();
