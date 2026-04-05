package data

import "testing"

func TestVisibleTimelessJewelConquerorsMatchesCurrent3_28Data(t *testing.T) {
	expected := map[JewelType][]Conqueror{
		GloriousVanity:  {Xibaqua, Ahuana, Doryani},
		LethalPride:     {Kaom, Rakiata, Akoya},
		BrutalRestraint: {Balbala, Asenath, Nasima},
		MilitantFaith:   {Maxarius, Dominus, Avarius},
		ElegantHubris:   {Cadiro, Victario, Caspiro},
	}

	for jewelType, conquerors := range expected {
		actual, ok := VisibleTimelessJewelConquerors[jewelType]
		if !ok {
			t.Fatalf("missing visible conquerors for jewel type %v", jewelType)
		}

		if len(actual) != len(conquerors) {
			t.Fatalf("unexpected conqueror count for jewel type %v: got %d want %d", jewelType, len(actual), len(conquerors))
		}

		for _, conqueror := range conquerors {
			if actual[conqueror] == nil {
				t.Fatalf("missing active conqueror %q for jewel type %v", conqueror, jewelType)
			}
		}
	}

	legacy := map[JewelType][]Conqueror{
		GloriousVanity:  {Zerphi},
		LethalPride:     {Kiloava},
		BrutalRestraint: {Deshret},
		MilitantFaith:   {Venarius},
		ElegantHubris:   {Chitus},
	}

	for jewelType, conquerors := range legacy {
		for _, conqueror := range conquerors {
			if VisibleTimelessJewelConquerors[jewelType][conqueror] != nil {
				t.Fatalf("legacy conqueror %q should not be visible for jewel type %v", conqueror, jewelType)
			}
		}
	}
}
