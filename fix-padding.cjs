const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

content = content.replace(
  /<div className="max-w-6xl mx-auto pb-20">/,
  `<div className="max-w-6xl mx-auto pb-4">`
);

fs.writeFileSync('src/components/Dashboard.tsx', content);
