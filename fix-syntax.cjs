const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

content = content.replace(
  /const type = saleType;\| 'cash'>\('debt'\);/,
  `const type = saleType;`
);

fs.writeFileSync('src/components/Dashboard.tsx', content);
