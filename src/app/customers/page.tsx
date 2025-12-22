'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, Button } from '@/components/ui';
import { Users, Plus, Search, ChevronRight, Mail, Phone, Building2, Sun, Moon, Pencil } from 'lucide-react';
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

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

  const handleCreateCustomer = async (formData: any) => {
    try {
      setIsCreating(true);
      await customersApi.create(formData);
      setShowCreateModal(false);
      loadCustomers(); // Refresh list
    } catch (error: any) {
      console.error('Failed to create customer:', error);
      alert(error.message || 'Failed to create customer');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditCustomer = async (formData: any) => {
    if (!editingCustomer) return;
    try {
      setIsUpdating(true);
      await customersApi.update(editingCustomer._id, formData);
      setShowEditModal(false);
      setEditingCustomer(null);
      loadCustomers(); // Refresh list
    } catch (error: any) {
      console.error('Failed to update customer:', error);
      alert(error.message || 'Failed to update customer');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditClick = (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation(); // Prevent card click
    setEditingCustomer(customer);
    setShowEditModal(true);
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
          <Button onClick={() => setShowCreateModal(true)} variant="outline">
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleEditClick(e, customer)}
                        className="p-2 rounded-lg hover:bg-accent transition-colors"
                        title="Edit customer"
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground hover:text-primary" />
                      </button>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
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

        {/* Create Customer Modal */}
        {showCreateModal && <CreateCustomerModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateCustomer} isLoading={isCreating} />}
        
        {/* Edit Customer Modal */}
        {showEditModal && editingCustomer && (
          <EditCustomerModal
            customer={editingCustomer}
            onClose={() => { setShowEditModal(false); setEditingCustomer(null); }}
            onUpdate={handleEditCustomer}
            isLoading={isUpdating}
          />
        )}
      </main>
    </div>
  );
}

// Create Customer Modal Component
function CreateCustomerModal({ onClose, onCreate, isLoading }: { onClose: () => void; onCreate: (data: any) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    alternate_phone_numbers: '',
    city: '',
    customer_type: 'B2C',
    customer_remarks: '',
    internal_notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert alternate_phone_numbers from comma-separated string to array
    const data = {
      ...formData,
      alternate_phone_numbers: formData.alternate_phone_numbers
        ? formData.alternate_phone_numbers.split(',').map(p => p.trim()).filter(Boolean)
        : []
    };
    
    onCreate(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <h2 className="text-2xl font-bold">Add New Customer</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="john.doe@example.com"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-2">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="John Doe"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium mb-2">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="+91-9876543210"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Mumbai"
              />
            </div>

            {/* Customer Type */}
            <div>
              <label className="block text-sm font-medium mb-2">Customer Type</label>
              <select
                value={formData.customer_type}
                onChange={(e) => setFormData({ ...formData, customer_type: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="B2C">B2C</option>
                <option value="B2B">B2B</option>
              </select>
            </div>

            {/* Alternate Phone Numbers */}
            <div>
              <label className="block text-sm font-medium mb-2">Alternate Phones</label>
              <input
                type="text"
                value={formData.alternate_phone_numbers}
                onChange={(e) => setFormData({ ...formData, alternate_phone_numbers: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="+91-9123456780, +91-9876543211"
              />
              <p className="text-xs text-muted-foreground mt-1">Comma-separated</p>
            </div>
          </div>

          {/* Customer Remarks */}
          <div>
            <label className="block text-sm font-medium mb-2">Customer Remarks</label>
            <textarea
              value={formData.customer_remarks}
              onChange={(e) => setFormData({ ...formData, customer_remarks: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
              placeholder="Premium customer, referred by partner"
            />
          </div>

          {/* Internal Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Internal Notes</label>
            <textarea
              value={formData.internal_notes}
              onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
              placeholder="High priority, needs quick turnaround"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Customer Modal Component
function EditCustomerModal({ customer, onClose, onUpdate, isLoading }: { customer: Customer; onClose: () => void; onUpdate: (data: any) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    name: customer.name || '',
    phone: customer.phone || '',
    alternate_phone_numbers: '',
    city: customer.city || '',
    customer_type: customer.customer_type || 'B2C',
    customer_remarks: '',
    internal_notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert alternate_phone_numbers from comma-separated string to array
    const data: any = {
      name: formData.name,
      phone: formData.phone,
      city: formData.city,
      customer_type: formData.customer_type,
    };
    
    if (formData.alternate_phone_numbers) {
      data.alternate_phone_numbers = formData.alternate_phone_numbers.split(',').map(p => p.trim()).filter(Boolean);
    }
    
    if (formData.customer_remarks) {
      data.customer_remarks = formData.customer_remarks;
    }
    
    if (formData.internal_notes) {
      data.internal_notes = formData.internal_notes;
    }
    
    onUpdate(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <h2 className="text-2xl font-bold">Edit Customer</h2>
          <p className="text-sm text-muted-foreground mt-1">{customer.email}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-2">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="John Doe"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium mb-2">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="+91-9876543210"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Mumbai"
              />
            </div>

            {/* Customer Type */}
            <div>
              <label className="block text-sm font-medium mb-2">Customer Type</label>
              <select
                value={formData.customer_type}
                onChange={(e) => setFormData({ ...formData, customer_type: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="B2C">B2C</option>
                <option value="B2B">B2B</option>
              </select>
            </div>

            {/* Alternate Phone Numbers */}
            <div>
              <label className="block text-sm font-medium mb-2">Alternate Phones</label>
              <input
                type="text"
                value={formData.alternate_phone_numbers}
                onChange={(e) => setFormData({ ...formData, alternate_phone_numbers: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="+91-9123456780, +91-9876543211"
              />
              <p className="text-xs text-muted-foreground mt-1">Comma-separated</p>
            </div>
          </div>

          {/* Customer Remarks */}
          <div>
            <label className="block text-sm font-medium mb-2">Customer Remarks</label>
            <textarea
              value={formData.customer_remarks}
              onChange={(e) => setFormData({ ...formData, customer_remarks: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
              placeholder="Premium customer, referred by partner"
            />
          </div>

          {/* Internal Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Internal Notes</label>
            <textarea
              value={formData.internal_notes}
              onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
              placeholder="High priority, needs quick turnaround"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Customer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
