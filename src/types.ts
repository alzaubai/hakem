export interface Customer {
  id?: string;
  name: string;
  phone: string;
  createdAt: number;
}

export interface Debt {
  id?: string;
  customerId: string;
  customerName: string;
  itemName: string;
  costPrice: number;
  sellPrice: number;
  downPayment: number;
  installmentAmount: number;
  remainingAmount: number;
  nextDueDate: number;
  status: 'active' | 'completed' | 'archived';
  createdAt: number;
  archiveReason?: string;
  archivedAt?: number;
  isCashSale?: boolean;
  warrantyMonths?: number;
  serialNumber?: string;
  vehiclePlate?: string;
  notes?: string;
  carType?: string;
}

export interface Payment {
  id?: string;
  debtId: string;
  customerId: string;
  amount: number;
  paymentDate: number;
}

export interface Expense {
  id?: string;
  description: string;
  amount: number;
  createdAt: number;
}

export interface Employee {
  id?: string;
  name: string;
  code: string;
  role: 'employee';
  createdAt: number;
}

export interface AdminUser {
  id?: string;
  email: string;
  name?: string;
  createdAt: number;
  addedBy?: string;
}

export type UserRole = 'admin' | 'employee';
