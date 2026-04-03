const fs = require('fs');

const tw = fs
  .readFileSync(
    'C:/Users/Lucifer/.gemini/antigravity/brain/cdab88d4-494b-4008-89c6-cc25268763ed/.system_generated/steps/49/content.md',
    'utf-8'
  )
  .split('\n');
const us = fs
  .readFileSync(
    'C:/Users/Lucifer/.gemini/antigravity/brain/cdab88d4-494b-4008-89c6-cc25268763ed/.system_generated/steps/60/content.md',
    'utf-8'
  )
  .split('\n');

const res = {};
let pattern = /^\[(.*?)\]/;

for (let i = 0; i < tw.length; i++) {
  if (tw[i].includes('poedb.tw/tw/') && us[i].includes('poedb.tw/us/')) {
    const twMatch = tw[i].match(pattern);
    const usMatch = us[i].match(pattern);
    if (twMatch && usMatch && usMatch[1] && twMatch[1] && usMatch[1] !== twMatch[1]) {
      res[usMatch[1]] = twMatch[1];
    }
  }
}
console.log(JSON.stringify(res, null, 2));
