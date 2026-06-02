import { Bus } from '../utils/EventBus.js';

export const CombatSystem = {
  applyKnockback(target, dirX, dirY, force) {
    if (!target?.body) return;
    const resist = target.knockbackResist ?? 0;
    const f = force * (1 - resist);
    target.body.setVelocity(dirX * f, dirY * f);
    if (target.knockbackTimer) clearTimeout(target.knockbackTimer);
    target.knockbackTimer = setTimeout(() => {
      if (target?.body) target.body.setVelocity(0, 0);
    }, 180);
  },

  applyStun(target, duration) {
    target.stunned = true;
    target.stunUntil = Date.now() + duration;
    if (target.stunTimer) clearTimeout(target.stunTimer);
    target.stunTimer = setTimeout(() => {
      target.stunned = false;
    }, duration);
    Bus.emit('enemy:stunned', target);
  },

  takeDamage(target, amount, attacker) {
    if (target.invincible || target.hp <= 0) return false;
    target.hp = Math.max(0, target.hp - amount);
    Bus.emit('entity:damaged', target, amount, attacker);
    if (target.hp <= 0) Bus.emit('entity:died', target);
    return true;
  },

  dodge(player) {
    player.invincible = true;
    player.dodging = true;
    if (player.invincibleTimer) clearTimeout(player.invincibleTimer);
    player.invincibleTimer = setTimeout(() => {
      player.invincible = false;
      player.dodging = false;
    }, 500);
  },

  guard(player, incomingDamage) {
    return player.guarding ? Math.ceil(incomingDamage * 0.4) : incomingDamage;
  },
};
