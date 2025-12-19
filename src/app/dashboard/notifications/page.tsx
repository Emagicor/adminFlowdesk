'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { Bell, Plus, Trash2, Check } from 'lucide-react';
import { useCustomer } from '@/context';
import { notificationsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function NotificationsPage() {
  const { selectedCustomer } = useCustomer();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (selectedCustomer) {
      loadData();
    }
  }, [selectedCustomer]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await notificationsApi.list(selectedCustomer?._id);
      setNotifications(res.data?.notifications || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete notification?')) return;
    try {
      await notificationsApi.delete(id);
      loadData();
    } catch (e) { console.error(e); }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      loadData();
    } catch (e) { console.error(e); }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
      case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-1">Messages for {selectedCustomer?.name}</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Send Notification
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card className="p-12 text-center">
          <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-medium text-lg mb-2">No notifications</h3>
          <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Send Notification
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <Card key={notif._id} className={notif.read ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {notif.title && (
                      <h3 className="font-medium text-foreground">{notif.title}</h3>
                    )}
                    <p className="text-muted-foreground">{notif.message}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(notif.priority)}`}>
                        {notif.priority}
                      </span>
                      <span className="text-xs text-muted-foreground">{notif.channel}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(notif.createdAt)}</span>
                      {notif.read && (
                        <span className="text-xs text-green-600">✓ Read</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!notif.read && (
                      <Button variant="ghost" size="sm" onClick={() => handleMarkRead(notif._id)}>
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(notif._id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateNotificationModal
          customerId={selectedCustomer?._id || ''}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); loadData(); }}
        />
      )}
    </div>
  );
}

function CreateNotificationModal({ customerId, onClose, onCreated }: any) {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    channel: 'in_app',
    priority: 'medium',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      await notificationsApi.create({
        customer_id: customerId,
        ...formData,
      });
      onCreated();
    } catch (e) { console.error(e); } finally { setIsCreating(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <Card className="w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <CardHeader><CardTitle>Send Notification</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Optional title"
                className="w-full h-10 px-3 rounded-lg border border-input bg-background" />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Message *</label>
              <textarea required value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4} placeholder="Enter notification message..."
                className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Channel</label>
                <select value={formData.channel} onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background">
                  <option value="in_app">In-App</option>
                  <option value="email">Email</option>
                  <option value="wati">WhatsApp</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
