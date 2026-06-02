import { PDS } from '../systems/PlayerDataSystem.js';
import { DS } from '../systems/DungeonSystem.js';
import { OS } from '../systems/OfudaSystem.js';
import { BlessingSystem } from '../systems/BlessingSystem.js';
import { DialogueBox } from '../utils/DialogueSystem.js';
import { DIALOGUES } from '../data/DialogueData.js';
import { bindBus } from '../utils/SceneBus.js';
import { ShopUI } from '../ui/ShopUI.js';

const W = 800, H = 560;
const WALL = 30;
const INTERACT_RANGE = 60;

export class TownScene extends Phaser.Scene {
  constructor() { super('Town'); }

  create() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x050e05);

    this._interactables = [];
    this._returning = this.scene.settings.data?.returning ?? false;
    this._cleared = PDS.hasFlag('dungeon1_cleared');

    this._buildGround();
    this._buildTownLayout();
    this._buildPlayer();
    this._buildNPCs();
    this._buildKohaku();
    this._buildUI();
    this._setupInput();
    this._setupDungeonGate();

    OS.reset();

    this.time.delayedCall(300, () => this._playEntrance());
  }

  _playEntrance() {
    if (this._cleared && this._returning) {
      this._dlg.show(DIALOGUES.kohaku_town_cleared);
      return;
    }
    this._dlg.show(this._returning ? DIALOGUES.kohaku_town_return : DIALOGUES.kohaku_town_first);
  }

  _buildGround() {
    this.add.rectangle(W / 2, H / 2, W - WALL * 2, H - WALL * 2, 0x0c1a0c).setDepth(0);
    const path = (x, y, w, h) => this.add.rectangle(x, y, w, h, 0x1a1a2e, 0.8).setDepth(1);
    path(W / 2, H / 2, 56, H - WALL * 2);
    path(W / 2, H * 0.45, W - WALL * 2, 56);
    this._addStones();
    this._addTrees();
  }

  _addStones() {
    const positions = [
      [180, 220], [620, 220], [180, 380], [620, 380],
      [350, 180], [450, 180], [350, 420], [450, 420],
    ];
    positions.forEach(([x, y]) => {
      this.add.ellipse(x, y, 18, 12, 0x446644, 0.5).setDepth(1);
    });
  }

  _addTrees() {
    [[100, 100],[700, 100],[80, 440],[720, 440]].forEach(([x, y]) => {
      this.add.circle(x, y, 22, 0x224422, 0.7).setDepth(2);
      this.add.circle(x, y - 8, 16, 0x336633, 0.8).setDepth(2);
      this.add.rectangle(x, y + 20, 6, 18, 0x442211).setDepth(2);
    });
  }

  _buildTownLayout() {
    // 商店街エリア (左上)
    this._addBuilding(160, 150, 200, 120, 0x1a1208, '商店街', '🏮 商店街');
    // 鍛冶屋 (右上)
    this._addBuilding(W - 160, 150, 190, 120, 0x100c18, '鍛冶屋', '⚒ 鍛冶屋');

    // 神社エリア (右下)
    const sx = W - 170, sy = H - 170;
    this.add.rectangle(sx, sy, 140, 170, 0x080f08).setDepth(2);
    this.add.rectangle(sx, sy - 45, 160, 18, 0x553300).setDepth(3);
    this.add.rectangle(sx, sy - 45, 158, 16, 0x774400).setDepth(3);
    this._drawTorii(sx, sy - 10, 0.9, true);
    this.add.text(sx, sy + 50, '星見神社', { fontSize: '13px', color: '#ffddaa', fontFamily: 'serif' }).setDepth(4).setOrigin(0.5);
    this._addLantern(sx - 50, sy + 20);
    this._addLantern(sx + 50, sy + 20);

    // 鳥居ゲート (上中央)
    this._drawTorii(W / 2, 90, 1.4, false);
    this.add.text(W / 2, 130, '朱鳥居の迷宮', { fontSize: '12px', color: '#ffaaaa', fontFamily: 'serif' })
      .setDepth(5).setOrigin(0.5);

    // 川 (左下)
    this.add.rectangle(80, H - 150, 80, 160, 0x0a2030, 0.8).setDepth(1);
    for (let i = 0; i < 5; i++) {
      this.add.rectangle(55 + i * 12, H - 140 + i * 8, 30, 6, 0x1a4060, 0.5).setDepth(2).setRotation(0.1);
    }
    this.add.text(78, H - 160, '星見川', { fontSize: '11px', color: '#88bbcc', fontFamily: 'serif' }).setDepth(3).setOrigin(0.5);
  }

  _addBuilding(x, y, w, h, bg, key, label) {
    this.add.rectangle(x, y, w, h, bg).setDepth(2);
    this.add.rectangle(x, y - h / 2, w + 12, 18, 0x553300).setDepth(3);
    this.add.rectangle(x, y - h / 2, w + 10, 16, 0x774400).setDepth(3);
    this.add.text(x, y - 20, label, { fontSize: '14px', color: '#ccbbaa', fontFamily: 'serif' }).setDepth(4).setOrigin(0.5);
  }

  _addLantern(x, y) {
    this.add.rectangle(x, y - 14, 4, 14, 0x666655).setDepth(3);
    this.add.rectangle(x, y, 16, 24, this._cleared ? 0xffcc33 : 0xddaa00).setDepth(3);
    const glow = this.add.circle(x, y, this._cleared ? 12 : 6, 0xffee66, this._cleared ? 0.5 : 0.15).setDepth(4);
    if (this._cleared) {
      // クリア後は灯籠に火が灯り、ゆらめく
      this.tweens.add({ targets: glow, alpha: 0.25, scale: 1.3, yoyo: true, repeat: -1, duration: 1200, ease: 'Sine.easeInOut' });
    }
  }

  _drawTorii(x, y, scale, small = false) {
    const s = scale;
    const col = 0xcc2200;
    this.add.rectangle(x - 26 * s, y, 9 * s, 72 * s, col).setDepth(3);
    this.add.rectangle(x + 26 * s, y, 9 * s, 72 * s, col).setDepth(3);
    this.add.rectangle(x, y - 30 * s, 65 * s, 10 * s, col).setDepth(3);
    this.add.rectangle(x, y - 22 * s, 56 * s, 7 * s, col).setDepth(3);
    if (!small) {
      this.add.circle(x - 24 * s, y + 36 * s, 3, 0xff4400, 0.5).setDepth(3);
      this.add.circle(x + 24 * s, y + 36 * s, 3, 0xff4400, 0.5).setDepth(3);
    }
  }

  _buildPlayer() {
    this.player = this.add.rectangle(W / 2, H / 2 + 60, 22, 28, 0x88ccff).setDepth(10);
    this.physics.add.existing(this.player);
    this.player.body.setSize(20, 24);
    this.player.speed = 140;

    // 壁
    const walls = this.physics.add.staticGroup();
    const addW = (x, y, w, h) => {
      const r = this.add.rectangle(x, y, w, h, 0x000000, 0).setDepth(0);
      this.physics.add.existing(r, true);
      walls.add(r);
    };
    addW(W / 2, WALL / 2, W, WALL);
    addW(W / 2, H - WALL / 2, W, WALL);
    addW(WALL / 2, H / 2, WALL, H);
    addW(W - WALL / 2, H / 2, WALL, H);
    this.physics.add.collider(this.player, walls);
  }

  _buildKohaku() {
    const x = W - 120, y = H - 120;
    this._kohaku = this.add.circle(x, y, 14, 0xffeedd).setDepth(9);
    const tail = this.add.triangle(x + 10, y + 10, 0, 0, 12, -5, 8, 10, 0xffddcc).setDepth(8);
    const ear1 = this.add.triangle(x - 8, y - 12, 0, 0, -6, -12, 6, -12, 0xffddcc).setDepth(9);
    const ear2 = this.add.triangle(x + 8, y - 12, 0, 0, -6, -12, 6, -12, 0xffddcc).setDepth(9);
    const eyeL = this.add.circle(x - 5, y - 2, 2.5, 0x442211).setDepth(10);
    const eyeR = this.add.circle(x + 5, y - 2, 2.5, 0x442211).setDepth(10);
    this._kohakuParts = [this._kohaku, tail, ear1, ear2, eyeL, eyeR];
    this.add.text(x, y - 30, 'こはく', { fontSize: '11px', color: '#ffddaa', fontFamily: 'serif', backgroundColor: '#00000066', padding: { x: 3, y: 1 } }).setDepth(11).setOrigin(0.5);
    this.tweens.add({ targets: this._kohakuParts, y: '-=4', yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });

    const kohakuLines = this._cleared ? DIALOGUES.kohaku_town_cleared : DIALOGUES.kohaku_town_first;
    this._interactables.push({
      x, y, label: 'こはく [E]',
      onInteract: () => this._dlg.show(kohakuLines),
    });
  }

  _buildNPCs() {
    const fudaya = this._cleared ? DIALOGUES.fudaya_after_clear : DIALOGUES.fudaya_1;
    this._addNpc(160, 110, 0xffbb66, '札屋・紙月', 'fudaya', fudaya);
    this._addNpc(W - 160, 110, 0xcc8844, '鍛冶屋・火月', 'kajiya', DIALOGUES.kajiya_1);
    // 神社（賽銭で体力・回避を強化）
    this._interactables.push({
      x: W - 170, y: H - 170, label: '星見神社 [E]',
      onInteract: () => this._openShop('shrine'),
    });
  }

  _addNpc(x, y, color, label, shopNpc, dialogue) {
    this.add.rectangle(x, y, 20, 30, color).setDepth(8);
    this.add.circle(x, y - 22, 12, color).setDepth(8);
    this.add.text(x, y - 44, label, { fontSize: '11px', color: '#ffffcc', fontFamily: 'serif', backgroundColor: '#000000aa', padding: { x: 3, y: 2 } }).setDepth(9).setOrigin(0.5);
    // 会話 → 終わったら強化メニューを開く
    this._interactables.push({
      x, y, label: `${label} [E]`,
      onInteract: () => this._dlg.show(dialogue, () => this._openShop(shopNpc)),
    });
  }

  _openShop(npc) {
    if (this._shop) return;
    this._shopOpen = true;
    this.player.body.setVelocity(0, 0);
    this._shop = new ShopUI(this, npc, () => {
      this._shop = null;
      this._shopOpen = false;
    });
  }

  _setupDungeonGate() {
    this._gate = { x: W / 2, y: 75, w: 70, h: 40 };
    this._gateHintText = this.add.text(W / 2, 115, '', {
      fontSize: '13px', color: '#ffcccc', backgroundColor: '#00000088',
      padding: { x: 6, y: 3 }, fontFamily: 'serif',
    }).setDepth(20).setOrigin(0.5).setVisible(false);
  }

  _buildUI() {
    this.add.text(W / 2, 20, '★ 星見町', { fontSize: '22px', color: '#ffddcc', fontFamily: 'serif', stroke: '#000', strokeThickness: 3 }).setDepth(20).setOrigin(0.5);

    this._magText = this.add.text(W - 20, 18, '', {
      fontSize: '15px', color: '#ffdd88', fontFamily: 'serif',
    }).setDepth(20).setOrigin(1, 0);
    this._refreshCurrency();
    bindBus(this, 'player:magatama', () => this._refreshCurrency());
    bindBus(this, 'player:kakera', () => this._refreshCurrency());

    const goal = this._cleared
      ? '目的: 神具を強化に使い、次の異界へ備えよう'
      : '目的: 神社の鳥居からまよい町へ';
    this._goalText = this.add.text(20, H - 28, goal, {
      fontSize: '12px', color: '#aaaacc', fontFamily: 'serif',
    }).setDepth(20);

    this.add.text(W / 2, H - 14, 'WASD 移動   E 話す/入る', {
      fontSize: '11px', color: '#666677',
    }).setDepth(20).setOrigin(0.5);

    this._dlg = new DialogueBox(this);
  }

  _refreshCurrency() {
    if (this._magText?.active) {
      this._magText.setText(`勾玉: ${PDS.getMagatama()}   欠片: ${PDS.getKakera()}`);
    }
  }

  _setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,E');
    this._eJustPressed = false;
  }

  update() {
    if (this._dlg?.isVisible() || this._shopOpen) {
      this.player.body.setVelocity(0, 0);
      return;
    }

    const p = this.player;
    const { cursors, keys } = this;
    let vx = 0, vy = 0;
    if (cursors.left.isDown  || keys.A.isDown) vx -= 1;
    if (cursors.right.isDown || keys.D.isDown) vx += 1;
    if (cursors.up.isDown    || keys.W.isDown) vy -= 1;
    if (cursors.down.isDown  || keys.S.isDown) vy += 1;
    const len = Math.sqrt(vx * vx + vy * vy) || 1;
    if (vx || vy) p.body.setVelocity(vx / len * p.speed, vy / len * p.speed);
    else p.body.setVelocity(0, 0);

    const px = p.x, py = p.y;

    const inGate = Math.abs(px - this._gate.x) < this._gate.w / 2 && Math.abs(py - this._gate.y) < this._gate.h + 20;
    this._gateHintText.setVisible(inGate);
    if (inGate) this._gateHintText.setText('[E] まよい町へ入る');

    if (Phaser.Input.Keyboard.JustDown(keys.E)) {
      if (inGate) { this._enterDungeon(); return; }
      this._tryInteract(px, py);
    }
  }

  _tryInteract(px, py) {
    for (const obj of this._interactables) {
      const dx = px - obj.x, dy = py - obj.y;
      if (Math.sqrt(dx * dx + dy * dy) < INTERACT_RANGE) {
        obj.onInteract();
        return;
      }
    }
  }

  _enterDungeon() {
    this._dlg.show(DIALOGUES.kohaku_before_dungeon, () => {
      DS.generate();
      OS.reset();
      BlessingSystem.reset();   // ご利益を初期化
      PDS.startRun();           // HP全回復・ランボーナス初期化
      this.cameras.main.fade(500, 0, 0, 0);
      this.time.delayedCall(520, () => this.scene.start('Dungeon'));
    });
  }
}
