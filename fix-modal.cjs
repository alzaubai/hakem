const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// Dashboard state
content = content.replace(
  /const \[isAddModalOpen, setIsAddModalOpen\] = useState\(false\);/,
  `const [isAddModalOpen, setIsAddModalOpen] = useState<'debt' | 'cash' | false>(false);`
);

// Dashboard button
content = content.replace(
  /onClick=\{\(\) => setIsAddModalOpen\(true\)\}/g,
  `onClick={() => setIsAddModalOpen(activeTab === 'cashSales' ? 'cash' : 'debt')}`
);

// Modal render
content = content.replace(
  /\{isAddModalOpen && \(\s*<AddDebtModal\s*onClose=\{\(\) => setIsAddModalOpen\(false\)\}/g,
  `{isAddModalOpen && (
        <AddDebtModal 
          saleType={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}`
);

// AddDebtModal definition
content = content.replace(
  /function AddDebtModal\(\{ onClose, onAdd \}: \{ onClose: \(\) => void, onAdd: \([^)]+\) => Promise<void> \}\) \{([\s\S]*?)const \[type, setType\] = useState<'debt' | 'cash'>\('debt'\);/,
  `function AddDebtModal({ onClose, onAdd, saleType }: { onClose: () => void, onAdd: (data: {customerName: string, customerPhone: string, itemName: string, costPrice: number, sellPrice: number, downPayment: number, installmentAmount: number, nextDueDate: number, transactionDate?: number, isCashSale?: boolean, warrantyMonths?: number, serialNumber?: string, vehiclePlate?: string}) => Promise<void>, saleType: 'debt' | 'cash' }) {\n  const type = saleType;`
);

// Remove toggle buttons from modal
content = content.replace(
  /<div className="flex bg-slate-100 p-1 rounded-xl mb-4">[\s\S]*?<\/div>/,
  ``
);

// Change modal title based on type
content = content.replace(
  /<h2 className="text-xl font-black text-slate-900">إضافة معاملة جديدة<\/h2>/,
  `<h2 className="text-xl font-black text-slate-900">{type === 'cash' ? 'إضافة مبيعات نقدية' : 'إضافة معاملة (دين)'}</h2>`
);

fs.writeFileSync('src/components/Dashboard.tsx', content);
