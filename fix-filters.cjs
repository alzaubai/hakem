const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// Use correct count for filters based on activeTab
content = content.replace(
  /{activeOrCompletedDebts\.length}/g,
  `{activeOrCompletedDebts.filter(d => activeTab === 'cashSales' ? d.isCashSale : !d.isCashSale).length}`
);

content = content.replace(
  /count=\{activeOrCompletedDebts\.filter\(d => d\.status === 'active' && \(\!isPast\(new Date\(d\.nextDueDate\)\) \|\| isToday\(new Date\(d\.nextDueDate\)\)\)\)\.length\}/,
  `count={activeOrCompletedDebts.filter(d => (activeTab === 'cashSales' ? d.isCashSale : !d.isCashSale) && d.status === 'active' && (!isPast(new Date(d.nextDueDate)) || isToday(new Date(d.nextDueDate)))).length}`
);

content = content.replace(
  /count=\{lateDebts\.length\}/,
  `count={lateDebts.filter(d => activeTab === 'cashSales' ? d.isCashSale : !d.isCashSale).length}`
);

content = content.replace(
  /count=\{activeOrCompletedDebts\.filter\(d => d\.status === 'completed'\)\.length\}/,
  `count={activeOrCompletedDebts.filter(d => (activeTab === 'cashSales' ? d.isCashSale : !d.isCashSale) && d.status === 'completed').length}`
);

fs.writeFileSync('src/components/Dashboard.tsx', content);
