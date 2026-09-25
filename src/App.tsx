import { useState, useEffect } from "react";
import { Wallet, Activity, LogIn, LogOut, Key, ShieldAlert } from "lucide-react";
import { useAppData } from "./hooks/useAppData";
import { Dashboard } from "./components/Dashboard";
import { auth, googleProvider, signInWithPopup, signOut, signInAnonymously } from "./lib/firebase";
import { User } from "firebase/auth";
import type { UserRole } from "./types";
import { maskEmail } from "./lib/utils";
import { PWAInstallButton } from "./components/PWAInstallButton";

export const PRIMARY_ADMIN_EMAILS = [
  'abdalhakeem852@gmail.com'
];

export const MASTER_PROMO_KEY = '2026';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Phone Auth State
  const [showCodeAuth, setShowCodeAuth] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // We need employees data to check the code. But we can only query them IF we are authenticated.
  // Wait, if we use the normal useAppData, it requires authentication.
  // We will handle the code check in MainApp, but first we sign in anonymously.

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed", error);
      setErrorMsg(error.message);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;
    setErrorMsg('');
    setCodeLoading(true);

    try {
      // Sign in anonymously first so we can read the DB
      await signInAnonymously(auth);
      // We store the code in localStorage to verify it in MainApp once the DB loads
      localStorage.setItem('empCode', accessCode.trim());
    } catch (error: any) {
      console.error("Code auth failed", error);
      setErrorMsg('حدث خطأ أثناء تسجيل الدخول.');
    } finally {
      setCodeLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('empCode');
    signOut(auth);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" dir="rtl">
        <Activity className="w-8 h-8 text-blue-600 animate-pulse mb-4" />
        <p className="text-slate-500 font-medium">جاري التحقق من الحماية...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" dir="rtl">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-200 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Wallet size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">سجل الديون</h1>
          <p className="text-slate-500 text-sm mb-6 font-medium">لوحة التحكم مقفلة. يرجى تسجيل الدخول للوصول إلى النظام.</p>
          
          {errorMsg && (
            <div className="mb-4 text-xs font-bold text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
              {errorMsg}
            </div>
          )}

          {!showCodeAuth ? (
            <div className="space-y-3">
              <button 
                onClick={handleGoogleLogin}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <LogIn className="w-5 h-5" />
                <span>دخول الإدارة (Google)</span>
              </button>
              <button 
                onClick={() => setShowCodeAuth(true)}
                className="w-full bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Key className="w-5 h-5" />
                <span>دخول العمال (رمز الدخول)</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleCodeSubmit} className="space-y-4 text-right">
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1.5">رمز الدخول الخاص بك</label>
                <input 
                  type="password" 
                  required
                  placeholder="****"
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-center tracking-[0.5em]"
                  dir="ltr"
                />
              </div>
              <button 
                type="submit"
                disabled={codeLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center transition-colors shadow-sm"
              >
                {codeLoading ? 'جاري التحقق...' : 'تسجيل الدخول'}
              </button>
              <button 
                type="button"
                onClick={() => setShowCodeAuth(false)}
                className="w-full text-slate-500 hover:text-slate-700 text-sm font-bold py-2"
              >
                رجوع
              </button>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">متاح كتطبيق لهاتفك</span>
            <PWAInstallButton />
          </div>
        </div>
      </div>
    );
  }

  return <MainApp user={user} onLogout={handleLogout} />;
}

function MainApp({ user, onLogout }: { user: User, onLogout: () => void }) {
  const { 
    customers, 
    debts, 
    payments, 
    expenses, 
    employees, 
    admins,
    loading, 
    addCustomerAndDebt, 
    payInstallment, 
    addExpense, 
    deleteExpense, 
    archiveDebt, 
    deletePermanentDebt, 
    updateDebt, 
    updatePayment, 
    deletePayment, 
    addEmployee, 
    deleteEmployee,
    addAdmin,
    deleteAdmin
  } = useAppData();

  const [promoKey, setPromoKey] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoting, setPromoting] = useState(false);

  const emailLower = user.email?.toLowerCase() || '';
  const isPrimaryAdmin = PRIMARY_ADMIN_EMAILS.some(e => e.toLowerCase() === emailLower);
  const isSecondaryAdmin = admins.some(a => a.email.toLowerCase() === emailLower);
  const isAdmin = isPrimaryAdmin || isSecondaryAdmin;

  const savedCode = localStorage.getItem('empCode');
  const isEmployee = user.isAnonymous && employees.some(e => e.code === savedCode);

  const handleAddAdmin = async (email: string, name?: string) => {
    if (!isPrimaryAdmin) {
      throw new Error('فقط صاحب الإيميل الأساسي المعتمد في الكود يملك صلاحية إضافة مدراء.');
    }
    await addAdmin(email, name, user.displayName || user.email || 'المدير الرئيسي');
  };

  const handleDeleteAdmin = async (id: string) => {
    if (!isPrimaryAdmin) {
      throw new Error('فقط صاحب الإيميل الأساسي المعتمد في الكود يملك صلاحية حذف المدراء.');
    }
    await deleteAdmin(id);
  };

  const handlePromoteSelf = async () => {
    if (!promoKey.trim()) return;
    setPromoError('');
    if (promoKey.trim() !== MASTER_PROMO_KEY) {
      setPromoError('رمز الترقية الإداري غير صحيح.');
      return;
    }

    if (!user.email) {
      setPromoError('لا يوجد بريد إلكتروني مرتبط بحسابك للترقية.');
      return;
    }

    setPromoting(true);
    try {
      await addAdmin(user.email, user.displayName || 'مدير معتمد', 'ترقية عبر رمز المطور');
      setPromoKey('');
    } catch (err: any) {
      setPromoError(err.message || 'حدث خطأ أثناء ترقية الحساب');
    } finally {
      setPromoting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" dir="rtl">
        <Activity className="w-8 h-8 text-blue-600 animate-pulse mb-4" />
        <p className="text-slate-500 font-medium">جاري تحميل السجلات...</p>
      </div>
    );
  }

  // If user signed in anonymously with invalid code
  if (user.isAnonymous && !isEmployee) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" dir="rtl">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-200 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <ShieldAlert size={32} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">رمز الدخول غير صحيح</h1>
          <p className="text-slate-500 text-sm mb-6 font-medium">الرمز الذي أدخلته غير مطابق لأي حساب عامل مسجل.</p>
          <button
            onClick={onLogout}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>رجوع لتسجيل الدخول</span>
          </button>
        </div>
      </div>
    );
  }

  // If Google user is not an admin
  if (!user.isAnonymous && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" dir="rtl">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-200 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <ShieldAlert size={32} />
          </div>
          <h1 className="text-xl font-black text-slate-900 mb-2">حساب Google غير مصرح له كمدير</h1>
          <p className="text-slate-500 text-sm mb-4 font-medium leading-relaxed">
            تم تسجيل الدخول بواسطة: <br />
            <span className="font-bold text-slate-800 font-mono text-xs inline-block mt-1 bg-slate-100 px-3 py-1 rounded-lg" dir="ltr">{maskEmail(user.email || '')}</span>
            <br />
            ولكن هذا البريد غير مضاف حالياً في قائمة المدراء المصرح لهم.
          </p>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-right mb-6">
            <label className="text-xs font-bold text-slate-800 block mb-1 flex items-center gap-1.5">
              <Key size={14} className="text-blue-600" />
              هل تملك رمز الترقية الإداري؟
            </label>
            <p className="text-[11px] text-slate-500 mb-3">
              إذا كنت المطور أو المشرف، أدخل رمز الترقية لترقية هذا البريد كمدير معتمد فوراً وحفظه في النظام:
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="رمز الترقية (2026)"
                value={promoKey}
                onChange={e => setPromoKey(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-blue-500 text-center tracking-widest"
                dir="ltr"
              />
              <button
                onClick={handlePromoteSelf}
                disabled={promoting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-colors disabled:opacity-50"
              >
                {promoting ? 'جاري الترقية...' : 'ترقية الحساب'}
              </button>
            </div>
            {promoError && (
              <p className="text-xs font-bold text-red-600 mt-2">{promoError}</p>
            )}
          </div>

          <button
            onClick={onLogout}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>
    );
  }

  const role: UserRole = isAdmin ? 'admin' : 'employee';
  const employeeName = employees.find(e => e.code === localStorage.getItem('empCode'))?.name || 'عامل';

  return (
    <div className="min-h-screen bg-slate-50 font-sans" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-inner">
              <Wallet size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-none mb-1">سجل الديون</h1>
              <p className="text-xs text-slate-500 font-medium">نظام إدارة الأقساط ورأس المال</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
             <PWAInstallButton />
             <div className="hidden sm:flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
               <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
               {role === 'admin' ? (user.displayName || maskEmail(user.email || '')) : employeeName}
               {role === 'admin' && (
                 <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                   isPrimaryAdmin 
                     ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                     : 'bg-blue-100 text-blue-700'
                 }`}>
                   {isPrimaryAdmin ? 'المدير الرئيسي (المالك)' : 'مدير معتمد'}
                 </span>
               )}
             </div>
             <button onClick={onLogout} title="تسجيل الخروج" className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100">
                <LogOut className="w-5 h-5" />
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pt-6">
        <Dashboard 
          customers={customers} 
          debts={debts} 
          payments={payments}
          expenses={expenses}
          employees={employees}
          admins={admins}
          primaryAdminEmails={PRIMARY_ADMIN_EMAILS}
          isPrimaryAdmin={isPrimaryAdmin}
          userRole={role}
          onAddDebt={addCustomerAndDebt}
          onPay={payInstallment}
          onAddExpense={addExpense}
          onDeleteExpense={deleteExpense}
          onArchiveDebt={archiveDebt}
          onDeletePermanentDebt={deletePermanentDebt}
          onUpdateDebt={updateDebt}
          onUpdatePayment={updatePayment}
          onDeletePayment={deletePayment}
          onAddEmployee={addEmployee}
          onDeleteEmployee={deleteEmployee}
          onAddAdmin={handleAddAdmin}
          onDeleteAdmin={handleDeleteAdmin}
        />
      </main>
    </div>
  );
}

