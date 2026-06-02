import { PDS } from '../systems/PlayerDataSystem.js';

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
    PDS.load();   // セーブデータ（恒久強化・勾玉・進行）を読み込む
    // 一度でもクリア済みなら、プロローグを飛ばして町から再開
    this.scene.start(PDS.hasFlag('dungeon1_cleared') ? 'Town' : 'Prologue');
  }
}
