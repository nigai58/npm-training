import { StateMachine } from '../../utils/StateMachine.js';
import { CombatSystem } from '../../systems/CombatSystem.js';

export class BaseEnemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, data) {
    super(scene, x, y, '__DEFAULT');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.enemyData = data;
    this.hp = data.hp;
    this.maxHp = data.hp;
    this.speed = data.speed;
    this.damage = data.damage;
    this.knockbackResist = data.knockbackResist ?? 0.5;
    this.stunned = false;
    this.stunUntil = 0;
    this.invincible = false;

    this.setDisplaySize(data.size, data.size);
    this.setTint(data.color);
    this.body.setSize(data.size * 0.8, data.size * 0.8);
    this.setDepth(8);

    this._hpBarBg = scene.add.rectangle(x, y - data.size / 2 - 6, data.size, 4, 0x330000).setDepth(20);
    this._hpBar   = scene.add.rectangle(x, y - data.size / 2 - 6, data.size, 4, 0xff2222).setDepth(21);
    this._hpBarBg.setOrigin(0.5, 0.5);
    this._hpBar.setOrigin(0.5, 0.5);

    this.fsm = null;
    this.target = null;
  }

  initFSM(initialState, states) {
    this.fsm = new StateMachine(initialState, states, this);
  }

  updateHpBar() {
    const ratio = Math.max(0, this.hp / this.maxHp);
    const w = this.enemyData.size * ratio;
    this._hpBar.setSize(w, 4);
    this._hpBar.setPosition(
      this.x - this.enemyData.size / 2 + w / 2,
      this.y - this.enemyData.size / 2 - 6
    );
    this._hpBarBg.setPosition(this.x, this.y - this.enemyData.size / 2 - 6);
  }

  update(delta, player) {
    if (!this.active || this.hp <= 0) return;
    this.target = player;
    if (this.stunned) {
      this.body.setVelocity(0, 0);
      this.setTint(0xaa88ff);
      this.updateHpBar();
      return;
    }
    this.setTint(this.enemyData.color);
    if (this.fsm) this.fsm.update(delta);
    this.updateHpBar();
  }

  distToPlayer() {
    if (!this.target) return Infinity;
    const dx = this.target.x - this.x, dy = this.target.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  dirToPlayer() {
    if (!this.target) return { x: 0, y: 0 };
    const dx = this.target.x - this.x, dy = this.target.y - this.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: dx / d, y: dy / d };
  }

  // スプライトと HP バーを破棄する。重複呼び出しに耐える。
  die() {
    if (this._dead) return;
    this._dead = true;
    if (this.knockbackTimer) this.knockbackTimer.remove(false);
    if (this.stunTimer) this.stunTimer.remove(false);
    this._hpBar?.destroy();
    this._hpBarBg?.destroy();
    this.destroy();
  }

  takeDamage(amount, attacker) {
    return CombatSystem.takeDamage(this, amount, attacker);
  }
}
