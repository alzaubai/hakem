const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// Search inputs
content = content.replace(
  /className="w-full bg-white border border-slate-200 rounded-xl py-2\.5 sm:py-3\.5 pr-10 sm:pr-12 pl-3 sm:pl-4 text-sm sm:text-base focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium placeholder-slate-400"/g,
  `className="w-full bg-white border border-slate-200 rounded-xl py-2 sm:py-2.5 pr-10 sm:pr-11 pl-3 sm:pl-4 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium placeholder-slate-400"`
);

// Buttons (Export, Add)
content = content.replace(
  /className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 sm:px-6 py-2\.5 sm:py-3\.5 text-sm sm:text-base rounded-xl flex items-center justify-center gap-2 font-bold transition-colors shadow-sm"/g,
  `className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 sm:px-5 py-2 sm:py-2.5 text-sm rounded-xl flex items-center justify-center gap-2 font-bold transition-colors shadow-sm"`
);

content = content.replace(
  /className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2\.5 sm:py-3\.5 text-sm sm:text-base rounded-xl flex items-center justify-center gap-2 font-bold transition-colors shadow-sm"/g,
  `className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 text-sm rounded-xl flex items-center justify-center gap-2 font-bold transition-colors shadow-sm"`
);

content = content.replace(
  /className="bg-slate-900 hover:bg-slate-800 text-white px-4 sm:px-5 py-2\.5 sm:py-3 text-sm sm:text-base rounded-xl flex items-center gap-2 font-bold transition-colors shadow-sm"/g,
  `className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 sm:py-2.5 text-sm rounded-xl flex items-center gap-2 font-bold transition-colors shadow-sm"`
);

fs.writeFileSync('src/components/Dashboard.tsx', content);
