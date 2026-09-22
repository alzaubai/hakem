const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// 1. Hide status filters for Cash Sales
const filtersBlockOld = `{/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            <FilterButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} label="الكل" count={activeOrCompletedDebts.filter(d => activeTab === 'cashSales' ? d.isCashSale : !d.isCashSale).length} />
            <FilterButton active={statusFilter === 'active'} onClick={() => setStatusFilter('active')} label="نشط (غير متأخر)" count={activeOrCompletedDebts.filter(d => (activeTab === 'cashSales' ? d.isCashSale : !d.isCashSale) && d.status === 'active' && (!isPast(new Date(d.nextDueDate)) || isToday(new Date(d.nextDueDate)))).length} color="blue" />
            <FilterButton active={statusFilter === 'late'} onClick={() => setStatusFilter('late')} label="متأخر" count={lateDebts.filter(d => activeTab === 'cashSales' ? d.isCashSale : !d.isCashSale).length} color="red" />
            <FilterButton active={statusFilter === 'completed'} onClick={() => setStatusFilter('completed')} label="مسدد بالكامل" count={activeOrCompletedDebts.filter(d => (activeTab === 'cashSales' ? d.isCashSale : !d.isCashSale) && d.status === 'completed').length} color="emerald" />
          </div>`;

const filtersBlockNew = `{/* Filters */}
          {activeTab === 'debts' && (
            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
              <FilterButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} label="الكل" count={activeOrCompletedDebts.filter(d => !d.isCashSale).length} />
              <FilterButton active={statusFilter === 'active'} onClick={() => setStatusFilter('active')} label="نشط (غير متأخر)" count={activeOrCompletedDebts.filter(d => !d.isCashSale && d.status === 'active' && (!isPast(new Date(d.nextDueDate)) || isToday(new Date(d.nextDueDate)))).length} color="blue" />
              <FilterButton active={statusFilter === 'late'} onClick={() => setStatusFilter('late')} label="متأخر" count={lateDebts.filter(d => !d.isCashSale).length} color="red" />
              <FilterButton active={statusFilter === 'completed'} onClick={() => setStatusFilter('completed')} label="مسدد بالكامل" count={activeOrCompletedDebts.filter(d => !d.isCashSale && d.status === 'completed').length} color="emerald" />
            </div>
          )}`;

content = content.replace(filtersBlockOld, filtersBlockNew);

// 2. Reduce Search and Action Buttons size on Mobile (Debts & Cash Sales)
// Finding the search input wrapper
content = content.replace(
  /<div className="flex flex-col sm:flex-row gap-3">/g,
  `<div className="flex flex-col sm:flex-row gap-2 sm:gap-3">`
);
content = content.replace(
  /className="w-full bg-white border border-slate-200 rounded-xl py-3\.5 pr-12 pl-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium placeholder-slate-400"/g,
  `className="w-full bg-white border border-slate-200 rounded-xl py-2.5 sm:py-3.5 pr-10 sm:pr-12 pl-3 sm:pl-4 text-sm sm:text-base focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium placeholder-slate-400"`
);
content = content.replace(
  /className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-6 py-3\.5 rounded-xl flex items-center justify-center gap-2 font-bold transition-colors shadow-sm"/g,
  `className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 sm:px-6 py-2.5 sm:py-3.5 text-sm sm:text-base rounded-xl flex items-center justify-center gap-2 font-bold transition-colors shadow-sm"`
);
content = content.replace(
  /className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3\.5 rounded-xl flex items-center justify-center gap-2 font-bold transition-colors shadow-sm"/g,
  `className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2.5 sm:py-3.5 text-sm sm:text-base rounded-xl flex items-center justify-center gap-2 font-bold transition-colors shadow-sm"`
);

// 3. Fix Actions column symmetric alignment
content = content.replace(
  /<div className="flex items-center justify-center gap-1\.5 sm:gap-2">/g,
  `<div className="flex items-center justify-start gap-1.5 sm:gap-2 min-w-max">`
);

// 4. Reduce Search and Button sizes in Expenses tab
content = content.replace(
  /className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl flex items-center gap-2 font-bold transition-colors shadow-sm"/g,
  `className="bg-slate-900 hover:bg-slate-800 text-white px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base rounded-xl flex items-center gap-2 font-bold transition-colors shadow-sm"`
);

// 5. Reduce Search and Button sizes in Employees tab
content = content.replace(
  /className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl flex items-center gap-2 font-bold transition-colors shadow-sm"/g,
  `className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base rounded-xl flex items-center gap-2 font-bold transition-colors shadow-sm"`
);

fs.writeFileSync('src/components/Dashboard.tsx', content);
