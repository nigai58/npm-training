import { Player } from '../entities/Player.js';
import { Room } from '../entities/Room.js';
import { Projectile } from '../entities/Projectile.js';
import { HUD } from '../ui/HUD.js';
import { RewardPopup } from '../ui/RewardPopup.js';
import { DS } from '../systems/DungeonSystem.js';
import { OS } from '../systems/OfudaSystem.js';
import { PDS } from '../systems/PlayerDataSystem.js';
import { RewardSystem } from '../systems/RewardSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { Bus } from '../utils/EventBus.js';
import { OFUDA_DATA } from '../data/OfudaData.js';

export class DungeonScene extends Phaser.Scene {
  constructor() { super('Dungeon'); }

  create() {
    this._projectiles = [];
    this._currentRoom = null;
    this._transitioning = false;
    this._enemies = [];

    this._loadRoom(DS.getCurrentIndex());
    this._setupPlayer();
    this._setupInput();
    this._setupBusListeners();

    this.hud = new HUD(this);
    this.hud.updateRoom(DS.getCurrentIndex(), DS.getTotalRooms());

    this.cameras.main.setBackgroundColor(0x08060e);
  }

  _loadRoom(index) {
    this._currentRoom?.destroy();
    this._projectiles.forEach(p => p.active && p.destroy());
    this._projectiles = [];

    const roomDef = DS.rooms[index];
    const room = new Room(this, roomDef.template, index, DS.getTotalRooms());
    room.build();
    this._currentRoom = room;
    this._enemies = room.enemies;

    const W = roomDef.template.width, H = roomDef.template.height;

    if (roomDef.type === 'heal') {
      this._doHeal(W, H);
    }

    if (this._player) {
      const enterFromNorth = index > 0;
      this._player.setPosition(W / 2, enterFromNorth ? H - 100 : H / 2);
    }

    if (roomDef.type === 'puzzle') {
      this._showPuzzleNote(roomDef.template.puzzleNote, W, H);
    }

    if (roomDef.type === 'boss') {
      Bus.emit('boss:arenaStart');
    }
  }

  _doHeal(W, H) {
    const healed = Math.floor(PDS.getMaxHp() * 0.4);
    PDS.heal(healed);
    RewardPopup.show(this, W / 2, H / 2, `＋${healed} HP 回復`);
  }

  _showPuzzleNote(note, W, H) {
    const t = this.add.text(W / 2, 80, note ?? '封印を解け', {
      fontSize: '16px', color: '#ffddff', fontFamily: 'serif',
      backgroundColor: '#00000099', padding: { x: 8, y: 4 },
    }).setDepth(50).setOrigin(0.5);
    this.time.delayedCall(3500, () => t.destroy());
  }

  _setupPlayer() {
    const roomDef = DS.getCurrentRoom();
    const W = roomDef.template.width, H = roomDef.template.height;
    this._player = new Player(this, W / 2, H * 0.75);

    this.physics.add.collider(this._player, this._currentRoom.walls);

    this._player._hitbox = this.add.rectangle(0, 0, 1, 1, 0xffff00, 0).setDepth(11);
    this.physics.add.existing(this._player._hitbox, false);

    this.cameras.main.setBounds(0, 0, W, H);
    this.cameras.main.startFollow(this._player, true, 0.12, 0.12);
  }

  _setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,E,Z,X,C,V,SPACE,SHIFT');

    this.input.keyboard.on('keydown-Z', () => this._useOfuda('fire'));
    this.input.keyboard.on('keydown-X', () => this._useOfuda('wind'));
    this.input.keyboard.on('keydown-C', () => this._useOfuda('seal'));

    this.input.on('pointerdown', (ptr) => {
      if (ptr.x > this.scale.width * 0.6) this._player.tryAttack();
    });
  }

  _useOfuda(id) {
    OS.use(id, this._player, this, this._enemies.filter(e => e.active));
  }

  _setupBusListeners() {
    Bus.on('ofuda:fireProjectile', ({ x, y, vx, vy, data, owner }) => {
      this._spawnProjectile(x, y, vx, vy, data, owner);
    });

    Bus.on('ofuda:windBlast', ({ x, y, radius }) => {
      this._vfxCircle(x, y, radius, 0x88ddff, 300);
    });
    Bus.on('ofuda:sealBlast', ({ x, y, radius }) => {
      this._vfxCircle(x, y, radius, 0xaa88ff, 400);
    });

    Bus.on('gimmick:seal', ({ x, y, radius }) => {
      this._currentRoom?.sealBarrier();
    });

    Bus.on('enemy:died', (e) => {
      this._enemies = this._enemies.filter(en => en !== e);
      const key = `enemy_${e.enemyData?.label?.toLowerCase() === '小鬼' ? 'kooni' : e.enemyData?.label?.toLowerCase() === '狐火' ? 'kitsunebi' : 'lantern'}`;
      const drop = RewardSystem.generateDrop(key);
      if (drop?.magatama > 0) {
        RewardPopup.show(this, e.x, e.y, `勾玉 +${drop.magatama}`);
        RewardSystem.collect({ magatama: drop.magatama });
      }
      this._checkRoomClear();
    });

    Bus.on('enemy:aoe', ({ x, y, radius, damage }) => {
      this._vfxCircle(x, y, radius, 0xddaa00, 300);
      const p = this._player;
      if (!p) return;
      const dx = p.x - x, dy = p.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < radius) p.receiveDamage(damage);
    });

    Bus.on('boss:slam', ({ x, y, radius, damage }) => {
      this._vfxCircle(x, y, radius, 0xff4400, 400);
      const p = this._player;
      if (!p) return;
      const dx = p.x - x, dy = p.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < radius) {
        p.receiveDamage(damage);
        CombatSystem.applyKnockback(p, dx / (Math.sqrt(dx*dx+dy*dy)||1), dy / (Math.sqrt(dx*dx+dy*dy)||1), 350);
      }
    });

    Bus.on('boss:howl', ({ x, y, radius, stunDuration }) => {
      this._vfxCircle(x, y, radius, 0xffffaa, 500);
      const p = this._player;
      if (!p) return;
      const dx = p.x - x, dy = p.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < radius) {
        CombatSystem.applyStun(p, stunDuration);
        this.time.delayedCall(stunDuration, () => { p.stunned = false; });
        RewardPopup.show(this, p.x, p.y - 20, '咆哮！スタン！');
      }
    });

    Bus.on('boss:phase2', () => {
      const t = this.add.text(this.scale.width / 2, this.scale.height / 2, '荒れ狛犬　覚醒！', {
        fontSize: '28px', color: '#ff4444', fontFamily: 'serif',
        stroke: '#000', strokeThickness: 4,
      }).setScrollFactor(0).setDepth(300).setOrigin(0.5);
      this.time.delayedCall(2000, () => t.destroy());
    });

    Bus.on('player:dead', () => this._onPlayerDead());
    Bus.on('entity:died', (e) => { if (e === this._player) this._onPlayerDead(); });

    Bus.on('player:swing', (hitInfo) => this._resolveSwing(hitInfo));
  }

  _spawnProjectile(x, y, vx, vy, data, owner) {
    const proj = new Projectile(this, x, y, vx, vy, data, owner);
    this._projectiles.push(proj);

    if (owner === 'player') {
      this._enemies.forEach(e => {
        if (!e.active) return;
        this.physics.add.overlap(proj, e, () => {
          if (!proj.active) return;
          CombatSystem.takeDamage(e, data.damage, this._player);
          const dir = { x: vx / (Math.sqrt(vx*vx+vy*vy)||1), y: vy / (Math.sqrt(vx*vx+vy*vy)||1) };
          CombatSystem.applyKnockback(e, dir.x, dir.y, 200);
          this._vfxCircle(proj.x, proj.y, 20, data.color ?? 0xff4400, 200);
          proj.destroy();
        });
      });
    } else {
      this.physics.add.overlap(proj, this._player, () => {
        if (!proj.active) return;
        this._player.receiveDamage(data.damage);
        proj.destroy();
      });
    }
  }

  _resolveSwing({ x, y, w, h, damage, knockback, angle }) {
    const rect = new Phaser.Geom.Rectangle(x - w / 2, y - h / 2, w, h);
    this._enemies.forEach(e => {
      if (!e.active || e.hp <= 0) return;
      if (Phaser.Geom.Intersects.RectangleToRectangle(rect, e.getBounds())) {
        const hit = CombatSystem.takeDamage(e, damage, this._player);
        if (hit) {
          CombatSystem.applyKnockback(e, Math.cos(angle), Math.sin(angle), knockback);
          this._vfxSlash(x, y, angle);
        }
      }
    });
  }

  _checkRoomClear() {
    const alive = this._enemies.filter(e => e.active && e.hp > 0);
    if (alive.length === 0) {
      const room = DS.getCurrentRoom();
      if (room.type === 'boss') {
        this._onBossDefeated();
        return;
      }
      if (room.doorsLocked || room.type === 'puzzle') {
        this._currentRoom.checkClear();
      }
      if (room.doorsLocked === false || ['treasure', 'heal', 'start', 'end'].includes(room.type)) return;
      DS.clearRoom();
      this._currentRoom.unlockDoors();
    }
  }

  _onBossDefeated() {
    const drop = RewardSystem.generateDrop('chest_boss');
    RewardSystem.collect(drop);
    DS.clearRoom();
    this.cameras.main.flash(600, 255, 220, 100);

    const W = this._currentRoom.template.width;
    const t = this.add.text(W / 2, 120, '荒れ狛犬を討伐した！', {
      fontSize: '24px', color: '#ffdd88', fontFamily: 'serif',
      stroke: '#000', strokeThickness: 4,
    }).setDepth(200).setOrigin(0.5);

    this.time.delayedCall(2000, () => {
      t.destroy();
      DS.advanceRoom();
      this._loadRoom(DS.getCurrentIndex());
      this.hud.updateRoom(DS.getCurrentIndex(), DS.getTotalRooms());
    });
  }

  _onPlayerDead() {
    this._transitioning = true;
    this.cameras.main.fade(800, 0, 0, 0);
    this.time.delayedCall(900, () => {
      this.scene.start('Town');
    });
  }

  _vfxCircle(x, y, radius, color, duration) {
    const c = this.add.circle(x, y, radius, color, 0.35).setDepth(50);
    this.tweens.add({ targets: c, alpha: 0, scale: 1.3, duration, onComplete: () => c.destroy() });
  }

  _vfxSlash(x, y, angle) {
    const line = this.add.rectangle(x, y, 50, 6, 0xffffff, 0.8).setDepth(50).setRotation(angle);
    this.tweens.add({ targets: line, alpha: 0, scaleX: 0.2, duration: 180, onComplete: () => line.destroy() });
  }

  update(time, delta) {
    if (this._transitioning) return;
    const p = this._player;
    if (!p?.active) return;

    p.update(this.cursors, this.keys, delta);

    const keys = this.keys;
    if (Phaser.Input.Keyboard.JustDown(keys.SPACE)) p.tryAttack();
    if (Phaser.Input.Keyboard.JustDown(keys.SHIFT))  p.tryDodge();
    if (keys.V.isDown) p.guarding = true; else p.guarding = false;

    this._enemies.forEach(e => e.active && e.update(delta, p));
    this._projectiles = this._projectiles.filter(pr => {
      if (!pr.active) return false;
      pr.update(delta);
      return pr.active;
    });

    this._checkDoorEntry();
    this.physics.add.collider(p, this._currentRoom?.walls);
    this.hud.update();
  }

  _checkDoorEntry() {
    const p = this._player;
    const room = this._currentRoom;
    if (!room || this._transitioning) return;

    Object.entries(room.doors).forEach(([dir, door]) => {
      if (!door.open) return;
      const pb = p.getBounds();
      const db = door.rect.getBounds();
      if (Phaser.Geom.Intersects.RectangleToRectangle(pb, db)) {
        this._transitioning = true;
        this.cameras.main.fade(300, 0, 0, 0);
        this.time.delayedCall(320, () => {
          this._transitioning = false;
          const curRoom = DS.getCurrentRoom();

          if (curRoom.type === 'end') {
            this.scene.start('DungeonClear');
            return;
          }

          if (curRoom.type === 'treasure' && !curRoom._chestOpened) {
            curRoom._chestOpened = true;
            const drop = RewardSystem.generateDrop('chest_treasure');
            RewardSystem.collect(drop);
            const W = this._currentRoom.template.width, H = this._currentRoom.template.height;
            RewardPopup.show(this, W / 2, H / 2, `宝箱から 勾玉×${drop.magatama}！`);
          }

          DS.advanceRoom();
          this._loadRoom(DS.getCurrentIndex());
          this.hud.updateRoom(DS.getCurrentIndex(), DS.getTotalRooms());

          if (this._player) {
            const newRoom = DS.getCurrentRoom();
            const W = newRoom.template.width, H = newRoom.template.height;
            this._player.setPosition(W / 2, H - 100);
            this.physics.add.collider(this._player, this._currentRoom.walls);
            this.cameras.main.setBounds(0, 0, W, H);
          }
        });
      }
    });
  }

  shutdown() {
    Bus.off('ofuda:fireProjectile');
    Bus.off('ofuda:windBlast');
    Bus.off('ofuda:sealBlast');
    Bus.off('gimmick:seal');
    Bus.off('enemy:died');
    Bus.off('enemy:aoe');
    Bus.off('boss:slam');
    Bus.off('boss:howl');
    Bus.off('boss:phase2');
    Bus.off('player:dead');
    Bus.off('entity:died');
    Bus.off('player:swing');
    this.hud?.destroy();
  }
}
