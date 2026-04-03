import fs from 'fs';
import path from 'path';

const valuesContent = fs.readFileSync('./frontend/src/lib/values.ts', 'utf-8');
const zhTwContent = fs.readFileSync('./frontend/src/lib/zh_tw.ts', 'utf-8');

// Extract stat descriptions
const statDescriptionsMatch = zhTwContent.match(/export const statDescriptions: Record<number, string> = {([\s\S]*?)};/);
let translatedLocally = 0;
let translatedFallback = 0;
let missing = [];

if (statDescriptionsMatch) {
  const dictStr = statDescriptionsMatch[1];
  const keys = [...dictStr.matchAll(/(\d+):/g)].map(m => parseInt(m[1]));
  const statDescs = new Set(keys);

  // Extract fallback
  const fallbackMatch = zhTwContent.match(/export const englishFallbackTranslations: Record<string, string> = {([\s\S]*?)};/);
  let fallbacks = new Set();
  // We can't perfectly extract fallback strings with a simple regex since they contain quotes, etc., but we can try
  
  // Parse statValues
  const lines = valuesContent.split('\n');
  const statIds = [];
  const statEnglish = {};
  for(const line of lines) {
    const match = line.match(/^\s*(\d+):\s*\d+,?(?:\s*\/\/\s*(.*))?$/);
    if (match) {
      const id = parseInt(match[1]);
      const commentText = (match[2] || '').trim();
      statIds.push(id);
      statEnglish[id] = commentText;
    }
  }

  for(const id of statIds) {
    if (statDescs.has(id)) {
      translatedLocally++;
    } else {
      // Check if it's in fallback. Rough check by string inclusion in zh_tw.ts:
      const eng = statEnglish[id].replace(/'/g, "\\'"); // escape single quotes
      if (zhTwContent.includes(eng)) {
          translatedFallback++;
      } else {
          missing.push({id, text: statEnglish[id]});
      }
    }
  }

  console.log(`Total used stats in values.ts with comments: ${statIds.length}`);
  console.log(`Translated in statDescriptions: ${translatedLocally}`);
  console.log(`Translated in fallback: ${translatedFallback}`);
  console.log(`Missing translations: ${missing.length}`);
  missing.forEach(m => console.log(`  ${m.id}: '${m.text}'`));
} else {
  console.log('Could not find statDescriptions');
}
