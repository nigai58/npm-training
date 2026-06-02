import { PDS } from '../systems/PlayerDataSystem.js';
import { DS } from '../systems/DungeonSystem.js';
import { OS } from '../systems/OfudaSystem.js';
import { Bus } from '../utils/EventBus.js';

const W = 800, H = 560;

export class TownScene extends Phaser.Scene {
  constructor() { super('Town'); }

  create() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a1a0a);

    this._buildTownLayout();
    this._buildPlayer();
    this._buildNPCs();
    this._buildUI();
    this._setupInput();
    this._setupDungeonGate();

    PDS.reset();
    OS.reset();
  }

  _buildTownLayout() {
    this.add.rectangle(W / 2, H / 2, W - 60, H - 60, 0x101a10).setDepth(0);

    const path = (x, y, w, h) => this.add.rectangle(x, y, w, h, 0x1a1a28).setDepth(1);
    path(W / 2, H / 2, 60, H - 80);
    path(W / 2, H / 2, W - 80, 60);

    this._addBuilding(160, 160, 180, 120, 0x221810, '商店街');
    this._addBuilding(W - 160, 160, 180, 120, 0x101820, '鍛冶屋');
    this._addBuilding(160, H - 160, 180, 120, 0x102010, '旅籠');

    const sx = W - 160, sy = H - 180;
    this.add.rectangle(sx, sy, 130, 160, 0x0a1a0a).setDepth(2);
    this.add.rectangle(sx, sy - 30, 160, 16, 0x663300).setDepth(3);
    this.add.text(sx, sy + 30, '⛩ 神社', { fontSize: '16px', color: '#ffddaa', fontFamily: 'serif' }).setDepth(4).setOrigin(0.5);

    const toriiX = W / 2, toriiY = 80;
    this._drawTorii(toriiX, toriiY, 1.2);
    this.add.text(toriiX, toriiY + 40, '朱鳥居の迷宮', { fontSize: '13px', color: '#ffaaaa', fontFamily: 'serif' }).setDepth(5).setOrigin(0.5);

    this.add.text(20, 20, '静かな街', { fontSize: '22px', color: '#ddbbff', fontFamily: 'serif' }).setDepth(10);
  }

  _addBuilding(x, y, w, h, col, label) {
    this.add.rectangle(x, y, w, h, col).setDepth(2);
    this.add.rectangle(x, y - h / 2, w + 10, 16, 0x663300).setDepth(3);
    this.add.text(x, y + 10, label, { fontSize: '14px', color: '#ccbbaa', fontFamily: 'serif' }).setDepth(4).setOrigin(0.5);
  }

  _drawTorii(x, y, scale = 1) {
    const s = scale;
    this.add.rectangle(x - 22 * s, y, 8 * s, 60 * s, 0xcc2200).setDepth(3);
    this.add.rectangle(x + 22 * s, y, 8 * s, 60 * s, 0xcc2200).setDepth(3);
    this.add.rectangle(x, y - 25 * s, 55 * s, 8 * s, 0xcc2200).setDepth(3);
    this.add.rectangle(x, y - 18 * s, 48 * s, 6 * s, 0xcc2200).setDepth(3);
  }

  _buildPlayer() {
    this.player = this.add.rectangle(W / 2, H / 2, 24, 24, 0x88ccff).setDepth(10);
    this.physics.add.existing(this.player);
    this.player.speed = 140;
  }

  _buildNPCs() {
    const addNpc = (x, y, color, label) => {
      this.add.rectangle(x, y, 22, 28, color).setDepth(8);
      const txt = this.add.text(x, y - 30, label, { fontSize: '11px', color: '#ffffcc', fontFamily: 'serif', backgroundColor: '#000000aa', padding: { x: 3, y: 2 } }).setDepth(9).setOrigin(0.5);
    };
    addNpc(160, 100, 0xffaa44, '札屋');
    addNpc(W - 160, 100, 0xaa6633, '鍛冶屋');
  }

  _setupDungeonGate() {
    this.gate = this.add.rectangle(W / 2, 58, DOOR_W ?? 60, 30, 0x440000, 0.01).setDepth(12);
    this.physics.add.existing(this.gate, true);
    this.gate.setInteractive();
    this.gate.on('pointerover', () => {
      this._gateHint?.destroy();
      this._gateHint = this.add.text(W / 2, 100, '[E] ダンジョンへ', { fontSize: '14px', color: '#ffaaaa', backgroundColor: '#00000088', padding: { x: 6, y: 3 } }).setDepth(20).setOrigin(0.5);
    });
    this.gate.on('pointerout', () => this._gateHint?.destroy());
  }

  _buildUI() {
    this.add.text(W / 2, H - 30, '[WASD] 移動  [E] ダンジョン入口に近づいて進む', {
      fontSize: '12px', color: '#888899', fontFamily: 'sans-serif',
    }).setDepth(20).setOrigin(0.5);

    this._magText = this.add.text(W - 20, 20, `勾玉: ${PDS.getMagatama()}`, {
      fontSize: '15px', color: '#ffddaa', fontFamily: 'serif',
    }).setDepth(20).setOrigin(1, 0);
    Bus.on('player:magatama', n => this._magText?.setText(`勾玉: ${n}`));
  }

  _setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,E');
  }

  update() {
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

    if (Phaser.Geom.Intersects.RectangleToRectangle(p.getBounds(), this.gate.getBounds())) {
      if (Phaser.Input.Keyboard.JustDown(keys.E)) {
        this._enterDungeon();
      } else {
        this._gateHint?.setVisible(true);
      }
    }
  }

  _enterDungeon() {
    DS.generate();
    OS.reset();
    this.scene.start('Dungeon');
  }
}

const DOOR_W = 60;
