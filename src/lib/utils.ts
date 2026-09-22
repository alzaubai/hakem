import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string' || !email.includes('@')) return email || '';
  const atIndex = email.indexOf('@');
  const localPart = email.slice(0, atIndex);
  const domainPart = email.slice(atIndex); // includes '@...'

  if (localPart.length <= 1) {
    return `${localPart}*${domainPart}`;
  }
  if (localPart.length === 2) {
    return `${localPart[0]}*${localPart[1]}${domainPart}`;
  }

  const firstChar = localPart[0];
  const lastChar = localPart[localPart.length - 1];
  const asterisks = '*'.repeat(Math.max(3, localPart.length - 2));

  return `${firstChar}${asterisks}${lastChar}${domainPart}`;
}
