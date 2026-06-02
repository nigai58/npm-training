import { StateMachine } from '../utils/StateMachine.js';
import { WEAPON_DATA } from '../data/WeaponData.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { PDS } from '../systems/PlayerDataSystem.js';
import { Run } from '../systems/RunState.js';
import { Bus } from '../utils/EventBus.js';
import { bindBus } from '../utils/SceneBus.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, '__DEFAULT');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDisplaySize(28, 28);
    this.body.setSize(24, 24);
    this.setDepth(10);

    this.baseSpeed = 160;
    this.speed = 160;
    this.hp = PDS.getHp();
    this.maxHp = PDS.getMaxHp();
    this.invincible = false;
    this.dodging = false;
    this.guarding = false;
    this.stunned = false;
    this.knockbackResist = 0.1;
    this.facingAngle = Math.PI / 2;

    this.weapon = WEAPON_DATA[PDS.getWeapon()] ?? WEAPON_DATA.bokuto;
    this.comboStep = 0;
    this.comboTimer = 0;
    this.attackCooldown = 0;
    this.dodgeCooldown = 0;
    this.lastAttackTime = 0;

    this._hitbox = scene.add.rectangle(0, 0, 1, 1, 0xffff00, 0).setDepth(11);
    scene.physics.add.existing(this._hitbox, false);

    this._comboFsm = new StateMachine('idle', {
      idle: {},
      swing1: { onEnter() { this._doSwing(0); } },
      swing2: { onEnter() { this._doSwing(1); } },
      swing3: { onEnter() { this._doSwing(2); } },
      cooldown: {},
    }, this);

    bindBus(scene, 'player:hp', (hp, max) => { this.hp = hp; this.maxHp = max; });
  }

  _doSwing(step) {
    const w = this.weapon;
    const angle = this.facingAngle;
    const ox = Math.cos(angle) * 36;
    const oy = Math.sin(angle) * 36;
    const hx = this.x + ox, hy = this.y + oy;

    this._hitbox.setPosition(hx, hy);
    this._hitbox.setSize(w.hitboxW, w.hitboxH);

    let dmg = w.damage[step] * PDS.getStats().attackMult;
    if (step === 2) dmg *= Run.comboFinisherMult;   // 破魔の冴え
    Bus.emit('player:swing', {
      x: hx, y: hy,
      w: w.hitboxW, h: w.hitboxH,
      damage: Math.round(dmg),
      knockback: w.knockback,
      angle,
    });

    this.lastAttackTime = Date.now();
    this.comboTimer = w.comboWindow;
    this.scene.time.delayedCall(w.swingDuration[step], () => {
      if (step === 2) {
        this._comboFsm.transition('cooldown');
        this.scene.time.delayedCall(w.cooldownAfterCombo, () => {
          this._comboFsm.transition('idle');
          this.comboStep = 0;
          this.attackCooldown = 0;
        });
      } else {
        this._comboFsm.transition('idle');
        this.attackCooldown = 0;
      }
    });
  }

  tryAttack() {
    if (this.attackCooldown > 0 || this.stunned) return;
    const now = Date.now();
    if (now - this.lastAttackTime > this.weapon.comboWindow) this.comboStep = 0;

    if (this._comboFsm.is('idle')) {
      this.attackCooldown = 1;
      const step = this.comboStep;
      this.comboStep = (step + 1) % 3;
      const states = ['swing1', 'swing2', 'swing3'];
      this._comboFsm.transition(states[step]);
    }
  }

  tryDodge() {
    if (this.dodgeCooldown > 0 || this.dodging || this.stunned) return;
    const cd = 900 * PDS.getStats().dodgeCdMult;   // 韋駄天で短縮
    this.dodgeCooldown = cd;
    CombatSystem.dodge(this);
    const angle = this.facingAngle;
    this.body.setVelocity(Math.cos(angle) * 420, Math.sin(angle) * 420);
    this.scene.time.delayedCall(200, () => {
      if (this.body) this.body.setVelocity(0, 0);
    });
    this.scene.time.delayedCall(cd, () => { if (this.active) this.dodgeCooldown = 0; });
  }

  update(cursors, keys, delta) {
    if (this.dodging) return;
    if (this.stunned) {
      this.body.setVelocity(0, 0);
      this.setTint(0xaa88ff);
      if (this.comboTimer > 0) this.comboTimer -= delta;
      if (this.dodgeCooldown > 0) this.dodgeCooldown -= delta;
      return;
    }

    const left  = cursors.left.isDown  || keys.A?.isDown;
    const right = cursors.right.isDown || keys.D?.isDown;
    const up    = cursors.up.isDown    || keys.W?.isDown;
    const down  = cursors.down.isDown  || keys.S?.isDown;

    let vx = 0, vy = 0;
    if (left)  vx -= 1;
    if (right) vx += 1;
    if (up)    vy -= 1;
    if (down)  vy += 1;

    const len = Math.sqrt(vx * vx + vy * vy);
    if (len > 0) {
      vx /= len; vy /= len;
      this.facingAngle = Math.atan2(vy, vx);
    }

    this.speed = this.baseSpeed * Run.speedMult;   // 韋駄天の足
    this.body.setVelocity(vx * this.speed, vy * this.speed);

    if (this.comboTimer > 0) this.comboTimer -= delta;
    if (this.dodgeCooldown > 0) this.dodgeCooldown -= delta;

    this._tintByState();
  }

  _tintByState() {
    if (this.dodging) { this.setTint(0x88ffff); return; }
    if (this.guarding) { this.setTint(0xffff88); return; }
    if (this._comboFsm.current !== 'idle') { this.setTint(0xff8844); return; }
    this.clearTint();
  }

  receiveDamage(amount) {
    if (this.invincible) return;
    let final = CombatSystem.guard(this, amount);
    final = Math.max(1, Math.ceil(final * (1 - Run.damageReduction)));  // 火防の護符
    PDS.takeDamage(final);
    this.invincible = true;
    this.scene.time.delayedCall(800, () => { if (this.active) this.invincible = false; });
    this.scene.cameras.main.shake(120, 0.006);
  }
}
