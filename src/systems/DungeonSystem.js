import { ROOM_SEQUENCE, TYPE_TO_TEMPLATE, ROOM_TEMPLATES } from '../data/DungeonData.js';
import { Random } from '../utils/Random.js';
import { Bus } from '../utils/EventBus.js';

class DungeonSystem {
  constructor() {
    this.rooms = [];
    this.currentIndex = 0;
    this.rng = null;
    this.sessionRewards = [];
  }

  generate(seed) {
    this.rng = new Random(seed ?? Date.now());
    this.rooms = ROOM_SEQUENCE.map((type, i) => {
      const templateName = TYPE_TO_TEMPLATE[type](this.rng);
      const template = ROOM_TEMPLATES[templateName];
      return {
        id: i,
        type,
        templateName,
        template,
        cleared: type === 'start' || type === 'end' || type === 'heal' || type === 'treasure',
        doorsLocked: type === 'battle' || type === 'puzzle' || type === 'boss',
      };
    });
    this.currentIndex = 0;
    this.sessionRewards = [];
    Bus.emit('dungeon:generated', this.rooms);
  }

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
