import { REWARD_DATA } from '../data/RewardData.js';
import { PDS } from './PlayerDataSystem.js';
import { DS } from './DungeonSystem.js';
import { Bus } from '../utils/EventBus.js';

export const RewardSystem = {
  generateDrop(sourceKey, rng) {
    const table = REWARD_DATA[sourceKey];
    if (!table) return null;
    const result = { magatama: 0, items: [], flags: [] };

    if (table.magatama) {
      result.magatama = rng
        ? rng.int(table.magatama.min, table.magatama.max)
        : Math.floor(Math.random() * (table.magatama.max - table.magatama.min + 1)) + table.magatama.min;
    }
    if (table.items) {
      const totalWeight = table.items.reduce((s, i) => s + i.weight, 0);
      const roll = Math.random() * totalWeight;
      let acc = 0;
      for (const item of table.items) {
        acc += item.weight;
        if (roll <= acc) { result.items.push(item); break; }
      }
    }
    if (table.flags) result.flags = [...table.flags];
    return result;
  },

  collect(reward) {
    if (!reward) return;
    PDS.applyReward(reward);
    DS.addReward(reward);
    Bus.emit('reward:collected', reward);
  },
};
