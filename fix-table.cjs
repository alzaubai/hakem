const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// Replace table header
content = content.replace(
  /<th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 whitespace-nowrap">الباقي<\/th>/,
  `<th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 whitespace-nowrap">الباقي</th>\n                    <th className="px-3 sm:px-5 py-3 sm:py-4 font-bold text-slate-700 whitespace-nowrap">الضمان</th>`
);

// Modify item column (remove warranty logic)
const itemColOld = `<td className="px-3 sm:px-5 py-3 sm:py-4">
                        <div className="font-medium text-slate-700 whitespace-nowrap">{debt.itemName}</div>
                        {debt.isCashSale && (
                          <div className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                            بيع كاش
                          </div>
                        )}
                        {debt.warrantyMonths && debt.warrantyMonths > 0 ? (() => {
                          const warrantyEnd = addMonths(new Date(debt.createdAt), debt.warrantyMonths);
                          const isValid = new Date() <= warrantyEnd;
                          return (
                            <div className={cn("mt-1 text-[10px] font-bold flex flex-col gap-0.5", isValid ? "text-emerald-600" : "text-red-500")}>
                              <span className="flex items-center gap-1">
                                {isValid ? '🟢 ضمان ساري' : '🔴 ضمان منتهي'}
                              </span>
                              {(debt.serialNumber || debt.vehiclePlate) && (
                                <span className="text-slate-500 font-medium whitespace-nowrap">
                                  {debt.serialNumber && \`S/N: \${debt.serialNumber}\`} {debt.vehiclePlate && \`| لوحة: \${debt.vehiclePlate}\`}
                                </span>
                              )}
                            </div>
                          );
                        })() : null}
                      </td>`;

const itemColNew = `<td className="px-3 sm:px-5 py-3 sm:py-4">
                        <div className="font-medium text-slate-700 whitespace-nowrap">{debt.itemName}</div>
                        {debt.isCashSale && (
                          <div className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                            بيع كاش
                          </div>
                        )}
                      </td>`;
                      
content = content.replace(itemColOld, itemColNew);

// Add warranty column next to remaining amount
const remainingColOld = `<td className="px-3 sm:px-5 py-3 sm:py-4 font-black text-red-600">{debt.remainingAmount.toLocaleString('en-US')}</td>`;
const remainingColNew = `<td className="px-3 sm:px-5 py-3 sm:py-4 font-black text-red-600">{debt.remainingAmount.toLocaleString('en-US')}</td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4">
                        {debt.warrantyMonths && debt.warrantyMonths > 0 ? (() => {
                          const warrantyEnd = addMonths(new Date(debt.createdAt), debt.warrantyMonths);
                          const isValid = new Date() <= warrantyEnd;
                          return (
                            <div className={cn("text-[10px] font-bold flex flex-col gap-0.5 whitespace-nowrap", isValid ? "text-emerald-600" : "text-red-500")}>
                              <span className="flex items-center gap-1 text-[11px]">
                                {isValid ? '🟢 ضمان ساري' : '🔴 ضمان منتهي'}
                              </span>
                              {(debt.serialNumber || debt.vehiclePlate) && (
                                <span className="text-slate-500 font-medium mt-0.5">
                                  {debt.serialNumber && \`S/N: \${debt.serialNumber}\`} {debt.vehiclePlate && \`| لوحة: \${debt.vehiclePlate}\`}
                                </span>
                              )}
                            </div>
                          );
                        })() : (
                          <span className="text-slate-400 text-[11px] font-medium">-</span>
                        )}
                      </td>`;

content = content.replace(remainingColOld, remainingColNew);

fs.writeFileSync('src/components/Dashboard.tsx', content);
