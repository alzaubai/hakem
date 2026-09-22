const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

content = content.replace(
  /<div className="flex flex-col md:flex-row gap-2 sm:gap-3">/g,
  `<div className="flex flex-col sm:flex-row gap-2 sm:gap-3">`
);

fs.writeFileSync('src/components/Dashboard.tsx', content);
