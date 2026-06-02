import { DS } from '../systems/DungeonSystem.js';
import { PDS } from '../systems/PlayerDataSystem.js';

export class DungeonClearScene extends Phaser.Scene {
  constructor() { super('DungeonClear'); }

  create() {
    const W = this.scale.width, H = this.scale.height;

    this.add.rectangle(W / 2, H / 2, W, H, 0x080410);

    this.add.text(W / 2, 80, '朱鳥居の迷宮　攻略！', {
      fontSize: '28px', color: '#ffdd88', fontFamily: 'serif',
      stroke: '#441100', strokeThickness: 5,
    }).setOrigin(0.5);

    const rewards = DS.getSessionRewards();
    const totalMag = rewards.reduce((s, r) => s + (r.magatama ?? 0), 0);
    const allItems = rewards.flatMap(r => r.items ?? []);

    this.add.text(W / 2, 140, `獲得勾玉: ${totalMag}`, { fontSize: '20px', color: '#ffcc44', fontFamily: 'serif' }).setOrigin(0.5);

    if (allItems.length) {
      this.add.text(W / 2, 180, '獲得アイテム:', { fontSize: '16px', color: '#ccbbff', fontFamily: 'serif' }).setOrigin(0.5);
      allItems.forEach((item, i) => {
        this.add.text(W / 2, 210 + i * 28, `・${item.label}`, { fontSize: '15px', color: '#ffffff', fontFamily: 'serif' }).setOrigin(0.5);
      });
    }

    const btnY = H - 100;
    const btn = this.add.rectangle(W / 2, btnY, 220, 50, 0x334433).setInteractive().setDepth(10);
    this.add.text(W / 2, btnY, '町へ帰還する', { fontSize: '18px', color: '#aaffaa', fontFamily: 'serif' }).setDepth(11).setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(0x446644));
    btn.on('pointerout',  () => btn.setFillStyle(0x334433));
    btn.on('pointerdown', () => this.scene.start('Town'));

    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('Town'));
    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('Town'));
  }
}
