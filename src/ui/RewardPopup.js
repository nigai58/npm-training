export class RewardPopup {
  static show(scene, x, y, text) {
    const t = scene.add.text(x, y, text, {
      fontSize: '16px', color: '#ffdd88', fontFamily: 'serif',
      stroke: '#000', strokeThickness: 3,
    }).setDepth(200).setOrigin(0.5);

    scene.tweens.add({
      targets: t,
      y: y - 50, alpha: 0,
      duration: 1400,
      ease: 'Power2',
      onComplete: () => t.destroy(),
    });
  }
}
