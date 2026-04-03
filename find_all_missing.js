const fs = require('fs');
const zlib = require('zlib');

const zhTwContent = fs.readFileSync('./frontend/src/lib/zh_tw.ts', 'utf-8');
const statsDescJson = JSON.parse(zlib.gunzipSync(fs.readFileSync('./data/passive_skill_stat_descriptions.json.gz')).toString('utf-8'));
const idToDesc = {};
statsDescJson.descriptors.forEach(d => {
  d.ids.forEach(id => {
    idToDesc[id] = d.list[0].string;
  });
});

// Extract stat descriptions
const statDescriptionsMatch = zhTwContent.match(/export const statDescriptions: Record<number, string> = {([\s\S]*?)};/);
let statDescs = new Set();
if (statDescriptionsMatch) {
  const dictStr = statDescriptionsMatch[1];
  const keys = [...dictStr.matchAll(/(\d+):/g)].map(m => parseInt(m[1]));
  statDescs = new Set(keys);
}

// Extract fallback descriptions (basic strings)
const fallbackMatch = zhTwContent.match(/export const englishFallbackTranslations: Record<string, string> = {([\s\S]*?)};/);
let englishFallbacks = [];
if (fallbackMatch) {
  // basic parsing to find the string keys ignoring the exact value
  // we'll just check if the string includes it later
}

const statsJson = JSON.parse(zlib.gunzipSync(fs.readFileSync('./data/stats.json.gz')).toString('utf-8'));

function checkMissingKeys(dataObj, sourceName, statsArray) {
  Object.values(dataObj).forEach(entry => {
    if (entry.StatsKeys) {
      entry.StatsKeys.forEach(statId => {
        if (!statDescs.has(statId)) {
          const statData = statsJson[statId];
          if (statData) {
            statsArray.push({id: statId, text: statData.Id || statData.ID || String(statId), source: sourceName});
          }
        }
      });
    }
  });
}

const missingStats = [];

// Check AlternatePassiveSkills
const altSkills = JSON.parse(zlib.gunzipSync(fs.readFileSync('./data/alternate_passive_skills.json.gz')).toString('utf-8'));
checkMissingKeys(altSkills, 'AlternatePassiveSkill', missingStats);

// Check AlternatePassiveAdditions
const altAdds = JSON.parse(zlib.gunzipSync(fs.readFileSync('./data/alternate_passive_additions.json.gz')).toString('utf-8'));
checkMissingKeys(altAdds, 'AlternatePassiveAddition', missingStats);

// Remove duplicates based on ID
const uniqueMissing = missingStats.reduce((acc, curr) => {
  if (!acc.some(item => item.id === curr.id)) {
    acc.push(curr);
  }
  return acc;
}, []);

// Also check englishFallbackTranslations? Since we can't perfectly extract, let's just print unique that aren't matched
const trulyMissing = [];
for (let m of uniqueMissing) {
  // Escape single quote roughly just for inclusion test
  const testText = m.text ? String(m.text).replace(/'/g, "\\'") : String(m.id);
  if (!zhTwContent.includes(testText)) {
    trulyMissing.push(m);
  }
}

trulyMissing.forEach(m => {
  const desc = idToDesc[m.text] || 'N/A';
  console.log(`--- ${m.id} ---`);
  console.log(`Internal ID: ${m.text}`);
  console.log(`English Description: ${desc.replace(/\n/g, ' / ')}`);
});


