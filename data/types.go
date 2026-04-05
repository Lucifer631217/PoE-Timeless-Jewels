package data

import "encoding/json"

type Stat struct {
	Index    uint32  `json:"_key"`
	ID       string  `json:"Id"`
	Text     string  `json:"Text"`
	Category *uint32 `json:"Category"`
}

type PassiveSkill struct {
	Index               uint32   `json:"_key"`
	ID                  string   `json:"Id"`
	StatIndices         []uint32 `json:"Stats"`
	PassiveSkillGraphID uint32   `json:"PassiveSkillGraphId"`
	Name                string   `json:"Name"`
	IsKeystone          bool     `json:"IsKeystone"`
	IsNotable           bool     `json:"IsNotable"`
	IsJewelSocket       bool     `json:"IsJewelSocket"`
}

type AlternateTreeVersion struct {
	Index                                  uint32 `json:"_key"`
	ID                                     string `json:"Id"`
	AreSmallAttributePassiveSkillsReplaced bool   `json:"Var1"`
	AreSmallNormalPassiveSkillsReplaced    bool   `json:"Var2"`
	MinimumAdditions                       uint32 `json:"Var5"`
	MaximumAdditions                       uint32 `json:"Var6"`
	NotableReplacementSpawnWeight          uint32 `json:"Var9"`
}

type AlternatePassiveSkill struct {
	Index                    uint32             `json:"_key"`
	ID                       string             `json:"Id"`
	AlternateTreeVersionsKey uint32             `json:"AlternateTreeVersionsKey"`
	Name                     string             `json:"Name"`
	PassiveType              []PassiveSkillType `json:"PassiveType"`
	StatsKeys                []uint32           `json:"StatsKeys"`
	Stat1Min                 uint32             `json:"Stat1Min"`
	Stat1Max                 uint32             `json:"Stat1Max"`
	Stat2Min                 uint32             `json:"Stat2Min"`
	Stat2Max                 uint32             `json:"Stat2Max"`
	Stat3Min                 uint32             `json:"Var9"`
	Stat3Max                 uint32             `json:"Var10"`
	Stat4Min                 uint32             `json:"Var11"`
	Stat4Max                 uint32             `json:"Var12"`
	SpawnWeight              uint32             `json:"SpawnWeight"`
	ConquerorIndex           uint32             `json:"Var18"`
	RandomMin                uint32             `json:"RandomMin"`
	RandomMax                uint32             `json:"RandomMax"`
	ConquerorVersion         uint32             `json:"Var24"`
	EnabledWeight            uint32             `json:"Var25"`
}

func (a *AlternatePassiveSkill) GetStatMinMax(statMin bool, index uint32) uint32 {
	switch statMin {
	case true:
		switch index {
		case 0:
			return a.Stat1Min
		case 1:
			return a.Stat2Min
		case 2:
			return a.Stat3Min
		case 3:
			return a.Stat4Min
		}
	case false:
		switch index {
		case 0:
			return a.Stat1Max
		case 1:
			return a.Stat2Max
		case 2:
			return a.Stat3Max
		case 3:
			return a.Stat4Max
		}
	}
	return 0
}

func (a *AlternatePassiveSkill) UnmarshalJSON(data []byte) error {
	type alias AlternatePassiveSkill
	type signedAlias struct {
		alias
		Stat1Min  int64 `json:"Stat1Min"`
		Stat1Max  int64 `json:"Stat1Max"`
		Stat2Min  int64 `json:"Stat2Min"`
		Stat2Max  int64 `json:"Stat2Max"`
		Stat3Min  int64 `json:"Var9"`
		Stat3Max  int64 `json:"Var10"`
		Stat4Min  int64 `json:"Var11"`
		Stat4Max  int64 `json:"Var12"`
		RandomMin int64 `json:"RandomMin"`
		RandomMax int64 `json:"RandomMax"`
	}

	var decoded signedAlias
	if err := json.Unmarshal(data, &decoded); err != nil {
		return err
	}

	*a = AlternatePassiveSkill(decoded.alias)
	a.Stat1Min = uint32(int32(decoded.Stat1Min))
	a.Stat1Max = uint32(int32(decoded.Stat1Max))
	a.Stat2Min = uint32(int32(decoded.Stat2Min))
	a.Stat2Max = uint32(int32(decoded.Stat2Max))
	a.Stat3Min = uint32(int32(decoded.Stat3Min))
	a.Stat3Max = uint32(int32(decoded.Stat3Max))
	a.Stat4Min = uint32(int32(decoded.Stat4Min))
	a.Stat4Max = uint32(int32(decoded.Stat4Max))
	a.RandomMin = uint32(int32(decoded.RandomMin))
	a.RandomMax = uint32(int32(decoded.RandomMax))

	return nil
}

type AlternatePassiveAddition struct {
	Index                    uint32             `json:"_key"`
	ID                       string             `json:"Id"`
	AlternateTreeVersionsKey uint32             `json:"AlternateTreeVersionsKey"`
	SpawnWeight              uint32             `json:"SpawnWeight"`
	StatsKeys                []uint32           `json:"StatsKeys"`
	Stat1Min                 uint32             `json:"Stat1Min"`
	Stat1Max                 uint32             `json:"Stat1Max"`
	Stat2Min                 uint32             `json:"Var6"`
	Stat2Max                 uint32             `json:"Var7"`
	PassiveType              []PassiveSkillType `json:"PassiveType"`
}

func (a *AlternatePassiveAddition) GetStatMinMax(statMin bool, index uint32) uint32 {
	switch statMin {
	case true:
		switch index {
		case 0:
			return a.Stat1Min
		case 1:
			return a.Stat2Min
		}
	case false:
		switch index {
		case 0:
			return a.Stat1Max
		case 1:
			return a.Stat2Max
		}
	}
	return 0
}

func (a *AlternatePassiveAddition) UnmarshalJSON(data []byte) error {
	type alias AlternatePassiveAddition
	type signedAlias struct {
		alias
		Stat1Min int64 `json:"Stat1Min"`
		Stat1Max int64 `json:"Stat1Max"`
		Stat2Min int64 `json:"Var6"`
		Stat2Max int64 `json:"Var7"`
	}

	var decoded signedAlias
	if err := json.Unmarshal(data, &decoded); err != nil {
		return err
	}

	*a = AlternatePassiveAddition(decoded.alias)
	a.Stat1Min = uint32(int32(decoded.Stat1Min))
	a.Stat1Max = uint32(int32(decoded.Stat1Max))
	a.Stat2Min = uint32(int32(decoded.Stat2Min))
	a.Stat2Max = uint32(int32(decoded.Stat2Max))

	return nil
}
