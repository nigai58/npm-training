import { Bus } from './EventBus.js';

/**
 * Register a global Bus listener that is automatically removed when the
 * scene shuts down or is destroyed. This prevents listener leaks across
 * scene restarts (Phaser reuses scene instances on scene.start()).
 *
 * Roblox 転用時は BindableEvent:Connect() の戻り値 connection を
 * シーン相当のクリーンアップで :Disconnect() する形に対応する。
 */
export function bindBus(scene, event, fn) {
  Bus.on(event, fn);
  const cleanup = () => Bus.off(event, fn);
  scene.events.once('shutdown', cleanup);
  scene.events.once('destroy', cleanup);
  return fn;
}
