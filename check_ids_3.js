const fs = require('fs');
const zlib = require('zlib');

function readGz(path) {
    return JSON.parse(zlib.gunzipSync(fs.readFileSync(path)).toString());
}

const statsData = readGz('d:\\PoE 永恆珠寶\\data\\stats.json.gz');

const keywords = ['leech', 'warcry', 'fortif', 'endurance', 'kill'];

keywords.forEach(kw => {
    console.log(`\nSearching for keyword: "${kw}"`);
    const matches = statsData.filter(s => s && s.ID && s.ID.toLowerCase().includes(kw.toLowerCase()));
    matches.forEach(m => {
        console.log(`  ID: ${m.ID}, Index: ${m.Index}, Text: ${m.Text}`);
    });
});
