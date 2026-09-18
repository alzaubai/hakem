const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// Expenses headers and cells
content = content.replace(
  /className="px-5 py-4 font-bold text-slate-700"/g,
  `className="px-4 py-3 font-bold text-slate-700"`
);
content = content.replace(
  /className="px-5 py-4 font-bold text-slate-700 text-center"/g,
  `className="px-4 py-3 font-bold text-slate-700 text-center"`
);
content = content.replace(
  /className="px-5 py-4 text-slate-500 font-medium"/g,
  `className="px-4 py-3 text-slate-500 font-medium"`
);
content = content.replace(
  /className="px-5 py-4 font-bold text-slate-800"/g,
  `className="px-4 py-3 font-bold text-slate-800"`
);
content = content.replace(
  /className="px-5 py-4 font-bold text-red-600"/g,
  `className="px-4 py-3 font-bold text-red-600"`
);
content = content.replace(
  /className="px-5 py-4 text-center"/g,
  `className="px-4 py-3 text-center"`
);

// Employees headers and cells
content = content.replace(
  /className="px-5 py-4 font-bold text-slate-700 text-right"/g,
  `className="px-4 py-3 font-bold text-slate-700 text-right"`
);

// General cell fix just in case
content = content.replace(
  /className="px-5 py-4/g,
  `className="px-4 py-3`
);

fs.writeFileSync('src/components/Dashboard.tsx', content);
