import { Bus } from '../utils/EventBus.js';

// Phaser の scene.time.delayedCall を使う。シーン破棄時に自動で破棄され、
// 破棄済みオブジェクトへのコールバック発火を防ぐ。
// （Roblox 転用時は task.delay + 生存チェック、または Debris/TweenService 相当）

export const CombatSystem = {
  applyKnockback(target, dirX, dirY, force) {
    if (!target?.body || !target.scene) return;
    const resist = target.knockbackResist ?? 0;
    const f = force * (1 - resist);
    target.body.setVelocity(dirX * f, dirY * f);
    if (target.knockbackTimer) target.knockbackTimer.remove(false);
    target.knockbackTimer = target.scene.time.delayedCall(180, () => {
      if (target?.active && target.body) target.body.setVelocity(0, 0);
    });
  },

  applyStun(target, duration) {
    if (!target?.scene) return;
    target.stunned = true;
    target.stunUntil = Date.now() + duration;
    if (target.stunTimer) target.stunTimer.remove(false);
    target.stunTimer = target.scene.time.delayedCall(duration, () => {
      if (target?.active) target.stunned = false;
    });
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
    if (!player?.scene) return;
    player.invincible = true;
    player.dodging = true;
    if (player.invincibleTimer) player.invincibleTimer.remove(false);
    player.invincibleTimer = player.scene.time.delayedCall(500, () => {
      if (player?.active) { player.invincible = false; player.dodging = false; }
    });
  },

  guard(player, incomingDamage) {
    return player.guarding ? Math.ceil(incomingDamage * 0.4) : incomingDamage;
  },
};
