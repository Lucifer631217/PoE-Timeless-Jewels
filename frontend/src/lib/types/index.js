/* eslint-disable */
export let calculator;
export let data;

export const initializeCrystalline = () => {
  calculator = {
    Calculate: globalThis["go"]["timeless-jewels"]["calculator"]["Calculate"],
    ReverseSearch: globalThis["go"]["timeless-jewels"]["calculator"]["ReverseSearch"],
  }
  data = {
    GetAlternatePassiveAdditionByIndex: globalThis["go"]["timeless-jewels"]["data"]["GetAlternatePassiveAdditionByIndex"],
    GetAlternatePassiveSkillByIndex: globalThis["go"]["timeless-jewels"]["data"]["GetAlternatePassiveSkillByIndex"],
    GetPassiveSkillByIndex: globalThis["go"]["timeless-jewels"]["data"]["GetPassiveSkillByIndex"],
    GetStatByIndex: globalThis["go"]["timeless-jewels"]["data"]["GetStatByIndex"],
    OfficialStatTranslationLocales: globalThis["go"]["timeless-jewels"]["data"]["OfficialStatTranslationLocales"],
    PassiveSkillAuraStatTranslationsByLocaleJSON: globalThis["go"]["timeless-jewels"]["data"]["PassiveSkillAuraStatTranslationsByLocaleJSON"],
    PassiveSkillAuraStatTranslationsJSON: globalThis["go"]["timeless-jewels"]["data"]["PassiveSkillAuraStatTranslationsJSON"],
    PassiveSkillStatTranslationsByLocaleJSON: globalThis["go"]["timeless-jewels"]["data"]["PassiveSkillStatTranslationsByLocaleJSON"],
    PassiveSkillStatTranslationsJSON: globalThis["go"]["timeless-jewels"]["data"]["PassiveSkillStatTranslationsJSON"],
    PassiveSkills: globalThis["go"]["timeless-jewels"]["data"]["PassiveSkills"],
    PossibleStats: globalThis["go"]["timeless-jewels"]["data"]["PossibleStats"],
    SkillTree: globalThis["go"]["timeless-jewels"]["data"]["SkillTree"],
    StatTranslationsByLocaleJSON: globalThis["go"]["timeless-jewels"]["data"]["StatTranslationsByLocaleJSON"],
    StatTranslationsJSON: globalThis["go"]["timeless-jewels"]["data"]["StatTranslationsJSON"],
    TimelessJewelConquerors: globalThis["go"]["timeless-jewels"]["data"]["TimelessJewelConquerors"],
    TimelessJewelSeedRanges: globalThis["go"]["timeless-jewels"]["data"]["TimelessJewelSeedRanges"],
    TimelessJewels: globalThis["go"]["timeless-jewels"]["data"]["TimelessJewels"],
    TreeToPassive: globalThis["go"]["timeless-jewels"]["data"]["TreeToPassive"],
  }
}