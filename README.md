# オーケストラ譜面ライブラリ

パブリックドメイン（著作権切れ）／Creative Commons の譜面を各所から収集し、
**曲・パート・楽器ごとに整理して扱えるライブラリ** を提供する Web アプリ。

オーケストラで配られる譜面が「自分のパート以外も溜まる・種類が多すぎて散らかる」
という悩みを、**収集 → 整理 → 検索 → パート別に取り出す** の流れで解決する。

> 著作権の都合で市販の現役譜面は配布できないため、**ライセンスが明確な無料譜面に
> 範囲を限定**している。再配布が許可された譜面（Mutopia=CC）と、リンク誘導のみに
> 留める譜面（IMSLP）をデータ構造レベルで区別する。

## 機能（MVP）

- **譜面ライブラリ管理**: 一覧／キーワード検索／作曲家・楽器・タグ・ソース・
  ライセンスでの絞り込み、曲詳細（パート別ファイル＋ライセンスバッジ）
- **「自分の楽器」で絞り込み**（`score_files.instrument`）
- **パブリックドメイン収集**: ソースアダプタ方式で複数ソースに対応
  - `seed` … バンドル済みの厳選パブリックドメイン作品（ネット不要・デモ初期データ）
  - `mutopia` … Mutopia Project（CC、再配布可）。GitHub 上の LilyPond ヘッダから
    実データを収集
  - `imslp` … IMSLP（著作権切れ、再配布グレー）。メタデータ＋外部リンクのみ

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
    routes/           works / files / sources の各 API
    services/
      library.js      検索・フィルタ・詳細（リポジトリ層）
      importer.js     収集パイプライン（正規化＆upsert、冪等）
  sources/            収集元アダプタ（registerSource で追加）
    index.js          レジストリ
    seed.js / mutopia.js / imslp.js
public/               依存なしフロント（一覧・検索・詳細）
scripts/import.js     収集 CLI
test/                 node:test
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

## テスト

```bash
npm test
```

importer の正規化・冪等性、library の検索/フィルタ、works API、Mutopia ヘッダ解析を
カバー（in-memory DB、ネットワーク非依存）。

## 今後（Phase 2）

- 合奏団・メンバー登録（役割: 指揮者／パートリーダー／団員）
- 指揮者・パートリーダーから登録メンバーへの譜面**配布／共有**（再配布可ソース限定）
- 認証。`services/` のリポジトリ層分離により追加が容易。
