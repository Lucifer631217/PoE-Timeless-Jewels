package data

var VisibleTimelessJewelConquerors map[JewelType]map[Conqueror]*TimelessJewelConqueror

func BuildVisibleTimelessJewelConquerors() map[JewelType]map[Conqueror]*TimelessJewelConqueror {
	visible := make(map[JewelType]map[Conqueror]*TimelessJewelConqueror)

	for jewelType, conquerors := range TimelessJewelConquerors {
		for conquerorName, conqueror := range conquerors {
			if !isVisibleTimelessJewelConqueror(jewelType, conqueror) {
				continue
			}

			if _, ok := visible[jewelType]; !ok {
				visible[jewelType] = make(map[Conqueror]*TimelessJewelConqueror)
			}

			visible[jewelType][conquerorName] = conqueror
		}
	}

	return visible
}

func isVisibleTimelessJewelConqueror(jewelType JewelType, conqueror *TimelessJewelConqueror) bool {
	if conqueror == nil {
		return false
	}

	for _, skill := range AlternatePassiveSkills {
		if skill == nil {
			continue
		}

		if skill.AlternateTreeVersionsKey != uint32(jewelType) {
			continue
		}

		if skill.ConquerorIndex != conqueror.Index || skill.ConquerorVersion != conqueror.Version {
			continue
		}

		if skill.EnabledWeight == 0 {
			continue
		}

		for _, passiveType := range skill.PassiveType {
			if passiveType == KeyStone {
				return true
			}
		}
	}

	return false
}
