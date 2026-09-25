import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2, Info } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  // If already installed and running in standalone mode, hide
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setInstalling(true);
      try {
        await install();
      } finally {
        setInstalling(false);
      }
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        disabled={installing}
        title="تثبيت التطبيق على جهازك للعمل بدون إنترنت وفتح سريع"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all border border-blue-500 hover:shadow"
      >
        <Download className="w-3.5 h-3.5 animate-bounce" />
        <span className="hidden sm:inline">تثبيت التطبيق</span>
        <span className="sm:hidden">تثبيت</span>
      </button>

      {/* Guide Modal for devices where direct prompt isn't supported or manual steps are needed */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" dir="rtl">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">تثبيت التطبيق على جهازك</h3>
                  <p className="text-[11px] text-slate-500">يعمل كتطبيق أندرويد حقيقي بدون شريط متصفح</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 space-y-3">
              {isAndroid || !isIOS ? (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      اضغط على قائمة الخيارات <strong>(الثلاث نقاط ⋮)</strong> في الزاوية العلوية لمتصفح Chrome.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      اختر <strong>«تثبيت التطبيق» (Install app)</strong> أو <strong>«إضافة إلى الشاشة الرئيسية» (Add to Home screen)</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">✓</span>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      ستظهر أيقونة التطبيق الرسمية فوراً على شاشة جهازك وتفتح كبرنامج مستقل بالكامل.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      اضغط على زر <strong>المشاركة (Share)</strong> في شريط متصفح Safari بالأسفل.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      مرر للأسفل واختر <strong>«إضافة إلى الصفحة الرئيسية» (Add to Home Screen)</strong>.
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 flex items-start gap-2 text-[11px] text-blue-800">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  ميزة التثبيت تجعل سجل الديون يعمل بسرعة فائقة، ويحفظ بياناتك محلياً ويوفر سهولة وصول بنقرة واحدة من شاشة جهازك.
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>فهمت، شكراً</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
