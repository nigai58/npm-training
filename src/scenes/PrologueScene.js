import { DialogueBox } from '../utils/DialogueSystem.js';
import { DIALOGUES } from '../data/DialogueData.js';

export class PrologueScene extends Phaser.Scene {
  constructor() { super('Prologue'); }

  create() {
    const W = this.scale.width, H = this.scale.height;

    this.add.rectangle(W / 2, H / 2, W, H, 0x04020e);
    this._buildStars(W, H);
    this._buildShrineArt(W, H);

    this._titleShown = false;
    this._dialogueDone = false;

    this.time.delayedCall(800, () => this._showTitle());
  }

  _buildStars(W, H) {
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H * 0.7;
      const r = Math.random() * 1.5 + 0.5;
      const star = this.add.circle(x, y, r, 0xffffff, Math.random() * 0.6 + 0.2).setDepth(1);
      this.tweens.add({
        targets: star, alpha: Math.random() * 0.4 + 0.1,
        yoyo: true, repeat: -1,
        duration: Phaser.Math.Between(1200, 3000),
        delay: Phaser.Math.Between(0, 2000),
      });
    }
    this._bigStar = this.add.circle(W / 2, 60, 5, 0xffeeaa, 0.9).setDepth(2);
    this.tweens.add({ targets: this._bigStar, alpha: 0, duration: 1600, delay: 500 });
  }

  _buildShrineArt(W, H) {
    const ground = this.add.rectangle(W / 2, H - 50, W, 100, 0x0a180a).setDepth(1);
    this._drawTorii(W / 2, H - 80, 1.6);
    for (let i = 0; i < 4; i++) {
      const lx = W / 2 + (i % 2 === 0 ? -1 : 1) * (80 + Math.floor(i / 2) * 50);
      this.add.rectangle(lx, H - 100, 10, 30, 0xddaa00, 0.6).setDepth(2);
    }
    const mist = this.add.rectangle(W / 2, H * 0.6, W, H * 0.5, 0x8898cc, 0.08).setDepth(3);
    this.tweens.add({ targets: mist, alpha: 0.18, x: W / 2 + 30, yoyo: true, repeat: -1, duration: 4000 });
  }

  _drawTorii(x, y, scale) {
    const s = scale;
    this.add.rectangle(x - 28 * s, y, 10 * s, 80 * s, 0xcc2200).setDepth(2);
    this.add.rectangle(x + 28 * s, y, 10 * s, 80 * s, 0xcc2200).setDepth(2);
    this.add.rectangle(x, y - 32 * s, 70 * s, 10 * s, 0xcc2200).setDepth(2);
    this.add.rectangle(x, y - 24 * s, 60 * s, 7 * s, 0xcc2200).setDepth(2);
  }

  _showTitle() {
    const W = this.scale.width, H = this.scale.height;
    const title = this.add.text(W / 2, H * 0.28, 'まよい町と星灯りの札使い', {
      fontSize: '26px', color: '#ffddaa', fontFamily: 'serif',
      stroke: '#221100', strokeThickness: 4,
    }).setDepth(10).setOrigin(0.5).setAlpha(0);

    const sub = this.add.text(W / 2, H * 0.28 + 40, '和風アクションローグライト', {
      fontSize: '13px', color: '#aa99cc', fontFamily: 'serif',
    }).setDepth(10).setOrigin(0.5).setAlpha(0);

    this.tweens.add({ targets: [title, sub], alpha: 1, duration: 1200,
      onComplete: () => {
        this.time.delayedCall(1200, () => {
          this.tweens.add({ targets: [title, sub], alpha: 0, duration: 600,
            onComplete: () => this._showDialogue() });
        });
      }
    });
  }

  _showDialogue() {
    this._dlg = new DialogueBox(this);
    this._dlg.show(DIALOGUES.prologue, () => {
      this.cameras.main.fade(800, 0, 0, 0);
      this.time.delayedCall(850, () => this.scene.start('Town'));
    });
  }
}
