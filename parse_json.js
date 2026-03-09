const fs = require('fs');
const dataStr = fs.readFileSync('shifts_dump.json', 'utf8').replace(/^\uFEFF/, "");
const data = JSON.parse(dataStr);
const sorted = data.shifts.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
console.log(JSON.stringify(sorted.slice(0, 5), null, 2));
