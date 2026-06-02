import { BaseEnemy } from './BaseEnemy.js';
import { ENEMY_DATA } from '../../data/EnemyData.js';
import { CombatSystem } from '../../systems/CombatSystem.js';
import { Bus } from '../../utils/EventBus.js';

// 水鏡の主・鏡花：水弾連射 / 水柱 / 突進 の3行動。HP50%以下で激化。
export class BossKyouka extends BaseEnemy {
  constructor(scene, x, y) {
    super(scene, x, y, ENEMY_DATA.kyouka);
    this.phase = 1;
    this.actionQueue = ['volley', 'geyser', 'charge'];
    this.queueIndex = 0;
    this.chargeActive = false;
    this.chargeDir = { x: 0, y: 0 };

    this.setDepth(15);
    Bus.emit('boss:spawned', this);

    this.initFSM('idle', {
      idle: {
        onEnter() { this.body.setVelocity(0, 0); },
        onUpdate(delta, t) {
          const interval = this.phase === 1 ? 1900 : 1100;
          if (t > interval) {
            const action = this.actionQueue[this.queueIndex % this.actionQueue.length];
            this.queueIndex++;
            this.fsm.transition(action);
          }
        },
      },
      volley: {
        onEnter() {
          this.body.setVelocity(0, 0);
          const shots = this.phase === 2 ? 5 : 3;
          const dir = this.dirToPlayer();
          const baseAngle = Math.atan2(dir.y, dir.x);
          const spread = 0.5;
          for (let i = 0; i < shots; i++) {
            const a = baseAngle + (i - (shots - 1) / 2) * (spread / Math.max(1, shots - 1)) * 2;
            Bus.emit('ofuda:fireProjectile', {
              x: this.x, y: this.y,
              vx: Math.cos(a) * 220, vy: Math.sin(a) * 220,
              data: { damage: this.enemyData.volleyDamage, color: this.enemyData.volleyColor, radius: 9 },
              owner: 'enemy',
            });
          }
          this.scene.time.delayedCall(700, () => { if (this.active) this.fsm.transition('idle'); });
        },
      },
      geyser: {
        onEnter() {
          this.body.setVelocity(0, 0);
          // プレイヤーの足元を狙う水柱を予告 → 着弾
          const tx = this.target?.x ?? this.x;
          const ty = this.target?.y ?? this.y;
          Bus.emit('ofuda:windBlast', { x: tx, y: ty, radius: this.enemyData.geyserRange }); // 予告円(青)
          this.scene.time.delayedCall(550, () => {
            if (!this.active) return;
            Bus.emit('boss:slam', { x: tx, y: ty, radius: this.enemyData.geyserRange, damage: this.enemyData.geyserDamage });
            this.scene.cameras.main.shake(220, 0.008);
            this.scene.time.delayedCall(300, () => { if (this.active) this.fsm.transition('idle'); });
          });
        },
      },
      charge: {
        onEnter() {
          const dir = this.dirToPlayer();
          this.chargeDir = dir;
          this.chargeActive = true;
          const spd = this.enemyData.chargeSpeed * (this.phase === 2 ? 1.3 : 1);
          this.body.setVelocity(dir.x * spd, dir.y * spd);
          this.scene.time.delayedCall(600, () => {
            if (!this.active) return;
            this.chargeActive = false;
            this.body.setVelocity(0, 0);
            this.fsm.transition('idle');
          });
        },
        onUpdate() {
          if (this.chargeActive && this.target && !this.target.invincible) {
            const dx = this.target.x - this.x, dy = this.target.y - this.y;
            if (Math.sqrt(dx * dx + dy * dy) < 48) {
              this.target.receiveDamage(this.damage * 1.4);
              CombatSystem.applyKnockback(this.target, this.chargeDir.x, this.chargeDir.y, 360);
            }
          }
        },
      },
    });
  }

  update(delta, player) {
    super.update(delta, player);
    if (!this.active || this.hp <= 0) return;

    if (this.phase === 1 && this.hp / this.maxHp <= 0.5) {
      this.phase = 2;
      this.speed *= 1.25;
      Bus.emit('boss:phase2', this);
      this.scene.cameras.main.flash(400, 80, 160, 255);
    }
  }
}
