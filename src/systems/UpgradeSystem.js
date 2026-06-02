import { PDS } from './PlayerDataSystem.js';
import { UPGRADE_DEFS, upgradeCost, upgradeMaxLevel } from '../data/UpgradeData.js';
import { Bus } from '../utils/EventBus.js';

export const UpgradeSystem = {
  isMaxed(id) {
    return PDS.getUpgradeLevel(id) >= upgradeMaxLevel(id);
  },

  nextCost(id) {
    return upgradeCost(id, PDS.getUpgradeLevel(id));
  },

  canAfford(id) {
    const cost = this.nextCost(id);
    if (cost == null) return false;
    const cur = UPGRADE_DEFS[id].currency;
    return cur === 'kakera' ? PDS.getKakera() >= cost : PDS.getMagatama() >= cost;
  },

  // 購入成功で true。
  purchase(id) {
    if (this.isMaxed(id) || !this.canAfford(id)) return false;
    const cost = this.nextCost(id);
    const cur = UPGRADE_DEFS[id].currency;
    const paid = cur === 'kakera' ? PDS.spendKakera(cost) : PDS.spendMagatama(cost);
    if (!paid) return false;
    PDS.setUpgradeLevel(id, PDS.getUpgradeLevel(id) + 1);
    Bus.emit('upgrade:purchased', id, PDS.getUpgradeLevel(id));
    return true;
  },
};
