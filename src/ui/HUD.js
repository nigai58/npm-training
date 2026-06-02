import { OFUDA_DATA } from '../data/OfudaData.js';
import { OS } from '../systems/OfudaSystem.js';
import { bindBus } from '../utils/SceneBus.js';

export class HUD {
  constructor(scene) {
    this.scene = scene;
    this._ofudaButtons = {};
    this._build();
    this._bindEvents();
  }

  _build() {
    const scene = this.scene;

    this._hpBg = scene.add.rectangle(120, 24, 200, 18, 0x330000).setScrollFactor(0).setDepth(100);
    this._hpBar = scene.add.rectangle(120, 24, 200, 18, 0xff2222).setScrollFactor(0).setDepth(101);
    this._hpBg.setOrigin(0, 0.5);
    this._hpBar.setOrigin(0, 0.5);
    this._hpBg.setPosition(20, 20);
    this._hpBar.setPosition(20, 20);
    this._hpText = scene.add.text(225, 20, '', { fontSize: '12px', color: '#fff' }).setScrollFactor(0).setDepth(102).setOrigin(0, 0);

    this._roomText = scene.add.text(scene.scale.width / 2, 20, '', {
      fontSize: '16px', color: '#ddbbff', fontFamily: 'serif',
    }).setScrollFactor(0).setDepth(100).setOrigin(0.5, 0);

    this._buildOfudaSlots();
    this._buildActionButtons();
  }

  _buildOfudaSlots() {
    const scene = this.scene;
    const ofudaIds = ['fire', 'wind', 'seal'];
    const labels = ['火札(1)', '風札(2)', '封印(3)'];
    ofudaIds.forEach((id, i) => {
      const x = 20 + i * 90, y = scene.scale.height - 60;
      const bg = scene.add.rectangle(x + 35, y, 80, 48, 0x222233).setScrollFactor(0).setDepth(100).setOrigin(0, 0.5);
      const icon = scene.add.text(x + 75, y, OFUDA_DATA[id].icon, { fontSize: '20px' }).setScrollFactor(0).setDepth(101).setOrigin(1, 0.5);
      const lbl = scene.add.text(x + 40, y + 12, labels[i], { fontSize: '10px', color: '#aaa' }).setScrollFactor(0).setDepth(101).setOrigin(0.5, 0.5);
      const cd = scene.add.text(x + 40, y - 8, '', { fontSize: '12px', color: '#ff8888' }).setScrollFactor(0).setDepth(102).setOrigin(0.5, 0.5);
      this._ofudaButtons[id] = { bg, icon, lbl, cd };
    });
  }

  _buildActionButtons() {
    const scene = this.scene;
    const W = scene.scale.width;
    const H = scene.scale.height;

    const makeBtn = (x, y, label, color) => {
      const btn = scene.add.circle(x, y, 30, color, 0.85).setScrollFactor(0).setDepth(100).setInteractive();
      const txt = scene.add.text(x, y, label, { fontSize: '12px', color: '#fff' }).setScrollFactor(0).setDepth(101).setOrigin(0.5);
      return { btn, txt };
    };

    this._attackBtn = makeBtn(W - 70, H - 70, '攻撃', 0x884422);
    this._dodgeBtn  = makeBtn(W - 140, H - 50, '回避', 0x224488);
  }

  _bindEvents() {
    bindBus(this.scene, 'player:hp', (hp, max) => {
      if (this._hpBar?.active) this._updateHp(hp, max);
    });
  }

  _updateHp(hp, max) {
    const ratio = Math.max(0, hp / max);
    this._hpBar.setSize(200 * ratio, 18);
    this._hpText.setText(`${hp}/${max}`);
    const col = ratio > 0.5 ? 0xff2222 : ratio > 0.25 ? 0xff8800 : 0xff0044;
    this._hpBar.setFillStyle(col);
  }

  updateRoom(current, total) {
    this._roomText.setText(`部屋 ${current + 1} / ${total}`);
  }

  update() {
    Object.entries(this._ofudaButtons).forEach(([id, btns]) => {
      const cd = OS.getRemainingCooldown(id);
      if (cd > 0) {
        btns.bg.setFillStyle(0x111122);
        btns.cd.setText(`${(cd / 1000).toFixed(1)}s`);
      } else {
        btns.bg.setFillStyle(0x222233);
        btns.cd.setText('');
      }
    });
  }

  destroy() {
    [this._hpBg, this._hpBar, this._hpText, this._roomText].forEach(o => o?.destroy());
    Object.values(this._ofudaButtons).forEach(btns => Object.values(btns).forEach(o => o?.destroy()));
    this._attackBtn?.btn.destroy(); this._attackBtn?.txt.destroy();
    this._dodgeBtn?.btn.destroy();  this._dodgeBtn?.txt.destroy();
  }
}
