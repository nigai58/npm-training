import { BaseEnemy } from './BaseEnemy.js';
import { ENEMY_DATA } from '../../data/EnemyData.js';
import { Bus } from '../../utils/EventBus.js';

export class Kitsunebi extends BaseEnemy {
  constructor(scene, x, y) {
    super(scene, x, y, ENEMY_DATA.kitsunebi);
    this.shotCooldown = 0;

    this.initFSM('idle', {
      idle: {
        onUpdate() {
          this.body.setVelocity(0, 0);
          if (this.distToPlayer() < this.enemyData.detectRange) this.fsm.transition('aggro');
        },
      },
      aggro: {
        onUpdate(delta) {
          const dist = this.distToPlayer();
          if (dist > this.enemyData.detectRange * 1.6) { this.fsm.transition('idle'); return; }

          const prefer = this.enemyData.preferRange;
          const dir = this.dirToPlayer();
          if (dist < prefer - 30) {
            this.body.setVelocity(-dir.x * this.speed, -dir.y * this.speed);
          } else if (dist > prefer + 30) {
            this.body.setVelocity(dir.x * this.speed * 0.6, dir.y * this.speed * 0.6);
          } else {
            const perp = { x: -dir.y, y: dir.x };
            this.body.setVelocity(perp.x * this.speed * 0.5, perp.y * this.speed * 0.5);
          }

          this.shotCooldown -= delta;
          if (this.shotCooldown <= 0 && dist < this.enemyData.attackRange) {
            this.shotCooldown = this.enemyData.fireRate;
            Bus.emit('ofuda:fireProjectile', {
              x: this.x, y: this.y,
              vx: dir.x * 200, vy: dir.y * 200,
              data: { damage: this.damage, color: 0xff6600, radius: 8 },
              owner: 'enemy',
            });
          }
        },
      },
    });
  }
}
