const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// Table Headers
content = content.replace(
  /className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 whitespace-nowrap"/g,
  `className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-700 whitespace-nowrap"`
);
content = content.replace(
  /className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 text-center whitespace-nowrap"/g,
  `className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-700 text-center whitespace-nowrap"`
);

// Table Cells
content = content.replace(
  /className="px-3 sm:px-5 py-3 sm:py-4"/g,
  `className="px-3 sm:px-4 py-2.5 sm:py-3"`
);
content = content.replace(
  /className="px-3 sm:px-5 py-3 sm:py-4 text-slate-500 text-\[10px\] sm:text-xs font-medium whitespace-nowrap"/g,
  `className="px-3 sm:px-4 py-2.5 sm:py-3 text-slate-500 text-[10px] sm:text-xs font-medium whitespace-nowrap"`
);
content = content.replace(
  /className="px-3 sm:px-5 py-3 sm:py-4 text-slate-900 font-bold"/g,
  `className="px-3 sm:px-4 py-2.5 sm:py-3 text-slate-900 font-bold"`
);
content = content.replace(
  /className="px-3 sm:px-5 py-3 sm:py-4 text-slate-600 font-medium"/g,
  `className="px-3 sm:px-4 py-2.5 sm:py-3 text-slate-600 font-medium"`
);
content = content.replace(
  /className="px-3 sm:px-5 py-3 sm:py-4 font-black text-red-600"/g,
  `className="px-3 sm:px-4 py-2.5 sm:py-3 font-black text-red-600"`
);
content = content.replace(
  /className="px-3 sm:px-5 py-3 sm:py-4 text-slate-700 font-medium whitespace-nowrap"/g,
  `className="px-3 sm:px-4 py-2.5 sm:py-3 text-slate-700 font-medium whitespace-nowrap"`
);
content = content.replace(
  /className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap"/g,
  `className="px-3 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap"`
);
content = content.replace(
  /className="px-3 sm:px-5 py-3 sm:py-4 text-center"/g,
  `className="px-3 sm:px-4 py-2.5 sm:py-3 text-center"`
);

fs.writeFileSync('src/components/Dashboard.tsx', content);
