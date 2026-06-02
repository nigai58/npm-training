import { Kooni } from './enemies/Kooni.js';
import { Kitsunebi } from './enemies/Kitsunebi.js';
import { MovingLantern } from './enemies/MovingLantern.js';
import { BossKomainu } from './enemies/Boss_Komainu.js';
import { Bus } from '../utils/EventBus.js';

const WALL = 48;
const DOOR_W = 80;

const ENEMY_CLASS = { kooni: Kooni, kitsunebi: Kitsunebi, lantern: MovingLantern, komainu: BossKomainu };

export class Room {
  constructor(scene, template, roomIndex, totalRooms) {
    this.scene = scene;
    this.template = template;
    this.roomIndex = roomIndex;
    this.totalRooms = totalRooms;
    this.enemies = [];
    this.gimmicks = [];
    this.walls = null;
    this.doors = {};
    this.cleared = template.cleared ?? false;
    this._barriers = [];
  }

  build() {
    const { width: W, height: H, floorColor, wallColor, doors, gimmicks, enemies, type } = this.template;
    const scene = this.scene;

    this.floor = scene.add.rectangle(W / 2, H / 2, W - WALL * 2, H - WALL * 2, floorColor).setDepth(0);

    this.walls = scene.physics.add.staticGroup();

    const addWall = (x, y, w, h) => {
      const r = scene.add.rectangle(x, y, w, h, wallColor).setDepth(1);
      scene.physics.add.existing(r, true);
      this.walls.add(r);
      return r;
    };

    addWall(W / 2, WALL / 2, W, WALL);
    addWall(W / 2, H - WALL / 2, W, WALL);
    addWall(WALL / 2, H / 2, WALL, H);
    addWall(W - WALL / 2, H / 2, WALL, H);

    this._buildDoors(W, H, doors, addWall, scene, wallColor);
    this._buildDecorations(W, H, type, scene);

    gimmicks.forEach(g => this._spawnGimmick(g, scene));
    this._spawnEnemies(enemies, W, H, scene);
  }

  _buildDoors(W, H, doorConfig, addWall, scene, wallColor) {
    const sideGap = (W - WALL * 2 - DOOR_W) / 2;
    const udGap   = (H - WALL * 2 - DOOR_W) / 2;

    if (doorConfig.north) {
      addWall(WALL + sideGap / 2,          WALL / 2, sideGap, WALL);
      addWall(W - WALL - sideGap / 2,      WALL / 2, sideGap, WALL);
      this.doors.north = this._makeDoor(scene, W / 2, WALL / 2, DOOR_W, WALL, 'north', wallColor);
    }
    if (doorConfig.south) {
      addWall(WALL + sideGap / 2,          H - WALL / 2, sideGap, WALL);
      addWall(W - WALL - sideGap / 2,      H - WALL / 2, sideGap, WALL);
      this.doors.south = this._makeDoor(scene, W / 2, H - WALL / 2, DOOR_W, WALL, 'south', wallColor);
    }
  }

  _makeDoor(scene, x, y, w, h, dir, color) {
    const rect = scene.add.rectangle(x, y, w, h, this.cleared ? 0x4488aa : color).setDepth(2);
    const body = scene.physics.add.existing(rect, true);
    const door = { rect, dir, open: this.cleared };
    if (!this.cleared) this.walls.add(rect);
    return door;
  }

  _buildDecorations(W, H, type, scene) {
    const torii = (x, y, scale = 1) => {
      scene.add.rectangle(x - 22 * scale, y, 8 * scale, 60 * scale, 0xcc2200).setDepth(3);
      scene.add.rectangle(x + 22 * scale, y, 8 * scale, 60 * scale, 0xcc2200).setDepth(3);
      scene.add.rectangle(x, y - 25 * scale, 55 * scale, 8 * scale, 0xcc2200).setDepth(3);
      scene.add.rectangle(x, y - 20 * scale, 48 * scale, 6 * scale, 0xcc2200).setDepth(3);
    };
    const lanternDeco = (x, y) => {
      scene.add.rectangle(x, y, 14, 22, 0xddaa00).setDepth(3);
      scene.add.rectangle(x, y - 14, 4, 12, 0x888888).setDepth(3);
    };

    if (type === 'start') {
      torii(W / 2, H / 2, 1.4);
      lanternDeco(W / 2 - 80, H / 2);
      lanternDeco(W / 2 + 80, H / 2);
    }
    if (type === 'boss') {
      torii(W / 2, H * 0.3, 1.6);
      lanternDeco(WALL + 40, H * 0.5);
      lanternDeco(W - WALL - 40, H * 0.5);
    }
    if (type === 'heal') {
      scene.add.rectangle(W / 2, H / 2 - 20, 30, 50, 0x885522).setDepth(3);
      scene.add.rectangle(W / 2, H / 2 - 50, 50, 16, 0x664411).setDepth(3);
    }
    if (type === 'end') {
      torii(W / 2, H / 2, 1.2);
    }

    const addStonePath = () => {
      for (let i = 0; i < 6; i++) {
        scene.add.rectangle(W / 2 + (Math.random() - 0.5) * 20, H * 0.3 + i * 40, 28, 16, 0x888899, 0.6).setDepth(1);
      }
    };
    if (['battle', 'boss'].includes(type)) addStonePath();
  }

  _spawnGimmick(g, scene) {
    if (g.tag === 'chest') {
      const chest = scene.add.rectangle(g.x, g.y, 36, 28, 0xaa7722).setDepth(5);
      scene.physics.add.existing(chest, true);
      chest.gimmickTag = 'chest';
      chest.opened = false;
      this.gimmicks.push(chest);
    }
    if (g.tag === 'barrier') {
      const bar = scene.add.rectangle(g.x, g.y, 120, 20, 0xaa44ff, 0.8).setDepth(5);
      scene.physics.add.existing(bar, true);
      bar.gimmickTag = 'barrier';
      bar.sealed = true;
      this.walls.add(bar);
      this._barriers.push(bar);
      this.gimmicks.push(bar);
    }
    if (g.tag === 'shrine') {
      scene.add.rectangle(g.x, g.y, 40, 60, 0x885522).setDepth(5);
      const shrine = scene.add.rectangle(g.x, g.y, 38, 58, 0x885522).setDepth(5);
      shrine.gimmickTag = 'shrine';
      this.gimmicks.push(shrine);
    }
  }

  _spawnEnemies(enemyList, W, H, scene) {
    const margin = WALL + 60;
    const positions = [
      { x: W * 0.3, y: H * 0.4 }, { x: W * 0.7, y: H * 0.4 },
      { x: W * 0.5, y: H * 0.6 }, { x: W * 0.3, y: H * 0.7 },
      { x: W * 0.7, y: H * 0.7 },
    ];
    enemyList.forEach((type, i) => {
      const pos = positions[i % positions.length];
      const EClass = ENEMY_CLASS[type];
      if (!EClass) return;
      const e = new EClass(scene, pos.x, pos.y);
      this.enemies.push(e);
    });
  }

  unlockDoors() {
    Object.values(this.doors).forEach(door => {
      if (!door.open) {
        door.open = true;
        door.rect.setFillStyle(0x4488aa);
        this.walls.remove(door.rect, false, false);
      }
    });
    this.cleared = true;
  }

  sealBarrier() {
    this._barriers.forEach(b => {
      b.setVisible(false);
      b.sealed = false;
      this.walls.remove(b, false, false);
    });
    if (this._barriers.length > 0 && !this.cleared) {
      this.checkClear();
    }
  }

  checkClear() {
    const allDead = this.enemies.every(e => !e.active || e.hp <= 0);
    const allBarriersOpen = this._barriers.every(b => !b.sealed);
    if (allDead && allBarriersOpen) {
      this.unlockDoors();
      Bus.emit('room:cleared', this);
    }
  }

  destroy() {
    this.floor?.destroy();
    this.enemies.forEach(e => { if (e.active) { e._hpBar?.destroy(); e._hpBarBg?.destroy(); e.destroy(); } });
    this.gimmicks.forEach(g => g.destroy?.());
    this.walls?.getChildren().forEach(w => w.destroy());
    Object.values(this.doors).forEach(d => d.rect?.destroy());
  }
}
