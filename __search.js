const fs = require('fs');
const p = 'node_modules/react-dom/cjs/react-dom-client.development.js';
const s = fs.readFileSync(p, 'utf8');
const needle = 'Encountered a script tag';
const i = s.indexOf(needle);
if (i >= 0) { fs.writeFileSync('__react_warn.txt', s.slice(Math.max(0, i - 1500), i + 800)); console.log('found at', i); } else { console.log('not found'); }
