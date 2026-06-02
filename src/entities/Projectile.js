export class Projectile extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, vx, vy, data, owner) {
    super(scene, x, y, '__DEFAULT');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.owner = owner;
    this.projData = data;
    this.setDisplaySize(data.radius ?? 12, data.radius ?? 12);
    this.setTint(data.color ?? 0xff4400);
    this.body.setVelocity(vx, vy);
    this.setDepth(9);
    this.lifespan = 3000;
    this.elapsed = 0;
  }

  update(delta) {
    this.elapsed += delta;
    if (this.elapsed > this.lifespan) { this.destroy(); return; }
  }
}
