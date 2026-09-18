const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// For Archive table
content = content.replace(
  /<div className="overflow-x-auto">\s*<table className="w-full text-sm text-right border-collapse">/g,
  `<div className="overflow-auto max-h-[65vh]">\n              <table className="w-full text-sm text-right border-collapse">`
);

fs.writeFileSync('src/components/Dashboard.tsx', content);
