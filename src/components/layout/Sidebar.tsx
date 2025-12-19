'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Layers,
  FileText,
  CalendarDays, 
  Bell, 
  Settings,
  LogOut,
  ChevronLeft,
  ArrowLeftCircle
} from 'lucide-react';
import { useAuth, useCustomer } from '@/context';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/projects', label: 'Projects', icon: FolderKanban },
  { href: '/dashboard/documents', label: 'Documents', icon: FileText },
  { href: '/dashboard/meetings', label: 'Meetings', icon: CalendarDays },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
];

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const { selectedCustomer, clearCustomer } = useCustomer();
  const [collapsed, setCollapsed] = useState(false);
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSwitchCustomer = () => {
    clearCustomer();
    router.push('/customers');
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen bg-sidebar-bg border-r border-sidebar-border transition-all duration-300 z-50',
          'lg:block', // Always show on desktop
          isOpen ? 'block' : 'hidden lg:block', // Toggle on mobile
          collapsed ? 'w-16' : 'w-64'
        )}
      >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center">
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
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-accent transition-colors"
        >
          <ChevronLeft className={cn('w-5 h-5 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Selected Customer */}
      {selectedCustomer && !collapsed && (
        <div className="p-3 border-b border-sidebar-border">
          <div className="px-3 py-2 bg-primary/10 rounded-lg">
            <p className="text-xs text-muted-foreground">Current Customer</p>
            <p className="font-medium text-foreground truncate">{selectedCustomer.name}</p>
            <p className="text-xs text-muted-foreground truncate">{selectedCustomer.email}</p>
          </div>
          <button
            onClick={handleSwitchCustomer}
            className="w-full mt-2 flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeftCircle className="w-4 h-4" />
            Switch Customer
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-sidebar-border">
        <Link
          href="/dashboard/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
            'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">Settings</span>}
        </Link>
        <button
          onClick={logout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
            'text-muted-foreground hover:bg-destructive hover:text-destructive-foreground'
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">Logout</span>}
        </button>
        
        {/* User info */}
        {!collapsed && user && (
          <div className="mt-3 px-3 py-2 bg-muted rounded-lg">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}
