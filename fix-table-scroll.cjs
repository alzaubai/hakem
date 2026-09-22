const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// 1. Debts and Cash Sales Table
content = content.replace(
  /<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">\s*<div className="overflow-x-auto">/g,
  `<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-auto max-h-[65vh] hide-scrollbar-on-mobile">`
);

// 2. Expenses and Employees Tables
content = content.replace(
  /<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">\s*<div className="overflow-x-auto">/g,
  `<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
             <div className="overflow-auto max-h-[65vh] hide-scrollbar-on-mobile">`
);

// 3. Update table heads to be sticky
content = content.replace(
  /<thead className="bg-slate-50 text-slate-600 border-b border-slate-200">/g,
  `<thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0 z-10 shadow-sm">`
);

fs.writeFileSync('src/components/Dashboard.tsx', content);
