import { OFUDA_DATA } from '../data/OfudaData.js';
import { CombatSystem } from './CombatSystem.js';
import { PDS } from './PlayerDataSystem.js';
import { Run } from './RunState.js';
import { Bus } from '../utils/EventBus.js';

class OfudaSystem {
  constructor() {
    this.cooldowns = {};
  }

  reset() { this.cooldowns = {}; }

  canUse(id) {
    const cd = this.cooldowns[id];
    return !cd || Date.now() > cd;
  }

  getRemainingCooldown(id) {
    const cd = this.cooldowns[id];
    if (!cd) return 0;
    return Math.max(0, cd - Date.now());
  }

  use(id, player, scene, enemies) {
    if (!this.canUse(id)) return false;
    const base = OFUDA_DATA[id];
    if (!base) return false;

    const stats = PDS.getStats();
    // 恒久強化 × ご利益で実効値を算出（元データは不変）
    const data = {
      ...base,
      damage: Math.round((base.damage ?? 0) * stats.ofudaPowerMult * (Run.ofudaDamageMult[id] ?? 1)),
      radius: (base.radius ?? 0) * (Run.ofudaRadiusMult[id] ?? 1),
    };
    const cd = base.cooldown * stats.ofudaCdMult * Run.ofudaCdMult;
    this.cooldowns[id] = Date.now() + cd;
    Bus.emit('ofuda:used', id, data);

    if (id === 'fire')  this._useFire(data, player, scene, enemies);
    if (id === 'wind')  this._useWind(data, player, enemies, scene);
    if (id === 'seal')  this._useSeal(data, player, enemies, scene);

    return true;
  }

  _useFire(data, player, scene, enemies) {
    const angle = player.facingAngle ?? 0;
    const vx = Math.cos(angle) * data.projectileSpeed;
    const vy = Math.sin(angle) * data.projectileSpeed;
    Bus.emit('ofuda:fireProjectile', { x: player.x, y: player.y, vx, vy, data, owner: 'player' });
  }

  _useWind(data, player, enemies, scene) {
    const px = player.x, py = player.y;
    enemies.forEach(e => {
      if (!e.active || e.hp <= 0) return;
      const dx = e.x - px, dy = e.y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < data.radius && dist > 0) {
        CombatSystem.applyKnockback(e, dx / dist, dy / dist, data.knockbackForce);
        CombatSystem.takeDamage(e, data.damage, player);
      }
    });
    Bus.emit('ofuda:windBlast', { x: px, y: py, radius: data.radius });
    scene?.cameras?.main?.shake(200, 0.003);
  }

  _useSeal(data, player, enemies, scene) {
    const px = player.x, py = player.y;
    enemies.forEach(e => {
      if (!e.active || e.hp <= 0) return;
      const dx = e.x - px, dy = e.y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < data.radius) {
        CombatSystem.applyStun(e, data.stunDuration);
        CombatSystem.takeDamage(e, data.damage, player);
      }
    });
    Bus.emit('ofuda:sealBlast', { x: px, y: py, radius: data.radius });
    Bus.emit('gimmick:seal', { x: px, y: py, radius: data.radius });
  }
}

export const OS = new OfudaSystem();
