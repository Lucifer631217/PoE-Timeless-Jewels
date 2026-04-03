const fs = require('fs');
const zlib = require('zlib');

function readGz(path) {
    return JSON.parse(zlib.gunzipSync(fs.readFileSync(path)).toString());
}

const statsData = readGz('d:\\PoE 永恆珠寶\\data\\stats.json.gz');

const ids = [
    'attack_damage_leeched_as_life_%',
    'endurance_charge_on_kill_%',
    'warcry_buff_effect_+%',
    'base_max_fortification',
    'max_fortification_+1_per_5'
];

ids.forEach(id => {
    const stat = statsData.find(s => s && s.ID === id);
    if (stat) {
        console.log(`ID: ${id}, Index: ${stat.Index}, Text: ${stat.Text}`);
    } else {
        console.log(`ID: ${id} NOT FOUND`);
    }
});

// Also search by Text substring
console.log('\nSearching by Text substring:');
const searchTexts = [
    'Attack Damage Leeched as Life',
    'Endurance Charge on Kill',
    'Warcry Buff Effect',
    'maximum Fortification'
];

searchTexts.forEach(text => {
    console.log(`Searching for text: "${text}"`);
    const matches = statsData.filter(s => s && s.Text && s.Text.includes(text));
    matches.forEach(m => {
        console.log(`  MatchFound - ID: ${m.ID}, Index: ${m.Index}, Text: ${m.Text}`);
    });
});
