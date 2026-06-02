import { DUNGEONS, buildRoomTemplate } from '../data/DungeonData.js';
import { Random } from '../utils/Random.js';
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
