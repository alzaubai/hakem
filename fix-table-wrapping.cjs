const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// 1. Add whitespace-nowrap to all table cells that might need it
content = content.replace(
  /className="px-3 sm:px-4 py-2\.5 sm:py-3 text-slate-900 font-bold"/g,
  `className="px-3 sm:px-4 py-2.5 sm:py-3 text-slate-900 font-bold whitespace-nowrap"`
);
content = content.replace(
  /className="px-3 sm:px-4 py-2\.5 sm:py-3 text-slate-600 font-medium"/g,
  `className="px-3 sm:px-4 py-2.5 sm:py-3 text-slate-600 font-medium whitespace-nowrap"`
);
content = content.replace(
  /className="px-3 sm:px-4 py-2\.5 sm:py-3 font-black text-red-600"/g,
  `className="px-3 sm:px-4 py-2.5 sm:py-3 font-black text-red-600 whitespace-nowrap"`
);
content = content.replace(
  /className="px-3 sm:px-4 py-2\.5 sm:py-3 text-center"/g,
  `className="px-3 sm:px-4 py-2.5 sm:py-3 text-center whitespace-nowrap"`
);

// 2. Fix Expenses Table by wrapping it in overflow-x-auto and adding whitespace-nowrap
content = content.replace(
  /<table className="w-full text-sm text-right">\s*<thead className="bg-slate-50 text-slate-600 border-b border-slate-200">/g,
  `<div className="overflow-x-auto">\n              <table className="w-full text-sm text-right whitespace-nowrap">\n                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">`
);

content = content.replace(
  /<\/tbody>\s*<\/table>\s*<\/div>\s*<\/div>\s*\)}/g,
  `</tbody>\n              </table>\n            </div>\n          </div>\n        </div>\n      )}`
);

// Note: The previous replace might be tricky with regex. Let's do a more targeted replace for the table wrappers.
fs.writeFileSync('src/components/Dashboard.tsx', content);
