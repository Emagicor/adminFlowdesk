'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  customer_type: string;
}

interface CustomerContextType {
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  clearCustomer: () => void;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('selected_customer');
    if (stored) {
      try {
        const customer = JSON.parse(stored);
        console.log('🟢 [Customer Context] Loaded from localStorage:', customer);
        setSelectedCustomer(customer);
      } catch (e) {
        localStorage.removeItem('selected_customer');
      }
    }
  }, []);

  // Save to localStorage when customer changes
  useEffect(() => {
    if (selectedCustomer) {
      console.log('🟢 [Customer Context] Selected customer changed:', selectedCustomer);
      localStorage.setItem('selected_customer', JSON.stringify(selectedCustomer));
    } else {
      console.log('🔴 [Customer Context] Customer cleared');
      localStorage.removeItem('selected_customer');
    }
  }, [selectedCustomer]);

  const clearCustomer = () => {
    console.log('🔴 [Customer Context] Clearing customer');
    setSelectedCustomer(null);
    localStorage.removeItem('selected_customer');
  };

  const wrappedSetSelectedCustomer = (customer: Customer | null) => {
    console.log('🟡 [Customer Context] Setting customer:', customer);
    setSelectedCustomer(customer);
  };

  return (
    <CustomerContext.Provider value={{ selectedCustomer, setSelectedCustomer: wrappedSetSelectedCustomer, clearCustomer }}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
}
