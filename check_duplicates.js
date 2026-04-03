const fs = require('fs');

const content = fs.readFileSync('d:\\PoE 永恆珠寶\\frontend\\src\\lib\\zh_tw.ts', 'utf8');
const statDescMatches = content.match(/statDescriptions: Record<number, string> = \{([\s\S]*?)\};/);

if (statDescMatches) {
    const list = statDescMatches[1];
    const lines = list.split('\n');
    const keys = {};
    lines.forEach(line => {
        const m = line.match(/^\s*(\d+):/);
        if (m) {
            const key = m[1];
            if (keys[key]) {
                console.log(`Duplicate key found: ${key}`);
            }
            keys[key] = true;
        }
    });
    console.log('Finished checking');
} else {
    console.log('Could not find statDescriptions');
}
