import { Player } from '../entities/Player.js';
import { Room } from '../entities/Room.js';
import { Projectile } from '../entities/Projectile.js';
import { HUD } from '../ui/HUD.js';
import { RewardPopup } from '../ui/RewardPopup.js';
import { DialogueBox } from '../utils/DialogueSystem.js';
import { DIALOGUES } from '../data/DialogueData.js';
import { DS } from '../systems/DungeonSystem.js';
import { OS } from '../systems/OfudaSystem.js';
import { PDS } from '../systems/PlayerDataSystem.js';
import { RewardSystem } from '../systems/RewardSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { Bus } from '../utils/EventBus.js';

const ROOM_HINTS = {
  start:    'kohaku_dungeon_start',
  battle:   'kohaku_dungeon_battle',
  treasure: 'kohaku_dungeon_treasure',
  puzzle:   'kohaku_dungeon_puzzle',
  heal:     'kohaku_dungeon_heal',
  boss:     'kohaku_dungeon_boss',
};

export class DungeonScene extends Phaser.Scene {
  constructor() { super('Dungeon'); }

  create() {
    this._projectiles = [];
    this._currentRoom = null;
    this._transitioning = false;
    this._enemies = [];
    this._hintShownRooms = new Set();
    this._bossDefeated = false;

    this._loadRoom(DS.getCurrentIndex());
    this._setupPlayer();
    this._setupInput();
    this._setupBusListeners();

    this.hud = new HUD(this);
    this.hud.updateRoom(DS.getCurrentIndex(), DS.getTotalRooms());
    this._dlg = new DialogueBox(this);

    this.cameras.main.setBackgroundColor(0x060410);
    this.cameras.main.fadeIn(400);

    this.time.delayedCall(600, () => this._showRoomHint(DS.getCurrentRoom().type));
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

    if (roomDef.type === 'heal') this._doHeal(W, H);
    if (roomDef.type === 'puzzle') this._showPuzzleNote(roomDef.template.puzzleNote, W, H);
  }

  _showRoomHint(type) {
    if (this._hintShownRooms.has(type)) return;
    const key = ROOM_HINTS[type];
    if (!key || !DIALOGUES[key]) return;
    this._hintShownRooms.add(type);
    this._dlg.show(DIALOGUES[key]);
  }

  _doHeal(W, H) {
    const healed = Math.floor(PDS.getMaxHp() * 0.4);
    PDS.heal(healed);
    RewardPopup.show(this, W / 2, H / 2 - 30, `こはく「お、分社だ！」`);
    this.time.delayedCall(600, () => RewardPopup.show(this, W / 2, H / 2, `HP +${healed} 回復`));
  }

  _showPuzzleNote(note, W, H) {
    const t = this.add.text(W / 2, 78, note ?? '封印を解け', {
      fontSize: '15px', color: '#ffddff', fontFamily: 'serif',
      backgroundColor: '#00000099', padding: { x: 8, y: 4 },
    }).setDepth(50).setOrigin(0.5);
    this.time.delayedCall(4000, () => t.destroy());
  }

  _setupPlayer() {
    const roomDef = DS.getCurrentRoom();
    const W = roomDef.template.width, H = roomDef.template.height;
    this._player = new Player(this, W / 2, H * 0.78);

    this.physics.add.collider(this._player, this._currentRoom.walls);

    this._player._hitbox = this.add.rectangle(0, 0, 1, 1, 0xffff00, 0).setDepth(11);
    this.physics.add.existing(this._player._hitbox, false);

    this.cameras.main.setBounds(0, 0, W, H);
    this.cameras.main.startFollow(this._player, true, 0.1, 0.1);
  }

  _setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,E,Z,X,C,V,SPACE,SHIFT');

    this.input.keyboard.on('keydown-Z', () => { if (!this._dlg.isVisible()) this._useOfuda('fire'); });
    this.input.keyboard.on('keydown-X', () => { if (!this._dlg.isVisible()) this._useOfuda('wind'); });
    this.input.keyboard.on('keydown-C', () => { if (!this._dlg.isVisible()) this._useOfuda('seal'); });
  }

  _useOfuda(id) {
    OS.use(id, this._player, this, this._enemies.filter(e => e.active));
  }

  _setupBusListeners() {
    Bus.on('ofuda:fireProjectile', ({ x, y, vx, vy, data, owner }) =>
      this._spawnProjectile(x, y, vx, vy, data, owner));

    Bus.on('ofuda:windBlast',  ({ x, y, radius }) => this._vfxCircle(x, y, radius, 0x88ddff, 320));
    Bus.on('ofuda:sealBlast',  ({ x, y, radius }) => this._vfxCircle(x, y, radius, 0xaa88ff, 420));

    Bus.on('gimmick:seal', () => this._currentRoom?.sealBarrier());

    Bus.on('entity:died', (e) => {
      if (e === this._player) { this._onPlayerDead(); return; }
      this._onEnemyDied(e);
    });

    Bus.on('enemy:aoe',  ({ x, y, radius, damage }) => this._handleAoe(x, y, radius, damage, 0xddaa00));
    Bus.on('boss:slam',  ({ x, y, radius, damage }) => {
      this._handleAoe(x, y, radius, damage, 0xff4400);
      this.cameras.main.shake(280, 0.01);
    });
    Bus.on('boss:howl',  ({ x, y, radius, stunDuration }) => this._handleHowl(x, y, radius, stunDuration));
    Bus.on('boss:phase2', () => this._showPhase2Notice());
    Bus.on('player:swing', (info) => this._resolveSwing(info));
    Bus.on('player:dead', () => this._onPlayerDead());
  }

  _onEnemyDied(e) {
    this._enemies = this._enemies.filter(en => en !== e);

    const labelMap = { '小鬼': 'enemy_kooni', '狐火': 'enemy_kitsunebi', '動く灯籠': 'enemy_lantern' };
    const key = labelMap[e.enemyData?.label] ?? 'enemy_kooni';
    const drop = RewardSystem.generateDrop(key);
    if (drop?.magatama > 0) {
      RewardPopup.show(this, e.x, e.y - 20, `勾玉 +${drop.magatama}`);
      RewardSystem.collect({ magatama: drop.magatama });
    }
    RewardPopup.show(this, e.x, e.y, `${e.enemyData?.label ?? 'もののけ'}を鎮めた`);

    this._checkRoomClear();
  }

  _spawnProjectile(x, y, vx, vy, data, owner) {
    const proj = new Projectile(this, x, y, vx, vy, data, owner);
    this._projectiles.push(proj);
    const speed = Math.sqrt(vx * vx + vy * vy) || 1;

    if (owner === 'player') {
      this._enemies.forEach(e => {
        if (!e.active) return;
        this.physics.add.overlap(proj, e, () => {
          if (!proj.active) return;
          CombatSystem.takeDamage(e, data.damage, this._player);
          CombatSystem.applyKnockback(e, vx / speed, vy / speed, 200);
          this._vfxCircle(proj.x, proj.y, 22, data.color ?? 0xff4400, 200);
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

  _handleAoe(x, y, radius, damage, color) {
    this._vfxCircle(x, y, radius, color, 350);
    const p = this._player;
    if (!p) return;
    const dx = p.x - x, dy = p.y - y;
    if (Math.sqrt(dx * dx + dy * dy) < radius) p.receiveDamage(damage);
  }

  _handleHowl(x, y, radius, stunDuration) {
    this._vfxCircle(x, y, radius, 0xffffaa, 500);
    this.cameras.main.shake(200, 0.006);
    const p = this._player;
    if (!p) return;
    const dx = p.x - x, dy = p.y - y;
    if (Math.sqrt(dx * dx + dy * dy) < radius) {
      CombatSystem.applyStun(p, stunDuration);
      RewardPopup.show(this, p.x, p.y - 28, '⚡ 咆哮！ スタン！');
    }
  }

  _showPhase2Notice() {
    this.cameras.main.flash(400, 255, 80, 80);
    const W = this.scale.width, H = this.scale.height;
    const t = this.add.text(W / 2, H / 2 - 60, '荒れ狛犬　覚醒！', {
      fontSize: '30px', color: '#ff4444', fontFamily: 'serif',
      stroke: '#000', strokeThickness: 5,
    }).setScrollFactor(0).setDepth(300).setOrigin(0.5);
    const s = this.add.text(W / 2, H / 2 - 20, 'こはく「黒いモヤが濃くなってる……！」', {
      fontSize: '14px', color: '#ffbbbb', fontFamily: 'serif',
    }).setScrollFactor(0).setDepth(300).setOrigin(0.5);
    this.time.delayedCall(2200, () => { t.destroy(); s.destroy(); });
  }

  _checkRoomClear() {
    const alive = this._enemies.filter(e => e.active && e.hp > 0);
    if (alive.length > 0) return;

    const room = DS.getCurrentRoom();
    if (room.type === 'boss' && !this._bossDefeated) {
      this._onBossDefeated(); return;
    }
    if (room.doorsLocked) {
      DS.clearRoom();
      this._currentRoom.unlockDoors();
      RewardPopup.show(this, this._currentRoom.template.width / 2, 60, '扉が開いた');
    }
    if (room.type === 'puzzle') {
      this._currentRoom.checkClear();
    }
  }

  _onBossDefeated() {
    if (this._bossDefeated) return;
    this._bossDefeated = true;
    this.cameras.main.flash(500, 255, 220, 100);

    this.time.delayedCall(600, () => {
      this._dlg.show(DIALOGUES.boss_defeated, () => {
        const drop = RewardSystem.generateDrop('chest_boss');
        RewardSystem.collect(drop);
        DS.clearRoom();
        this._currentRoom.unlockDoors();

        const W = this._currentRoom.template.width;
        RewardPopup.show(this, W / 2, 80, '火の勾玉を受け取った！');
        this.time.delayedCall(1400, () => {
          DS.advanceRoom();
          this._transitionToRoom(DS.getCurrentIndex());
        });
      });
    });
  }

  _onPlayerDead() {
    if (this._transitioning) return;
    this._transitioning = true;
    const W = this.scale.width, H = this.scale.height;
    const t = this.add.text(W / 2, H / 2, 'きみは倒れてしまった……', {
      fontSize: '22px', color: '#cc8888', fontFamily: 'serif',
      stroke: '#000', strokeThickness: 4,
    }).setScrollFactor(0).setDepth(400).setOrigin(0.5);
    const s = this.add.text(W / 2, H / 2 + 40, 'こはく「また一緒に行こう。今度は絶対大丈夫だから」', {
      fontSize: '13px', color: '#ffbbbb', fontFamily: 'serif',
    }).setScrollFactor(0).setDepth(400).setOrigin(0.5);

    this.cameras.main.fade(1200, 0, 0, 0);
    this.time.delayedCall(1300, () => this.scene.start('Town', { returning: true }));
  }

  _vfxCircle(x, y, radius, color, duration) {
    const c = this.add.circle(x, y, radius, color, 0.30).setDepth(50);
    this.tweens.add({ targets: c, alpha: 0, scale: 1.3, duration, onComplete: () => c.destroy() });
  }

  _vfxSlash(x, y, angle) {
    const line = this.add.rectangle(x, y, 52, 6, 0xffffff, 0.85).setDepth(50).setRotation(angle);
    this.tweens.add({ targets: line, alpha: 0, scaleX: 0.1, duration: 180, onComplete: () => line.destroy() });
  }

  update(time, delta) {
    if (this._transitioning || this._dlg?.isVisible()) return;
    const p = this._player;
    if (!p?.active) return;

    p.update(this.cursors, this.keys, delta);

    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) p.tryAttack();
    if (Phaser.Input.Keyboard.JustDown(this.keys.SHIFT))  p.tryDodge();
    this.keys.V.isDown ? (p.guarding = true) : (p.guarding = false);

    this._enemies.forEach(e => e.active && e.update(delta, p));
    this._projectiles = this._projectiles.filter(pr => {
      if (!pr.active) return false;
      pr.update(delta);
      return pr.active;
    });

    this.physics.add.collider(p, this._currentRoom?.walls);
    this._checkDoorEntry();
    this.hud.update();
  }

  _checkDoorEntry() {
    const p = this._player;
    const room = this._currentRoom;
    if (!room || this._transitioning || this._dlg?.isVisible()) return;

    Object.entries(room.doors).forEach(([dir, door]) => {
      if (!door.open) return;
      if (Phaser.Geom.Intersects.RectangleToRectangle(p.getBounds(), door.rect.getBounds())) {
        const cur = DS.getCurrentRoom();
        if (cur.type === 'end') {
          this._transitioning = true;
          this.cameras.main.fade(400, 0, 0, 0);
          this.time.delayedCall(450, () => this.scene.start('DungeonClear'));
          return;
        }
        if (cur.type === 'treasure' && !cur._chestOpened) {
          cur._chestOpened = true;
          const drop = RewardSystem.generateDrop('chest_treasure');
          RewardSystem.collect(drop);
          const W = room.template.width;
          RewardPopup.show(this, W / 2, room.template.height / 2, `宝箱　勾玉×${drop.magatama}！`);
          if (drop.items?.length) RewardPopup.show(this, W / 2, room.template.height / 2 + 36, drop.items[0].label + ' を入手！');
        }
        this._transitioning = true;
        this.cameras.main.fade(300, 0, 0, 0);
        this.time.delayedCall(320, () => this._transitionToRoom(DS.getCurrentIndex() + 1));
      }
    });
  }

  _transitionToRoom(nextIndex) {
    if (nextIndex >= DS.getTotalRooms()) { this.scene.start('DungeonClear'); return; }
    DS.advanceRoom();
    this._loadRoom(DS.getCurrentIndex());
    this.hud.updateRoom(DS.getCurrentIndex(), DS.getTotalRooms());

    const newRoom = DS.getCurrentRoom();
    const W = newRoom.template.width, H = newRoom.template.height;
    if (this._player) {
      this._player.setPosition(W / 2, H - 110);
      this.physics.add.collider(this._player, this._currentRoom.walls);
      this.cameras.main.setBounds(0, 0, W, H);
    }
    this._transitioning = false;
    this.cameras.main.fadeIn(300);
    this.time.delayedCall(400, () => this._showRoomHint(newRoom.type));
  }

  shutdown() {
    ['ofuda:fireProjectile','ofuda:windBlast','ofuda:sealBlast','gimmick:seal',
     'entity:died','enemy:aoe','boss:slam','boss:howl','boss:phase2',
     'player:swing','player:dead'].forEach(e => Bus.off(e));
    this.hud?.destroy();
    this._dlg?.destroy();
  }
}
