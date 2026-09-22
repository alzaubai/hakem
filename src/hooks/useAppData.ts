import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, query, orderBy, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import type { Customer, Debt, Payment, Expense, Employee, AdminUser } from '../types';

export function useAppData() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Safety timeout to ensure loading spinner never blocks the user
    const timeout = setTimeout(() => {
      if (active) setLoading(false);
    }, 2000);

    const unsubCustomers = onSnapshot(
      collection(db, 'customers'),
      (snapshot) => {
        if (!active) return;
        setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
      },
      (error) => {
        console.error("Error fetching customers:", error);
        handleFirestoreError(error, OperationType.LIST, 'customers');
      }
    );

    const unsubAdmins = onSnapshot(
      collection(db, 'admins'),
      (snapshot) => {
        if (!active) return;
        setAdmins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminUser)));
      },
      (error) => {
        console.error("Error fetching admins:", error);
        handleFirestoreError(error, OperationType.LIST, 'admins');
      }
    );

    const unsubEmployees = onSnapshot(
      collection(db, 'employees'),
      (snapshot) => {
        if (!active) return;
        setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee)));
      },
      (error) => {
        console.error("Error fetching employees:", error);
        handleFirestoreError(error, OperationType.LIST, 'employees');
      }
    );

    let unsubDebtsFallback: (() => void) | null = null;
    const unsubDebts = onSnapshot(
      query(collection(db, 'debts'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        if (!active) return;
        setDebts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Debt)));
      },
      (error) => {
        console.warn("Retrying debts without orderBy index...", error);
        handleFirestoreError(error, OperationType.LIST, 'debts');
        unsubDebtsFallback = onSnapshot(collection(db, 'debts'), (snap) => {
          if (!active) return;
          const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Debt));
          data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setDebts(data);
        });
      }
    );

    let unsubPaymentsFallback: (() => void) | null = null;
    const unsubPayments = onSnapshot(
      query(collection(db, 'payments'), orderBy('paymentDate', 'desc')),
      (snapshot) => {
        if (!active) return;
        setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
      },
      (error) => {
        console.warn("Retrying payments without orderBy index...", error);
        handleFirestoreError(error, OperationType.LIST, 'payments');
        unsubPaymentsFallback = onSnapshot(collection(db, 'payments'), (snap) => {
          if (!active) return;
          const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
          data.sort((a, b) => (b.paymentDate || 0) - (a.paymentDate || 0));
          setPayments(data);
        });
      }
    );

    let unsubExpensesFallback: (() => void) | null = null;
    const unsubExpenses = onSnapshot(
      query(collection(db, 'expenses'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        if (!active) return;
        setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
        setLoading(false);
      },
      (error) => {
        console.warn("Retrying expenses without orderBy index...", error);
        handleFirestoreError(error, OperationType.LIST, 'expenses');
        if (active) setLoading(false);
        unsubExpensesFallback = onSnapshot(collection(db, 'expenses'), (snap) => {
          if (!active) return;
          const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
          data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setExpenses(data);
        });
      }
    );

    return () => {
      active = false;
      clearTimeout(timeout);
      unsubCustomers();
      unsubEmployees();
      unsubDebts();
      if (unsubDebtsFallback) unsubDebtsFallback();
      unsubPayments();
      if (unsubPaymentsFallback) unsubPaymentsFallback();
      unsubExpenses();
      if (unsubExpensesFallback) unsubExpensesFallback();
      unsubAdmins();
    };
  }, []);

  const addAdmin = async (email: string, name?: string, addedBy?: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      await addDoc(collection(db, 'admins'), {
        email: cleanEmail,
        name: name?.trim() || cleanEmail.split('@')[0],
        createdAt: Date.now(),
        addedBy: addedBy || 'المدير'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'admins');
      throw error;
    }
  };

  const deleteAdmin = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'admins', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `admins/${id}`);
      throw error;
    }
  };

  const addEmployee = async (name: string, code: string) => {
    try {
      await addDoc(collection(db, 'employees'), {
        name,
        code: code.trim(),
        role: 'employee',
        createdAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'employees');
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'employees', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `employees/${id}`);
    }
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
    vehiclePlate?: string,
    notes?: string,
    carType?: string
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
      vehiclePlate = "",
      notes = "",
      carType = ""
    } = data;
    
    try {
      const batch = writeBatch(db);
      let customerId = '';
      
      // Check if customer exists by name
      const existingCustomer = customers.find(c => 
        c.name && customerName && c.name.trim().toLowerCase() === customerName.trim().toLowerCase()
      );
      if (existingCustomer && existingCustomer.id) {
        customerId = existingCustomer.id;
        // Optionally update phone if it was empty before or changed
        if (customerPhone && (!existingCustomer.phone || existingCustomer.phone !== customerPhone)) {
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
        customerPhone,
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
        vehiclePlate,
        notes,
        carType
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'debts');
    }
  };

  const payInstallment = async (debtId: string, customerId: string, amount: number, nextDueDate: number) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;

    try {
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
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'payments');
    }
  };

  const addExpense = async (title: string, amount: number, date: number) => {
    try {
      await addDoc(collection(db, 'expenses'), {
        title,
        amount,
        createdAt: date
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'expenses');
    }
  };

  const deleteExpense = async (expenseId: string) => {
    try {
      await deleteDoc(doc(db, 'expenses', expenseId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `expenses/${expenseId}`);
    }
  };

  const archiveDebt = async (debtId: string, reason: string) => {
    try {
      await updateDoc(doc(db, 'debts', debtId), {
        status: 'archived',
        archiveReason: reason,
        archivedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `debts/${debtId}`);
    }
  };

  const deletePayment = async (paymentId: string, debtId: string, amount: number) => {
    const debt = debts.find(d => d.id === debtId);
    
    try {
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
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'payments');
    }
  };

  const deletePermanentDebt = async (debtId: string) => {
    try {
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
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `debts/${debtId}`);
    }
  };

  const updatePayment = async (paymentId: string, debtId: string, newAmount: number, newDate: number) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;

    try {
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
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `payments/${paymentId}`);
    }
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
    notes?: string;
    carType?: string;
    paymentsList?: Array<{ id?: string; amount: number; paymentDate: number; isDeleted?: boolean }>;
  }) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;

    try {
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
        notes: data.notes ?? '',
        carType: data.carType ?? '',
        status: newStatus
      };

      if (data.transactionDate) {
        updateFields.createdAt = data.transactionDate;
      }

      batch.update(doc(db, 'debts', debtId), updateFields);

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `debts/${debtId}`);
    }
  };

  return {
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
  };
}
