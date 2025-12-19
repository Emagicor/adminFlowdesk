'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, Button } from '@/components/ui';
import { Users, Plus, Search, ChevronRight, Mail, Phone, Building2, Sun, Moon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAuth, useCustomer } from '@/context';
import { customersApi } from '@/lib/api';

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  customer_type: string;
  is_active: boolean;
}

export default function CustomerSelectPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, isLoading: authLoading } = useAuth();
  const { setSelectedCustomer } = useCustomer();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);

  // Only render theme toggle after client-side hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !user) {
      router.replace('/login');
    } else if (user) {
      loadCustomers();
    }
  }, [authLoading, user]);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const response = await customersApi.list(1, 100, searchTerm);
      setCustomers(response.data?.customers || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      const debounce = setTimeout(() => loadCustomers(), 300);
      return () => clearTimeout(debounce);
    }
  }, [searchTerm]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer({
      _id: customer._id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      city: customer.city,
      customer_type: customer.customer_type,
    });
    router.push('/dashboard');
  };

  const getTypeColor = (type: string) => {
    return type === 'B2B'
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
      : 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          {mounted && (
            <>
              {theme === 'light' ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src="/light-mode.png"
                  alt="China Sourcing"
                  className="h-8 w-auto"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src="/dark-mode.png"
                  alt="China Sourcing"
                  className="h-8 w-auto"
                />
              )}
            </>
          )}
          {!mounted && <div className="h-8 w-32" />}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            {mounted ? (
              theme === 'dark' ? (
                <Sun className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Moon className="w-5 h-5 text-muted-foreground" />
              )
            ) : (
              <div className="w-5 h-5" />
            )}
          </button>
          <div className="text-sm text-muted-foreground">
            {user?.name}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto py-12 px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Select Customer</h1>
          <p className="text-muted-foreground">Choose a customer to view their dashboard</p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-11 pr-4 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Add Customer Button */}
        <div className="flex justify-center mb-8">
          <Button onClick={() => router.push('/customers/new')} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add New Customer
          </Button>
        </div>

        {/* Customers Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-40 bg-muted animate-pulse rounded-xl"></div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <Card className="max-w-md mx-auto p-8 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-medium text-lg mb-2">No customers found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Try a different search' : 'Create your first customer to get started'}
            </p>
            <Button onClick={() => router.push('/customers/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map((customer) => (
              <Card
                key={customer._id}
                className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
                onClick={() => handleSelectCustomer(customer)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">
                          {customer.name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {customer.name}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(customer.customer_type)}`}>
                          {customer.customer_type}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                    {customer.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    {customer.city && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span>{customer.city}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
