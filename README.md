# オーケストラ譜面ライブラリ

パブリックドメイン（著作権切れ）／Creative Commons の譜面を各所から収集し、
**曲・パート・楽器ごとに整理して扱えるライブラリ** を提供する Web アプリ。

オーケストラで配られる譜面が「自分のパート以外も溜まる・種類が多すぎて散らかる」
という悩みを、**収集 → 整理 → 検索 → パート別に取り出す** の流れで解決する。

> 著作権の都合で市販の現役譜面は配布できないため、**ライセンスが明確な無料譜面に
> 範囲を限定**している。再配布が許可された譜面（Mutopia=CC）と、リンク誘導のみに
> 留める譜面（IMSLP）をデータ構造レベルで区別する。

## 機能

**ライブラリ（収集・整理）**
- **譜面ライブラリ管理**: 一覧／キーワード検索／作曲家・楽器・タグ・ソース・
  ライセンスでの絞り込み、曲詳細（パート別ファイル＋ライセンスバッジ）
- **「自分の楽器」で絞り込み**（`score_files.instrument`）
- **パブリックドメイン収集**: ソースアダプタ方式で複数ソースに対応
  - `seed` … バンドル済みの厳選パブリックドメイン作品（ネット不要・デモ初期データ）
  - `mutopia` … Mutopia Project（CC、再配布可）。GitHub 上の LilyPond ヘッダから
    実データを収集
  - `imslp` … IMSLP（著作権切れ、再配布グレー）。メタデータ＋外部リンクのみ

**配布（Phase 2）**
- **合奏団・メンバー登録**（役割: 指揮者／パートリーダー／団員）
- **譜面配布**: 指揮者・パートリーダーが登録メンバーへ譜面を送る。一般団員は配布不可。
- ライブラリは PD/CC 譜面のみのため配布は構造上「著作権の許す範囲」に収まる。
  再配布可の曲は実ファイル（`file`）、リンクのみの曲は外部リンク参照（`link`）として共有。
- **受信箱**: メンバーごとに「自分宛に届いた譜面」を確認できる。

**認証・通知・提案（Phase 3）**
- **認証／アクセス制御**: ユーザー登録・ログイン（scrypt パスワード＋Cookie セッション、
  外部依存なし）。合奏団は作成者が所有し、メンバー追加・配布・収集は**所有者のみ**。
- **配布通知**: 配布時に各宛先へ通知（既定はサーバログの in-app 通知）。
  `src/notifications/` のアダプタを差し替えればメール／プッシュに拡張可能。
- **既読管理**: 受信箱の未読カウント、既読化。
- **楽器ベースの譜面提案**: メンバーの楽器に合う譜面を、**未配布のものから**自動提案。

## セットアップ

```bash
npm install
npm start        # http://localhost:3000
```

## 譜面の収集

```bash
# バンドル済みパブリックドメインデータ（ネットワーク不要）
node scripts/import.js seed

# Mutopia から実データを収集（再配布可・CC）
node scripts/import.js mutopia --limit 15

# IMSLP のメタデータ＋外部リンク
node scripts/import.js imslp --limit 20

# 再配布可ソースの PDF を storage/ へ取得（オープンネットワーク時）
node scripts/import.js mutopia --limit 15 --download
```

UI 左の「収集」ボタンからも同じ取り込みを実行できる（`POST /api/sources/:name/sync`）。

> **プロキシ環境での注意**: Node の組み込み `fetch` は `HTTPS_PROXY` を既定で読まない。
> 送信プロキシ経由が必要な環境では `NODE_USE_ENV_PROXY=1 node scripts/import.js ...`
> を使う（Node 22.21+）。通常のオープンネットワークでは不要。

## アーキテクチャ

```
src/
  server/
    app.js            Express アプリ生成（テストへ in-memory DB を注入可）
    index.js          起動エントリ
    db.js             better-sqlite3 初期化＋マイグレーション
    migrations.sql    スキーマ（works/composers/score_files/tags/sources）
    middleware/auth.js  Cookieセッション解決・requireAuth（Phase 3）
    routes/           works/files/sources/ensembles/distributions/auth の各 API
    services/
      library.js      検索・フィルタ・詳細（リポジトリ層）
      importer.js     収集パイプライン（正規化＆upsert、冪等）
      ensembles.js    合奏団・メンバー管理＋所有者アクセス制御
      distribution.js 配布・受信箱・既読・楽器ベース提案
      auth.js         ユーザー登録・ログイン・セッション（scrypt）
  sources/            収集元アダプタ（registerSource で追加）
    index.js / seed.js / mutopia.js / imslp.js
  notifications/      通知アダプタ（registerNotifier、既定 console）
public/               依存なしフロント（ライブラリ＋配布タブ＋認証）
  app.js / distribute.js / auth.js / index.html / styles.css
scripts/import.js     収集 CLI
test/                 node:test（35 ケース）
```

### データモデルの肝

- すべての work / score_file に `license` を保持。
- `license_redistributable` と `score_files.storage_kind`（`local` / `external`）で
  「実ファイルを持てる」か「外部リンクのみ」かを区別し、UI にライセンスバッジを表示。
- これにより「市販の現役譜面は扱わない」境界をデータ構造で強制する。

## API

| メソッド | パス | 説明 |
| --- | --- | --- |
| GET | `/api/works` | 一覧／検索（`search,composer,instrument,tag,source,redistributable`）|
| GET | `/api/works/:id` | 曲詳細（ファイル・タグ込み）|
| GET | `/api/facets` | フィルタ候補（作曲家・楽器・タグ・ソース）|
| GET | `/api/files/:id` | ローカル PDF 配信 or 外部 URL へ 302 |
| GET | `/api/sources` | 登録済み収集元一覧 |
| POST | `/api/sources/:name/sync` | 収集の実行（`{limit, download}`）|
| POST | `/api/auth/register` / `login` / `logout` | 認証（Cookie セッション）|
| GET | `/api/auth/me` | 現在のログインユーザー |
| GET/POST | `/api/ensembles` | 合奏団の一覧／作成（作成は要ログイン）|
| GET/POST | `/api/ensembles/:id/members` | メンバー一覧／追加（追加は所有者のみ）|
| GET | `/api/members/:id/inbox` | メンバーの受信箱（`{inbox, unread}`）|
| GET | `/api/members/:id/recommendations` | 楽器に合う未配布の譜面提案 |
| POST | `/api/distributions` | 配布作成（要ログイン）|
| POST | `/api/distributions/:id/read` | 既読化（`{memberId}`）|
| GET | `/api/ensembles/:id/distributions` | 配布履歴 |

> 認証は scrypt（`node:crypto`）と DB セッションのみで実装し、追加依存はなし。
> 通知はアダプタ方式（`src/notifications/`）で、既定の `console`（in-app ログ）を
> メール／プッシュ実装に差し替え可能。

## デプロイ（さくらのVPS / サブドメイン fumen）

`fumen.あなたのドメイン` での公開手順とサーバ設定一式は **[`deploy/`](deploy/)** にあります。
構成は **Node（systemd 常駐）+ nginx リバースプロキシ + Let's Encrypt(HTTPS)**。

```bash
# VPS 上での更新デプロイ（初回セットアップ後）
sudo -u fumen APP_DIR=/opt/fumen BRANCH=master bash /opt/fumen/deploy/deploy.sh
```

本番では `NODE_ENV=production`（または `SECURE_COOKIES=1`）でセッション Cookie に
`Secure` が付与され、`trust proxy` によりリバースプロキシ配下で正しく動作します。
詳細は [deploy/README.md](deploy/README.md) を参照。

## テスト

```bash
npm test
```

importer の正規化・冪等性、library の検索/フィルタ、works API、Mutopia ヘッダ解析を
カバー（in-memory DB、ネットワーク非依存）。

## 今後（Phase 4 以降）

- メール／プッシュ通知の実アダプタ実装（現状は in-app ログ）。
- メンバーアカウントとユーザーアカウントの紐付け（メンバー自身がログインして受信箱を見る）。
- パート譜の自動分割、編成・難易度での高度な提案。
