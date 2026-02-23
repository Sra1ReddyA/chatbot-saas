'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import {
  Bot, LayoutDashboard, MessageSquare, Users, CreditCard,
  Settings, Key, LogOut, ChevronRight, Bell, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/chatbots', label: 'Chatbots', icon: Bot },
  { href: '/dashboard/conversations', label: 'Conversations', icon: MessageSquare },
  { href: '/dashboard/leads', label: 'Leads', icon: Users },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  { href: '/dashboard/api-keys', label: 'API Keys', icon: Key },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, organization, isAuthenticated, isLoading, loadUser, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      loadUser().then(() => {
        if (!useAuthStore.getState().isAuthenticated) {
          router.replace('/login');
        }
      });
    }
  }, [isAuthenticated, isLoading, loadUser, router]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isTrialing = organization?.subscriptionStatus === 'TRIALING';
  const isPastDue = organization?.subscriptionStatus === 'PAST_DUE';
  const isFree = organization?.plan === 'FREE';

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Bot className="w-7 h-7 text-indigo-600 mr-2.5" />
          <span className="font-bold text-gray-900 text-lg">ChatBot Builder</span>
        </div>

        {/* Org info */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-gray-50">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {organization?.name[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{organization?.name}</p>
              <p className="text-xs text-gray-400 capitalize">{organization?.plan.toLowerCase()} plan</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className={cn('w-4.5 h-4.5', isActive ? 'text-indigo-600' : 'text-gray-400')} size={18} />
                {item.label}
                {isActive && <ChevronRight className="ml-auto w-3.5 h-3.5 text-indigo-400" />}
              </Link>
            );
          })}
        </nav>

        {/* Upgrade CTA */}
        {(isFree || isTrialing) && (
          <div className="px-4 pb-3">
            <div className="bg-indigo-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-indigo-600" />
                <p className="text-sm font-semibold text-indigo-900">
                  {isTrialing ? 'Trial ends soon' : 'Upgrade to unlock'}
                </p>
              </div>
              <p className="text-xs text-indigo-600 mb-3">
                {isTrialing ? 'Add a payment method to continue.' : 'Remove branding, more chatbots & features.'}
              </p>
              <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 text-xs h-8" asChild>
                <Link href="/dashboard/billing">Upgrade now</Link>
              </Button>
            </div>
          </div>
        )}

        {/* User footer */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-gray-500 hover:text-gray-900 -ml-1"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Past due banner */}
        {isPastDue && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center gap-3">
            <Bell className="w-4 h-4 text-red-600" />
            <p className="text-sm text-red-700">
              Your payment failed. Please{' '}
              <Link href="/dashboard/billing" className="font-semibold underline">
                update your billing info
              </Link>{' '}
              to avoid service interruption.
            </p>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
