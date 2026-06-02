export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff);
    g.fillRect(0, 0, 32, 32);
    g.generateTexture('__DEFAULT', 32, 32);
    g.destroy();
  }

  create() {
    this.scene.start('Prologue');
  }
}
