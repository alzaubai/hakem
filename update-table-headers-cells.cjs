const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// 1. Rewrite Headers
const oldHeaders = `                  <tr>
                    <th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 whitespace-nowrap">الزبون</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 whitespace-nowrap">البضاعة</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 whitespace-nowrap">تاريخ الشراء</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 whitespace-nowrap">السعر الكلي</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 whitespace-nowrap">المقدمة</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 whitespace-nowrap">الباقي</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 whitespace-nowrap">الضمان</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 whitespace-nowrap">موعد القسط</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 whitespace-nowrap">الحالة</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 text-center whitespace-nowrap">الإجراءات</th>
                  </tr>`;

const newHeaders = `                  <tr>
                    <th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 whitespace-nowrap">الزبون</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 whitespace-nowrap">البضاعة</th>
                    {activeTab === 'cashSales' && (
                      <>
                        <th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 whitespace-nowrap">رقم التسلسل</th>
                        <th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 whitespace-nowrap">رقم السيارة</th>
                      </>
                    )}
                    <th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 whitespace-nowrap">تاريخ الشراء</th>
                    <th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 whitespace-nowrap">السعر الكلي</th>
                    {activeTab === 'debts' && (
                      <>
                        <th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 whitespace-nowrap">المقدمة</th>
                        <th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 whitespace-nowrap">الباقي</th>
                      </>
                    )}
                    <th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 whitespace-nowrap">الضمان</th>
                    {activeTab === 'debts' && (
                      <>
                        <th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 whitespace-nowrap">موعد القسط</th>
                        <th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 whitespace-nowrap">الحالة</th>
                      </>
                    )}
                    <th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 text-center whitespace-nowrap">الإجراءات</th>
                  </tr>`;

content = content.replace(oldHeaders, newHeaders);

// 2. Extract block between item and warranty to replace
// Note: We'll use a regex to match the row output
const searchPattern = /<td className="px-3 sm:px-5 py-3 sm:py-4 text-slate-500 text-\[10px\] sm:text-xs font-medium whitespace-nowrap">\{format\(new Date\(debt\.createdAt\), 'yyyy\/MM\/dd'\)\}<\/td>[\s\S]*?<td className="px-3 sm:px-5 py-3 sm:py-4 text-slate-700 font-medium whitespace-nowrap">\s*\{debt.status === 'completed' \? '-' : \(/;

// Wait, doing this via script regex might be brittle. I'll construct it carefully.
