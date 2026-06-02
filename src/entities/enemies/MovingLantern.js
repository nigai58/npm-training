import { BaseEnemy } from './BaseEnemy.js';
import { ENEMY_DATA } from '../../data/EnemyData.js';
import { Bus } from '../../utils/EventBus.js';

export class MovingLantern extends BaseEnemy {
  constructor(scene, x, y, dataKey = 'lantern') {
    super(scene, x, y, ENEMY_DATA[dataKey]);
    this.aoeCooldown = 0;

    this.initFSM('idle', {
      idle: {
        onUpdate() {
          this.body.setVelocity(0, 0);
          if (this.distToPlayer() < this.enemyData.detectRange) this.fsm.transition('chase');
        },
      },
      chase: {
        onUpdate(delta) {
          const dist = this.distToPlayer();
          if (dist > this.enemyData.detectRange * 1.5) { this.fsm.transition('idle'); return; }
          if (dist < this.enemyData.aoeRange * 0.8) { this.fsm.transition('aoe'); return; }
          const dir = this.dirToPlayer();
          this.body.setVelocity(dir.x * this.speed, dir.y * this.speed);
        },
      },
      aoe: {
        onEnter() { this.body.setVelocity(0, 0); },
        onUpdate(delta) {
          if (this.distToPlayer() > this.enemyData.aoeRange) { this.fsm.transition('chase'); return; }
          this.aoeCooldown -= delta;
          if (this.aoeCooldown <= 0) {
            this.aoeCooldown = this.enemyData.aoeRate;
            Bus.emit('enemy:aoe', { x: this.x, y: this.y, radius: this.enemyData.aoeRange, damage: this.damage });
          }
        },
      },
    });
  }
}
