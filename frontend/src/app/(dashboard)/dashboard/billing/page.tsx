'use client';

import { useEffect, useState } from 'react';
import { billingApi } from '@/lib/api';
import type { Plan, UsageSummary, Invoice } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Loader2, ExternalLink, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BillingPage() {
  const { organization } = useAuthStore();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([billingApi.getPlans(), billingApi.getUsage(), billingApi.getInvoices()])
      .then(([p, u, i]) => {
        setPlans((p as any).plans);
        setUsage(u);
        setInvoices(i as Invoice[]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async (priceId?: string) => {
    if (!priceId) return;
    setLoadingCheckout(priceId);
    try {
      const { url } = await billingApi.createCheckout(priceId);
      window.location.href = url;
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCheckout(null);
    }
  };

  const handleManageBilling = async () => {
    setLoadingPortal(true);
    try {
      const { url } = await billingApi.createPortal();
      window.location.href = url;
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPortal(false);
    }
  };

  const currentPlan = organization?.plan || 'FREE';
  const isActive = organization?.subscriptionStatus === 'ACTIVE';
  const isTrialing = organization?.subscriptionStatus === 'TRIALING';

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Plans</h1>
        <p className="text-gray-500 mt-1">Manage your subscription and usage</p>
      </div>

      {/* Current plan status */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-semibold text-lg">{currentPlan.charAt(0) + currentPlan.slice(1).toLowerCase()} Plan</h3>
                <Badge variant={isActive ? 'default' : isTrialing ? 'secondary' : 'destructive'}>
                  {organization?.subscriptionStatus?.toLowerCase() || 'free'}
                </Badge>
              </div>
              {isTrialing && usage?.trialEndsAt && (
                <p className="text-sm text-gray-500">
                  Trial ends {new Date(usage.trialEndsAt).toLocaleDateString()}
                </p>
              )}
              {(isActive || isTrialing) && usage?.currentPeriodEnd && (
                <p className="text-sm text-gray-500">
                  Next billing: {new Date(usage.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
            {currentPlan !== 'FREE' && (
              <Button variant="outline" onClick={handleManageBilling} disabled={loadingPortal}>
                {loadingPortal ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ExternalLink className="w-4 h-4 mr-2" />}
                Manage Billing
              </Button>
            )}
          </div>

          {/* Usage bars */}
          {usage && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-100">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Messages</span>
                  <span className="font-medium">{usage.usage.messages.used.toLocaleString()} / {usage.usage.messages.limit.toLocaleString()}</span>
                </div>
                <Progress value={Math.min(usage.usage.messages.percentage, 100)} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Conversations</span>
                  <span className="font-medium">{usage.usage.conversations.used.toLocaleString()} / {usage.usage.conversations.limit.toLocaleString()}</span>
                </div>
                <Progress value={Math.min(usage.usage.conversations.percentage, 100)} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Chatbots</span>
                  <span className="font-medium">{usage.usage.chatbots.used} / {usage.usage.chatbots.limit}</span>
                </div>
                <Progress
                  value={(usage.usage.chatbots.used / usage.usage.chatbots.limit) * 100}
                  className="h-2"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const isPopular = plan.popular;

          return (
            <div
              key={plan.id}
              className={cn(
                'bg-white rounded-2xl border-2 p-6 flex flex-col relative',
                isPopular ? 'border-indigo-500 shadow-lg' : 'border-gray-200',
                isCurrent && 'bg-indigo-50'
              )}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className="font-bold text-gray-900 text-lg">{plan.name}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold">${plan.price.monthly}</span>
                  <span className="text-gray-400 text-sm">/month</span>
                </div>
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                variant={isCurrent ? 'outline' : isPopular ? 'default' : 'outline'}
                className="w-full"
                disabled={isCurrent || !plan.priceId}
                onClick={() => handleUpgrade(plan.priceId)}
              >
                {loadingCheckout === plan.priceId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isCurrent ? (
                  'Current plan'
                ) : plan.id === 'FREE' ? (
                  'Downgrade'
                ) : (
                  'Upgrade'
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Invoices */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium">
                      ${(inv.amount / 100).toFixed(2)} {inv.currency.toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : 'Pending'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={inv.status === 'paid' ? 'default' : 'destructive'} className="text-xs">
                      {inv.status}
                    </Badge>
                    {inv.invoiceUrl && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={inv.invoiceUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
