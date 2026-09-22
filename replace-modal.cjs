const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const startIdx = content.indexOf('function AddDebtModal');
const endIdx = content.indexOf('function AddEmployeeModal');

if (startIdx !== -1 && endIdx !== -1) {
  const newModal = `function AddDebtModal({ onClose, onAdd }: { onClose: () => void, onAdd: (data: {customerName: string, customerPhone: string, itemName: string, costPrice: number, sellPrice: number, downPayment: number, installmentAmount: number, nextDueDate: number, transactionDate?: number, isCashSale?: boolean, warrantyMonths?: number, serialNumber?: string, vehiclePlate?: string}) => Promise<void> }) {
  const [type, setType] = useState<'debt' | 'cash'>('debt');
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [item, setItem] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  
  const [downPayment, setDownPayment] = useState('');
  const [installment, setInstallment] = useState('');
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [transactionDate, setTransactionDate] = useState(todayStr);
  const [nextDueDate, setNextDueDate] = useState(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
  
  const [warrantyMonths, setWarrantyMonths] = useState('0');
  const [serialNumber, setSerialNumber] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');

  const [loading, setLoading] = useState(false);
  const remaining = Number(sellPrice) - Number(downPayment);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const nextDateMs = type === 'debt' ? startOfDay(new Date(nextDueDate)).getTime() : 0;
    const transactionDateMs = startOfDay(new Date(transactionDate)).getTime();
    
    await onAdd({
      customerName: name || (type === 'cash' ? 'زبون نقدي' : ''), 
      customerPhone: phone || '', 
      itemName: item, 
      costPrice: Number(costPrice), 
      sellPrice: Number(sellPrice), 
      downPayment: type === 'cash' ? Number(sellPrice) : Number(downPayment), 
      installmentAmount: type === 'cash' ? 0 : Number(installment), 
      nextDueDate: nextDateMs,
      transactionDate: transactionDateMs,
      isCashSale: type === 'cash',
      warrantyMonths: Number(warrantyMonths),
      serialNumber,
      vehiclePlate
    });
    setLoading(false);
  };

  const handleIntervalQuickSelect = (t: 'month' | 'week') => {
    const baseDate = new Date(transactionDate);
    const newNext = t === 'month' ? addMonths(baseDate, 1) : addWeeks(baseDate, 1);
    setNextDueDate(format(newNext, 'yyyy-MM-dd'));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden border border-slate-100">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <h2 className="text-xl font-black text-slate-900">إضافة معاملة جديدة</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-lg border border-slate-200">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
          
          <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
            <button type="button" onClick={() => setType('debt')} className={\`flex-1 py-2 text-sm font-bold rounded-lg transition-all \${type === 'debt' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}>
              بيع بالآجل (دين)
            </button>
            <button type="button" onClick={() => setType('cash')} className={\`flex-1 py-2 text-sm font-bold rounded-lg transition-all \${type === 'cash' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}>
              بيع نقدي (كاش)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">اسم الزبون {type === 'debt' && <span className="text-red-500">*</span>}</label>
              <input required={type === 'debt'} type="text" value={name} onChange={e => setName(e.target.value)} placeholder={type === 'cash' ? 'اختياري' : ''} className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">رقم الهاتف (للواتساب)</label>
              <input type="text" placeholder="07..." value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 dir-ltr text-right font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">نوع البضاعة (مثل: باتري، تاير) <span className="text-red-500">*</span></label>
            <input required type="text" value={item} onChange={e => setItem(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">سعر التكلفة (رأس المال) <span className="text-red-500">*</span></label>
              <input required type="number" min="0" value={costPrice} onChange={e => setCostPrice(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">السعر الكلي (البيع) <span className="text-red-500">*</span></label>
              <input required type="number" min="0" value={sellPrice} onChange={e => setSellPrice(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" />
            </div>
          </div>

          {type === 'debt' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">المقدمة (الواصل) <span className="text-red-500">*</span></label>
                  <input required type="number" min="0" value={downPayment} onChange={e => setDownPayment(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">قيمة القسط <span className="text-red-500">*</span></label>
                  <input required type="number" min="0" value={installment} onChange={e => setInstallment(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">تاريخ الشراء <span className="text-red-500">*</span></label>
                  <input required type="date" value={transactionDate} onChange={e => setTransactionDate(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">تاريخ القسط القادم <span className="text-red-500">*</span></label>
                  <input required type="date" value={nextDueDate} onChange={e => setNextDueDate(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" />
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => handleIntervalQuickSelect('month')} className="flex-1 text-xs font-bold bg-slate-100 text-slate-600 py-2 rounded-lg hover:bg-slate-200 transition-colors border border-slate-200">بعد شهر</button>
                    <button type="button" onClick={() => handleIntervalQuickSelect('week')} className="flex-1 text-xs font-bold bg-slate-100 text-slate-600 py-2 rounded-lg hover:bg-slate-200 transition-colors border border-slate-200">بعد أسبوع</button>
                  </div>
                </div>
              </div>
            </>
          )}

          {type === 'cash' && (
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">تاريخ الشراء <span className="text-red-500">*</span></label>
              <input required type="date" value={transactionDate} onChange={e => setTransactionDate(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" />
            </div>
          )}

          <div className="border-t border-slate-100 pt-5 mt-5">
            <h3 className="text-sm font-black text-slate-800 mb-3">معلومات الضمان (اختياري)</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">فترة الضمان</label>
                <select value={warrantyMonths} onChange={e => setWarrantyMonths(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 bg-slate-50/50">
                  <option value="0">بدون ضمان</option>
                  <option value="3">3 أشهر</option>
                  <option value="6">6 أشهر</option>
                  <option value="12">سنة واحدة</option>
                  <option value="24">سنتان</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">الرقم التسلسلي للقطعة (S/N)</label>
                  <input type="text" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="مثال: A123456789" className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 bg-slate-50/50 dir-ltr text-right" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">رقم السيارة</label>
                  <input type="text" value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value)} placeholder="مثال: بغداد 12345 أ" className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 bg-slate-50/50" />
                </div>
              </div>
            </div>
          </div>

          {type === 'debt' && (
            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 flex justify-between items-center mt-8">
              <span className="text-blue-900 font-bold">المبلغ الباقي تلقائياً:</span>
              <span className="text-2xl font-black text-blue-700">
                {isNaN(remaining) || remaining < 0 ? 0 : remaining.toLocaleString('en-US')} د.ع
              </span>
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-4 font-bold rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">إلغاء</button>
            <button disabled={loading} type="submit" className="flex-[2] py-4 font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-200 flex items-center justify-center gap-2">
              {loading ? 'جاري الحفظ...' : 'حفظ المعاملة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
`;
  content = content.substring(0, startIdx) + newModal + content.substring(endIdx);
  fs.writeFileSync('src/components/Dashboard.tsx', content);
} else {
  console.log("Could not find boundaries");
}
