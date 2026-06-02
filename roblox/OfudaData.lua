--!strict
-- お札（スキル）定義（src/data/OfudaData.js から移植）

local OfudaData = {
	fire = {
		id = "fire",
		label = "火札",
		icon = "🔥",
		cooldown = 4000,
		color = Color3.fromHex("ff4400"),
		projectileSpeed = 320,
		damage = 25,
		radius = 0,
		gimmickTag = "lantern",
	},
	wind = {
		id = "wind",
		label = "風札",
		icon = "💨",
		cooldown = 5000,
		color = Color3.fromHex("88ddff"),
		radius = 140,
		knockbackForce = 320,
		damage = 10,
		gimmickTag = "windmill",
	},
	seal = {
		id = "seal",
		label = "封印札",
		icon = "⛩",
		cooldown = 6000,
		color = Color3.fromHex("aa88ff"),
		radius = 160,
		stunDuration = 2000,
		damage = 5,
		gimmickTag = "barrier",
	},
}

return OfudaData
