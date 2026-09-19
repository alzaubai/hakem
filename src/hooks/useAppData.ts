import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, query, orderBy, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Customer, Debt, Payment, Expense, Employee } from '../types';

export function useAppData() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    });

    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee)));
    });

    const unsubDebts = onSnapshot(query(collection(db, 'debts'), orderBy('createdAt', 'desc')), (snapshot) => {
      setDebts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Debt)));
    }, (error) => {
      console.error("Error fetching debts:", error);
      const unsubFallback = onSnapshot(collection(db, 'debts'), (snap) => {
        const d = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Debt));
        d.sort((a, b) => b.createdAt - a.createdAt);
        setDebts(d);
      });
      return unsubFallback;
    });

    const unsubPayments = onSnapshot(query(collection(db, 'payments'), orderBy('paymentDate', 'desc')), (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
    }, (error) => {
      console.error("Error fetching payments:", error);
      const unsubFallback = onSnapshot(collection(db, 'payments'), (snap) => {
        const p = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
        p.sort((a, b) => b.paymentDate - a.paymentDate);
        setPayments(p);
      });
      return unsubFallback;
    });

    const unsubExpenses = onSnapshot(query(collection(db, 'expenses'), orderBy('createdAt', 'desc')), (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching expenses:", error);
      // Fallback in case of missing index, just fetch without ordering and sort client-side
      const unsubFallback = onSnapshot(collection(db, 'expenses'), (snap) => {
        const exps = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
        exps.sort((a, b) => b.createdAt - a.createdAt);
        setExpenses(exps);
        setLoading(false);
      });
      return unsubFallback;
    });

    return () => {
      unsubCustomers();
      unsubEmployees();
      unsubDebts();
      unsubPayments();
      unsubExpenses();
    };
  }, []);

  const addEmployee = async (name: string, code: string) => {
    await addDoc(collection(db, 'employees'), {
      name,
      code: code.trim(),
      role: 'employee',
      createdAt: Date.now()
    });
  };

  const deleteEmployee = async (id: string) => {
    await deleteDoc(doc(db, 'employees', id));
  };

  const addCustomerAndDebt = async (data: {
    customerName: string, 
    customerPhone: string, 
    itemName: string,
    costPrice: number,
    sellPrice: number,
    downPayment: number,
    installmentAmount: number,
    nextDueDate: number,
    transactionDate?: number,
    isCashSale?: boolean,
    warrantyMonths?: number,
    serialNumber?: string,
    vehiclePlate?: string
  }) => {
    const { 
      customerName, 
      customerPhone, 
      itemName, 
      costPrice, 
      sellPrice, 
      downPayment, 
      installmentAmount, 
      nextDueDate, 
      transactionDate = Date.now(), 
      isCashSale = false, 
      warrantyMonths = 0, 
      serialNumber = "", 
      vehiclePlate = "" 
    } = data;
    
    const batch = writeBatch(db);
    let customerId = '';
    
    // Check if customer exists by name
    const existingCustomer = customers.find(c => c.name === customerName);
    if (existingCustomer && existingCustomer.id) {
      customerId = existingCustomer.id;
      // Optionally update phone if it was empty before
      if (customerPhone && !existingCustomer.phone) {
        batch.update(doc(db, 'customers', customerId), { phone: customerPhone });
      }
    } else {
      const custRef = doc(collection(db, 'customers'));
      batch.set(custRef, {
        name: customerName,
        phone: customerPhone,
        createdAt: transactionDate
      });
      customerId = custRef.id;
    }

    const remainingAmount = sellPrice - downPayment;
    const debtRef = doc(collection(db, 'debts'));
    
    batch.set(debtRef, {
      customerId,
      customerName,
      itemName,
      costPrice,
      sellPrice,
      downPayment,
      installmentAmount,
      remainingAmount,
      nextDueDate,
      status: remainingAmount <= 0 ? 'completed' : 'active',
      createdAt: transactionDate,
      isCashSale,
      warrantyMonths,
      serialNumber,
      vehiclePlate
    });

    await batch.commit();
  };

  const payInstallment = async (debtId: string, customerId: string, amount: number, nextDueDate: number) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;

    const batch = writeBatch(db);
    const newRemaining = Math.max(0, debt.remainingAmount - amount);
    const newStatus = newRemaining <= 0 ? 'completed' : 'active';

    // Record payment
    const paymentRef = doc(collection(db, 'payments'));
    batch.set(paymentRef, {
      debtId,
      customerId,
      amount,
      paymentDate: Date.now()
    });

    // Update debt
    batch.update(doc(db, 'debts', debtId), {
      remainingAmount: newRemaining,
      nextDueDate: newStatus === 'completed' ? debt.nextDueDate : nextDueDate,
      status: newStatus
    });

    await batch.commit();
  };

  const addExpense = async (description: string, amount: number, date: number) => {
    await addDoc(collection(db, 'expenses'), {
      description,
      amount,
      createdAt: date
    });
  };

  const deleteExpense = async (expenseId: string) => {
    await deleteDoc(doc(db, 'expenses', expenseId));
  };

  const archiveDebt = async (debtId: string, reason: string) => {
    // Archive the debt document instead of deleting
    await updateDoc(doc(db, 'debts', debtId), {
      status: 'archived',
      archiveReason: reason,
      archivedAt: Date.now()
    });
  };

  const deletePayment = async (paymentId: string, debtId: string, amount: number) => {
    const debt = debts.find(d => d.id === debtId);
    
    const batch = writeBatch(db);
    
    // Delete the payment document
    batch.delete(doc(db, 'payments', paymentId));

    if (debt) {
      const newRemaining = debt.remainingAmount + amount;
      const newStatus = newRemaining <= 0 ? 'completed' : 'active';
      
      // Revert the debt balance
      batch.update(doc(db, 'debts', debtId), {
        remainingAmount: newRemaining,
        status: newStatus
      });
    }
    
    await batch.commit();
  };

  const deletePermanentDebt = async (debtId: string) => {
    const batch = writeBatch(db);

    // Delete the debt document
    batch.delete(doc(db, 'debts', debtId));

    // Delete associated payments
    const relatedPayments = payments.filter(p => p.debtId === debtId);
    relatedPayments.forEach(p => {
      if (p.id) {
        batch.delete(doc(db, 'payments', p.id));
      }
    });

    await batch.commit();
  };

  const updatePayment = async (paymentId: string, debtId: string, newAmount: number, newDate: number) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;

    const batch = writeBatch(db);
    batch.update(doc(db, 'payments', paymentId), {
      amount: newAmount,
      paymentDate: newDate
    });

    const otherPayments = payments.filter(p => p.debtId === debtId && p.id !== paymentId);
    const totalPaymentsPaid = otherPayments.reduce((sum, p) => sum + p.amount, 0) + newAmount;

    const newRemaining = Math.max(0, (debt.sellPrice - debt.downPayment) - totalPaymentsPaid);
    const newStatus = debt.status === 'archived' ? 'archived' : (newRemaining <= 0 ? 'completed' : 'active');

    batch.update(doc(db, 'debts', debtId), {
      remainingAmount: newRemaining,
      status: newStatus
    });

    await batch.commit();
  };

  const updateDebt = async (debtId: string, data: {
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
  }) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;

    const batch = writeBatch(db);

    // Update customer info if changed
    if (debt.customerId) {
      const existingCust = customers.find(c => c.id === debt.customerId);
      if (existingCust && (existingCust.name !== data.customerName || existingCust.phone !== data.customerPhone)) {
        batch.update(doc(db, 'customers', debt.customerId), {
          name: data.customerName,
          phone: data.customerPhone
        });
      }
    }

    // Process payments list if provided
    let totalPaymentsPaid = 0;
    if (data.paymentsList) {
      data.paymentsList.forEach(item => {
        if (item.isDeleted) {
          if (item.id) {
            batch.delete(doc(db, 'payments', item.id));
          }
        } else {
          totalPaymentsPaid += item.amount;
          if (item.id) {
            batch.update(doc(db, 'payments', item.id), {
              amount: item.amount,
              paymentDate: item.paymentDate
            });
          } else {
            const newPaymentRef = doc(collection(db, 'payments'));
            batch.set(newPaymentRef, {
              debtId,
              customerId: debt.customerId,
              amount: item.amount,
              paymentDate: item.paymentDate
            });
          }
        }
      });
    } else {
      const debtPayments = payments.filter(p => p.debtId === debtId);
      totalPaymentsPaid = debtPayments.reduce((sum, p) => sum + p.amount, 0);
    }

    const newRemaining = Math.max(0, (data.sellPrice - data.downPayment) - totalPaymentsPaid);
    const newStatus = debt.status === 'archived' ? 'archived' : (newRemaining <= 0 ? 'completed' : 'active');

    const updateFields: any = {
      customerName: data.customerName,
      itemName: data.itemName,
      costPrice: data.costPrice,
      sellPrice: data.sellPrice,
      downPayment: data.downPayment,
      installmentAmount: data.installmentAmount,
      remainingAmount: newRemaining,
      nextDueDate: data.nextDueDate,
      warrantyMonths: data.warrantyMonths ?? 0,
      serialNumber: data.serialNumber ?? '',
      vehiclePlate: data.vehiclePlate ?? '',
      status: newStatus
    };

    if (data.transactionDate) {
      updateFields.createdAt = data.transactionDate;
    }

    batch.update(doc(db, 'debts', debtId), updateFields);

    await batch.commit();
  };

  return {
    customers,
    debts,
    payments,
    expenses,
    employees,
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
    deleteEmployee
  };
}
