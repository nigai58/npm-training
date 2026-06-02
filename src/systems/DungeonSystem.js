import { DUNGEONS, ENDLESS_DEF, buildRoomTemplate, buildEndlessSequence } from '../data/DungeonData.js';
import { Random } from '../utils/Random.js';
import { Run } from './RunState.js';
import { Bus } from '../utils/EventBus.js';

class DungeonSystem {
  constructor() {
    this.rooms = [];
    this.currentIndex = 0;
    this.rng = null;
    this.sessionRewards = [];
    this.dungeonId = 'shubyori';
    this.def = null;
    this.endless = false;
    this.depth = 0;
  }

  // dungeonId 省略時は朱鳥居の迷宮
  generate(dungeonId = 'shubyori', seed) {
    this.dungeonId = dungeonId;
    this.def = DUNGEONS[dungeonId] ?? DUNGEONS.shubyori;
    this.endless = false;
    this.depth = 0;
    this.rng = new Random(seed ?? Date.now());

    this.rooms = this.def.sequence.map((type, i) => ({
      id: i,
      type,
      template: buildRoomTemplate(type, this.def, this.rng),
      cleared: type === 'start' || type === 'end' || type === 'heal' || type === 'treasure',
      doorsLocked: type === 'battle' || type === 'puzzle' || type === 'boss',
    }));
    this.currentIndex = 0;
    this.sessionRewards = [];
    Bus.emit('dungeon:generated', this.rooms);
  }

  // ─── 輪廻（エンドレス）─────────────────────
  generateEndless(seed) {
    this.dungeonId = 'rinne';
    this.endless = true;
    this.depth = 1;
    this.rng = new Random(seed ?? Date.now());
    this.sessionRewards = [];
    this._buildFloor();
  }

  _buildFloor() {
    const d = this.depth;
    const seq = buildEndlessSequence(d, this.rng);
    // 深度ごとにボスを巡回させた一時定義を作る
    const bossType = ENDLESS_DEF.bossPool[(Math.floor(d / 5) - 1 + ENDLESS_DEF.bossPool.length) % ENDLESS_DEF.bossPool.length];
    this.def = { ...ENDLESS_DEF, bossType };

    // 階層スケーリング（敵HP/攻撃力）
    Run.enemyHpMult = 1 + 0.15 * (d - 1);
    Run.enemyDamageMult = 1 + 0.10 * (d - 1);

    this.rooms = seq.map((type, i) => ({
      id: i,
      type,
      template: buildRoomTemplate(type, this.def, this.rng),
      cleared: type === 'start' || type === 'end' || type === 'heal' || type === 'treasure',
      doorsLocked: type === 'battle' || type === 'puzzle' || type === 'boss',
    }));
    this.currentIndex = 0;
    Bus.emit('dungeon:generated', this.rooms);
  }

  nextFloor() {
    this.depth++;
    this._buildFloor();
    return this.depth;
  }

  getDepth() { return this.depth; }
  isEndless() { return this.endless; }

  getDef() { return this.def; }
  getDungeonName() { return this.def?.name ?? ''; }
  getRelic() { return this.def?.bossRewards?.relic; }
  getMamori() { return this.def?.bossRewards?.mamori; }
  getClearFlag() { return this.def?.bossRewards?.clearFlag; }
  getBossDialogueKey() { return this.def?.bossDialogueKey; }
  getHintKey(type) { return this.def?.hints?.[type] ?? null; }

  getCurrentRoom() { return this.rooms[this.currentIndex]; }
  getTotalRooms() { return this.rooms.length; }
  getCurrentIndex() { return this.currentIndex; }

  clearRoom() {
    const room = this.getCurrentRoom();
    room.cleared = true;
    room.doorsLocked = false;
    Bus.emit('dungeon:roomCleared', room, this.currentIndex);
  }

  advanceRoom() {
    if (this.currentIndex < this.rooms.length - 1) {
      this.currentIndex++;
      Bus.emit('dungeon:roomChanged', this.getCurrentRoom(), this.currentIndex);
      return true;
    }
    return false;
  }

  addReward(reward) { this.sessionRewards.push(reward); }
  getSessionRewards() { return [...this.sessionRewards]; }

  isLastRoom() { return this.currentIndex >= this.rooms.length - 1; }
  isBossRoom() { return this.getCurrentRoom()?.type === 'boss'; }
}

export const DS = new DungeonSystem();
