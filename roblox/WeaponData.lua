--!strict
-- 武器定義（src/data/WeaponData.js から移植）
-- damage / swingDuration は 3 段コンボの各段に対応する配列。

local WeaponData = {
	bokuto = {
		id = "bokuto",
		label = "星灯りの木刀",
		damage = { 14, 18, 24 },
		comboWindow = 520,
		hitboxW = 62,
		hitboxH = 38,
		knockback = 200,
		swingDuration = { 180, 180, 260 },
		cooldownAfterCombo = 550,
	},
}

return WeaponData
