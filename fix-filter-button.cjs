const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// FilterButton update
content = content.replace(
  /function FilterButton\(\{ active, onClick, label, count, color = "slate" \}: \{ active: boolean, onClick: \(\) => void, label: string, count: number, color\?: string \}\) \{[\s\S]*?return \([\s\S]*?<button[\s\S]*?className=\{cn\([\s\S]*?"px-4 py-2\.5 rounded-xl font-bold flex items-center gap-2 transition-all whitespace-nowrap shadow-sm border"[\s\S]*?\)[\s\S]*?>[\s\S]*?<span className="text-sm">\{label\}<\/span>[\s\S]*?<span className=\{cn\([\s\S]*?"px-2 py-0\.5 rounded-md text-xs"[\s\S]*?\)[\s\S]*?>[\s\S]*?\{count\}[\s\S]*?<\/span>[\s\S]*?<\/button>[\s\S]*?\);[\s\S]*?\}/,
  `function FilterButton({ active, onClick, label, count, color = "slate" }: { active: boolean, onClick: () => void, label: string, count: number, color?: string }) {
  const baseColors: Record<string, string> = {
    slate: active ? "bg-slate-800 text-white border-slate-800" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
    blue: active ? "bg-blue-600 text-white border-blue-600" : "bg-white border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200",
    red: active ? "bg-red-600 text-white border-red-600" : "bg-white border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200",
    emerald: active ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200",
  };
  
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap shadow-sm border",
        baseColors[color]
      )}
    >
      <span className="text-xs sm:text-sm">{label}</span>
      <span className={cn(
        "px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs",
        active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
      )}>
        {count}
      </span>
    </button>
  );
}`
);

fs.writeFileSync('src/components/Dashboard.tsx', content);
