// 通知アダプタ（Phase 3）。
// 配布時に各宛先へ通知する。既定はサーバログ出力の in-app 通知。
// メール／プッシュ等は同じインターフェースのアダプタを registerNotifier で
// 追加すれば差し替えられる（外部サービスは未設定のためここではログのみ）。

const notifiers = new Map();

/** notifier = { name, async notify({ recipient, distribution, work }) -> bool } */
export function registerNotifier(notifier) {
  notifiers.set(notifier.name, notifier);
}

export function getNotifier(name = process.env.NOTIFIER || 'console') {
  return notifiers.get(name) || notifiers.get('console');
}

// 既定: サーバログへ出力する in-app 通知。
registerNotifier({
  name: 'console',
  async notify({ recipient, distribution, work }) {
    console.log(
      `[notify] -> ${recipient.name} (${recipient.instrument || '楽器未設定'}): ` +
        `「${work.title}」が配布されました (mode=${distribution.share_mode})`
    );
    return true;
  },
});
