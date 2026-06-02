--!strict
-- 恒久強化の定義（src/data/UpgradeData.js から移植）
-- costs[level] が次レベルの費用。computeStats は PDS 非依存の純粋関数。
-- 注意: JS は配列が 0 始まり、Lua は 1 始まり。currentLevel は「習得済みレベル数」
-- （0 = 未習得）として扱い、次の費用は costs[currentLevel + 1] で引く。

local UpgradeData = {}

UpgradeData.UPGRADE_DEFS = {
	maxHp = {
		label = "体力の護符", npc = "shrine", currency = "magatama",
		costs = { 20, 40, 80 }, desc = "最大HP +20",
	},
	dodge = {
		label = "韋駄天", npc = "shrine", currency = "magatama",
		costs = { 35 }, desc = "回避の再使用 -20%",
	},
	attack = {
		label = "刃の研ぎ", npc = "kajiya", currency = "magatama",
		costs = { 25, 50, 100 }, desc = "攻撃力 +15%",
	},
	ofudaPower = {
		label = "霊力増幅", npc = "fudaya", currency = "magatama",
		costs = { 25, 50 }, desc = "お札ダメージ +25%",
	},
	ofudaCd = {
		label = "早駆けの札", npc = "fudaya", currency = "magatama",
		costs = { 30, 60 }, desc = "お札クールダウン -15%",
	},
}

UpgradeData.NPC_UPGRADES = {
	shrine = { "maxHp", "dodge" },
	kajiya = { "attack" },
	fudaya = { "ofudaPower", "ofudaCd" },
}

UpgradeData.NPC_LABEL = {
	shrine = "星見神社",
	kajiya = "鍛冶屋・火月",
	fudaya = "札屋・紙月",
}

-- 強化の最大レベル（= 費用配列の長さ）
function UpgradeData.upgradeMaxLevel(id: string): number
	local def = UpgradeData.UPGRADE_DEFS[id]
	return def and #def.costs or 0
end

-- 次レベルの費用。最大なら nil。
function UpgradeData.upgradeCost(id: string, currentLevel: number): number?
	local def = UpgradeData.UPGRADE_DEFS[id]
	local costs = def and def.costs or {}
	if currentLevel < #costs then
		return costs[currentLevel + 1]
	end
	return nil
end

-- 強化レベル群から実効ステータスを計算する純粋関数。
function UpgradeData.computeStats(levels: { [string]: number }?)
	local lv = function(k: string): number
		return (levels and levels[k]) or 0
	end
	return {
		maxHp          = 100 + lv("maxHp") * 20,
		attackMult     = 1 + lv("attack") * 0.15,
		ofudaPowerMult = 1 + lv("ofudaPower") * 0.25,
		ofudaCdMult    = 1 - lv("ofudaCd") * 0.15,
		dodgeCdMult    = 1 - lv("dodge") * 0.20,
	}
end

return UpgradeData
