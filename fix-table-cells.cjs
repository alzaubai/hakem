const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// Replace Headers
content = content.replace(
  /<th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 whitespace-nowrap">الزبون<\/th>[\s\S]*?<th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 text-center whitespace-nowrap">الإجراءات<\/th>/,
  `<th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 whitespace-nowrap">الزبون</th>
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
                    <th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 text-center whitespace-nowrap">الإجراءات</th>`
);

// Replace cells
// Step 1: Add serial and plate after Item
const itemRegex = /<td className="px-3 sm:px-5 py-3 sm:py-4">\s*<div className="font-medium text-slate-700 whitespace-nowrap">\{debt\.itemName\}<\/div>\s*\{debt\.isCashSale && \(\s*<div className="inline-block mt-1 px-2 py-0\.5 bg-emerald-100 text-emerald-800 text-\[10px\] font-bold rounded">\s*بيع كاش\s*<\/div>\s*\)\}\s*<\/td>/;
const newItemHTML = `<td className="px-3 sm:px-5 py-3 sm:py-4">
                        <div className="font-medium text-slate-700 whitespace-nowrap">{debt.itemName}</div>
                        {debt.isCashSale && (
                          <div className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                            بيع كاش
                          </div>
                        )}
                      </td>
                      {activeTab === 'cashSales' && (
                        <>
                          <td className="px-3 sm:px-5 py-3 sm:py-4 text-slate-700 font-medium whitespace-nowrap">{debt.serialNumber || '-'}</td>
                          <td className="px-3 sm:px-5 py-3 sm:py-4 text-slate-700 font-medium whitespace-nowrap">{debt.vehiclePlate || '-'}</td>
                        </>
                      )}`;
content = content.replace(itemRegex, newItemHTML);

// Step 2: Wrap down payment and remaining in {activeTab === 'debts' && ()}
const downRemainingRegex = /<td className="px-3 sm:px-5 py-3 sm:py-4 text-slate-600 font-medium">\{debt\.downPayment\.toLocaleString\('en-US'\)\}<\/td>\s*<td className="px-3 sm:px-5 py-3 sm:py-4 font-black text-red-600">\{debt\.remainingAmount\.toLocaleString\('en-US'\)\}<\/td>/;
const newDownRemainingHTML = `{activeTab === 'debts' && (
                        <>
                          <td className="px-3 sm:px-5 py-3 sm:py-4 text-slate-600 font-medium">{debt.downPayment.toLocaleString('en-US')}</td>
                          <td className="px-3 sm:px-5 py-3 sm:py-4 font-black text-red-600">{debt.remainingAmount.toLocaleString('en-US')}</td>
                        </>
                      )}`;
content = content.replace(downRemainingRegex, newDownRemainingHTML);

// Step 3: Rewrite Warranty cell to remove emojis and show only text based on tab
const warrantyRegex = /<td className="px-3 sm:px-5 py-3 sm:py-4">\s*\{debt\.warrantyMonths && debt\.warrantyMonths > 0 \? \(\(\) => \{[\s\S]*?\}\)\(\) : \(\s*<span className="text-slate-400 text-\[11px\] font-medium">-<\/span>\s*\)\}\s*<\/td>/;
const newWarrantyHTML = `<td className="px-3 sm:px-5 py-3 sm:py-4">
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
                                  {debt.serialNumber && \`S/N: \${debt.serialNumber}\`} {debt.vehiclePlate && \`| لوحة: \${debt.vehiclePlate}\`}
                                </span>
                              )}
                            </div>
                          );
                        })() : (
                          <span className="text-slate-400 text-[11px] font-medium">-</span>
                        )}
                      </td>`;
content = content.replace(warrantyRegex, newWarrantyHTML);

// Step 4: Wrap Next Due Date and Status in {activeTab === 'debts' && ()}
const nextDueStatusRegex = /<td className="px-3 sm:px-5 py-3 sm:py-4 text-slate-700 font-medium whitespace-nowrap">\s*\{debt\.status === 'completed' \? '-' : \(\s*<span className=\{cn\(isPast\(new Date\(debt\.nextDueDate\)\) && !isToday\(new Date\(debt\.nextDueDate\)\) \? "text-red-600 font-bold" : ""\)\}>\s*\{format\(new Date\(debt\.nextDueDate\), 'yyyy\/MM\/dd'\)\}\s*<\/span>\s*\)\}\s*<\/td>\s*<td className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">\s*\{debt\.status === 'completed' \? \([\s\S]*?<\/span>\s*\)\s*\}\s*<\/td>/;
const newNextDueStatusHTML = `{activeTab === 'debts' && (
                        <>
                          <td className="px-3 sm:px-5 py-3 sm:py-4 text-slate-700 font-medium whitespace-nowrap">
                            {debt.status === 'completed' ? '-' : (
                              <span className={cn(isPast(new Date(debt.nextDueDate)) && !isToday(new Date(debt.nextDueDate)) ? "text-red-600 font-bold" : "")}>
                                {format(new Date(debt.nextDueDate), 'yyyy/MM/dd')}
                              </span>
                            )}
                          </td>
                          <td className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">
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
                      )}`;
content = content.replace(nextDueStatusRegex, newNextDueStatusHTML);

fs.writeFileSync('src/components/Dashboard.tsx', content);
