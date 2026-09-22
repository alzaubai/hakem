import { useState } from 'react';
import { Customer, Debt, Payment, Expense, Employee, UserRole, AdminUser } from '../types';
import { Search, Plus, CreditCard, AlertCircle, TrendingUp, Users, DollarSign, Calendar, Clock, CheckCircle2, Phone, MessageCircle, FileText, Filter, Receipt, Trash2, ArrowUpRight, ArrowDownRight, Check, Download, Archive, Pencil, PlusCircle, Layers, ShieldCheck, Lock, Shield } from 'lucide-react';
import { format, isPast, isToday, addMonths, addWeeks, startOfDay, endOfMonth, startOfMonth } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn, maskEmail } from '../lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ExcelJS from 'exceljs';

interface Props {
  customers: Customer[];
  debts: Debt[];
  payments: Payment[];
  expenses: Expense[];
  employees: Employee[];
  admins?: AdminUser[];
  primaryAdminEmails?: string[];
  isPrimaryAdmin?: boolean;
  userRole: UserRole;
  onAddDebt: (data: {
    customerName: string;
    customerPhone: string;
    itemName: string;
    costPrice: number;
    sellPrice: number;
    downPayment: number;
    installmentAmount: number;
    nextDueDate: number;
    transactionDate?: number;
    isCashSale?: boolean;
    warrantyMonths?: number;
    serialNumber?: string;
    vehiclePlate?: string;
    notes?: string;
    carType?: string;
  }) => Promise<void>;
  onPay: (debtId: string, customerId: string, amount: number, nextDate: number) => Promise<void>;
  onAddExpense: (desc: string, amount: number, date: number) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  onArchiveDebt: (id: string, reason: string) => Promise<void>;
  onDeletePermanentDebt: (id: string) => Promise<void>;
  onUpdateDebt: (debtId: string, data: {
    customerName: string;
    customerPhone: string;
    itemName: string;
    costPrice: number;
    sellPrice: number;
    downPayment: number;
    installmentAmount: number;
    nextDueDate: number;
    transactionDate?: number;
    warrantyMonths?: number;
    serialNumber?: string;
    vehiclePlate?: string;
    notes?: string;
    carType?: string;
    paymentsList?: Array<{ id?: string; amount: number; paymentDate: number; isDeleted?: boolean }>;
  }) => Promise<void>;
  onUpdatePayment?: (paymentId: string, debtId: string, amount: number, paymentDate: number) => Promise<void>;
  onDeletePayment: (paymentId: string, debtId: string, amount: number) => Promise<void>;
  onAddEmployee: (name: string, code: string) => Promise<void>;
  onDeleteEmployee: (id: string) => Promise<void>;
  onAddAdmin?: (email: string, name?: string) => Promise<void>;
  onDeleteAdmin?: (id: string) => Promise<void>;
}

export const formatPhoneForWA = (phone: string) => {
  let p = phone.trim();
  if (!p) return '';
  if (p.startsWith('0')) p = '+964' + p.slice(1);
  else if (!p.startsWith('+')) p = '+964' + p;
  return p;
};

// Helper for native Right-To-Left Excel files with full gridlines, cell borders, and print formatting
export const exportToExcelRTL = async (
  headers: string[],
  rows: (string | number)[][],
  fileName: string,
  sheetName: string = 'البيانات'
) => {
  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'سجل الديون';
    wb.created = new Date();

    const ws = wb.addWorksheet(sheetName, {
      views: [{ rightToLeft: true, showGridLines: true }],
      pageSetup: {
        orientation: 'landscape',
        paperSize: 9, // A4
        showGridLines: true,
        horizontalCentered: true,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0
      }
    });

    // Explicitly enforce grid lines when viewing and printing
    ws.pageSetup.showGridLines = true;

    // Header styling
    const headerRow = ws.addRow(headers);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.font = {
        name: 'Calibri',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' } // White text
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' } // Slate 800
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FF0F172A' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        right: { style: 'thin', color: { argb: 'FF0F172A' } }
      };
    });

    // Add Data rows with explicit cell borders and formatting
    rows.forEach((rowData, rowIndex) => {
      const row = ws.addRow(rowData);
      row.height = 24;
      const isEven = rowIndex % 2 === 0;

      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = {
          name: 'Calibri',
          size: 10,
          bold: false,
          color: { argb: 'FF1E293B' }
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' } // Subtle alternate row shade
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: typeof cell.value === 'number' ? 'center' : 'right',
          wrapText: false
        };
        // Explicit borders on all 4 sides so print and export are cleanly bordered
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };

        // Format currency/numbers
        if (typeof cell.value === 'number' && cell.value >= 1000) {
          cell.numFmt = '#,##0';
        }
      });
    });

    // Compute dynamic column widths with padding
    headers.forEach((header, i) => {
      const colNumber = i + 1;
      let maxLen = header.length;
      rows.forEach((r) => {
        const val = r[i] !== undefined && r[i] !== null ? String(r[i]) : '';
        if (val.length > maxLen) maxLen = val.length;
      });
      const col = ws.getColumn(colNumber);
      col.width = Math.min(42, Math.max(14, maxLen + 4));
    });

    // Generate buffer and trigger browser download
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
  }
};

export function Dashboard({ customers, debts, payments, expenses, employees, admins = [], primaryAdminEmails = [], isPrimaryAdmin = false, userRole, onAddDebt, onPay, onAddExpense, onDeleteExpense, onArchiveDebt, onDeletePermanentDebt, onUpdateDebt, onUpdatePayment, onDeletePayment, onAddEmployee, onDeleteEmployee, onAddAdmin, onDeleteAdmin }: Props) {
  // If user is employee, default to debts tab because overview is hidden
  const [activeTab, setActiveTab] = useState<'overview' | 'debts' | 'cashSales' | 'archive' | 'employees'>(userRole === 'admin' ? 'overview' : 'debts');
  const [isAddModalOpen, setIsAddModalOpen] = useState<'debt' | 'cash' | false>(false);
  const [addModalInitialData, setAddModalInitialData] = useState<{
    customerName?: string;
    customerPhone?: string;
    carType?: string;
    vehiclePlate?: string;
  } | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeCode, setNewEmployeeCode] = useState('');
  const [isSubmittingEmployee, setIsSubmittingEmployee] = useState(false);

  // Admin Management State
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [adminError, setAdminError] = useState('');
  
  const [selectedDebtDetails, setSelectedDebtDetails] = useState<Debt | null>(null);
  const [selectedDebtForPay, setSelectedDebtForPay] = useState<Debt | null>(null);
  const [selectedDebtForArchive, setSelectedDebtForArchive] = useState<Debt | null>(null);
  const [selectedDebtForEdit, setSelectedDebtForEdit] = useState<Debt | null>(null);
  const [selectedDebtForNotes, setSelectedDebtForNotes] = useState<Debt | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ message: string, onConfirm: () => void } | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [archiveSearchQuery, setArchiveSearchQuery] = useState('');
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

  // Daily Cash Drawer (وارد اليوم - يتصفر كل بداية يوم)
  const todayDownPayments = activeOrCompletedDebts
    .filter(d => isToday(new Date(d.createdAt)))
    .reduce((sum, d) => sum + d.downPayment, 0);

  const todayPayments = payments
    .filter(p => isToday(new Date(p.paymentDate)))
    .reduce((sum, p) => sum + p.amount, 0);

  const todayReceived = todayDownPayments + todayPayments;

  const todayExpenses = expenses
    .filter(e => isToday(new Date(e.createdAt)))
    .reduce((sum, e) => sum + e.amount, 0);

  const todayCashDrawer = todayReceived - todayExpenses;
  
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
      (d.carType && d.carType.toLowerCase().includes(searchLower)) ||
      (d.serialNumber && d.serialNumber.toLowerCase().includes(searchLower)) ||
      (d.vehiclePlate && d.vehiclePlate.toLowerCase().includes(searchLower)) ||
      (d.notes && d.notes.toLowerCase().includes(searchLower)) ||
      (customer?.phone && customer.phone.includes(searchLower));
      
    if (!matchesSearch) return false;
    
    if (statusFilter === 'active') return d.status === 'active' && (!isPast(new Date(d.nextDueDate)) || isToday(new Date(d.nextDueDate)));
    if (statusFilter === 'late') return d.status === 'active' && isPast(new Date(d.nextDueDate)) && !isToday(new Date(d.nextDueDate));
    if (statusFilter === 'completed') return d.status === 'completed';
    return true;
  });

  // Dedicated search filtering for Archive
  const filteredArchivedDebts = archivedDebts.filter(d => {
    if (!archiveSearchQuery.trim()) return true;
    const customer = customers.find(c => c.id === d.customerId);
    const searchLower = archiveSearchQuery.toLowerCase();
    return (
      d.customerName.toLowerCase().includes(searchLower) ||
      d.itemName.toLowerCase().includes(searchLower) ||
      (d.carType && d.carType.toLowerCase().includes(searchLower)) ||
      (d.serialNumber && d.serialNumber.toLowerCase().includes(searchLower)) ||
      (d.vehiclePlate && d.vehiclePlate.toLowerCase().includes(searchLower)) ||
      (d.archiveReason && d.archiveReason.toLowerCase().includes(searchLower)) ||
      (d.notes && d.notes.toLowerCase().includes(searchLower)) ||
      (customer?.phone && customer.phone.includes(searchLower))
    );
  });

  // Native Right-To-Left Excel Exports for all sections with Arabic alphabetical sorting
  const handleExportDebts = () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const headers = [
      'اسم الزبون',
      'رقم الهاتف',
      'نوع البضاعة',
      'نوع السيارة',
      'رقم السيارة',
      'تاريخ الشراء',
      'السعر الكلي (د.ع)',
      'المقدمة (الواصل) (د.ع)',
      'المبلغ المتبقي (د.ع)',
      'مبلغ القسط (د.ع)',
      'موعد القسط القادم',
      'الحالة',
      'فترة الضمان',
      'الملاحظات'
    ];
    // Sort alphabetically by Arabic customer name (أ - ي)
    const sortedDebts = [...filteredDebts].sort((a, b) => {
      const nameComp = (a.customerName || '').localeCompare(b.customerName || '', 'ar', { sensitivity: 'base' });
      if (nameComp !== 0) return nameComp;
      return b.createdAt - a.createdAt;
    });

    const rows = sortedDebts.map(d => {
      const cust = customers.find(c => c.id === d.customerId);
      return [
        d.customerName,
        cust?.phone || '-',
        d.itemName,
        d.carType || '-',
        d.vehiclePlate || '-',
        format(new Date(d.createdAt), 'yyyy/MM/dd'),
        d.sellPrice,
        d.downPayment,
        d.remainingAmount,
        d.installmentAmount,
        d.status === 'completed' ? 'مسدد بالكامل' : format(new Date(d.nextDueDate), 'yyyy/MM/dd'),
        d.status === 'completed' ? 'مسدد' : (isPast(new Date(d.nextDueDate)) && !isToday(new Date(d.nextDueDate)) ? 'متأخر' : 'نشط'),
        d.warrantyMonths ? `${d.warrantyMonths} أشهر` : 'بدون ضمان',
        d.notes || '-'
      ];
    });
    exportToExcelRTL(headers, rows, `سجل_الديون_أبجدي_${todayStr}`, 'سجل الديون');
  };

  const handleExportCashSales = () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const headers = [
      'اسم الزبون',
      'رقم الهاتف',
      'نوع البضاعة',
      'نوع السيارة',
      'رقم السيارة',
      'تاريخ الشراء',
      'سعر البيع (د.ع)',
      'فترة الضمان',
      'الملاحظات'
    ];
    // Sort alphabetically by customer name (أ - ي)
    const sortedSales = [...filteredDebts].sort((a, b) => {
      const nameA = a.customerName || 'زبون نقدي';
      const nameB = b.customerName || 'زبون نقدي';
      const nameComp = nameA.localeCompare(nameB, 'ar', { sensitivity: 'base' });
      if (nameComp !== 0) return nameComp;
      return b.createdAt - a.createdAt;
    });

    const rows = sortedSales.map(d => {
      const cust = customers.find(c => c.id === d.customerId);
      return [
        d.customerName || 'زبون نقدي',
        cust?.phone || '-',
        d.itemName,
        d.carType || '-',
        d.vehiclePlate || '-',
        format(new Date(d.createdAt), 'yyyy/MM/dd'),
        d.sellPrice,
        d.warrantyMonths ? `${d.warrantyMonths} أشهر` : 'بدون ضمان',
        d.notes || '-'
      ];
    });
    exportToExcelRTL(headers, rows, `مبيعات_نقدية_أبجدي_${todayStr}`, 'المبيعات النقدية');
  };

  const handleExportArchive = () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const headers = [
      'اسم الزبون',
      'رقم الهاتف',
      'نوع البضاعة',
      'نوع السيارة',
      'رقم السيارة',
      'تاريخ الشراء',
      'السعر الكلي (د.ع)',
      'المقدمة (د.ع)',
      'المتبقي (د.ع)',
      'تاريخ الأرشفة',
      'سبب الأرشفة',
      'الملاحظات'
    ];
    // Sort alphabetically by Arabic customer name (أ - ي)
    const sortedArchived = [...filteredArchivedDebts].sort((a, b) => {
      const nameComp = (a.customerName || '').localeCompare(b.customerName || '', 'ar', { sensitivity: 'base' });
      if (nameComp !== 0) return nameComp;
      return (b.archivedAt || 0) - (a.archivedAt || 0);
    });

    const rows = sortedArchived.map(d => {
      const cust = customers.find(c => c.id === d.customerId);
      return [
        d.customerName,
        cust?.phone || '-',
        d.itemName,
        d.carType || '-',
        d.vehiclePlate || '-',
        format(new Date(d.createdAt), 'yyyy/MM/dd'),
        d.sellPrice,
        d.downPayment,
        d.remainingAmount,
        d.archivedAt ? format(new Date(d.archivedAt), 'yyyy/MM/dd HH:mm') : '-',
        d.archiveReason || 'لا يوجد سبب',
        d.notes || '-'
      ];
    });
    exportToExcelRTL(headers, rows, `ارشيف_الديون_أبجدي_${todayStr}`, 'الأرشيف');
  };

  const handleExportExpenses = () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const headers = ['تاريخ الصرف', 'بيان المصروف', 'المبلغ (د.ع)'];
    // Sort alphabetically by expense description
    const sortedExpenses = [...expenses].sort((a, b) =>
      (a.description || '').localeCompare(b.description || '', 'ar', { sensitivity: 'base' })
    );
    const rows = sortedExpenses.map(e => [
      format(new Date(e.createdAt), 'yyyy/MM/dd'),
      e.description,
      e.amount
    ]);
    exportToExcelRTL(headers, rows, `سجل_المصاريف_أبجدي_${todayStr}`, 'المصاريف');
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
              المدراء والعمال
            </button>
          </>
        )}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <StatCard title="إجمالي الديون بالسوق" value={totalDebtsOut} icon={<DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />} colorClass="bg-blue-50/50 border-blue-100" />
            <StatCard title="إجمالي الواصل" value={totalReceived} icon={<ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />} colorClass="bg-emerald-50/50 border-emerald-100" />
            <StatCard title="متوقع استلامه هذا الشهر" value={expectedThisMonth} icon={<Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />} colorClass="bg-orange-50/50 border-orange-100" />
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
              onClick={activeTab === 'cashSales' ? handleExportCashSales : handleExportDebts}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 font-bold transition-colors shadow-sm"
              title="تصدير ملف إكسل من اليمين لليسار"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              <span>تصدير إكسل (RTL)</span>
            </button>
            <button 
              onClick={() => {
                setAddModalInitialData(null);
                setIsAddModalOpen(activeTab === 'cashSales' ? 'cash' : 'debt');
              }}
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
                        <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-700 whitespace-nowrap">نوع السيارة</th>
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
                        <div className="font-bold text-slate-900 whitespace-nowrap flex items-center gap-1.5">
                          <span>{debt.customerName}</span>
                          {(() => {
                            const custDebtsCount = activeOrCompletedDebts.filter(d => 
                              (d.customerId && debt.customerId && d.customerId === debt.customerId) || 
                              (d.customerName && debt.customerName && d.customerName.trim().toLowerCase() === debt.customerName.trim().toLowerCase())
                            ).length;
                            return custDebtsCount > 1 ? (
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold px-1.5 py-0.2 rounded-md" title={`هذا العميل لديه ${custDebtsCount} معاملات`}>
                                {custDebtsCount} مشتريات
                              </span>
                            ) : null;
                          })()}
                        </div>
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
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-slate-800 font-bold whitespace-nowrap">{debt.carType || '-'}</td>
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
                              {activeTab === 'debts' && (debt.carType || debt.serialNumber || debt.vehiclePlate) && (
                                <span className="text-slate-500 font-medium mt-0.5 text-[10px]">
                                  {debt.carType && `سيارة: ${debt.carType} `}
                                  {debt.vehiclePlate && `| لوحة: ${debt.vehiclePlate} `}
                                  {debt.serialNumber && `| S/N: ${debt.serialNumber}`}
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
                          <button 
                            onClick={() => {
                              setAddModalInitialData({
                                customerName: debt.customerName,
                                customerPhone: customers.find(c => c.id === debt.customerId)?.phone || '',
                                carType: debt.carType || '',
                                vehiclePlate: debt.vehiclePlate || ''
                              });
                              setIsAddModalOpen('debt');
                            }} 
                            title="إضافة مشتريات / دين جديد لنفس العميل" 
                            className="px-2 sm:px-2.5 py-1.5 sm:py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors flex items-center gap-1 font-bold shadow-sm text-[10px] sm:text-xs border border-indigo-200"
                          >
                            <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span>شراء جديد</span>
                          </button>
                          <button 
                            onClick={() => setSelectedDebtForNotes(debt)} 
                            title={debt.notes ? "عرض وتعديل الملاحظات" : "إضافة ملاحظة"} 
                            className={cn(
                              "px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors flex items-center gap-1 sm:gap-1.5 font-bold shadow-sm text-[10px] sm:text-xs border",
                              debt.notes 
                                ? "bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-300" 
                                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200"
                            )}
                          >
                            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
                            <span>ملاحظات</span>
                            {debt.notes && <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>}
                          </button>
                          <button 
                            onClick={() => setSelectedDebtForEdit(debt)} 
                            title="تعديل بيانات المعاملة" 
                            className="px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg transition-colors flex items-center gap-1 sm:gap-1.5 font-bold shadow-sm text-[10px] sm:text-xs border border-blue-200"
                          >
                            <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span>تعديل</span>
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

      {activeTab === 'archive' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Archive className="w-5 h-5 text-orange-600" />
                <span>سجل الأرشيف والمحذوفات</span>
                <span className="text-xs bg-orange-100 text-orange-800 font-bold px-2 py-0.5 rounded-full">
                  {filteredArchivedDebts.length} {filteredArchivedDebts.length !== archivedDebts.length ? `من أصل ${archivedDebts.length}` : 'معاملة'}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">يحتوي على جميع المعاملات التي تم أرشفتها لسبب ما، وتبقى للتدقيق والحفظ والبحث.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <div className="relative min-w-[240px] sm:w-72">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="بحث خاص بالأرشيف..." 
                  value={archiveSearchQuery}
                  onChange={e => setArchiveSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-9 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                />
                {archiveSearchQuery && (
                  <button 
                    onClick={() => setArchiveSearchQuery('')} 
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 bg-slate-200/70 hover:bg-slate-300 w-4 h-4 rounded-full flex items-center justify-center"
                    title="مسح البحث"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button 
                onClick={handleExportArchive}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 font-bold transition-colors shadow-sm whitespace-nowrap"
                title="تصدير الأرشيف إلى إكسل من اليمين لليسار"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>تصدير الأرشيف (RTL)</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-auto max-h-[65vh]">
              <table className="w-full text-xs sm:text-sm text-right border-collapse">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-700 whitespace-nowrap">الزبون</th>
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-700 whitespace-nowrap">البضاعة</th>
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-700 whitespace-nowrap">نوع السيارة</th>
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-700 whitespace-nowrap">تاريخ الشراء</th>
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-700 whitespace-nowrap">السعر الكلي</th>
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-700 whitespace-nowrap">المقدمة</th>
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-700 whitespace-nowrap">تاريخ الأرشفة</th>
                    <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-700">سبب الأرشفة / ملاحظات</th>
                    {userRole === 'admin' && (
                      <th className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-700 text-center whitespace-nowrap">حذف نهائي</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredArchivedDebts.map(debt => (
                    <tr key={debt.id} className="hover:bg-slate-50/80 transition-colors opacity-85">
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-900 whitespace-nowrap">
                        <div>{debt.customerName}</div>
                        {debt.vehiclePlate && <div className="text-[11px] text-slate-500 font-normal">لوحة: {debt.vehiclePlate}</div>}
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-slate-700 whitespace-nowrap">{debt.itemName}</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-slate-800 font-bold whitespace-nowrap">{debt.carType || '-'}</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-slate-500 text-xs font-medium whitespace-nowrap">{format(new Date(debt.createdAt), 'yyyy/MM/dd')}</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-slate-900 font-bold whitespace-nowrap">{debt.sellPrice.toLocaleString('en-US')} د.ع</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-slate-600 font-medium whitespace-nowrap">{debt.downPayment.toLocaleString('en-US')} د.ع</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-slate-600 text-xs font-medium whitespace-nowrap">{debt.archivedAt ? format(new Date(debt.archivedAt), 'yyyy/MM/dd HH:mm') : '-'}</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        <div className="flex flex-col gap-1 max-w-sm">
                          <span className="inline-block bg-orange-50 text-orange-800 border border-orange-200 px-2.5 py-1 rounded-lg text-xs font-bold">
                            {debt.archiveReason || 'لا يوجد سبب محدد'}
                          </span>
                          {debt.notes && (
                            <span className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200">
                              ملاحظة: {debt.notes}
                            </span>
                          )}
                        </div>
                      </td>
                      {userRole === 'admin' && (
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => setConfirmAction({
                              message: `تحذير هام: هل أنت متأكد من مسح سجل "${debt.customerName} - ${debt.itemName}" من الأرشيف نهائياً؟ إذا مسحته من الأرشيف ينمسح نهائياً ولا يمكن استرجاعه مطلقاً!`,
                              onConfirm: () => onDeletePermanentDebt(debt.id!)
                            })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 rounded-xl border border-red-200 transition-colors shadow-sm"
                            title="مسح من الأرشيف نهائياً"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>مسح نهائي</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {filteredArchivedDebts.length === 0 && (
                    <tr>
                      <td colSpan={userRole === 'admin' ? 9 : 8} className="px-5 py-12 text-center text-slate-500 font-medium">
                        {archiveSearchQuery ? 'لا توجد نتائج مطابقة لبحثك في الأرشيف.' : 'لا توجد سجلات مؤرشفة حتى الآن.'}
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
        <div className="space-y-8">
          {/* SECTION 1: Admins (Google Login) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-200 shrink-0">
                  <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-0.5">المدراء وأصحاب الصلاحيات الكاملة</h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">تسجيل الدخول عبر Google - صلاحية كاملة لإدارة السجلات والتقارير</p>
                </div>
              </div>
              {isPrimaryAdmin ? (
                <button 
                  onClick={() => {
                    setNewAdminEmail('');
                    setNewAdminName('');
                    setAdminError('');
                    setIsAddAdminModalOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded-xl flex items-center gap-2 font-bold transition-colors shadow-sm whitespace-nowrap self-stretch sm:self-auto justify-center"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  إضافة بريد مدير جديد
                </button>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-800 rounded-xl text-xs font-bold border border-amber-200">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>إضافة وحذف المدراء مقتصرة حصرياً على صاحب الحساب الأساسي</span>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="overflow-auto max-h-[50vh] hide-scrollbar-on-mobile">
                <table className="w-full text-sm text-right whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 font-bold text-slate-700">الاسم / الصفة</th>
                      <th className="px-4 py-3 font-bold text-slate-700">بريد Google</th>
                      <th className="px-4 py-3 font-bold text-slate-700">نوع الصلاحية</th>
                      <th className="px-4 py-3 font-bold text-slate-700">تاريخ الإضافة</th>
                      <th className="px-4 py-3 font-bold text-slate-700 text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Primary Admins */}
                    {primaryAdminEmails.map((email, idx) => (
                      <tr key={`primary-${idx}`} className="bg-slate-50/50 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-800 flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5 text-blue-600" />
                          <span>المدير الرئيسي</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-bold font-mono text-xs" dir="ltr">{maskEmail(email)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            مطلق
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-medium text-xs">نظامي دائم</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs text-slate-400 font-medium select-none">-</span>
                        </td>
                      </tr>
                    ))}

                    {/* Secondary Admins in Firestore */}
                    {admins.map(adm => (
                      <tr key={adm.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-800">{adm.name || 'مدير إضافي'}</td>
                        <td className="px-4 py-3 text-slate-700 font-bold font-mono text-xs" dir="ltr">{maskEmail(adm.email)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            مطلق
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-medium text-xs">
                          {adm.createdAt ? format(new Date(adm.createdAt), 'yyyy/MM/dd') : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isPrimaryAdmin ? (
                            <button 
                              onClick={() => {
                                setConfirmAction({
                                  message: `هل أنت متأكد من حذف حساب المدير (${maskEmail(adm.email)})؟ سيفقد صلاحية الدخول كمدير فوراً.`,
                                  onConfirm: () => onDeleteAdmin && adm.id && onDeleteAdmin(adm.id)
                                });
                              }} 
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                              title="حذف هذا المدير"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium select-none" title="فقط صاحب البريد المعتمد في الكود يمكنه حذف المدراء">-</span>
                          )}
                        </td>
                      </tr>
                    ))}

                    {admins.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-6 text-center text-slate-400 text-xs font-medium">
                          لا يوجد مدراء إضافيون مضافون حالياً. يمكنك إضافة أي إيميل Google ليصبح مديراً في أي وقت.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* SECTION 2: Employees (PIN code) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 shrink-0">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-0.5">حسابات العمال والموظفين</h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">تسجيل الدخول برمز المرور (PIN) - صلاحية محدودة لتسجيل المبيعات والأقساط</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddEmployeeModalOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded-xl flex items-center gap-2 font-bold transition-colors shadow-sm whitespace-nowrap self-stretch sm:self-auto justify-center"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                إضافة عامل جديد
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="overflow-auto max-h-[50vh] hide-scrollbar-on-mobile">
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
                        <td colSpan={4} className="px-5 py-8 text-center text-slate-500 font-medium">
                          لا يوجد عمال مضافين.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isAddModalOpen && (
        <AddDebtModal 
          saleType={isAddModalOpen}
          initialCustomer={addModalInitialData}
          onClose={() => {
            setIsAddModalOpen(false);
            setAddModalInitialData(null);
          }} 
          onAdd={async (data) => {
            await onAddDebt(data);
            setIsAddModalOpen(false);
            setAddModalInitialData(null);
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
          customer={customers.find(c => c.id === selectedDebtDetails.customerId) || { name: selectedDebtDetails.customerName, phone: '', createdAt: 0 } as Customer}
          payments={payments.filter(p => p.debtId === selectedDebtDetails.id)}
          allDebts={debts}
          allPayments={payments}
          onClose={() => setSelectedDebtDetails(null)}
          onDeletePayment={onDeletePayment}
          onUpdatePayment={onUpdatePayment}
          onEdit={(debt) => {
            setSelectedDebtDetails(null);
            setSelectedDebtForEdit(debt);
          }}
          onAddNewPurchase={(customerInfo) => {
            setSelectedDebtDetails(null);
            setAddModalInitialData(customerInfo);
            setIsAddModalOpen('debt');
          }}
          userRole={userRole}
        />
      )}

      {selectedDebtForEdit && (
        <EditDebtModal
          debt={selectedDebtForEdit}
          customer={customers.find(c => c.id === selectedDebtForEdit.customerId)}
          payments={payments}
          onClose={() => setSelectedDebtForEdit(null)}
          onUpdate={async (debtId, data) => {
            await onUpdateDebt(debtId, data);
            setSelectedDebtForEdit(null);
          }}
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
      {selectedDebtForNotes && (
        <DebtNotesModal
          debt={selectedDebtForNotes}
          onClose={() => setSelectedDebtForNotes(null)}
          onSaveNotes={async (debtId, notes) => {
            const currentDebt = debts.find(d => d.id === debtId);
            if (currentDebt) {
              await onUpdateDebt(debtId, {
                customerName: currentDebt.customerName,
                customerPhone: customers.find(c => c.id === currentDebt.customerId)?.phone || '',
                itemName: currentDebt.itemName,
                costPrice: currentDebt.costPrice || 0,
                sellPrice: currentDebt.sellPrice,
                downPayment: currentDebt.downPayment,
                installmentAmount: currentDebt.installmentAmount,
                nextDueDate: currentDebt.nextDueDate,
                transactionDate: currentDebt.createdAt,
                warrantyMonths: currentDebt.warrantyMonths,
                serialNumber: currentDebt.serialNumber,
                vehiclePlate: currentDebt.vehiclePlate,
                carType: currentDebt.carType,
                notes: notes
              });
            }
            setSelectedDebtForNotes(null);
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
      {isAddAdminModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">إضافة مدير جديد</h3>
                <p className="text-xs text-slate-500 font-medium">منح صلاحيات الإدارة الكاملة لبريد Google</p>
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newAdminEmail.trim()) return;
              if (!isPrimaryAdmin) {
                setAdminError('عذراً، فقط صاحب الإيميل الأساسي المعتمد في الكود يملك صلاحية إضافة مدراء.');
                return;
              }
              setAdminError('');
              setAdminSubmitting(true);
              try {
                if (onAddAdmin) {
                  await onAddAdmin(newAdminEmail.trim(), newAdminName.trim());
                }
                setIsAddAdminModalOpen(false);
                setNewAdminEmail('');
                setNewAdminName('');
              } catch (err: any) {
                setAdminError(err.message || 'حدث خطأ أثناء إضافة المدير');
              } finally {
                setAdminSubmitting(false);
              }
            }} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  بريد Google الإلكتروني <span className="text-red-500">*</span>
                </label>
                <input 
                  type="email" 
                  required
                  placeholder="name@gmail.com"
                  value={newAdminEmail}
                  onChange={e => setNewAdminEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500 text-left font-mono"
                  dir="ltr"
                />
                <p className="text-[11px] text-slate-400 mt-1">يجب أن يكون نفس البريد الذي يسجل به الشخص دخوله عبر زر Google.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  اسم أو صفة المدير (اختياري)
                </label>
                <input 
                  type="text" 
                  placeholder="مثال: المهندس أحمد / المحاسب"
                  value={newAdminName}
                  onChange={e => setNewAdminName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              {adminError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700">
                  {adminError}
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={adminSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
                >
                  {adminSubmitting ? 'جاري الحفظ...' : 'تأكيد وإضافة المدير'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddAdminModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-sm transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
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

function DebtNotesModal({ 
  debt, 
  onClose, 
  onSaveNotes 
}: { 
  debt: Debt; 
  onClose: () => void; 
  onSaveNotes: (debtId: string, notes: string) => Promise<void>; 
}) {
  const [notes, setNotes] = useState(debt.notes || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSaveNotes(debt.id!, notes.trim());
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden border border-slate-100">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-amber-50/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">ملاحظات المعاملة</h2>
              <p className="text-xs text-slate-500 font-bold">{debt.customerName} - {debt.itemName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-lg border border-slate-200">✕</button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">الملاحظات المسجلة</label>
            <textarea
              rows={5}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="اكتب هنا أي ملاحظات أو تفاصيل تخص هذا المديون أو البضاعة أو الاتفاق..."
              className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/50 focus:bg-white resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ الملاحظات'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-colors"
            >
              إغلاق
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

function StatCard({ title, value, isCurrency = true, icon, colorClass = "bg-white border-slate-200", subtitle }: { title: string, value: number, isCurrency?: boolean, icon: React.ReactNode, colorClass?: string, subtitle?: string }) {
  return (
    <div className={cn("p-4 sm:p-5 rounded-2xl border shadow-sm flex flex-col justify-between transition-colors", colorClass)}>
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="text-slate-600 text-xs sm:text-sm font-bold">{title}</div>
        <div className="p-1.5 sm:p-2 bg-white rounded-xl shadow-sm">{icon}</div>
      </div>
      <div>
        <div className="text-xl sm:text-2xl font-black text-slate-900">
          <span dir="ltr" className="inline-block">{value.toLocaleString('en-US')}</span> {isCurrency && <span className="text-xs sm:text-sm font-bold text-slate-500">د.ع</span>}
        </div>
        {subtitle && (
          <div className="text-[10px] sm:text-[11px] font-bold text-slate-600 mt-1.5 bg-white/70 px-2 py-0.5 rounded-md inline-block">
            {subtitle}
          </div>
        )}
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

function DebtDetailsModal({ 
  debt, 
  customer, 
  payments, 
  allDebts, 
  allPayments, 
  onClose, 
  onDeletePayment, 
  onUpdatePayment, 
  onEdit, 
  onAddNewPurchase, 
  userRole 
}: { 
  debt: Debt, 
  customer: Customer, 
  payments: Payment[], 
  allDebts?: Debt[], 
  allPayments?: Payment[], 
  onClose: () => void, 
  onDeletePayment: (paymentId: string, debtId: string, amount: number) => Promise<void>, 
  onUpdatePayment?: (paymentId: string, debtId: string, amount: number, paymentDate: number) => Promise<void>, 
  onEdit?: (debt: Debt) => void, 
  onAddNewPurchase?: (customerInfo: { customerName: string; customerPhone?: string; carType?: string; vehiclePlate?: string }) => void,
  userRole: UserRole 
}) {
  const [activeView, setActiveView] = useState<'single' | 'consolidated'>('single');
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState('');
  const [editPaymentDate, setEditPaymentDate] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const phoneFormatted = customer?.phone ? formatPhoneForWA(customer.phone) : '';

  // All transactions for this customer across the system
  const customerDebts = (allDebts || []).filter(d => 
    (d.customerId && debt.customerId && d.customerId === debt.customerId) || 
    (d.customerName && debt.customerName && d.customerName.trim().toLowerCase() === debt.customerName.trim().toLowerCase())
  );
  const allCustomerDebts = customerDebts.length > 0 ? customerDebts : [debt];

  // Consolidated math
  const totalPurchasesSellPrice = allCustomerDebts.reduce((sum, d) => sum + d.sellPrice, 0);
  const totalPurchasesDownPayment = allCustomerDebts.reduce((sum, d) => sum + d.downPayment, 0);
  const allCustomerPayments = (allPayments || []).filter(p => allCustomerDebts.some(d => d.id === p.debtId));
  const totalCustomerInstallments = allCustomerPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalCustomerReceived = totalPurchasesDownPayment + totalCustomerInstallments;
  const totalCustomerRemaining = allCustomerDebts.reduce((sum, d) => sum + d.remainingAmount, 0);

  // Single transaction math
  const totalPaidInInstallments = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalReceivedOverall = debt.downPayment + totalPaidInInstallments;
  
  const generateWAStatement = () => {
    const text = `مرحباً ${customer.name}،

نود تزويدك بكشف حسابك لدينا:
• البضاعة: ${debt.itemName}
• تاريخ الشراء: ${format(new Date(debt.createdAt), 'yyyy/MM/dd')}
${debt.carType ? `• نوع السيارة: ${debt.carType}\n` : ''}${debt.vehiclePlate ? `• رقم السيارة: ${debt.vehiclePlate}\n` : ''}• السعر الكلي: ${debt.sellPrice.toLocaleString('en-US')} د.ع
• المقدمة (الواصل عند التسجيل): ${debt.downPayment.toLocaleString('en-US')} د.ع

سجل الدفعات والمقدمة:
- دفعة المقدمة: ${debt.downPayment.toLocaleString('en-US')} د.ع (${format(new Date(debt.createdAt), 'yyyy/MM/dd')})
${payments.length > 0 
  ? payments.map((p, i) => `- قسط ${i + 1}: ${p.amount.toLocaleString('en-US')} د.ع (${format(new Date(p.paymentDate), 'yyyy/MM/dd')})`).join('\n') 
  : "- لم يتم تسجيل أقساط لاحقة بعد."}

• إجمالي الواصل حتى الآن: ${totalReceivedOverall.toLocaleString('en-US')} د.ع
• المبلغ المتبقي: ${debt.remainingAmount.toLocaleString('en-US')} د.ع
• موعد القسط القادم: ${debt.status === 'completed' ? 'تم التسديد بالكامل' : format(new Date(debt.nextDueDate), 'yyyy/MM/dd')}
${debt.notes ? `\n• ملاحظات: ${debt.notes}\n` : ''}
شكراً لتعاملك معنا.`;
    return encodeURIComponent(text);
  };

  const generateConsolidatedWAStatement = () => {
    const text = `مرحباً ${customer.name}،

نود تزويدك بكشف حسابك الشامل لجميع المشتريات والمعاملات لدينا:

📋 تفاصيل المعاملات (${allCustomerDebts.length} مشتريات):
${allCustomerDebts.map((d, i) => {
  const dPayments = (allPayments || []).filter(p => p.debtId === d.id);
  const dPaid = d.downPayment + dPayments.reduce((sum, p) => sum + p.amount, 0);
  const statusStr = d.status === 'completed' ? 'مسدد بالكامل' : (d.status === 'archived' ? 'مؤرشف' : 'قيد التسديد');
  return `${i + 1}. ${d.itemName} (${format(new Date(d.createdAt), 'yyyy/MM/dd')})
   - السعر الكلي: ${d.sellPrice.toLocaleString('en-US')} د.ع | المقدمة: ${d.downPayment.toLocaleString('en-US')} د.ع
   - إجمالي المدفوع: ${dPaid.toLocaleString('en-US')} د.ع | المتبقي: ${d.remainingAmount.toLocaleString('en-US')} د.ع [${statusStr}]`;
}).join('\n\n')}

💰 الملخص المالي الشامل:
• إجمالي قيمة المشتريات: ${totalPurchasesSellPrice.toLocaleString('en-US')} د.ع
• إجمالي المبالغ الواصلة: ${totalCustomerReceived.toLocaleString('en-US')} د.ع
• إجمالي الرصيد المتبقي بذمتكم: ${totalCustomerRemaining.toLocaleString('en-US')} د.ع

شكراً لثقتكم وتعاملك الراقي معنا.`;
    return encodeURIComponent(text);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-100">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center shadow-sm shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900">كشف حساب العميل</h2>
                {allCustomerDebts.length > 1 && (
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                    {allCustomerDebts.length} مشتريات
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-500">{customer.name} {customer.phone ? `(${customer.phone})` : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-lg border border-slate-200">✕</button>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 p-1.5 gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveView('single')}
            className={cn(
              "flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5",
              activeView === 'single'
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            )}
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span>هذه المعاملة ({debt.itemName})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('consolidated')}
            className={cn(
              "flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5",
              activeView === 'consolidated'
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            )}
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>كشف الحساب الشامل ({allCustomerDebts.length})</span>
          </button>
        </div>
        
        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto">

          {/* Quick Add Purchase Button for this Customer */}
          {onAddNewPurchase && (
            <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-xs text-indigo-950 font-bold">يريد العميل أخذ بضاعة جديدة بالأقساط؟</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onAddNewPurchase({
                    customerName: debt.customerName,
                    customerPhone: customer.phone,
                    carType: debt.carType,
                    vehiclePlate: debt.vehiclePlate
                  });
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-colors shrink-0 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>شراء جديد للعميل</span>
              </button>
            </div>
          )}

          {activeView === 'single' ? (
            /* Single Transaction View */
            <>
              {/* Initial Info & Down Payment Summary Box */}
              <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">المعلومات الأولية والتسجيل</span>
                  <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    بتاريخ {format(new Date(debt.createdAt), 'yyyy/MM/dd')}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-sm">
                  <div>
                    <div className="text-slate-500 text-xs font-bold mb-1">نوع البضاعة</div>
                    <div className="font-black text-slate-900 text-base">{debt.itemName}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs font-bold mb-1">السعر الكلي</div>
                    <div className="font-black text-slate-900 text-base">{debt.sellPrice.toLocaleString('en-US')} د.ع</div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl col-span-2 sm:col-span-1">
                    <div className="text-emerald-800 text-xs font-black mb-0.5">المقدمة (الواصل الأولي)</div>
                    <div className="font-black text-emerald-700 text-base">{debt.downPayment.toLocaleString('en-US')} د.ع</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs font-bold mb-1">المبلغ المتبقي</div>
                    <div className="font-black text-red-600 text-lg">{debt.remainingAmount.toLocaleString('en-US')} د.ع</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs font-bold mb-1">مبلغ القسط الشهري</div>
                    <div className="font-bold text-slate-800 text-sm">{debt.isCashSale ? 'بيع كاش' : `${debt.installmentAmount.toLocaleString('en-US')} د.ع`}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs font-bold mb-1">موعد القسط القادم</div>
                    <div className="font-bold text-slate-800 text-sm">{debt.status === 'completed' ? 'مسدد بالكامل' : format(new Date(debt.nextDueDate), 'yyyy/MM/dd')}</div>
                  </div>
                </div>

                {/* Extra details: car type, plate, warranty */}
                {(debt.carType || debt.vehiclePlate || debt.serialNumber || (debt.warrantyMonths && debt.warrantyMonths > 0)) && (
                  <div className="pt-2 border-t border-slate-200/80 flex flex-wrap gap-2 text-xs">
                    {debt.carType && (
                      <span className="bg-blue-50 text-blue-800 font-bold px-2.5 py-1 rounded-lg border border-blue-100">
                        نوع السيارة: {debt.carType}
                      </span>
                    )}
                    {debt.vehiclePlate && (
                      <span className="bg-slate-100 text-slate-800 font-bold px-2.5 py-1 rounded-lg border border-slate-200">
                        رقم السيارة: {debt.vehiclePlate}
                      </span>
                    )}
                    {debt.serialNumber && (
                      <span className="bg-slate-100 text-slate-700 font-medium px-2.5 py-1 rounded-lg border border-slate-200">
                        S/N: {debt.serialNumber}
                      </span>
                    )}
                    {debt.warrantyMonths && debt.warrantyMonths > 0 ? (
                      <span className="bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-lg border border-emerald-200">
                        ضمان: {debt.warrantyMonths} أشهر
                      </span>
                    ) : null}
                  </div>
                )}

                {/* Notes if present */}
                {debt.notes && (
                  <div className="pt-2 border-t border-slate-200/80">
                    <div className="text-xs font-bold text-amber-800 mb-1">الملاحظات المسجلة:</div>
                    <div className="text-xs text-slate-700 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/70 leading-relaxed">
                      {debt.notes}
                    </div>
                  </div>
                )}
              </div>

              {/* Payments & Installments Ledger */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                    <Clock className="w-5 h-5 text-slate-400" />
                    <span>سجل الواصل والدفعات</span>
                  </h3>
                  <div className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    إجمالي الواصل: {totalReceivedOverall.toLocaleString('en-US')} د.ع
                  </div>
                </div>

                <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                  {/* Down Payment entry */}
                  <div className="flex justify-between items-center p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl shadow-xs">
                    <div>
                      <div className="text-emerald-900 text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>الدفعة المقدمة (عند فتح الحساب)</span>
                      </div>
                      <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                        {format(new Date(debt.createdAt), 'yyyy/MM/dd')}
                      </div>
                    </div>
                    <div className="font-black text-emerald-700 text-sm">
                      {debt.downPayment.toLocaleString('en-US')} د.ع
                    </div>
                  </div>

                  {/* Installment payments */}
                  {payments.map((p, idx) => (
                    <div key={p.id} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                      <div>
                        <div className="text-slate-800 text-xs font-bold">قسط مسدد #{idx + 1}</div>
                        <div className="text-slate-500 text-[11px] font-medium mt-0.5">
                          {format(new Date(p.paymentDate), 'yyyy/MM/dd')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="font-black text-emerald-600 flex items-center gap-1 text-sm">
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          {p.amount.toLocaleString('en-US')} د.ع
                        </div>
                        {userRole === 'admin' && (
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => {
                                setEditingPayment(p);
                                setEditPaymentAmount(p.amount.toString());
                                setEditPaymentDate(format(new Date(p.paymentDate), 'yyyy-MM-dd'));
                              }}
                              title="تعديل هذه الدفعة"
                              className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => setPaymentToDelete(p)}
                              title="حذف الدفعة"
                              className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {payments.length === 0 && (
                    <div className="text-xs text-slate-500 text-center py-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      لم يتم تسجيل أقساط لاحقة بعد (تم استلام المقدمة فقط).
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2.5 pt-2">
                {phoneFormatted && (
                  <a 
                    href={`https://wa.me/${phoneFormatted}?text=${generateWAStatement()}`}
                    target="_blank"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    إرسال كشف هذه المعاملة عبر واتساب
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onEdit) onEdit(debt);
                  }}
                  className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
                >
                  <Pencil className="w-4 h-4" />
                  تعديل بيانات هذه المعاملة
                </button>
              </div>
            </>
          ) : (
            /* Consolidated Customer Account Statement View */
            <>
              {/* Consolidated Overall Financial Card */}
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-300" />
                    <span className="text-xs font-bold text-indigo-200">الرصيد المالي الشامل للعميل</span>
                  </div>
                  <span className="text-xs font-medium bg-white/10 px-2.5 py-0.5 rounded-md text-slate-200">
                    {allCustomerDebts.length} معاملات مسجلة
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                    <div className="text-[11px] text-slate-300 font-bold mb-1">إجمالي المشتريات</div>
                    <div className="text-sm sm:text-base font-black text-white">{totalPurchasesSellPrice.toLocaleString('en-US')} د.ع</div>
                  </div>
                  <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                    <div className="text-[11px] text-emerald-300 font-bold mb-1">إجمالي الواصل</div>
                    <div className="text-sm sm:text-base font-black text-emerald-300">{totalCustomerReceived.toLocaleString('en-US')} د.ع</div>
                  </div>
                  <div className="bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">
                    <div className="text-[11px] text-red-300 font-bold mb-1">المتبقي الكلي</div>
                    <div className="text-sm sm:text-base font-black text-red-300">{totalCustomerRemaining.toLocaleString('en-US')} د.ع</div>
                  </div>
                </div>
              </div>

              {/* All Items List */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-800 text-sm flex items-center justify-between">
                  <span>سجل جميع المعاملات والمشتريات ({allCustomerDebts.length}):</span>
                </h3>

                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                  {allCustomerDebts.map((d, index) => {
                    const itemPayments = (allPayments || []).filter(p => p.debtId === d.id);
                    const itemTotalReceived = d.downPayment + itemPayments.reduce((sum, p) => sum + p.amount, 0);

                    return (
                      <div key={d.id} className={cn(
                        "p-3.5 rounded-2xl border transition-all shadow-xs",
                        d.id === debt.id ? "bg-indigo-50/50 border-indigo-200" : "bg-white border-slate-200"
                      )}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 bg-slate-100 text-slate-700 text-xs font-bold rounded-full flex items-center justify-center shrink-0">
                                {index + 1}
                              </span>
                              <h4 className="font-black text-slate-900 text-sm">{d.itemName}</h4>
                              {d.id === debt.id && (
                                <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.2 rounded">المعاملة الحالية</span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium mt-1">
                              تاريخ الشراء: {format(new Date(d.createdAt), 'yyyy/MM/dd')}
                              {d.carType && ` | سيارة: ${d.carType}`}
                              {d.vehiclePlate && ` | لوحة: ${d.vehiclePlate}`}
                            </div>
                          </div>
                          <div>
                            {d.status === 'completed' ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800">
                                مسدد بالكامل
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800">
                                متبقي: {d.remainingAmount.toLocaleString('en-US')} د.ع
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center font-bold">
                          <div>
                            <span className="text-slate-500 font-normal block text-[10px]">السعر الكلي</span>
                            <span className="text-slate-800">{d.sellPrice.toLocaleString('en-US')} د.ع</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-normal block text-[10px]">المقدمة</span>
                            <span className="text-slate-800">{d.downPayment.toLocaleString('en-US')} د.ع</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-normal block text-[10px]">إجمالي المدفوع</span>
                            <span className="text-emerald-700">{itemTotalReceived.toLocaleString('en-US')} د.ع</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Consolidated Actions */}
              <div className="space-y-2.5 pt-2">
                {phoneFormatted && (
                  <a 
                    href={`https://wa.me/${phoneFormatted}?text=${generateConsolidatedWAStatement()}`}
                    target="_blank"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    إرسال كشف الحساب الشامل عبر واتساب
                  </a>
                )}
              </div>
            </>
          )}

        </div>

        {/* Edit Payment Modal */}
        {editingPayment && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-60">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600" />
                <span>تعديل الدفعة</span>
              </h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!onUpdatePayment) return;
                setIsSavingPayment(true);
                const newDateMs = startOfDay(new Date(editPaymentDate)).getTime();
                await onUpdatePayment(editingPayment.id!, editingPayment.debtId, Number(editPaymentAmount), newDateMs);
                setIsSavingPayment(false);
                setEditingPayment(null);
              }} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">مبلغ الدفعة (د.ع)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={editPaymentAmount}
                    onChange={e => setEditPaymentAmount(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 font-bold focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">تاريخ الدفعة</label>
                  <input
                    required
                    type="date"
                    value={editPaymentDate}
                    onChange={e => setEditPaymentDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 font-medium focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    type="submit"
                    disabled={isSavingPayment}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSavingPayment ? 'جاري الحفظ...' : 'حفظ التعديل'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditingPayment(null)} 
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {paymentToDelete && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-60">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-2">حذف الدفعة</h3>
              <p className="text-slate-600 mb-6 font-medium text-sm leading-relaxed">
                هل أنت متأكد من حذف هذه الدفعة بقيمة ({paymentToDelete.amount.toLocaleString('en-US')} د.ع)؟ سيعود المبلغ إلى الباقي المطلوب.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={async () => {
                    await onDeletePayment(paymentToDelete.id!, paymentToDelete.debtId, paymentToDelete.amount);
                    setPaymentToDelete(null);
                  }} 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold transition-colors shadow-sm"
                >
                  تأكيد الحذف
                </button>
                <button 
                  onClick={() => setPaymentToDelete(null)} 
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
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

function AddDebtModal({ 
  onClose, 
  onAdd, 
  saleType,
  initialCustomer
}: { 
  onClose: () => void; 
  onAdd: (data: {
    customerName: string;
    customerPhone: string;
    itemName: string;
    costPrice: number;
    sellPrice: number;
    downPayment: number;
    installmentAmount: number;
    nextDueDate: number;
    transactionDate?: number;
    isCashSale?: boolean;
    warrantyMonths?: number;
    serialNumber?: string;
    vehiclePlate?: string;
    carType?: string;
    notes?: string;
  }) => Promise<void>; 
  saleType: 'debt' | 'cash';
  initialCustomer?: {
    customerName?: string;
    customerPhone?: string;
    carType?: string;
    vehiclePlate?: string;
  } | null;
}) {
  const type = saleType;
  
  const [name, setName] = useState(initialCustomer?.customerName || '');
  const [phone, setPhone] = useState(initialCustomer?.customerPhone || '');
  const [item, setItem] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  
  const [downPayment, setDownPayment] = useState('');
  const [installment, setInstallment] = useState('');
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [transactionDate, setTransactionDate] = useState(todayStr);
  const [nextDueDate, setNextDueDate] = useState(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
  
  const [carType, setCarType] = useState(initialCustomer?.carType || '');
  const [vehiclePlate, setVehiclePlate] = useState(initialCustomer?.vehiclePlate || '');
  const [warrantyMonths, setWarrantyMonths] = useState('0');
  const [serialNumber, setSerialNumber] = useState('');
  const [notes, setNotes] = useState('');

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
      costPrice: 0, 
      sellPrice: Number(sellPrice), 
      downPayment: type === 'cash' ? Number(sellPrice) : Number(downPayment), 
      installmentAmount: type === 'cash' ? 0 : Number(installment), 
      nextDueDate: nextDateMs,
      transactionDate: transactionDateMs,
      isCashSale: type === 'cash',
      warrantyMonths: Number(warrantyMonths),
      serialNumber: type === 'cash' ? '' : serialNumber.trim(),
      vehiclePlate: vehiclePlate.trim(),
      carType: carType.trim(),
      notes: notes.trim()
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
          <div>
            <h2 className="text-xl font-black text-slate-900">{type === 'cash' ? 'إضافة مبيعات نقدية' : 'إضافة معاملة (دين)'}</h2>
            {initialCustomer?.customerName && (
              <p className="text-xs font-bold text-indigo-700 mt-0.5">تسجيل بضاعة جديدة لنفس العميل: {initialCustomer.customerName}</p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-lg border border-slate-200">✕</button>
        </div>
        
        {initialCustomer?.customerName && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between text-xs text-indigo-950 font-bold shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-indigo-600 text-white rounded-lg flex items-center justify-center shrink-0">
                <PlusCircle className="w-4 h-4" />
              </div>
              <div>
                <span>إضافة مشتريات جديدة لنفس العميل: </span>
                <span className="text-indigo-900 font-black">{initialCustomer.customerName}</span>
              </div>
            </div>
            <span className="bg-indigo-100 text-indigo-800 text-[11px] px-2.5 py-0.5 rounded-lg border border-indigo-200">
              تم تجهيز البيانات تلقائياً
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">اسم الزبون {type === 'debt' && <span className="text-red-500">*</span>}</label>
              <input 
                required={type === 'debt'} 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder={type === 'cash' ? 'زبون نقدي (اختياري)' : 'اسم المديون'} 
                className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">رقم الهاتف (للواتساب)</label>
              <input 
                type="text" 
                placeholder="07..." 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                className="w-full border border-slate-200 rounded-xl px-4 py-3 dir-ltr text-right font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">نوع البضاعة (مثل: باتري، تاير) <span className="text-red-500">*</span></label>
              <input 
                required 
                type="text" 
                value={item} 
                onChange={e => setItem(e.target.value)} 
                placeholder="مثال: باتري دايو 70 أمبير"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">السعر الكلي (سعر البيع) <span className="text-red-500">*</span></label>
              <input 
                required 
                type="number" 
                min="0" 
                value={sellPrice} 
                onChange={e => setSellPrice(e.target.value)} 
                placeholder="مثال: 120000"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" 
              />
            </div>
          </div>

          {type === 'debt' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">المقدمة (الواصل) <span className="text-red-500">*</span></label>
                  <input 
                    required 
                    type="number" 
                    min="0" 
                    value={downPayment} 
                    onChange={e => setDownPayment(e.target.value)} 
                    placeholder="المبلغ المدفوع كدفعة أولى"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">قيمة القسط <span className="text-red-500">*</span></label>
                  <input 
                    required 
                    type="number" 
                    min="0" 
                    value={installment} 
                    onChange={e => setInstallment(e.target.value)} 
                    placeholder="مبلغ القسط الشهري أو الأسبوعي"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">تاريخ الشراء <span className="text-red-500">*</span></label>
                  <input 
                    required 
                    type="date" 
                    value={transactionDate} 
                    onChange={e => setTransactionDate(e.target.value)} 
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">تاريخ القسط القادم <span className="text-red-500">*</span></label>
                  <input 
                    required 
                    type="date" 
                    value={nextDueDate} 
                    onChange={e => setNextDueDate(e.target.value)} 
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" 
                  />
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
              <input 
                required 
                type="date" 
                value={transactionDate} 
                onChange={e => setTransactionDate(e.target.value)} 
                className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" 
              />
            </div>
          )}

          {/* Vehicle info */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-sm font-black text-slate-800 mb-3">معلومات السيارة والضمان (اختياري)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">نوع السيارة</label>
                <input 
                  type="text" 
                  value={carType} 
                  onChange={e => setCarType(e.target.value)} 
                  placeholder="مثال: سوناتا، إلنترا، كيا أوبتيما..." 
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 bg-slate-50/50 focus:bg-white transition-colors" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">رقم السيارة</label>
                <input 
                  type="text" 
                  value={vehiclePlate} 
                  onChange={e => setVehiclePlate(e.target.value)} 
                  placeholder="مثال: بغداد 12345 أ" 
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 bg-slate-50/50 focus:bg-white transition-colors" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">فترة ضمان الباتري</label>
                <select 
                  value={warrantyMonths} 
                  onChange={e => setWarrantyMonths(e.target.value)} 
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 bg-slate-50/50 focus:bg-white transition-colors"
                >
                  <option value="0">بدون ضمان</option>
                  <option value="2">شهرين (2 شهر)</option>
                  <option value="3">3 أشهر</option>
                  <option value="4">4 أشهر</option>
                </select>
              </div>
              {type === 'debt' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">الرقم التسلسلي للقطعة (S/N)</label>
                  <input 
                    type="text" 
                    value={serialNumber} 
                    onChange={e => setSerialNumber(e.target.value)} 
                    placeholder="مثال: A123456789" 
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 bg-slate-50/50 focus:bg-white transition-colors dir-ltr text-right" 
                  />
                </div>
              ) : null}
            </div>
          </div>

          {/* Notes field */}
          <div className="border-t border-slate-100 pt-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>ملاحظات المعاملة (اختياري)</span>
              </label>
              <textarea 
                rows={3}
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="اكتب هنا أي ملاحظات أو شروط خاصة بالمعاملة أو الزبون..." 
                className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium focus:outline-none focus:border-blue-500 bg-slate-50/50 focus:bg-white transition-colors resize-none" 
              />
            </div>
          </div>

          {type === 'debt' && (
            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 flex justify-between items-center mt-6">
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

function EditDebtModal({ 
  debt, 
  customer, 
  payments, 
  onClose, 
  onUpdate 
}: { 
  debt: Debt; 
  customer?: Customer; 
  payments: Payment[]; 
  onClose: () => void; 
  onUpdate: (debtId: string, data: {
    customerName: string;
    customerPhone: string;
    itemName: string;
    costPrice: number;
    sellPrice: number;
    downPayment: number;
    installmentAmount: number;
    nextDueDate: number;
    transactionDate?: number;
    warrantyMonths?: number;
    serialNumber?: string;
    vehiclePlate?: string;
    paymentsList?: Array<{ id?: string; amount: number; paymentDate: number; isDeleted?: boolean }>;
  }) => Promise<void>; 
}) {
  const [name, setName] = useState(customer?.name || debt.customerName || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [item, setItem] = useState(debt.itemName || '');
  const [costPrice, setCostPrice] = useState(debt.costPrice?.toString() || '0');
  const [sellPrice, setSellPrice] = useState(debt.sellPrice?.toString() || '0');
  const [downPayment, setDownPayment] = useState(debt.downPayment?.toString() || '0');
  const [installment, setInstallment] = useState(debt.installmentAmount?.toString() || '0');

  // Editable Payments state
  const [editablePayments, setEditablePayments] = useState<Array<{
    id?: string;
    amount: number;
    paymentDate: number;
    isDeleted?: boolean;
  }>>(() => {
    return payments
      .filter(p => p.debtId === debt.id)
      .map(p => ({
        id: p.id,
        amount: p.amount,
        paymentDate: p.paymentDate,
        isDeleted: false
      }));
  });

  const initialDateStr = debt.createdAt ? format(new Date(debt.createdAt), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  const [transactionDate, setTransactionDate] = useState(initialDateStr);
  const initialNextDueStr = debt.nextDueDate ? format(new Date(debt.nextDueDate), 'yyyy-MM-dd') : format(addMonths(new Date(), 1), 'yyyy-MM-dd');
  const [nextDueDate, setNextDueDate] = useState(initialNextDueStr);

  const [warrantyMonths, setWarrantyMonths] = useState((debt.warrantyMonths || 0).toString());
  const [serialNumber, setSerialNumber] = useState(debt.serialNumber || '');
  const [vehiclePlate, setVehiclePlate] = useState(debt.vehiclePlate || '');

  const [loading, setLoading] = useState(false);

  // Total already paid in installments (excluding downPayment)
  const totalPaidInInstallments = editablePayments
    .filter(p => !p.isDeleted)
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // Remaining calculation: (Sell Price - Down Payment) - Previous Installments
  const newRemaining = Math.max(0, (Number(sellPrice) - Number(downPayment)) - totalPaidInInstallments);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const nextDateMs = debt.isCashSale ? 0 : startOfDay(new Date(nextDueDate)).getTime();
    const transactionDateMs = startOfDay(new Date(transactionDate)).getTime();

    await onUpdate(debt.id!, {
      customerName: name.trim(),
      customerPhone: phone.trim(),
      itemName: item.trim(),
      costPrice: Number(costPrice),
      sellPrice: Number(sellPrice),
      downPayment: Number(downPayment),
      installmentAmount: debt.isCashSale ? 0 : Number(installment),
      nextDueDate: nextDateMs,
      transactionDate: transactionDateMs,
      warrantyMonths: Number(warrantyMonths),
      serialNumber: serialNumber.trim(),
      vehiclePlate: vehiclePlate.trim(),
      paymentsList: editablePayments
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center shadow-sm">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">تعديل بيانات المعاملة والبيع</h2>
              <p className="text-xs text-slate-500 font-medium">تعديل السعر، رأس المال، الواصل، وبيانات الزبون والضمان</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-lg border border-slate-200">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* Customer info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">اسم الزبون <span className="text-red-500">*</span></label>
              <input 
                required 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">رقم الهاتف</label>
              <input 
                type="tel" 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                placeholder="07XXXXXXXXX" 
                className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors text-right dir-ltr" 
              />
            </div>
          </div>

          {/* Item */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">نوع البضاعة / القطعة <span className="text-red-500">*</span></label>
            <input 
              required 
              type="text" 
              value={item} 
              onChange={e => setItem(e.target.value)} 
              placeholder="مثال: تاير هانكوك 205/65/15" 
              className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" 
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">سعر التكلفة (رأس المال) <span className="text-red-500">*</span></label>
              <input 
                required 
                type="number" 
                min="0" 
                value={costPrice} 
                onChange={e => setCostPrice(e.target.value)} 
                className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">سعر البيع الكلي <span className="text-red-500">*</span></label>
              <input 
                required 
                type="number" 
                min="0" 
                value={sellPrice} 
                onChange={e => setSellPrice(e.target.value)} 
                className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" 
              />
            </div>
          </div>

          {/* Down payment & Installment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">الواصل أول بيع (المقدمة) <span className="text-red-500">*</span></label>
              <input 
                required 
                type="number" 
                min="0" 
                value={downPayment} 
                onChange={e => setDownPayment(e.target.value)} 
                className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" 
              />
            </div>
            {!debt.isCashSale && (
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">مبلغ القسط الشهري <span className="text-red-500">*</span></label>
                <input 
                  required 
                  type="number" 
                  min="0" 
                  value={installment} 
                  onChange={e => setInstallment(e.target.value)} 
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" 
                />
              </div>
            )}
          </div>

          {/* Editable Payments History Section */}
          {!debt.isCashSale && (
            <div className="border-t border-slate-200 pt-4 mt-2 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>سجل الدفعات والأقساط المستلمة</span>
                    <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                      {editablePayments.filter(p => !p.isDeleted).length} دفعة
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">يمكنك تعديل مبالغ وتواريخ الأقساط، أو حذفها، أو إضافة دفعة جديدة</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditablePayments(prev => [
                      ...prev,
                      {
                        amount: Number(installment) || 0,
                        paymentDate: Date.now(),
                        isDeleted: false
                      }
                    ]);
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة دفعة</span>
                </button>
              </div>

              {editablePayments.filter(p => !p.isDeleted).length === 0 ? (
                <p className="text-slate-500 text-xs text-center py-3.5 bg-slate-50 rounded-xl border border-dashed border-slate-200 font-medium">
                  لم يتم تسجيل أي أقساط بعد الشراء حتى الآن.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                  {editablePayments.map((p, idx) => {
                    if (p.isDeleted) return null;
                    return (
                      <div key={p.id || `new-${idx}`} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
                        <div className="text-xs font-bold text-slate-600 shrink-0 w-14">
                          قسط {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              value={p.amount}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setEditablePayments(prev => prev.map((item, i) => i === idx ? { ...item, amount: val } : item));
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-blue-500"
                              placeholder="مبلغ القسط"
                            />
                            <span className="absolute left-2 top-1.5 text-[10px] text-slate-400 font-bold">د.ع</span>
                          </div>
                        </div>
                        <div className="w-36">
                          <input
                            type="date"
                            value={format(new Date(p.paymentDate), 'yyyy-MM-dd')}
                            onChange={e => {
                              const newDateMs = startOfDay(new Date(e.target.value)).getTime();
                              setEditablePayments(prev => prev.map((item, i) => i === idx ? { ...item, paymentDate: newDateMs } : item));
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditablePayments(prev => prev.map((item, i) => i === idx ? { ...item, isDeleted: true } : item));
                          }}
                          title="حذف هذه الدفعة"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Dynamic Summary calculation */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-600">
              <span>سعر البيع الكلي:</span>
              <span className="text-slate-900">{Number(sellPrice || 0).toLocaleString('en-US')} د.ع</span>
            </div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-600">
              <span>الواصل أول بيع (المقدمة):</span>
              <span className="text-emerald-600">- {Number(downPayment || 0).toLocaleString('en-US')} د.ع</span>
            </div>
            {!debt.isCashSale && (
              <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                <span>مجموع الأقساط اللاحقة المستلمة:</span>
                <span className="text-emerald-700">- {totalPaidInInstallments.toLocaleString('en-US')} د.ع</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm font-black text-slate-800 pt-2 border-t border-slate-200">
              <span>المتبقي الجديد المطلوب:</span>
              <span className={newRemaining <= 0 ? "text-emerald-600" : "text-red-600"}>
                {newRemaining.toLocaleString('en-US')} د.ع {newRemaining <= 0 ? '(مسدد بالكامل)' : ''}
              </span>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">تاريخ الشراء / البيع <span className="text-red-500">*</span></label>
              <input 
                required 
                type="date" 
                value={transactionDate} 
                onChange={e => setTransactionDate(e.target.value)} 
                className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" 
              />
            </div>
            {!debt.isCashSale && (
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">تاريخ القسط القادم <span className="text-red-500">*</span></label>
                <input 
                  required 
                  type="date" 
                  value={nextDueDate} 
                  onChange={e => setNextDueDate(e.target.value)} 
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-colors" 
                />
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => handleIntervalQuickSelect('month')} className="flex-1 text-[11px] font-bold bg-slate-100 text-slate-600 py-1.5 rounded-lg hover:bg-slate-200 transition-colors border border-slate-200">بعد شهر</button>
                  <button type="button" onClick={() => handleIntervalQuickSelect('week')} className="flex-1 text-[11px] font-bold bg-slate-100 text-slate-600 py-1.5 rounded-lg hover:bg-slate-200 transition-colors border border-slate-200">بعد أسبوع</button>
                </div>
              </div>
            )}
          </div>

          {/* Warranty & Extra info */}
          <div className="border-t border-slate-100 pt-4 mt-4">
            <h3 className="text-sm font-black text-slate-800 mb-3">معلومات الضمان والسيارة (اختياري)</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">فترة ضمان الباتري</label>
                <select 
                  value={warrantyMonths} 
                  onChange={e => setWarrantyMonths(e.target.value)} 
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 bg-slate-50/50"
                >
                  <option value="0">بدون ضمان</option>
                  <option value="2">شهرين (2 شهر)</option>
                  <option value="3">3 أشهر</option>
                  <option value="4">4 أشهر</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">الرقم التسلسلي للقطعة (S/N)</label>
                  <input 
                    type="text" 
                    value={serialNumber} 
                    onChange={e => setSerialNumber(e.target.value)} 
                    placeholder="مثال: A123456789" 
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 bg-slate-50/50 dir-ltr text-right" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">رقم السيارة</label>
                  <input 
                    type="text" 
                    value={vehiclePlate} 
                    onChange={e => setVehiclePlate(e.target.value)} 
                    placeholder="مثال: بغداد 12345 أ" 
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-blue-500 bg-slate-50/50" 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="submit" 
              disabled={loading} 
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-colors disabled:opacity-50 shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? 'جاري الحفظ...' : (
                <>
                  <Check className="w-5 h-5" />
                  <span>حفظ التعديلات</span>
                </>
              )}
            </button>
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-xl font-bold transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
