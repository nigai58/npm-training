--!strict
-- ラン内ご利益（src/data/BlessingData.js から移植）
-- apply(run, pds) で run テーブル（RunState 相当）に効果を反映する。
-- run は { damageReduction, speedMult, magatamaMult, comboFinisherMult,
--          ofudaCdMult, lifestealOnKill, ofudaDamageMult={fire,wind,seal},
--          ofudaRadiusMult={fire,wind,seal} } を持つ前提。

local BlessingData = {}

BlessingData.BLESSINGS = {
	{ id = "firewall", label = "火防の護符", icon = "🛡", desc = "被ダメージ -15%",
		apply = function(r, _) r.damageReduction = math.min(0.6, r.damageReduction + 0.15) end },
	{ id = "idaten", label = "韋駄天の足", icon = "🌀", desc = "移動速度 +20%",
		apply = function(r, _) r.speedMult = r.speedMult * 1.2 end },
	{ id = "fox", label = "狐の加護", icon = "🦊", desc = "勾玉ドロップ +50%",
		apply = function(r, _) r.magatamaMult = r.magatamaMult * 1.5 end },
	{ id = "fireheat", label = "火札の熱", icon = "🔥", desc = "火札ダメージ +40%",
		apply = function(r, _) r.ofudaDamageMult.fire = r.ofudaDamageMult.fire * 1.4 end },
	{ id = "windread", label = "風読み", icon = "💨", desc = "風札の範囲 +40%",
		apply = function(r, _) r.ofudaRadiusMult.wind = r.ofudaRadiusMult.wind * 1.4 end },
	{ id = "combo", label = "破魔の冴え", icon = "⚔", desc = "コンボ3段目 +50%",
		apply = function(r, _) r.comboFinisherMult = r.comboFinisherMult * 1.5 end },
	{ id = "jintsu", label = "神通", icon = "⛩", desc = "お札クールダウン -25%",
		apply = function(r, _) r.ofudaCdMult = r.ofudaCdMult * 0.75 end },
	{ id = "lifesteal", label = "生命の勾玉", icon = "💗", desc = "敵を鎮めるとHP +3",
		apply = function(r, _) r.lifestealOnKill = r.lifestealOnKill + 3 end },
	{ id = "kongo", label = "金剛の護り", icon = "🟡", desc = "このランの最大HP +20",
		apply = function(_, pds) if pds and pds.addRunMaxHp then pds:addRunMaxHp(20) end end },
}

local BY_ID = {}
for _, b in ipairs(BlessingData.BLESSINGS) do
	BY_ID[b.id] = b
end

function BlessingData.getBlessing(id: string)
	return BY_ID[id]
end

-- n 個をランダムに重複なく選ぶ（Fisher–Yates）。
-- rng は Random.new() のインスタンス。省略時はグローバル math.random を使う。
function BlessingData.pickBlessings(n: number, rng: Random?)
	local pool = {}
	for i, b in ipairs(BlessingData.BLESSINGS) do
		pool[i] = b
	end
	for i = #pool, 2, -1 do
		local j: number
		if rng then
			j = rng:NextInteger(1, i)
		else
			j = math.random(1, i)
		end
		pool[i], pool[j] = pool[j], pool[i]
	end
	local count = math.min(n, #pool)
	local out = {}
	for i = 1, count do
		out[i] = pool[i]
	end
	return out
end

return BlessingData
