const PORTRAIT_COLORS = {
  kohaku:  { face: 0xffeedd, accent: 0xffaa44, label: 'こはく' },
  fudaya:  { face: 0xddccbb, accent: 0x886644, label: '紙月' },
  kajiya:  { face: 0xccbbaa, accent: 0xcc6622, label: '火月' },
  komainu: { face: 0x9988aa, accent: 0x4a3060, label: '狛犬' },
};

export class DialogueBox {
  constructor(scene) {
    this.scene = scene;
    this._lines = [];
    this._index = 0;
    this._onDone = null;
    this._visible = false;
    this._build();
  }

  _build() {
    const scene = this.scene;
    const W = scene.scale.width, H = scene.scale.height;
    const boxH = 130, boxY = H - boxH / 2 - 10;

    this._bg = scene.add.rectangle(W / 2, boxY, W - 20, boxH, 0x0a0818, 0.92)
      .setScrollFactor(0).setDepth(500).setStrokeStyle(2, 0xaa88ff, 0.8);

    this._portrait = scene.add.circle(50, boxY, 28, 0x332255).setScrollFactor(0).setDepth(501);
    this._portraitInner = scene.add.circle(50, boxY, 20, 0x665588).setScrollFactor(0).setDepth(502);

    this._nameText = scene.add.text(88, boxY - 46, '', {
      fontSize: '13px', color: '#ffddaa', fontFamily: 'serif',
      backgroundColor: '#22114488', padding: { x: 6, y: 2 },
    }).setScrollFactor(0).setDepth(502);

    this._bodyText = scene.add.text(88, boxY - 26, '', {
      fontSize: '14px', color: '#eeeeff', fontFamily: 'serif',
      wordWrap: { width: W - 130 }, lineSpacing: 6,
    }).setScrollFactor(0).setDepth(502);

    this._hint = scene.add.text(W - 30, boxY + boxH / 2 - 18, '▼', {
      fontSize: '12px', color: '#aa88ff',
    }).setScrollFactor(0).setDepth(502).setOrigin(1, 1);
    scene.tweens.add({ targets: this._hint, alpha: 0, yoyo: true, repeat: -1, duration: 500 });

    this._setVisible(false);

    // 入力ハンドラは参照を保持し destroy() で必ず解除する（漏れ防止）
    this._advance = () => { if (this._visible) this._next(); };
    this._pointerAdvance = (ptr) => {
      if (this._visible && ptr.y > scene.scale.height - 150) this._advance();
    };
    scene.input.keyboard.on('keydown-SPACE', this._advance);
    scene.input.keyboard.on('keydown-ENTER', this._advance);
    scene.input.on('pointerdown', this._pointerAdvance);

    scene.events.once('shutdown', () => this.destroy());
    scene.events.once('destroy', () => this.destroy());
  }

  _setVisible(v) {
    this._visible = v;
    [this._bg, this._portrait, this._portraitInner, this._nameText, this._bodyText, this._hint].forEach(o => o?.setVisible(v));
  }

  show(lines, onDone) {
    this._lines = lines;
    this._index = 0;
    this._onDone = onDone ?? null;
    this._setVisible(true);
    this._render();
  }

  _render() {
    const line = this._lines[this._index];
    if (!line) { this._close(); return; }

    this._nameText.setText(line.speaker ?? '');

    const text = (line.text ?? '').replace(/\\n/g, '\n');
    this._bodyText.setText(text);

    const pd = PORTRAIT_COLORS[line.portrait];
    if (pd) {
      this._portrait.setFillStyle(pd.accent);
      this._portraitInner.setFillStyle(pd.face);
      this._portrait.setVisible(true);
      this._portraitInner.setVisible(true);
    } else {
      this._portrait.setVisible(false);
      this._portraitInner.setVisible(false);
    }
  }

  _next() {
    this._index++;
    if (this._index >= this._lines.length) { this._close(); return; }
    this._render();
  }

  _close() {
    this._setVisible(false);
    const cb = this._onDone;
    this._onDone = null;
    if (cb) cb();
  }

  isVisible() { return this._visible; }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    const kb = this.scene?.input?.keyboard;
    if (kb) {
      kb.off('keydown-SPACE', this._advance);
      kb.off('keydown-ENTER', this._advance);
    }
    this.scene?.input?.off('pointerdown', this._pointerAdvance);
    [this._bg, this._portrait, this._portraitInner, this._nameText, this._bodyText, this._hint].forEach(o => o?.destroy());
  }
}
