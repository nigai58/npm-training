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
import { Run } from '../systems/RunState.js';
import { BlessingSystem } from '../systems/BlessingSystem.js';
import { BlessingChoiceUI } from '../ui/BlessingChoiceUI.js';
import { bindBus } from '../utils/SceneBus.js';

// 汎用ヒント（start/boss はダンジョン毎に DS.getHintKey で上書き）
const GENERIC_HINTS = {
  battle:   'kohaku_dungeon_battle',
  treasure: 'kohaku_dungeon_treasure',
  puzzle:   'kohaku_dungeon_puzzle',
  heal:     'kohaku_dungeon_heal',
};

const ENEMY_REWARD_KEY = {
  '小鬼': 'enemy_kooni',
  '狐火': 'enemy_kitsunebi',
  '動く灯籠': 'enemy_lantern',
  '唐傘お化け': 'enemy_kooni',
  '雨降り小僧': 'enemy_kitsunebi',
  '水玉坊主': 'enemy_lantern',
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
    this._wallCollider = null;

    this._dlg = new DialogueBox(this);
    this._setupPlayer();
    this._loadRoom(DS.getCurrentIndex(), true);
    this._setupInput();
    this._setupBusListeners();

    this.hud = new HUD(this);
    this._updateHudRoom();

    this.cameras.main.setBackgroundColor(0x060410);
    this.cameras.main.fadeIn(400);

    // shutdown メソッドは Phaser が自動で呼ばないため明示的に配線する
    this.events.once('shutdown', () => this._cleanup());

    this.time.delayedCall(600, () => this._showRoomHint(DS.getCurrentRoom().type));
  }

  // ─── 部屋管理 ───────────────────────────────
  _loadRoom(index, isFirst = false) {
    if (this._wallCollider) { this._wallCollider.destroy(); this._wallCollider = null; }
    this._currentRoom?.destroy();
    this._projectiles.forEach(p => p.active && p.destroy());
    this._projectiles = [];

    const roomDef = DS.rooms[index];
    const room = new Room(this, roomDef.template, index, DS.getTotalRooms());
    room.build();
    this._currentRoom = room;
    this._enemies = room.enemies;

    const W = roomDef.template.width, H = roomDef.template.height;

    // プレイヤー配置：最初の部屋は中央下、以降は北扉から入ってくるので下端
    this._player.setPosition(W / 2, isFirst ? H * 0.78 : H - 110);
    this._player.body.setVelocity(0, 0);
    this._wallCollider = this.physics.add.collider(this._player, room.walls);

    this.cameras.main.setBounds(0, 0, W, H);

    if (roomDef.type === 'heal') this._doHeal(W, H);
    if (roomDef.type === 'puzzle') this._showPuzzleNote(roomDef.template.puzzleNote, W, H);
  }

  _setupPlayer() {
    const roomDef = DS.getCurrentRoom();
    const W = roomDef.template.width, H = roomDef.template.height;
    this._player = new Player(this, W / 2, H * 0.78);
    this.cameras.main.startFollow(this._player, true, 0.1, 0.1);
  }

  _showRoomHint(type) {
    if (this._hintShownRooms.has(type)) return;
    const key = DS.getHintKey(type) ?? GENERIC_HINTS[type];
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
    this.time.delayedCall(4000, () => t.active && t.destroy());
  }

  // ─── 入力 ─────────────────────────────────
  _setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,E,Z,X,C,V,SPACE,SHIFT');

    // scene の keyboard プラグインに紐づくため shutdown で自動解除される
    this.input.keyboard.on('keydown-Z', () => { if (!this._dlg.isVisible()) this._useOfuda('fire'); });
    this.input.keyboard.on('keydown-X', () => { if (!this._dlg.isVisible()) this._useOfuda('wind'); });
    this.input.keyboard.on('keydown-C', () => { if (!this._dlg.isVisible()) this._useOfuda('seal'); });
  }

  _useOfuda(id) {
    if (this._transitioning || !this._player?.active) return;
    OS.use(id, this._player, this, this._enemies.filter(e => e.active));
  }

  // ─── Bus リスナー（shutdown で自動解除）──────────
  _setupBusListeners() {
    bindBus(this, 'ofuda:fireProjectile', ({ x, y, vx, vy, data, owner }) =>
      this._spawnProjectile(x, y, vx, vy, data, owner));
    bindBus(this, 'ofuda:windBlast', ({ x, y, radius }) => this._vfxCircle(x, y, radius, 0x88ddff, 320));
    bindBus(this, 'ofuda:sealBlast', ({ x, y, radius }) => this._vfxCircle(x, y, radius, 0xaa88ff, 420));
    bindBus(this, 'gimmick:seal', () => this._currentRoom?.sealBarrier());

    bindBus(this, 'entity:died', (e) => {
      if (e === this._player) { this._onPlayerDead(); return; }
      this._onEnemyDied(e);
    });

    bindBus(this, 'enemy:aoe', ({ x, y, radius, damage }) => this._handleAoe(x, y, radius, damage, 0xddaa00));
    bindBus(this, 'boss:slam', ({ x, y, radius, damage }) => {
      this._handleAoe(x, y, radius, damage, 0xff4400);
      this.cameras.main.shake(280, 0.01);
    });
    bindBus(this, 'boss:howl', ({ x, y, radius, stunDuration }) => this._handleHowl(x, y, radius, stunDuration));
    bindBus(this, 'boss:phase2', (boss) => this._showPhase2Notice(boss));
    bindBus(this, 'player:swing', (info) => this._resolveSwing(info));
    bindBus(this, 'room:cleared', (room) => this._onRoomCleared(room));
  }

  _onRoomCleared(room) {
    if (room !== this._currentRoom) return;
    const def = DS.getCurrentRoom();
    if (def.doorsLocked) {
      DS.clearRoom();
      RewardPopup.show(this, room.template.width / 2, 60, '扉が開いた');
    }
    // 戦闘部屋クリアでご利益を1つ選ばせる
    if (def.type === 'battle') {
      this.time.delayedCall(400, () => this._offerBlessing());
    }
  }

  _offerBlessing() {
    if (this._transitioning) return;
    this._choosing = true;
    this._player?.body.setVelocity(0, 0);
    const options = BlessingSystem.offer(3);
    this._blessingUI = new BlessingChoiceUI(this, options, (b) => {
      BlessingSystem.choose(b);
      this._choosing = false;
      this._blessingUI = null;
      RewardPopup.show(this, this._player.x, this._player.y - 30, `ご利益「${b.label}」`);
    });
  }

  _onEnemyDied(e) {
    this._enemies = this._enemies.filter(en => en !== e);

    const key = ENEMY_REWARD_KEY[e.enemyData?.label];
    if (key) {
      const drop = RewardSystem.generateDrop(key);
      const gained = Run.applyMagatama(drop?.magatama ?? 0);   // 狐の加護
      if (gained > 0) {
        RewardPopup.show(this, e.x, e.y - 20, `勾玉 +${gained}`);
        RewardSystem.collect({ magatama: gained });
      }
    }
    if (Run.lifestealOnKill > 0) PDS.heal(Run.lifestealOnKill);  // 生命の勾玉
    RewardPopup.show(this, e.x, e.y, `${e.enemyData?.label ?? 'もののけ'}を鎮めた`);
    // 黒いモヤが晴れる演出 → スプライト破棄
    this._vfxCircle(e.x, e.y, (e.enemyData?.size ?? 28) * 0.8, 0xddccff, 300);
    e.die();

    this._checkRoomClear();
  }

  // ─── 弾（手動当たり判定。コライダー累積を避ける）─────
  _spawnProjectile(x, y, vx, vy, data, owner) {
    const proj = new Projectile(this, x, y, vx, vy, data, owner);
    this._projectiles.push(proj);
  }

  _updateProjectiles(delta) {
    this._projectiles = this._projectiles.filter(pr => {
      if (!pr.active) return false;
      pr.update(delta);
      if (!pr.active) return false;

      if (pr.owner === 'player') {
        for (const e of this._enemies) {
          if (!e.active || e.hp <= 0) continue;
          const hitR = (e.enemyData?.size ?? 28) * 0.5 + 8;
          if (this._dist(pr, e) < hitR) {
            CombatSystem.takeDamage(e, pr.projData.damage, this._player);
            const v = pr.body.velocity, sp = v.length() || 1;
            CombatSystem.applyKnockback(e, v.x / sp, v.y / sp, 200);
            this._vfxCircle(pr.x, pr.y, 22, pr.projData.color ?? 0xff4400, 200);
            pr.destroy();
            return false;
          }
        }
      } else {
        const p = this._player;
        if (p?.active && !p.invincible && this._dist(pr, p) < 20) {
          p.receiveDamage(pr.projData.damage);
          pr.destroy();
          return false;
        }
      }
      return true;
    });
  }

  _dist(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
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
    if (p?.active && !p.invincible && this._dist({ x, y }, p) < radius) p.receiveDamage(damage);
  }

  _handleHowl(x, y, radius, stunDuration) {
    this._vfxCircle(x, y, radius, 0xffffaa, 500);
    this.cameras.main.shake(200, 0.006);
    const p = this._player;
    if (p?.active && this._dist({ x, y }, p) < radius) {
      CombatSystem.applyStun(p, stunDuration);
      RewardPopup.show(this, p.x, p.y - 28, '⚡ 咆哮！ スタン！');
    }
  }

  _showPhase2Notice(boss) {
    this.cameras.main.flash(400, 255, 80, 80);
    const W = this.scale.width, H = this.scale.height;
    const name = boss?.enemyData?.label ?? 'ボス';
    const t = this.add.text(W / 2, H / 2 - 60, `${name}　覚醒！`, {
      fontSize: '28px', color: '#ff4444', fontFamily: 'serif',
      stroke: '#000', strokeThickness: 5,
    }).setScrollFactor(0).setDepth(300).setOrigin(0.5);
    const s = this.add.text(W / 2, H / 2 - 20, 'こはく「黒いモヤが濃くなってる……！」', {
      fontSize: '14px', color: '#ffbbbb', fontFamily: 'serif',
    }).setScrollFactor(0).setDepth(300).setOrigin(0.5);
    this.time.delayedCall(2200, () => { t.active && t.destroy(); s.active && s.destroy(); });
  }

  // ─── 部屋クリア判定 ───────────────────────────
  _checkRoomClear() {
    const alive = this._enemies.filter(e => e.active && e.hp > 0);
    if (alive.length > 0) return;

    const room = DS.getCurrentRoom();
    if (room.type === 'boss') {
      if (!this._bossDefeated) this._onBossDefeated();
      return;
    }
    // battle / puzzle 共通: Room.checkClear() が全条件を満たせば
    // 'room:cleared' を発火し、_onRoomCleared が扉と DS を更新する。
    // puzzle 部屋は結界(封印札)が解除されるまで cleared にならない。
    this._currentRoom.checkClear();
  }

  _onBossDefeated() {
    if (this._bossDefeated) return;
    this._bossDefeated = true;
    this.cameras.main.flash(500, 255, 220, 100);

    // 輪廻のボスは神具を落とさず、勾玉＋欠片を残して階層が続く
    if (DS.isEndless()) {
      const base = RewardSystem.generateDrop('chest_boss');
      const reward = { magatama: Run.applyMagatama(base.magatama), items: [{ id: 'kakera', label: '神具の欠片' }], flags: [] };
      RewardSystem.collect(reward);
      DS.clearRoom();
      this._currentRoom.unlockDoors();
      const W = this._currentRoom.template.width;
      RewardPopup.show(this, W / 2, 80, `守護獣を鎮めた！ 勾玉+${reward.magatama}・欠片+1`);
      return;
    }

    const dialogueKey = DS.getBossDialogueKey() ?? 'boss_defeated';
    const relic = DS.getRelic();
    const mamori = DS.getMamori();
    const clearFlag = DS.getClearFlag();

    this.time.delayedCall(600, () => {
      this._dlg.show(DIALOGUES[dialogueKey] ?? DIALOGUES.boss_defeated, () => {
        const base = RewardSystem.generateDrop('chest_boss');
        const reward = {
          magatama: Run.applyMagatama(base.magatama),   // 狐の加護
          items: [relic, mamori].filter(Boolean),
          flags: clearFlag ? [clearFlag] : [],
        };
        RewardSystem.collect(reward);
        DS.clearRoom();
        this._currentRoom.unlockDoors();

        const W = this._currentRoom.template.width;
        RewardPopup.show(this, W / 2, 80, `${relic?.label ?? '神具'} を受け取った！`);
        this.time.delayedCall(1400, () => this._transitionToNextRoom());
      });
    });
  }

  _onPlayerDead() {
    if (this._transitioning) return;
    this._transitioning = true;
    if (DS.isEndless()) PDS.recordDepth(DS.getDepth());
    const W = this.scale.width, H = this.scale.height;
    this.add.text(W / 2, H / 2, 'きみは倒れてしまった……', {
      fontSize: '22px', color: '#cc8888', fontFamily: 'serif',
      stroke: '#000', strokeThickness: 4,
    }).setScrollFactor(0).setDepth(400).setOrigin(0.5);
    this.add.text(W / 2, H / 2 + 40, 'こはく「また一緒に行こう。今度は絶対大丈夫だから」', {
      fontSize: '13px', color: '#ffbbbb', fontFamily: 'serif',
    }).setScrollFactor(0).setDepth(400).setOrigin(0.5);

    this.cameras.main.fade(1200, 0, 0, 0);
    this.time.delayedCall(1300, () => this.scene.start('Town', { returning: true }));
  }

  // ─── VFX ─────────────────────────────────
  _vfxCircle(x, y, radius, color, duration) {
    const c = this.add.circle(x, y, radius, color, 0.30).setDepth(50);
    this.tweens.add({ targets: c, alpha: 0, scale: 1.3, duration, onComplete: () => c.destroy() });
  }

  _vfxSlash(x, y, angle) {
    const line = this.add.rectangle(x, y, 52, 6, 0xffffff, 0.85).setDepth(50).setRotation(angle);
    this.tweens.add({ targets: line, alpha: 0, scaleX: 0.1, duration: 180, onComplete: () => line.destroy() });
  }

  // ─── メインループ ─────────────────────────────
  update(time, delta) {
    if (this._transitioning || this._choosing || this._dlg?.isVisible()) return;
    const p = this._player;
    if (!p?.active) return;

    p.update(this.cursors, this.keys, delta);

    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) p.tryAttack();
    if (Phaser.Input.Keyboard.JustDown(this.keys.SHIFT)) p.tryDodge();
    p.guarding = this.keys.V.isDown;

    this._enemies.forEach(e => e.active && e.update(delta, p));
    this._updateProjectiles(delta);

    this._checkDoorEntry();
    this.hud.update();
  }

  _checkDoorEntry() {
    const p = this._player;
    const room = this._currentRoom;
    if (!room || this._transitioning || this._dlg?.isVisible()) return;

    for (const door of Object.values(room.doors)) {
      if (!door.open) continue;
      if (!Phaser.Geom.Intersects.RectangleToRectangle(p.getBounds(), door.rect.getBounds())) continue;

      const cur = DS.getCurrentRoom();
      if (cur.type === 'end') {
        if (DS.isEndless()) { this._onFloorEnd(); return; }
        this._beginTransition(400, () => this.scene.start('DungeonClear'));
        return;
      }
      if (cur.type === 'treasure' && !cur._chestOpened) {
        cur._chestOpened = true;
        const drop = RewardSystem.generateDrop('chest_treasure');
        drop.magatama = Run.applyMagatama(drop.magatama);   // 狐の加護
        RewardSystem.collect(drop);
        const W = room.template.width, H = room.template.height;
        RewardPopup.show(this, W / 2, H / 2, `宝箱　勾玉×${drop.magatama}！`);
        if (drop.items?.length) RewardPopup.show(this, W / 2, H / 2 + 36, `${drop.items[0].label} を入手！`);
      }
      this._beginTransition(300, () => this._transitionToNextRoom());
      return;
    }
  }

  _beginTransition(fadeMs, cb) {
    this._transitioning = true;
    this.cameras.main.fade(fadeMs, 0, 0, 0);
    this.time.delayedCall(fadeMs + 20, cb);
  }

  _transitionToNextRoom() {
    const advanced = DS.advanceRoom();
    if (!advanced) {
      if (DS.isEndless()) { this._onFloorEnd(); return; }
      this.scene.start('DungeonClear'); return;
    }

    const newRoom = DS.getCurrentRoom();
    this._loadRoom(DS.getCurrentIndex());
    this._updateHudRoom();

    this._transitioning = false;
    this.cameras.main.fadeIn(300);
    this.time.delayedCall(400, () => this._showRoomHint(newRoom.type));
  }

  _updateHudRoom() {
    const floor = DS.isEndless() ? `輪廻 第${DS.getDepth()}層` : null;
    this.hud.updateRoom(DS.getCurrentIndex(), DS.getTotalRooms(), floor);
  }

  // ─── 輪廻：階層クリア時の選択 ───────────────────
  _onFloorEnd() {
    this._choosing = true;
    this._player?.body.setVelocity(0, 0);
    PDS.recordDepth(DS.getDepth());

    const W = this.scale.width, H = this.scale.height;
    const objs = [];
    objs.push(this.add.rectangle(W / 2, H / 2, W, H, 0x05030f, 0.7).setScrollFactor(0).setDepth(620));
    objs.push(this.add.text(W / 2, H / 2 - 70, `第 ${DS.getDepth()} 層 突破！`, {
      fontSize: '28px', color: '#ddbbff', fontFamily: 'serif', stroke: '#000', strokeThickness: 4,
    }).setScrollFactor(0).setDepth(621).setOrigin(0.5));
    objs.push(this.add.text(W / 2, H / 2 - 28, `最深記録: 第${PDS.getMaxDepth()}層`, {
      fontSize: '13px', color: '#9988bb', fontFamily: 'serif',
    }).setScrollFactor(0).setDepth(621).setOrigin(0.5));
    objs.push(this.add.text(W / 2, H / 2 + 20, '[Space] さらに深く潜る', {
      fontSize: '16px', color: '#aaffcc', fontFamily: 'serif',
    }).setScrollFactor(0).setDepth(621).setOrigin(0.5));
    objs.push(this.add.text(W / 2, H / 2 + 52, '[E] 勾玉を持って町へ帰る', {
      fontSize: '16px', color: '#ffddaa', fontFamily: 'serif',
    }).setScrollFactor(0).setDepth(621).setOrigin(0.5));

    const cleanup = () => {
      objs.forEach(o => o?.destroy());
      this.input.keyboard.off('keydown-SPACE', onNext);
      this.input.keyboard.off('keydown-E', onLeave);
    };
    const onNext = () => {
      cleanup();
      this._bossDefeated = false;   // 次のボス階層に備える
      DS.nextFloor();
      PDS.recordDepth(DS.getDepth());
      this._loadRoom(0);
      this._updateHudRoom();
      this._choosing = false;
      this.cameras.main.flash(300, 120, 80, 200);
    };
    const onLeave = () => {
      cleanup();
      this._choosing = false;
      this._beginTransition(500, () => this.scene.start('Town', { returning: true }));
    };
    this.time.delayedCall(150, () => {
      this.input.keyboard.on('keydown-SPACE', onNext);
      this.input.keyboard.on('keydown-E', onLeave);
    });
  }

  _cleanup() {
    this.hud?.destroy();
    this._dlg?.destroy();
    this._blessingUI?._objects?.forEach(o => o?.destroy());
    if (this._wallCollider) { this._wallCollider.destroy(); this._wallCollider = null; }
    this._currentRoom?.destroy();
    this._projectiles?.forEach(p => p.active && p.destroy());
  }
}
