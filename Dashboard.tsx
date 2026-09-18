import { useState } from 'react';
import { Customer, Debt, Payment, Expense, Employee, UserRole } from '../types';
import { Search, Plus, CreditCard, AlertCircle, TrendingUp, Users, DollarSign, Calendar, Clock, CheckCircle2, Phone, MessageCircle, FileText, Filter, Receipt, Trash2, ArrowUpRight, ArrowDownRight, Check, Download, Archive } from 'lucide-react';
import { format, isPast, isToday, addMonths, addWeeks, startOfDay, endOfMonth, startOfMonth } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  customers: Customer[];
  debts: Debt[];
  payments: Payment[];
  expenses: Expense[];
  employees: Employee[];
  userRole: UserRole;
  onAddDebt: (data: {customerName: string, customerPhone: string, itemName: string, costPrice: number, sellPrice: number, downPayment: number, installmentAmount: number, nextDueDate: number, transactionDate?: number, isCashSale?: boolean, warrantyMonths?: number, serialNumber?: string, vehiclePlate?: string}) => Promise<void>;
  onPay: (debtId: string, customerId: string, amount: number, nextDate: number) => Promise<void>;
  onAddExpense: (desc: string, amount: number, date: number) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  onArchiveDebt: (id: string, reason: string) => Promise<void>;
  onDeletePayment: (paymentId: string, debtId: string, amount: number) => Promise<void>;
  onAddEmployee: (name: string, code: string) => Promise<void>;
  onDeleteEmployee: (id: string) => Promise<void>;
}

export const formatPhoneForWA = (phone: string) => {
  let p = phone.trim();
  if (!p) return '';
  if (p.startsWith('0')) p = '+964' + p.slice(1);
  else if (!p.startsWith('+')) p = '+964' + p;
  return p;
};

export function Dashboard({ customers, debts, payments, expenses, employees, userRole, onAddDebt, onPay, onAddExpense, onDeleteExpense, onArchiveDebt, onDeletePayment, onAddEmployee, onDeleteEmployee }: Props) {
  // If user is employee, default to debts tab because overview is hidden
  const [activeTab, setActiveTab] = useState<'overview' | 'debts' | 'cashSales' | 'expenses' | 'archive' | 'employees'>(userRole === 'admin' ? 'overview' : 'debts');
  const [isAddModalOpen, setIsAddModalOpen] = useState<'debt' | 'cash' | false>(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeCode, setNewEmployeeCode] = useState('');
  const [isSubmittingEmployee, setIsSubmittingEmployee] = useState(false);
  
  const [selectedDebtDetails, setSelectedDebtDetails] = useState<Debt | null>(null);
  const [selectedDebtForPay, setSelectedDebtForPay] = useState<Debt | null>(null);
  const [selectedDebtForArchive, setSelectedDebtForArchive] = useState<Debt | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ message: string, onConfirm: () => void } | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'late' | 'completed'>('all');

  const activeOrCompletedDebts = debts.filter(d => d.status !== 'archived');
  const archivedDebts = debts.filter(d => d.status === 'archived');

  // Overview Stats (Excluding Archived)
  const totalDebtsOut = activeOrCompletedDebts.reduce((sum, d) => sum + d.remainingAmount, 0);
  const totalReceived = activeOrCompletedDebts.reduce((sum, d) => sum + d.downPayment, 0) + payments.filter(p => debts.find(d => d.id === p.debtId && d.status !== 'archived')).reduce((sum, p) => sum + p.amount, 0);
  
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalCapital = activeOrCompletedDebts.reduce((sum, d) => sum + d.costPrice, 0);
  const expectedProfit = activeOrCompletedDebts.reduce((sum, d) => sum + (d.sellPrice - d.costPrice), 0);
  const netExpectedProfit = expectedProfit - totalExpenses;
  
  const totalCashDrawer = totalReceived - totalExpenses;
  
  const activeCustomers = new Set(activeOrCompletedDebts.filter(d => d.status === 'active').map(d => d.customerId)).size;
  
  // Current Month Expected Income
  const startOfCurrentMonth = startOfMonth(new Date());
  const endOfCurrentMonth = endOfMonth(new Date());
  
  const expectedThisMonth = activeOrCompletedDebts
    .filter(d => d.status === 'active' && new Date(d.nextDueDate) >= startOfCurrentMonth && new Date(d.nextDueDate) <= endOfCurrentMonth)
    .reduce((sum, d) => sum + Math.min(d.installmentAmount, d.remainingAmount), 0);

  const lateDebts = activeOrCompletedDebts.filter(d => d.status === 'active' && isPast(new Date(d.nextDueDate)) && !isToday(new Date(d.nextDueDate)));

  // Filtering Debts (Excluding Archived)
  const filteredDebts = activeOrCompletedDebts.filter(d => {
    // Basic activeTab filtering: show only debts in 'debts' tab, and only cash sales in 'cashSales' tab
    if (activeTab === 'debts' && d.isCashSale) return false;
    if (activeTab === 'cashSales' && !d.isCashSale) return false;

    const customer = customers.find(c => c.id === d.customerId);
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      d.customerName.toLowerCase().includes(searchLower) || 
      d.itemName.toLowerCase().includes(searchLower) ||
      (d.serialNumber && d.serialNumber.toLowerCase().includes(searchLower)) ||
      (d.vehiclePlate && d.vehiclePlate.toLowerCase().includes(searchLower)) ||
      (customer?.phone && customer.phone.includes(searchLower));
      
    if (!matchesSearch) return false;
    
    if (statusFilter === 'active') return d.status === 'active' && (!isPast(new Date(d.nextDueDate)) || isToday(new Date(d.nextDueDate)));
    if (statusFilter === 'late') return d.status === 'active' && isPast(new Date(d.nextDueDate)) && !isToday(new Date(d.nextDueDate));
    if (statusFilter === 'completed') return d.status === 'completed';
    return true;
  });

  const exportToCSV = () => {
    const headers = ['اسم الزبون', 'البضاعة', 'تاريخ الشراء', 'السعر الكلي', 'الواصل', 'الباقي', 'تاريخ القسط القادم', 'الحالة'];
    const rows = filteredDebts.map(d => [
      d.customerName,
      d.itemName,
      format(new Date(d.createdAt), 'yyyy/MM/dd'),
      d.sellPrice,
      d.downPayment,
      d.remainingAmount,
      d.status === 'completed' ? '-' : format(new Date(d.nextDueDate), 'yyyy/MM/dd'),
      d.status === 'completed' ? 'مسدد' : (isPast(new Date(d.nextDueDate)) && !isToday(new Date(d.nextDueDate)) ? 'متأخر' : 'نشط')
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `سجل_الديون_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Chart Data preparation
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const d = addMonths(new Date(), -i);
    return {
      monthStr: format(d, 'MMM yyyy', { locale: ar }),
      monthStart: startOfMonth(d).getTime(),
      monthEnd: endOfMonth(d).getTime()
    };
  }).reverse();

  const chartData = last6Months.map(m => {
    const income = payments
      .filter(p => p.paymentDate >= m.monthStart && p.paymentDate <= m.monthEnd && debts.find(d => d.id === p.debtId && d.status !== 'archived'))
      .reduce((sum, p) => sum + p.amount, 0) +
      activeOrCompletedDebts
        .filter(d => d.createdAt >= m.monthStart && d.createdAt <= m.monthEnd)
        .reduce((sum, d) => sum + d.downPayment, 0);

    const expense = expenses
      .filter(e => e.createdAt >= m.monthStart && e.createdAt <= m.monthEnd)
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      name: m.monthStr,
      "الدخل (دفعات ومقدمات)": income,
      "المصاريف": expense,
    };
  });

  return (
    <div className="max-w-6xl mx-auto pb-4">
      {/* Premium Tab Navigation */}
      <div className="flex gap-1.5 sm:gap-2 mb-8 bg-slate-200/50 p-1.5 rounded-xl overflow-x-auto whitespace-nowrap border border-slate-200 shadow-sm no-scrollbar">
        {userRole === 'admin' && (
          <button 
            onClick={() => setActiveTab('overview')}
            className={cn("whitespace-nowrap flex-shrink-0 py-2 sm:py-2.5 px-4 sm:px-6 rounded-lg text-xs sm:text-sm font-bold transition-all min-w-[100px] sm:min-w-[120px]", activeTab === 'overview' ? "bg-white shadow-sm text-blue-700" : "text-slate-600 hover:text-slate-900 hover:bg-white/50")}
          >
            نظرة عامة
          </button>
        )}
        <button 
          onClick={() => setActiveTab('debts')}
          className={cn("whitespace-nowrap flex-shrink-0 py-2 sm:py-2.5 px-4 sm:px-6 rounded-lg text-xs sm:text-sm font-bold transition-all min-w-[100px] sm:min-w-[120px]", activeTab === 'debts' ? "bg-white shadow-sm text-blue-700" : "text-slate-600 hover:text-slate-900 hover:bg-white/50")}
        >
          سجل الديون
        </button>
        <button 
          onClick={() => setActiveTab('cashSales')}
          className={cn("whitespace-nowrap flex-shrink-0 py-2 sm:py-2.5 px-4 sm:px-6 rounded-lg text-xs sm:text-sm font-bold transition-all min-w-[100px] sm:min-w-[120px]", activeTab === 'cashSales' ? "bg-white shadow-sm text-emerald-700" : "text-slate-600 hover:text-slate-900 hover:bg-white/50")}
        >
          المبيعات
        </button>
        <button 
          onClick={() => setActiveTab('expenses')}
          className={cn("whitespace-nowrap flex-shrink-0 py-2 sm:py-2.5 px-4 sm:px-6 rounded-lg text-xs sm:text-sm font-bold transition-all min-w-[100px] sm:min-w-[120px]", activeTab === 'expenses' ? "bg-white shadow-sm text-blue-700" : "text-slate-600 hover:text-slate-900 hover:bg-white/50")}
        >
          المصاريف التشغيلية
        </button>
        {userRole === 'admin' && (
          <>
            <button 
              onClick={() => setActiveTab('archive')}
              className={cn("whitespace-nowrap flex-shrink-0 py-2 sm:py-2.5 px-4 sm:px-6 rounded-lg text-xs sm:text-sm font-bold transition-all min-w-[100px] sm:min-w-[120px]", activeTab === 'archive' ? "bg-white shadow-sm text-blue-700" : "text-slate-600 hover:text-slate-900 hover:bg-white/50")}
            >
              الأرشيف
            </button>
            <button 
              onClick={() => setActiveTab('employees')}
              className={cn("whitespace-nowrap flex-shrink-0 py-2 sm:py-2.5 px-4 sm:px-6 rounded-lg text-xs sm:text-sm font-bold transition-all min-w-[100px] sm:min-w-[120px]", activeTab === 'employees' ? "bg-white shadow-sm text-blue-700" : "text-slate-600 hover:text-slate-900 hover:bg-white/50")}
            >
              العمال والصلاحيات
            </button>
          </>
        )}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <StatCard title="الصندوق الحالي (الكاش)" value={totalCashDrawer} icon={<DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />} colorClass="bg-emerald-100 border-emerald-200" />
            <StatCard title="إجمالي رأس المال" value={totalCapital} icon={<Archive className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />} colorClass="bg-indigo-50/50 border-indigo-100" />
            <StatCard title="إجمالي الديون بالسوق" value={totalDebtsOut} icon={<DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />} colorClass="bg-blue-50/50 border-blue-100" />
            <StatCard title="إجمالي الواصل" value={totalReceived} icon={<ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />} colorClass="bg-emerald-50/50 border-emerald-100" />
            
            <StatCard title="متوقع استلامه هذا الشهر" value={expectedThisMonth} icon={<Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />} colorClass="bg-orange-50/50 border-orange-100" />
            <StatCard title="إجمالي المصاريف" value={totalExpenses} icon={<Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />} colorClass="bg-red-50/50 border-red-100" />
            <StatCard title="صافي الأرباح المتوقعة" value={netExpectedProfit} icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />} colorClass="bg-purple-50/50 border-purple-100" />
            <StatCard title="الزبائن المديونين" value={activeCustomers} isCurrency={false} icon={<Users className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />} colorClass="bg-slate-50/50 border-slate-200" />
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              حركة الأموال (آخر 6 أشهر)
            </h3>
            <div className="h-[300px] w-full dir-ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => `${(val / 1000)}k`} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontFamily: 'Cairo', textAlign: 'right' }} 
                    formatter={(value: any) => [`${Number(value).toLocaleString('en-US')} د.ع`]}
                  />
                  <Area type="monotone" dataKey="الدخل (دفعات ومقدمات)" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="المصاريف" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {lateDebts.length > 0 && (
            <div className="bg-red-50/80 border border-red-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 text-red-700 font-bold mb-5">
                <AlertCircle className="w-5 h-5" />
                <h2 className="text-lg">متأخرون عن الدفع ({lateDebts.length})</h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lateDebts.map(debt => {
                  const customer = customers.find(c => c.id === debt.customerId);
                  const phoneFormatted = customer?.phone ? formatPhoneForWA(customer.phone) : '';
                  return (
                  <div key={debt.id} className="bg-white p-5 rounded-xl border border-red-100 flex flex-col justify-between shadow-sm">
                    <div className="mb-4">
                      <div className="font-bold text-slate-800 text-lg mb-1">{debt.customerName}</div>
                      <div className="text-sm text-slate-600">{debt.itemName}</div>
                      <div className="text-sm font-bold text-slate-800 mt-2">القسط: {debt.installmentAmount.toLocaleString('en-US')} د.ع</div>
                    </div>
                    <div className="flex flex-col items-end gap-3 mt-auto">
                      <div className="text-xs text-red-600 font-bold bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg w-full text-center">
                        متأخر منذ {format(new Date(debt.nextDueDate), 'dd MMM yyyy', { locale: ar })}
                      </div>
                      <div className="flex gap-2 w-full justify-between mt-2">
                        <button onClick={() => setSelectedDebtDetails(debt)} className="flex-1 p-2 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center font-bold text-sm">
                          كشف
                        </button>
                        {phoneFormatted && (
                          <div className="flex gap-2">
                            <a href={`tel:${phoneFormatted}`} className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100">
                              <Phone className="w-4 h-4" />
                            </a>
                            <a target="_blank" href={`https://wa.me/${phoneFormatted}?text=${encodeURIComponent(`مرحباً ${debt.customerName}، نود تذكيرك بموعد قسطك البالغ ${debt.installmentAmount.toLocaleString('en-US')} د.ع والذي كان مستحقاً بتاريخ ${format(new Date(debt.nextDueDate), 'yyyy/MM/dd')}، شكراً لك.`)}`} className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-100">
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          )}
        </div>
      )}

      {(activeTab === 'debts' || activeTab === 'cashSales') && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1 shadow-sm">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="ابحث عن اسم الزبون أو البضاعة..." 
                className="w-full bg-white border border-slate-200 rounded-xl py-2 sm:py-2.5 pr-10 sm:pr-11 pl-3 sm:pl-4 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium placeholder-slate-400"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={exportToCSV}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 sm:px-5 py-2 sm:py-2.5 text-sm rounded-xl flex items-center justify-center gap-2 font-bold transition-colors shadow-sm"
            >
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline">تصدير إكسل</span>
            </button>
            <button 
              onClick={() => setIsAddModalOpen(activeTab === 'cashSales' ? 'cash' : 'debt')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 text-sm rounded-xl flex items-center justify-center gap-2 font-bold transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span>إضافة معاملة</span>
            </button>
          </div>

          {/* Filters */}
          {activeTab === 'debts' && (
            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
              <FilterButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} label="الكل" count={activeOrCompletedDebts.filter(d => !d.isCashSale).length} />
              <FilterButton active={statusFilter === 'active'} onClick={() => setStatusFilter('active')} label="نشط (غير متأخر)" count={activeOrCompletedDebts.filter(d => !d.isCashSale && d.status === 'active' && (!isPast(new Date(d.nextDueDate)) || isToday(new Date(d.nextDueDate)))).length} color="blue" />
              <FilterButton active={statusFilter === 'late'} onClick={() => setStatusFilter('late')} label="متأخر" count={lateDebts.filter(d => !d.isCashSale).length} color="red" />
              <FilterButton active={statusFilter === 'completed'} onClick={() => setStatusFilter('completed')} label="مسدد بالكامل" count={activeOrCompletedDebts.filter(d => !d.isCashSale && d.status === 'completed').length} color="emerald" />
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-auto max-h-[65vh] hide-scrollbar-on-mobile">
              <table className="w-full text-xs sm:text-sm text-right border-collapse">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-700 whitespace-nowrap">الزبون</th>
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-700 whitespace-nowrap">البضاعة</th>
                    {activeTab === 'cashSales' && (
                      <>
                        <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-700 whitespace-nowrap">رقم التسلسل</th>
                        <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-700 whitespace-nowrap">رقم السيارة</th>
                      </>
                    )}
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-700 whitespace-nowrap">تاريخ الشراء</th>
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-700 whitespace-nowrap">السعر الكلي</th>
                    {activeTab === 'debts' && (
                      <>
                        <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-700 whitespace-nowrap">المقدمة</th>
                        <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-700 whitespace-nowrap">الباقي</th>
                      </>
                    )}
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-700 whitespace-nowrap">الضمان</th>
                    {activeTab === 'debts' && (
                      <>
                        <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-700 whitespace-nowrap">موعد القسط</th>
                        <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-700 whitespace-nowrap">الحالة</th>
                      </>
                    )}
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-700 text-center whitespace-nowrap">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDebts.map(debt => {
                    const customer = customers.find(c => c.id === debt.customerId);
                    const phoneFormatted = customer?.phone ? formatPhoneForWA(customer.phone) : '';
                    
                    return (
                    <tr key={debt.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        <div className="font-bold text-slate-900 whitespace-nowrap">{debt.customerName}</div>
                        {customer?.phone && <div className="text-xs text-slate-500 dir-ltr text-right mt-1 font-medium">{customer.phone}</div>}
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        <div className="font-medium text-slate-700 whitespace-nowrap">{debt.itemName}</div>
                        {debt.isCashSale && (
                          <div className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                            بيع كاش
                          </div>
                        )}
                      </td>
                      {activeTab === 'cashSales' && (
                        <>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-slate-700 font-medium whitespace-nowrap">{debt.serialNumber || '-'}</td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-slate-700 font-medium whitespace-nowrap">{debt.vehiclePlate || '-'}</td>
                        </>
                      )}
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-slate-500 text-[10px] sm:text-xs font-medium whitespace-nowrap">{format(new Date(debt.createdAt), 'yyyy/MM/dd')}</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-slate-900 font-bold whitespace-nowrap">{debt.sellPrice.toLocaleString('en-US')}</td>
                      {activeTab === 'debts' && (
                        <>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-slate-600 font-medium whitespace-nowrap">{debt.downPayment.toLocaleString('en-US')}</td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-black text-red-600 whitespace-nowrap">{debt.remainingAmount.toLocaleString('en-US')}</td>
                        </>
                      )}
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        {debt.warrantyMonths && debt.warrantyMonths > 0 ? (() => {
                          const warrantyEnd = addMonths(new Date(debt.createdAt), debt.warrantyMonths);
                          const isValid = new Date() <= warrantyEnd;
                          return (
                            <div className={cn("text-[11px] font-bold flex flex-col gap-0.5 whitespace-nowrap", isValid ? "text-emerald-600" : "text-red-500")}>
                              <span>
                                {isValid ? 'ضمان ساري' : 'ضمان منتهي'}
                              </span>
                              {activeTab === 'debts' && (debt.serialNumber || debt.vehiclePlate) && (
                                <span className="text-slate-500 font-medium mt-0.5 text-[10px]">
                                  {debt.serialNumber && `S/N: ${debt.serialNumber}`} {debt.vehiclePlate && `| لوحة: ${debt.vehiclePlate}`}
                                </span>
                              )}
                            </div>
                          );
                        })() : (
                          <span className="text-slate-400 text-[11px] font-medium">-</span>
                        )}
                      </td>
                      {activeTab === 'debts' && (
                        <>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-slate-700 font-medium whitespace-nowrap">
                            {debt.status === 'completed' ? '-' : (
                              <span className={cn(isPast(new Date(debt.nextDueDate)) && !isToday(new Date(debt.nextDueDate)) ? "text-red-600 font-bold" : "")}>
                                {format(new Date(debt.nextDueDate), 'yyyy/MM/dd')}
                              </span>
                            )}
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap">
                            {debt.status === 'completed' ? (
                              <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> مسدد
                              </span>
                            ) : isPast(new Date(debt.nextDueDate)) && !isToday(new Date(debt.nextDueDate)) ? (
                              <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> متأخر
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                نشط
                              </span>
                            )}
                          </td>
                        </>
                      )}
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-start gap-1.5 sm:gap-2 min-w-max">
                          {phoneFormatted && (
                            <>
                              <a href={`tel:${phoneFormatted}`} title="اتصال" className="p-1.5 sm:p-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors shadow-sm">
                                <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </a>
                              <a target="_blank" href={`https://wa.me/${phoneFormatted}`} title="واتساب" className="p-1.5 sm:p-2 bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors shadow-sm">
                                <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </a>
                            </>
                          )}
                          <button onClick={() => setSelectedDebtDetails(debt)} title="كشف الحساب" className="px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-lg transition-colors flex items-center gap-1 sm:gap-2 font-medium shadow-sm text-[10px] sm:text-xs">
                            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span>كشف</span>
                          </button>
                          {debt.status === 'active' && (
                            <button 
                              onClick={() => setSelectedDebtForPay(debt)}
                              className="px-2 sm:px-3 py-1.5 sm:py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1 sm:gap-2 font-bold shadow-sm text-[10px] sm:text-xs"
                            >
                              <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span>دفع</span>
                            </button>
                          )}
                          {userRole === 'admin' && (
                            <button 
                              onClick={() => setSelectedDebtForArchive(debt)} 
                              title="أرشفة المعاملة" 
                              className="p-1.5 sm:p-2 text-slate-400 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors"
                            >
                              <Archive className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )})}
                  {filteredDebts.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-5 py-12 text-center text-slate-500 font-medium">
                        لا يوجد ديون مطابقة للبحث أو الفلتر الحالي.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center border border-red-100 shrink-0">
                <Receipt className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-600 mb-0.5 sm:mb-1">إجمالي المصاريف التشغيلية</h3>
                <p className="text-xl sm:text-2xl font-black text-slate-900">{totalExpenses.toLocaleString('en-US')} <span className="text-xs sm:text-sm font-bold text-slate-500">د.ع</span></p>
              </div>
            </div>
            <button 
              onClick={() => setIsExpenseModalOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 sm:py-2.5 text-sm rounded-xl flex items-center gap-2 font-bold transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              تسجيل مصروف
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-auto max-h-[65vh] hide-scrollbar-on-mobile">
              <table className="w-full text-sm text-right whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 font-bold text-slate-700">التاريخ</th>
                    <th className="px-4 py-3 font-bold text-slate-700">التفاصيل / البيان</th>
                    <th className="px-4 py-3 font-bold text-slate-700">المبلغ</th>
                    <th className="px-4 py-3 font-bold text-slate-700 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map(expense => (
                    <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 font-medium">{format(new Date(expense.createdAt), 'yyyy/MM/dd')}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{expense.description}</td>
                      <td className="px-4 py-3 font-black text-slate-900">{expense.amount.toLocaleString('en-US')}</td>
                      <td className="px-4 py-3 text-center">
                        {userRole === 'admin' ? (
                          <button onClick={() => {
                            setConfirmAction({ message: 'هل أنت متأكد من حذف هذا المصروف؟', onConfirm: () => onDeleteExpense(expense.id!) });
                          }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100">
                             <Trash2 className="w-4 h-4" />
                          </button>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-12 text-center text-slate-500 font-medium">
                        لا توجد مصاريف مسجلة حتى الآن.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'archive' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Archive className="w-5 h-5 text-orange-600" />
                سجل الأرشيف والمحذوفات
              </h2>
              <p className="text-sm text-slate-500 mt-1">يحتوي على جميع المعاملات التي تم أرشفتها لسبب ما، ولا يمكن استرجاعها من هنا ولكن تبقى للتدقيق.</p>
            </div>
            <div className="overflow-auto max-h-[65vh]">
              <table className="w-full text-sm text-right border-collapse">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 font-bold text-slate-700">الزبون</th>
                    <th className="px-4 py-3 font-bold text-slate-700">البضاعة</th>
                    <th className="px-4 py-3 font-bold text-slate-700">تاريخ الشراء</th>
                    <th className="px-4 py-3 font-bold text-slate-700">السعر الكلي</th>
                    <th className="px-4 py-3 font-bold text-slate-700">تاريخ الأرشفة</th>
                    <th className="px-4 py-3 font-bold text-slate-700">سبب الأرشفة / ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {archivedDebts.map(debt => (
                    <tr key={debt.id} className="hover:bg-slate-50/80 transition-colors opacity-75">
                      <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{debt.customerName}</td>
                      <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">{debt.itemName}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs font-medium whitespace-nowrap">{format(new Date(debt.createdAt), 'yyyy/MM/dd')}</td>
                      <td className="px-4 py-3 text-slate-900 font-bold">{debt.sellPrice.toLocaleString('en-US')}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs font-medium whitespace-nowrap">{debt.archivedAt ? format(new Date(debt.archivedAt), 'yyyy/MM/dd HH:mm') : '-'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block bg-orange-50 text-orange-800 border border-orange-200 px-3 py-1.5 rounded-lg text-xs font-bold w-full max-w-xs">
                          {debt.archiveReason || 'لا يوجد سبب'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {archivedDebts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-slate-500 font-medium">
                        لا توجد سجلات مؤرشفة.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'employees' && userRole === 'admin' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 shrink-0">
                <Users className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-600 mb-0.5 sm:mb-1">العمال والصلاحيات</h3>
                <p className="text-xs sm:text-sm font-bold text-slate-500">حسابات تسجيل الدخول عن طريق رمز الدخول</p>
              </div>
            </div>
            <button 
              onClick={() => setIsAddEmployeeModalOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 sm:py-2.5 text-sm rounded-xl flex items-center gap-2 font-bold transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              إضافة عامل جديد
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-auto max-h-[65vh] hide-scrollbar-on-mobile">
              <table className="w-full text-sm text-right whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 font-bold text-slate-700">الاسم</th>
                    <th className="px-4 py-3 font-bold text-slate-700">رمز الدخول (المرور)</th>
                    <th className="px-4 py-3 font-bold text-slate-700">تاريخ الإضافة</th>
                    <th className="px-4 py-3 font-bold text-slate-700 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-800">{emp.name}</td>
                      <td className="px-4 py-3 text-slate-600 font-bold tracking-[0.2em]" dir="ltr">{emp.code}</td>
                      <td className="px-4 py-3 text-slate-500 font-medium">{format(new Date(emp.createdAt), 'yyyy/MM/dd')}</td>
                      <td className="px-4 py-3 text-center">
                         <button onClick={() => {
                           setConfirmAction({ message: 'هل أنت متأكد من حذف هذا العامل؟ لن يتمكن من تسجيل الدخول بعد الآن.', onConfirm: () => onDeleteEmployee(emp.id!) });
                         }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100">
                            <Trash2 className="w-4 h-4" />
                         </button>
                      </td>
                    </tr>
                  ))}
                  {employees.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-12 text-center text-slate-500 font-medium">
                        لا يوجد عمال مضافين.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isAddModalOpen && (
        <AddDebtModal 
          saleType={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)} 
          onAdd={async (data) => {
            await onAddDebt(data);
            setIsAddModalOpen(false);
          }} 
        />
      )}

      {isExpenseModalOpen && (
        <AddExpenseModal
          onClose={() => setIsExpenseModalOpen(false)}
          onAdd={async (...args) => {
            await onAddExpense(...args);
            setIsExpenseModalOpen(false);
          }}
        />
      )}

      {selectedDebtDetails && (
        <DebtDetailsModal
          debt={selectedDebtDetails}
          customer={customers.find(c => c.id === selectedDebtDetails.customerId)!}
          payments={payments.filter(p => p.debtId === selectedDebtDetails.id)}
          onClose={() => setSelectedDebtDetails(null)}
          onDeletePayment={onDeletePayment}
          userRole={userRole}
        />
      )}

      {selectedDebtForPay && (
        <PayDebtModal
          debt={selectedDebtForPay}
          onClose={() => setSelectedDebtForPay(null)}
          onPay={async (...args) => {
            await onPay(...args);
            setSelectedDebtForPay(null);
          }}
        />
      )}

      {selectedDebtForArchive && (
        <ArchiveDebtModal
          debt={selectedDebtForArchive}
          onClose={() => setSelectedDebtForArchive(null)}
          onArchive={async (id, reason) => {
            await onArchiveDebt(id, reason);
            setSelectedDebtForArchive(null);
          }}
        />
      )}
      {isAddEmployeeModalOpen && (
        <AddEmployeeModal 
          isOpen={isAddEmployeeModalOpen}
          onClose={() => setIsAddEmployeeModalOpen(false)}
          onAdd={onAddEmployee}
        />
      )}
      {confirmAction && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">تأكيد الإجراء</h3>
            <p className="text-slate-600 mb-6 font-medium text-sm leading-relaxed">{confirmAction.message}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  confirmAction.onConfirm();
                  setConfirmAction(null);
                }} 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold transition-colors shadow-sm"
              >
                تأكيد
              </button>
              <button 
                onClick={() => setConfirmAction(null)} 
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ArchiveDebtModal({ debt, onClose, onArchive }: { debt: Debt, onClose: () => void, onArchive: (id: string, reason: string) => Promise<void> }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setLoading(true);
    await onArchive(debt.id!, reason);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh] overflow-hidden border border-slate-100">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-orange-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">أرشفة معاملة</h2>
              <p className="text-sm font-medium text-slate-500">{debt.customerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-lg border border-slate-200">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-600">
            أنت على وشك نقل هذه المعاملة إلى الأرشيف. هذه العملية لا تحذف الأقساط لكنها تبعد المعاملة عن الحسابات الرئيسية.
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">سبب الأرشفة / ملاحظات <span className="text-red-500">*</span></label>
            <textarea 
              required 
              rows={3}
              value={reason} 
              onChange={e => setReason(e.target.value)} 
              placeholder="مثال: إدخال خاطئ، تراجع الزبون..."
              className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none" 
            />
          </div>
          <div className="pt-2 flex gap-3">
            <button type="submit" disabled={loading || !reason.trim()} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-3.5 rounded-xl font-bold transition-colors disabled:opacity-50 shadow-sm flex items-center justify-center gap-2">
              {loading ? 'جاري الأرشفة...' : (
                <>
                  <Archive className="w-5 h-5" />
                  <span>تأكيد الأرشفة</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, label, count, color = "slate" }: { active: boolean, onClick: () => void, label: string, count: number, color?: string }) {
  const baseColors: Record<string, string> = {
    slate: active ? "bg-slate-800 text-white border-slate-800" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
    blue: active ? "bg-blue-600 text-white border-blue-600" : "bg-white border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200",
    red: active ? "bg-red-600 text-white border-red-600" : "bg-white border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200",
    emerald: active ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200",
  };
  
  return (
    <button onClick={onClick} className={cn("px-3 sm:px-4 py-2 sm:py-2.5 border rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shadow-sm", baseColors[color])}>
      {label}
      <span className={cn("px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs", active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 font-bold")}>{count}</span>
    </button>
  )
}

function StatCard({ title, value, isCurrency = true, icon, colorClass = "bg-white border-slate-200" }: { title: string, value: number, isCurrency?: boolean, icon: React.ReactNode, colorClass?: string }) {
  return (
    <div className={cn("p-4 sm:p-5 rounded-2xl border shadow-sm flex flex-col justify-between transition-colors", colorClass)}>
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="text-slate-600 text-xs sm:text-sm font-bold">{title}</div>
        <div className="p-1.5 sm:p-2 bg-white rounded-xl shadow-sm">{icon}</div>
      </div>
      <div className="text-xl sm:text-2xl font-black text-slate-900">
        <span dir="ltr" className="inline-block">{value.toLocaleString('en-US')}</span> {isCurrency && <span className="text-xs sm:text-sm font-bold text-slate-500">د.ع</span>}
      </div>
    </div>
  );
}

// ================= MODALS ================= //

function PayDebtModal({ debt, onClose, onPay }: { debt: Debt, onClose: () => void, onPay: (debtId: string, customerId: string, amount: number, nextDate: number) => Promise<void> }) {
  // Default to expected installment amount, but never more than the remaining amount
  const defaultAmount = Math.min(debt.installmentAmount, debt.remainingAmount);
  const [amount, setAmount] = useState(String(defaultAmount));
  
  // Default next date is +1 month from current nextDueDate
  const defaultNextDate = format(addMonths(new Date(debt.nextDueDate), 1), 'yyyy-MM-dd');
  const [nextDueDate, setNextDueDate] = useState(defaultNextDate);
  
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onPay(debt.id!, debt.customerId, Number(amount), startOfDay(new Date(nextDueDate)).getTime());
    setLoading(false);
  };

  const handleIntervalQuickSelect = (type: 'month' | 'week') => {
    const baseDate = new Date();
    const newNext = type === 'month' ? addMonths(baseDate, 1) : addWeeks(baseDate, 1);
    setNextDueDate(format(newNext, 'yyyy-MM-dd'));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh] overflow-hidden border border-slate-100">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">تسديد قسط</h2>
              <p className="text-sm font-medium text-slate-500">{debt.customerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-lg border border-slate-200">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          
          {/* Context Info */}
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm">
            <span className="font-medium text-slate-600">المبلغ المتبقي الكلي:</span>
            <span className="font-black text-red-600">{debt.remainingAmount.toLocaleString('en-US')} د.ع</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">المبلغ المستلم الآن <span className="text-red-500">*</span></label>
            <div className="relative">
              <input required type="number" min="1" max={debt.remainingAmount} value={amount} onChange={e => setAmount(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold text-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">د.ع</div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">تاريخ استحقاق القسط القادم <span className="text-red-500">*</span></label>
            <input required type="date" value={nextDueDate} onChange={e => setNextDueDate(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => handleIntervalQuickSelect('month')} className="flex-1 text-xs font-bold bg-slate-100 text-slate-600 py-2 rounded-lg hover:bg-slate-200 transition-colors border border-slate-200">بعد شهر من اليوم</button>
              <button type="button" onClick={() => handleIntervalQuickSelect('week')} className="flex-1 text-xs font-bold bg-slate-100 text-slate-600 py-2 rounded-lg hover:bg-slate-200 transition-colors border border-slate-200">بعد أسبوع من اليوم</button>
            </div>
          </div>
          <div className="pt-2 flex gap-3">
            <button type="submit" disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold transition-colors disabled:opacity-50 shadow-sm flex items-center justify-center gap-2">
              {loading ? 'جاري الحفظ...' : (
                <>
                  <Check className="w-5 h-5" />
                  <span>تأكيد الاستلام</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DebtDetailsModal({ debt, customer, payments, onClose, onDeletePayment, userRole }: { debt: Debt, customer: Customer, payments: Payment[], onClose: () => void, onDeletePayment: (paymentId: string, debtId: string, amount: number) => Promise<void>, userRole: UserRole }) {
  const phoneFormatted = customer?.phone ? formatPhoneForWA(customer.phone) : '';
  
  const generateWAStatement = () => {
    const text = `مرحباً ${customer.name}،

نود تزويدك بكشف حسابك لدينا:
البضاعة: ${debt.itemName}
تاريخ الشراء: ${format(new Date(debt.createdAt), 'yyyy/MM/dd')}
السعر الكلي: ${debt.sellPrice.toLocaleString('en-US')} د.ع
المقدمة (الواصل): ${debt.downPayment.toLocaleString('en-US')} د.ع

سجل الدفعات السابقة:
${payments.length > 0 
  ? payments.map(p => `- ${format(new Date(p.paymentDate), 'yyyy/MM/dd')}: ${p.amount.toLocaleString('en-US')} د.ع`).join('\n') 
  : "لا توجد دفعات مسجلة بعد."}

المبلغ المتبقي: ${debt.remainingAmount.toLocaleString('en-US')} د.ع
تاريخ القسط القادم: ${debt.status === 'completed' ? 'تم التسديد بالكامل' : format(new Date(debt.nextDueDate), 'yyyy/MM/dd')}

شكراً لتعاملك معنا.`;
    return encodeURIComponent(text);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden border border-slate-100">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center shadow-sm">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">كشف حساب</h2>
              <p className="text-sm font-bold text-slate-500">{customer.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-lg border border-slate-200">✕</button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Summary Box */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 text-sm shadow-sm">
            <div>
              <div className="text-slate-500 mb-1.5 font-bold">البضاعة</div>
              <div className="font-bold text-slate-900 text-base">{debt.itemName}</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1.5 font-bold">السعر الكلي</div>
              <div className="font-bold text-slate-900 text-base">{debt.sellPrice.toLocaleString('en-US')}</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1.5 font-bold">المتبقي</div>
              <div className="font-black text-red-600 text-xl">{debt.remainingAmount.toLocaleString('en-US')}</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1.5 font-bold">القسط القادم</div>
              <div className="font-bold text-slate-900 text-base">{debt.status === 'completed' ? '-' : format(new Date(debt.nextDueDate), 'yyyy/MM/dd')}</div>
            </div>
          </div>

          {/* Payments History */}
          <div>
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-base">
              <Clock className="w-5 h-5 text-slate-400" />
              سجل الدفعات
            </h3>
            {payments.length === 0 ? (
              <p className="text-slate-500 text-sm font-bold text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                لم يتم تسجيل أي أقساط حتى الآن.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {payments.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <div className="text-slate-600 text-sm font-bold">{format(new Date(p.paymentDate), 'yyyy/MM/dd')}</div>
                    <div className="flex items-center gap-3">
                      <div className="font-black text-emerald-600 flex items-center gap-1.5 text-base">
                        <ArrowDownRight className="w-4 h-4" />
                        {p.amount.toLocaleString('en-US')} د.ع
                      </div>
                      {userRole === 'admin' && (
                        <button 
                          onClick={() => {
                            setConfirmAction({
                              message: 'هل أنت متأكد من حذف هذه الدفعة؟ سيعود المبلغ إلى الباقي المطلوب.',
                              onConfirm: () => onDeletePayment(p.id!, p.debtId, p.amount)
                            });
                          }}
                          title="حذف الدفعة"
                          className="text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action */}
          {phoneFormatted && (
            <a 
              href={`https://wa.me/${phoneFormatted}?text=${generateWAStatement()}`}
              target="_blank"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 mt-4 shadow-sm"
            >
              <MessageCircle className="w-5 h-5" />
              إرسال كشف الحساب عبر واتساب
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function AddExpenseModal({ onClose, onAdd }: { onClose: () => void, onAdd: (desc: string, amount: number, date: number) => Promise<void> }) {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [dateStr, setDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onAdd(desc, Number(amount), startOfDay(new Date(dateStr)).getTime());
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh] overflow-hidden border border-slate-100">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <h2 className="text-lg font-bold text-slate-900">تسجيل مصروف جديد</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-lg border border-slate-200">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">البيان (مثال: إيجار، كهرباء) <span className="text-red-500">*</span></label>
            <input required type="text" value={desc} onChange={e => setDesc(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">المبلغ <span className="text-red-500">*</span></label>
            <input required type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">التاريخ <span className="text-red-500">*</span></label>
            <input required type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="pt-4 flex gap-3">
            <button type="submit" disabled={loading} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold transition-colors disabled:opacity-50 shadow-sm">
              {loading ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddDebtModal({ onClose, onAdd, saleType }: { onClose: () => void, onAdd: (data: {customerName: string, customerPhone: string, itemName: string, costPrice: number, sellPrice: number, downPayment: number, installmentAmount: number, nextDueDate: number, transactionDate?: number, isCashSale?: boolean, warrantyMonths?: number, serialNumber?: string, vehiclePlate?: string}) => Promise<void>, saleType: 'debt' | 'cash' }) {
  const type = saleType;
  
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
          <h2 className="text-xl font-black text-slate-900">{type === 'cash' ? 'إضافة مبيعات نقدية' : 'إضافة معاملة (دين)'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-lg border border-slate-200">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
          
          

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
function AddEmployeeModal({ 
  isOpen, 
  onClose, 
  onAdd 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onAdd: (name: string, code: string) => Promise<void> 
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh] overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <h2 className="text-lg font-bold text-slate-900">إضافة عامل جديد</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-lg border border-slate-200 transition-colors">✕</button>
        </div>
        <form onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          try {
            await onAdd(name, code);
            onClose();
            setName('');
            setCode('');
          } catch (error) {
            console.error(error);
            alert('حدث خطأ أثناء إضافة العامل');
          } finally {
            setLoading(false);
          }
        }} className="p-6 space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">اسم العامل <span className="text-red-500">*</span></label>
            <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" placeholder="مثال: أحمد" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">رمز الدخول <span className="text-red-500">*</span></label>
            <input required type="text" value={code} onChange={e => setCode(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold text-center tracking-[0.2em] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" placeholder="مثال: 1234" dir="ltr" />
            <p className="text-xs font-medium text-slate-500 mt-1 text-center">سيستخدم العامل هذا الرمز لتسجيل الدخول</p>
          </div>
          <div className="pt-4 flex gap-3">
            <button type="submit" disabled={loading} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold transition-colors disabled:opacity-50 shadow-sm flex items-center justify-center gap-2">
              {loading ? 'جاري الإضافة...' : 'إضافة العامل'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
