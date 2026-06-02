// ご利益の3択カード。クリックまたは 1/2/3 キーで選択。
export class BlessingChoiceUI {
  constructor(scene, blessings, onPick) {
    this.scene = scene;
    this.blessings = blessings;
    this.onPick = onPick;
    this._objects = [];
    this._build();
  }

  _add(o) { this._objects.push(o); return o; }

  _build() {
    const scene = this.scene;
    const W = scene.scale.width, H = scene.scale.height;

    this._add(scene.add.rectangle(W / 2, H / 2, W, H, 0x05030f, 0.72)
      .setScrollFactor(0).setDepth(620).setInteractive());

    this._add(scene.add.text(W / 2, H / 2 - 130, 'こはく「お札に力が宿ってる……ひとつ選んで！」', {
      fontSize: '15px', color: '#ffddaa', fontFamily: 'serif',
    }).setScrollFactor(0).setDepth(621).setOrigin(0.5));
    this._add(scene.add.text(W / 2, H / 2 - 100, '── ご利益を選べ ──', {
      fontSize: '18px', color: '#cc99ff', fontFamily: 'serif',
    }).setScrollFactor(0).setDepth(621).setOrigin(0.5));

    const cardW = 150, gap = 20;
    const total = this.blessings.length * cardW + (this.blessings.length - 1) * gap;
    const startX = W / 2 - total / 2 + cardW / 2;

    this.blessings.forEach((b, i) => {
      const x = startX + i * (cardW + gap);
      const y = H / 2 + 10;
      const card = this._add(scene.add.rectangle(x, y, cardW, 180, 0x1a1830)
        .setScrollFactor(0).setDepth(621).setStrokeStyle(2, 0x8866cc).setInteractive());
      this._add(scene.add.text(x, y - 55, b.icon, { fontSize: '36px' })
        .setScrollFactor(0).setDepth(622).setOrigin(0.5));
      this._add(scene.add.text(x, y - 6, b.label, {
        fontSize: '16px', color: '#ffffff', fontFamily: 'serif',
      }).setScrollFactor(0).setDepth(622).setOrigin(0.5));
      this._add(scene.add.text(x, y + 38, b.desc, {
        fontSize: '12px', color: '#aaccff', fontFamily: 'serif',
        align: 'center', wordWrap: { width: cardW - 16 },
      }).setScrollFactor(0).setDepth(622).setOrigin(0.5));
      this._add(scene.add.text(x, y + 78, `[${i + 1}]`, {
        fontSize: '12px', color: '#887799',
      }).setScrollFactor(0).setDepth(622).setOrigin(0.5));

      card.on('pointerover', () => card.setStrokeStyle(3, 0xffcc66));
      card.on('pointerout', () => card.setStrokeStyle(2, 0x8866cc));
      card.on('pointerdown', () => this._pick(b));
    });

    this._keyHandler = (e) => {
      const idx = { '1': 0, '2': 1, '3': 2 }[e.key];
      if (idx != null && this.blessings[idx]) this._pick(this.blessings[idx]);
    };
    scene.input.keyboard.on('keydown', this._keyHandler);
  }

  _pick(b) {
    if (this._picked) return;
    this._picked = true;
    this.scene.input.keyboard.off('keydown', this._keyHandler);
    this._objects.forEach(o => o?.destroy());
    this._objects = [];
    this.onPick?.(b);
  }
}
