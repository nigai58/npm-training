--!strict
-- ダンジョン定義レジストリと部屋生成ロジック（src/data/DungeonData.js から移植）
-- buildRoomTemplate / buildEndlessSequence は再現性のため Random.new(seed) を受け取る。

local DungeonData = {}

local W, H = 800, 560

-- 部屋タイプの並び（全ダンジョン共通の骨格）
DungeonData.SEQUENCE = {
	"start",
	"battle", "battle", "battle",
	"treasure",
	"puzzle",
	"battle", "battle",
	"heal",
	"boss",
	"end",
}

-- 部屋タイプごとの扉構成
local DOORS = {
	start    = { south = true },
	battle   = { north = true, south = true },
	treasure = { north = true, south = true },
	puzzle   = { north = true, south = true },
	heal     = { north = true, south = true },
	boss     = { north = true },
	["end"]  = { north = true },
}

-- 五つの神具（図鑑・進捗用）
DungeonData.ALL_RELICS = {
	"hi_no_magatama",    -- 火の勾玉   朱鳥居の迷宮
	"mizu_no_kagami",    -- 水の鏡     迷い宿
	"kaze_no_suzu",      -- 風の鈴     天狗山
	"kaminari_no_taiko", -- 雷の太鼓   終電の異界
	"kage_no_men",       -- 影の面     夜市ダンジョン
}

-- ダンジョン定義レジストリ
DungeonData.DUNGEONS = {
	shubyori = {
		id = "shubyori",
		name = "朱鳥居の迷宮",
		theme = "shrine",
		floor = Color3.fromHex("221830"), wall = Color3.fromHex("150f20"),
		sequence = DungeonData.SEQUENCE,
		battleRosters = {
			{ "kooni", "kooni", "kitsunebi" },
			{ "kooni", "lantern", "kooni" },
		},
		puzzleEnemies = { "kooni" },
		puzzleNote = "封印札で結界を破れ",
		bossType = "komainu",
		bossRewards = {
			relic = { id = "hi_no_magatama", label = "火の勾玉" },
			mamori = { id = "mamoriseki", label = "狛犬の守り石" },
			clearFlag = "dungeon1_cleared",
		},
		bossDialogueKey = "boss_defeated",
		hints = { start = "kohaku_dungeon_start", boss = "kohaku_dungeon_boss" },
		unlockFlag = nil, -- 最初から入れる
	},

	mayoiyado = {
		id = "mayoiyado",
		name = "迷い宿",
		theme = "inn",
		floor = Color3.fromHex("14202a"), wall = Color3.fromHex("0a141e"),
		sequence = DungeonData.SEQUENCE,
		battleRosters = {
			{ "karakasa", "amefuri", "karakasa" },
			{ "amefuri", "mizudama", "karakasa" },
		},
		puzzleEnemies = { "karakasa" },
		puzzleNote = "封印札で水鏡の結界を割れ",
		bossType = "kyouka",
		bossRewards = {
			relic = { id = "mizu_no_kagami", label = "水の鏡" },
			mamori = { id = "kyouka_mamori", label = "鏡花の守り石" },
			clearFlag = "dungeon2_cleared",
		},
		bossDialogueKey = "boss_defeated_kyouka",
		hints = { start = "kohaku_mayoiyado_start", boss = "kohaku_mayoiyado_boss" },
		unlockFlag = "dungeon1_cleared", -- 朱鳥居クリアで解放
	},
}

-- 輪廻（エンドレス）の基本定義。敵は両ダンジョンを混成し、階層で強化される。
DungeonData.ENDLESS_DEF = {
	id = "rinne",
	name = "輪廻の鳥居",
	theme = "rinne",
	floor = Color3.fromHex("180c20"), wall = Color3.fromHex("0c0614"),
	battleRosters = {
		{ "kooni", "kitsunebi", "karakasa" },
		{ "karakasa", "lantern", "amefuri" },
		{ "kooni", "amefuri", "kooni", "kitsunebi" },
		{ "karakasa", "mizudama", "karakasa" },
	},
	puzzleEnemies = { "kooni", "karakasa" },
	puzzleNote = "封印札で結界を破れ",
	bossPool = { "komainu", "kyouka" },
	unlockFlag = "dungeon1_cleared",
}

-- 配列からランダムに 1 要素を引く（rng は Random.new()）
local function pick(rng: Random, list: { any }): any
	return list[rng:NextInteger(1, #list)]
end

-- 深度 d の階層シーケンスを組み立てる。5層ごとにボス。
function DungeonData.buildEndlessSequence(d: number, _rng: Random?): { string }
	local seq = { "start" }
	local nBattle = 2 + math.min(3, math.floor(d / 2))
	for _ = 1, nBattle do
		table.insert(seq, "battle")
	end
	if d % 3 == 0 then table.insert(seq, "treasure") end
	if d % 5 == 0 then
		table.insert(seq, "boss")
	elseif d % 2 == 0 then
		table.insert(seq, "heal")
	end
	table.insert(seq, "end")
	return seq
end

-- 部屋タイプ＋ダンジョン定義から、Room が使うテンプレートを組み立てる
function DungeonData.buildRoomTemplate(roomType: string, def: any, rng: Random): any
	local t = {
		type = roomType,
		width = W, height = H,
		doors = table.clone(DOORS[roomType]),
		floorColor = def.floor,
		wallColor = def.wall,
		theme = def.theme,
		enemies = {},
		gimmicks = {},
	}
	if roomType == "battle" then
		t.enemies = pick(rng, def.battleRosters)
	elseif roomType == "puzzle" then
		t.enemies = table.clone(def.puzzleEnemies)
		t.gimmicks = { { tag = "barrier", x = W / 2, y = H / 2 - 40 } }
		t.puzzleNote = def.puzzleNote
	elseif roomType == "treasure" then
		t.gimmicks = { { tag = "chest", x = W / 2, y = H / 2 } }
	elseif roomType == "heal" then
		t.gimmicks = { { tag = "shrine", x = W / 2, y = H / 2 } }
	elseif roomType == "boss" then
		t.enemies = { def.bossType }
	elseif roomType == "end" then
		t.gimmicks = { { tag = "torii", x = W / 2, y = H / 2 } }
	end
	return t
end

return DungeonData
