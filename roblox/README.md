# Roblox 移植用データ（Lua ModuleScript）

ブラウザ版プロトタイプ（`src/data/*.js`）のゲームデータを、Roblox Studio で
そのまま使える **Lua の ModuleScript** に変換したものです。
すべて純粋なデータ／純粋関数なので、描画・物理・入力とは独立しています。

## ファイル一覧

| ファイル | 元 (`src/data/`) | 内容 |
|----------|------------------|------|
| `EnemyData.lua`    | `EnemyData.js`    | 敵8種のステータス（HP・速度・攻撃・色など） |
| `OfudaData.lua`    | `OfudaData.js`    | お札3種（火・風・封印）の効果・クールダウン |
| `WeaponData.lua`   | `WeaponData.js`   | 武器（木刀）の3段コンボ・ヒットボックス |
| `RewardData.lua`   | `RewardData.js`   | 宝箱・敵ドロップの報酬テーブル |
| `UpgradeData.lua`  | `UpgradeData.js`  | 恒久強化の定義＋`computeStats`等の純粋関数 |
| `BlessingData.lua` | `BlessingData.js` | ラン内ご利益9種＋`pickBlessings` |
| `DungeonData.lua`  | `DungeonData.js`  | ダンジョン定義レジストリ＋部屋生成ロジック |
| `DialogueData.lua` | `DialogueData.js` | プロローグ・NPC・ボス撃破などの全会話 |

## 値の変換ルール

| JS | Lua |
|----|-----|
| `0xRRGGBB`（色） | `Color3.fromHex("RRGGBB")` |
| 配列 `[a, b, c]` | テーブル `{ a, b, c }`（1始まり） |
| `null` | `nil` |
| `export const X` | `local X = ...; return X`（ModuleScript） |
| 純粋関数 | `function M.fn(...)` として同梱 |

> **注意（配列インデックス）**: JS は0始まり、Luaは1始まりです。
> `UpgradeData.upgradeCost(id, currentLevel)` の `currentLevel` は
> 「習得済みレベル数（0=未習得）」として扱い、内部で `costs[currentLevel + 1]`
> を引いています。呼び出し側のレベル管理は0始まりのままで動きます。

## Roblox Studio への取り込み方

### 方法A: 手動（少数なら手軽）
1. Studio の Explorer で `ReplicatedStorage` を右クリック →
   **Insert Object → Folder**、名前を `GameData` にする。
2. `GameData` を右クリック → **Insert Object → ModuleScript** を8個作成し、
   それぞれ `EnemyData` などにリネーム。
3. 各 `.lua` の中身をコピーして対応する ModuleScript に貼り付け。

### 方法B: Rojo（推奨・ファイルのまま同期）
[Rojo](https://rojo.space/) を使うとこのフォルダをそのまま Studio に同期できます。

```json
// default.project.json の例（ReplicatedStorage.GameData にマップ）
{
  "name": "wafuu-dungeon",
  "tree": {
    "$className": "DataModel",
    "ReplicatedStorage": {
      "GameData": {
        "$path": "roblox"
      }
    }
  }
}
```

```bash
rojo serve   # Studio の Rojo プラグインから Connect
```

## 使い方の例（他の ModuleScript / Script から）

```lua
local GameData = game.ReplicatedStorage.GameData
local EnemyData = require(GameData.EnemyData)
local UpgradeData = require(GameData.UpgradeData)

-- 敵を生成するとき
local kooni = EnemyData.kooni
print(kooni.label, kooni.hp)          -- 小鬼  36
part.Color = kooni.color              -- Color3 をそのまま使える

-- プレイヤーの実効ステータス
local stats = UpgradeData.computeStats({ maxHp = 2, attack = 1 })
print(stats.maxHp, stats.attackMult)  -- 140  1.15

-- 強化費用（習得済み1レベル → 次の費用）
print(UpgradeData.upgradeCost("attack", 1))  -- 50

-- ダンジョンの部屋を生成（再現性のため seed 付き Random）
local DungeonData = require(GameData.DungeonData)
local rng = Random.new(12345)
local def = DungeonData.DUNGEONS.shubyori
local room = DungeonData.buildRoomTemplate("battle", def, rng)
print(table.concat(room.enemies, ", "))

-- ご利益を3つ抽選
local BlessingData = require(GameData.BlessingData)
local choices = BlessingData.pickBlessings(3, rng)

-- 会話を再生
local DialogueData = require(GameData.DialogueData)
for _, line in ipairs(DialogueData.prologue) do
    print(line.speaker, line.text)
end
```

## まだ Lua 化していないもの（必要なら別途依頼してください）

このフォルダは **データ層** のみです。以下のロジック層は今回未変換です:
- 戦闘計算（`CombatSystem`）、敵AI（FSM）、部屋遷移管理（`DungeonSystem`）
- プレイヤー移動・入力・コンボ状態（`Player`）
- セーブ（ブラウザは localStorage → Roblox は `DataStoreService`）

データ層が揃っているので、Roblox側ではこれらを `require` しながら
サーバースクリプトとして実装していく形になります。
