const fs = require('fs');
const zlib = require('zlib');

// Load alternate passive skills
const gz = fs.readFileSync('data/alternate_passive_skills.json.gz');
const json = JSON.parse(zlib.gunzipSync(gz).toString());

// Load zh_tw.ts
const zhContent = fs.readFileSync('frontend/src/lib/zh_tw.ts', 'utf8');

// Extract alternateSkillNames keys from zh_tw.ts - handle both quoted and unquoted keys
const nameMatch = zhContent.match(/alternateSkillNames[\s\S]*?=\s*{([\s\S]*?)};/);
const existingKeys = new Set();
if (nameMatch) {
  // Match quoted keys: 'key' or "key"
  const quotedMatches = nameMatch[1].matchAll(/'([^']+)'\s*:|"([^"]+)"\s*:/g);
  for (const m of quotedMatches) {
    existingKeys.add(m[1] || m[2]);
  }
  // Match unquoted keys: key:
  const unquotedMatches = nameMatch[1].matchAll(/^\s*([A-Za-z]\w*)\s*:/gm);
  for (const m of unquotedMatches) {
    existingKeys.add(m[1]);
  }
}

// Get unique AlternatePassiveSkill names
const names = new Set();
json.filter(x => x != null && x.Name).forEach(a => names.add(a.Name));
const sorted = [...names].sort();

// Find missing
const missing = sorted.filter(n => !existingKeys.has(n));

console.log('Total unique skill names:', sorted.length);
console.log('Existing in alternateSkillNames:', existingKeys.size);
console.log('Missing translations:', missing.length);
if (missing.length > 0) {
  missing.forEach(n => console.log('  -', n));
} else {
  console.log('All skill names are translated!');
}
