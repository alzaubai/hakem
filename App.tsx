import { useState, useEffect } from "react";
import { Wallet, Activity, LogIn, LogOut, Key } from "lucide-react";
import { useAppData } from "./hooks/useAppData";
import { Dashboard } from "./components/Dashboard";
import { auth, googleProvider, signInWithPopup, signOut, signInAnonymously } from "./lib/firebase";
import { User } from "firebase/auth";

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
        </div>
      </div>
    );
  }

  return <MainApp user={user} onLogout={handleLogout} />;
}

function MainApp({ user, onLogout }: { user: User, onLogout: () => void }) {
  const { customers, debts, payments, expenses, employees, loading, addCustomerAndDebt, payInstallment, addExpense, deleteExpense, archiveDebt, deletePayment, addEmployee, deleteEmployee } = useAppData();

  useEffect(() => {
    if (loading) return;
    
    // تم إضافة الإيميل الثاني هنا
    const isOwner = user.email?.toLowerCase() === 'ghadaqzau@gmail.com' || user.email?.toLowerCase() === 'lolazau@gmail.com';
    
    const savedCode = localStorage.getItem('empCode');
    const isEmployee = user.isAnonymous && employees.some(e => e.code === savedCode);

    if (!isOwner && !isEmployee) {
      alert('ليس لديك صلاحية الدخول. يجب أن تكون المدير أو عاملاً مسجلاً برمز الدخول.');
      onLogout();
    }
  }, [loading, employees, user, onLogout]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" dir="rtl">
        <Activity className="w-8 h-8 text-blue-600 animate-pulse mb-4" />
        <p className="text-slate-500 font-medium">جاري تحميل السجلات...</p>
      </div>
    );
  }

  // وتم إضافة الإيميل الثاني هنا أيضاً لتحديد الصلاحيات
  const role = (user.email?.toLowerCase() === 'ghadaqzau@gmail.com' || user.email?.toLowerCase() === 'lolazau@gmail.com') ? 'admin' : 'employee';
  
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
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
               <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
               {role === 'admin' ? (user.displayName || user.email) : employeeName}
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
          userRole={role}
          onAddDebt={addCustomerAndDebt}
          onPay={payInstallment}
          onAddExpense={addExpense}
          onDeleteExpense={deleteExpense}
          onArchiveDebt={archiveDebt}
          onDeletePayment={deletePayment}
          onAddEmployee={addEmployee}
          onDeleteEmployee={deleteEmployee}
        />
      </main>
    </div>
  );
}
