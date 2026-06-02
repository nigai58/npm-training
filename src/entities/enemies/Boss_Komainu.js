import { BaseEnemy } from './BaseEnemy.js';
import { ENEMY_DATA } from '../../data/EnemyData.js';
import { CombatSystem } from '../../systems/CombatSystem.js';
import { Bus } from '../../utils/EventBus.js';

export class BossKomainu extends BaseEnemy {
  constructor(scene, x, y) {
    super(scene, x, y, ENEMY_DATA.komainu);
    this.phase = 1;
    this.actionQueue = ['charge', 'slam', 'howl'];
    this.queueIndex = 0;
    this.actionTimer = 0;
    this.chargeActive = false;
    this.chargeDir = { x: 0, y: 0 };

    this.setDepth(15);

    Bus.emit('boss:spawned', this);

    this.initFSM('idle', {
      idle: {
        onEnter() { this.body.setVelocity(0, 0); },
        onUpdate(delta, t) {
          const interval = this.phase === 1 ? 2000 : 1200;
          if (t > interval) {
            const action = this.actionQueue[this.queueIndex % this.actionQueue.length];
            this.queueIndex++;
            this.fsm.transition(action);
          }
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
            if (Math.sqrt(dx*dx+dy*dy) < 50) {
              this.target.receiveDamage(this.damage * 1.5);
              CombatSystem.applyKnockback(this.target, this.chargeDir.x, this.chargeDir.y, 400);
            }
          }
        },
      },
      slam: {
        onEnter() {
          this.body.setVelocity(0, 0);
          this.scene.time.delayedCall(400, () => {
            if (!this.active) return;
            Bus.emit('boss:slam', { x: this.x, y: this.y, radius: this.enemyData.slamRange, damage: this.enemyData.slamDamage });
            this.scene.cameras.main.shake(300, 0.01);
            this.scene.time.delayedCall(300, () => { if (this.active) this.fsm.transition('idle'); });
          });
        },
      },
      howl: {
        onEnter() {
          this.body.setVelocity(0, 0);
          Bus.emit('boss:howl', { x: this.x, y: this.y, radius: this.enemyData.howlRange, stunDuration: this.enemyData.howlStun });
          this.scene.cameras.main.flash(200, 180, 120, 255);
          this.scene.time.delayedCall(1000, () => { if (this.active) this.fsm.transition('idle'); });
        },
      },
    });
  }

  update(delta, player) {
    super.update(delta, player);
    if (!this.active || this.hp <= 0) return;

    if (this.phase === 1 && this.hp / this.maxHp <= 0.5) {
      this.phase = 2;
      this.speed *= 1.3;
      Bus.emit('boss:phase2', this);
      this.scene.cameras.main.flash(400, 255, 80, 80);
    }
  }
}
