import { DS } from '../systems/DungeonSystem.js';
import { PDS } from '../systems/PlayerDataSystem.js';
import { ALL_RELICS } from '../data/DungeonData.js';

export class DungeonClearScene extends Phaser.Scene {
  constructor() { super('DungeonClear'); }

  create() {
    const W = this.scale.width, H = this.scale.height;

    this.add.rectangle(W / 2, H / 2, W, H, 0x04060e);
    this._buildStars(W, H);
    this.cameras.main.fadeIn(600);

    this.time.delayedCall(300, () => this._buildContent(W, H));
    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('Town', { returning: true }));
    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('Town', { returning: true }));
  }

  _buildStars(W, H) {
    for (let i = 0; i < 60; i++) {
      const s = this.add.circle(Math.random() * W, Math.random() * H, Math.random() * 1.5 + 0.5, 0xffffff, Math.random() * 0.5 + 0.1);
      this.tweens.add({ targets: s, alpha: 0.05, yoyo: true, repeat: -1, duration: Phaser.Math.Between(1000, 3000) });
    }
    const star = this.add.circle(W / 2, 50, 7, 0xffeeaa).setAlpha(0);
    this.tweens.add({ targets: star, alpha: 1, duration: 1400, delay: 600 });
    this.tweens.add({ targets: star, y: 44, yoyo: true, repeat: -1, duration: 2200, ease: 'Sine.easeInOut' });
  }

  _buildContent(W, H) {
    this.add.text(W / 2, 80, `★ ${DS.getDungeonName()}　攻略！`, {
      fontSize: '26px', color: '#ffdd88', fontFamily: 'serif',
      stroke: '#221100', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(W / 2, 116, 'こはく「やった！やったぞ！ぜんぶ鎮めた！」', {
      fontSize: '13px', color: '#ffccaa', fontFamily: 'serif',
    }).setOrigin(0.5);

    const rewards = DS.getSessionRewards();
    const totalMag = rewards.reduce((s, r) => s + (r.magatama ?? 0), 0);
    const allItems = rewards.flatMap(r => r.items ?? []);
    const allFlags = rewards.flatMap(r => r.flags ?? []);

    let y = 160;
    const row = (text, color = '#ffffff') => {
      this.add.text(W / 2, y, text, { fontSize: '16px', color, fontFamily: 'serif' }).setOrigin(0.5);
      y += 32;
    };

    this.add.rectangle(W / 2, 200, W * 0.7, 1, 0x554466).setOrigin(0.5, 0);
    y = 218;
    row('── 獲得報酬 ──', '#aa88ff');
    row(`勾玉  ×${totalMag}`, '#ffdd44');
    allItems.forEach(item => row(`・${item.label}`, '#88ffcc'));

    y = Math.max(y, 350);
    // 五つの神具：所持済みの神具を数える
    const got = PDS.getInventory().filter(i => ALL_RELICS.includes(i.id)).length;
    if (got > 0) {
      this.add.text(W / 2, y, `星灯りの神具　${got} / 5`, {
        fontSize: '15px', color: '#ffcc66', fontFamily: 'serif',
      }).setOrigin(0.5);
      y += 28;
      const note = got >= 2 ? '星見町に、また光が戻っていく……' : '神社の灯籠に火が戻った……';
      this.add.text(W / 2, y, note, {
        fontSize: '13px', color: '#ffeecc', fontFamily: 'serif',
      }).setOrigin(0.5);
    }

    const btnY = H - 70;
    const btn = this.add.rectangle(W / 2, btnY, 240, 50, 0x1a2a1a).setInteractive().setStrokeStyle(2, 0x446644);
    this.add.text(W / 2, btnY, '★  星見町へ帰る  ★', { fontSize: '17px', color: '#aaffaa', fontFamily: 'serif' }).setOrigin(0.5);
    btn.on('pointerover', () => btn.setFillStyle(0x2a3a2a));
    btn.on('pointerout',  () => btn.setFillStyle(0x1a2a1a));
    btn.on('pointerdown', () => {
      this.cameras.main.fade(400, 0, 0, 0);
      this.time.delayedCall(420, () => this.scene.start('Town', { returning: true }));
    });
    this.add.text(W / 2, H - 20, 'Space / Enter でも帰れます', { fontSize: '11px', color: '#555566' }).setOrigin(0.5);
  }
}
