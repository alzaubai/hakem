const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// Fix tabs: remove flex-1 and add flex-shrink-0 so they don't squish on iPad
content = content.replace(
  /className=\{cn\("flex-1 py-2 sm:py-2\.5 px-4 sm:px-6 rounded-lg text-xs sm:text-sm font-bold transition-all min-w-min sm:min-w-\[120px\]"/g,
  `className={cn("whitespace-nowrap flex-shrink-0 py-2 sm:py-2.5 px-4 sm:px-6 rounded-lg text-xs sm:text-sm font-bold transition-all min-w-[100px] sm:min-w-[120px]"`
);

// Also change the flex container for search and buttons to wrap on smaller tablets if needed
content = content.replace(
  /<div className="flex flex-col sm:flex-row gap-2 sm:gap-3">/g,
  `<div className="flex flex-col md:flex-row gap-2 sm:gap-3">`
);

fs.writeFileSync('src/components/Dashboard.tsx', content);
