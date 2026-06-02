import { Run } from './RunState.js';
import { PDS } from './PlayerDataSystem.js';
import { pickBlessings } from '../data/BlessingData.js';
import { Bus } from '../utils/EventBus.js';

export const BlessingSystem = {
  reset() { Run.reset(); },

  // 提示する候補を n 個返す。
  offer(n = 3) { return pickBlessings(n); },

  // 選んだご利益を RunState（必要なら PDS）に適用する。
  choose(blessing) {
    if (!blessing) return;
    blessing.apply(Run, PDS);
    Run.taken.push(blessing.id);
    Bus.emit('blessing:chosen', blessing);
  },
};
