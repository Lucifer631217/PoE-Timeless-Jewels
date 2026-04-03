const fs = require('fs');
const zlib = require('zlib');

function readGz(path) {
    return JSON.parse(zlib.gunzipSync(fs.readFileSync(path)).toString());
}

const statsData = readGz('d:\\PoE 永恆珠寶\\data\\stats.json.gz');
const descriptions = [
    readGz('d:\\PoE 永恆珠寶\\data\\stat_descriptions.json.gz'),
    readGz('d:\\PoE 永恆珠寶\\data\\passive_skill_stat_descriptions.json.gz'),
    readGz('d:\\PoE 永恆珠寶\\data\\passive_skill_aura_stat_descriptions.json.gz')
];

const targetStrings = [
    '#% of Attack Damage Leeched as Life',
    '#% chance to gain an Endurance Charge on Kill',
    '#% increased Warcry Buff Effect',
    '+# to maximum Fortification'
];

targetStrings.forEach(target => {
    console.log(`\nSearching for: "${target}"`);
    const results = [];
    descriptions.forEach(descFile => {
        descFile.descriptors.forEach(desc => {
            desc.list.forEach(item => {
                let s = item.string.replace(/\{\d(?::(.*?)d(.*?))\}/g, '$1#$2').replace(/\{\d\}/g, '#');
                if (s === target || s === '+' + target || s === target.replace('+', '')) {
                    // Find all numerical IDs for these stat IDs
                    desc.ids.forEach(statId => {
                        const numericalStat = statsData.find(s => s.ID === statId);
                        results.push({
                            statId: statId,
                            numericalIndex: numericalStat ? numericalStat.Index : 'unknown',
                            string: item.string,
                            normalized: s
                        });
                    });
                }
            });
        });
    });
    console.log(JSON.stringify(results, null, 2));
});
