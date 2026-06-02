import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { PrologueScene } from './scenes/PrologueScene.js';
import { TownScene } from './scenes/TownScene.js';
import { DungeonScene } from './scenes/DungeonScene.js';
import { DungeonClearScene } from './scenes/DungeonClearScene.js';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 560,
  backgroundColor: '#04020e',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: [BootScene, PrologueScene, TownScene, DungeonScene, DungeonClearScene],
  parent: document.body,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
