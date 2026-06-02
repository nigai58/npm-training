import { PDS } from '../systems/PlayerDataSystem.js';
import { UpgradeSystem } from '../systems/UpgradeSystem.js';
import { UPGRADE_DEFS, NPC_UPGRADES, NPC_LABEL, upgradeMaxLevel } from '../data/UpgradeData.js';

// 町の強化メニュー（オーバーレイ）。npc は 'shrine' | 'kajiya' | 'fudaya'。
export class ShopUI {
  constructor(scene, npc, onClose) {
    this.scene = scene;
    this.npc = npc;
    this.onClose = onClose;
    this._rows = [];
    this._objects = [];
    this._build();
  }

  _add(o) { this._objects.push(o); return o; }

  _build() {
    const scene = this.scene;
    const W = scene.scale.width, H = scene.scale.height;

    this._add(scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6).setScrollFactor(0).setDepth(600).setInteractive());
    const panel = this._add(scene.add.rectangle(W / 2, H / 2, 520, 380, 0x10101c, 0.98)
      .setScrollFactor(0).setDepth(601).setStrokeStyle(2, 0xaa88ff));

    this._add(scene.add.text(W / 2, H / 2 - 165, `${NPC_LABEL[this.npc]} の強化`, {
      fontSize: '20px', color: '#ffddaa', fontFamily: 'serif',
    }).setScrollFactor(0).setDepth(602).setOrigin(0.5));

    this._currencyText = this._add(scene.add.text(W / 2, H / 2 - 138, '', {
      fontSize: '13px', color: '#ffdd66', fontFamily: 'serif',
    }).setScrollFactor(0).setDepth(602).setOrigin(0.5));

    const ids = NPC_UPGRADES[this.npc] ?? [];
    ids.forEach((id, i) => this._buildRow(id, W / 2, H / 2 - 95 + i * 66));

    // 閉じる
    const closeBtn = this._add(scene.add.rectangle(W / 2, H / 2 + 150, 160, 40, 0x223322)
      .setScrollFactor(0).setDepth(602).setStrokeStyle(1, 0x66aa66).setInteractive());
    this._add(scene.add.text(W / 2, H / 2 + 150, '閉じる [E]', {
      fontSize: '15px', color: '#aaffaa', fontFamily: 'serif',
    }).setScrollFactor(0).setDepth(603).setOrigin(0.5));
    closeBtn.on('pointerdown', () => this.close());

    // 開いた瞬間の E キーで即閉じしないよう、少し待ってから登録
    this._escHandler = () => this.close();
    scene.time.delayedCall(220, () => {
      if (this._objects.length === 0) return;  // すでに閉じている
      scene.input.keyboard.on('keydown-E', this._escHandler);
      scene.input.keyboard.on('keydown-ESC', this._escHandler);
    });

    this._refresh();
  }

  _buildRow(id, cx, cy) {
    const scene = this.scene;
    const def = UPGRADE_DEFS[id];

    const label = this._add(scene.add.text(cx - 240, cy - 12, def.label, {
      fontSize: '15px', color: '#ffffff', fontFamily: 'serif',
    }).setScrollFactor(0).setDepth(602));
    const desc = this._add(scene.add.text(cx - 240, cy + 8, def.desc, {
      fontSize: '11px', color: '#99aacc', fontFamily: 'serif',
    }).setScrollFactor(0).setDepth(602));

    const dots = this._add(scene.add.text(cx + 40, cy - 2, '', {
      fontSize: '14px', color: '#ffcc44',
    }).setScrollFactor(0).setDepth(602));

    const btn = this._add(scene.add.rectangle(cx + 195, cy, 110, 44, 0x2a2a40)
      .setScrollFactor(0).setDepth(602).setStrokeStyle(1, 0x6666aa).setInteractive());
    const btnText = this._add(scene.add.text(cx + 195, cy, '', {
      fontSize: '13px', color: '#ffffff', fontFamily: 'serif', align: 'center',
    }).setScrollFactor(0).setDepth(603).setOrigin(0.5));

    btn.on('pointerdown', () => {
      if (UpgradeSystem.purchase(id)) {
        this.scene.cameras.main.flash(150, 120, 200, 120);
        this._refresh();
      } else {
        btn.setFillStyle(0x402020);
        this.scene.time.delayedCall(150, () => this._refresh());
      }
    });

    this._rows.push({ id, def, dots, btn, btnText });
  }

  _refresh() {
    this._currencyText.setText(`勾玉: ${PDS.getMagatama()}    神具の欠片: ${PDS.getKakera()}`);
    this._rows.forEach(({ id, def, dots, btn, btnText }) => {
      const lv = PDS.getUpgradeLevel(id);
      const max = upgradeMaxLevel(id);
      dots.setText('●'.repeat(lv) + '○'.repeat(max - lv));
      if (UpgradeSystem.isMaxed(id)) {
        btnText.setText('最大');
        btn.setFillStyle(0x1a1a1a);
      } else {
        const cost = UpgradeSystem.nextCost(id);
        const unit = def.currency === 'kakera' ? '欠片' : '勾玉';
        btnText.setText(`強化\n${cost} ${unit}`);
        btn.setFillStyle(UpgradeSystem.canAfford(id) ? 0x2a2a40 : 0x221a1a);
      }
    });
  }

  close() {
    const kb = this.scene?.input?.keyboard;
    if (kb) {
      kb.off('keydown-E', this._escHandler);
      kb.off('keydown-ESC', this._escHandler);
    }
    this._objects.forEach(o => o?.destroy());
    this._objects = [];
    this.onClose?.();
  }
}
