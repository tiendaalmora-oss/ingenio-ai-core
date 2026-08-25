const fs = require('fs');

const entry = fs.existsSync('./dist/src/main.js')
  ? './dist/src/main.js'
  : './dist/main.js';

console.log(`🚀 Starting application from ${entry}...`);
require(entry);
