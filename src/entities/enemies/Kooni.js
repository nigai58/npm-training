import { BaseEnemy } from './BaseEnemy.js';
import { ENEMY_DATA } from '../../data/EnemyData.js';

export class Kooni extends BaseEnemy {
  constructor(scene, x, y, dataKey = 'kooni') {
    super(scene, x, y, ENEMY_DATA[dataKey]);
    this.attackCooldown = 0;

    this.initFSM('idle', {
      idle: {
        onUpdate(delta) {
          this.body.setVelocity(0, 0);
          if (this.distToPlayer() < this.enemyData.detectRange) this.fsm.transition('chase');
        },
      },
      chase: {
        onUpdate(delta) {
          const dist = this.distToPlayer();
          if (dist > this.enemyData.detectRange * 1.5) { this.fsm.transition('idle'); return; }
          if (dist < this.enemyData.attackRange) { this.fsm.transition('attack'); return; }
          const dir = this.dirToPlayer();
          this.body.setVelocity(dir.x * this.speed, dir.y * this.speed);
        },
      },
      attack: {
        onEnter() { this.body.setVelocity(0, 0); },
        onUpdate(delta, t) {
          this.attackCooldown -= delta;
          if (this.distToPlayer() > this.enemyData.attackRange * 1.3) {
            this.fsm.transition('chase'); return;
          }
          if (this.attackCooldown <= 0) {
            this.attackCooldown = 1200;
            if (this.target && !this.target.invincible) {
              const dx = this.target.x - this.x, dy = this.target.y - this.y;
              const d = Math.sqrt(dx*dx+dy*dy)||1;
              this.target.receiveDamage(this.damage);
            }
          }
        },
      },
    });
  }
}
