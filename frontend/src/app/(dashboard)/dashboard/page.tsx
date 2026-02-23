'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { dashboardApi, billingApi } from '@/lib/api';
import type { DashboardStats, UsageSummary } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  MessageSquare, Users, Bot, Star, TrendingUp, ArrowRight, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

function StatCard({
  title, value, icon: Icon, sub, color = 'indigo',
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
  color?: string;
}) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-xl ${colors[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { organization } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([dashboardApi.getStats(), billingApi.getUsage()])
      .then(([s, u]) => { setStats(s); setUsage(u); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-16 bg-gray-100 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const chartData = stats?.conversationsByDay.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    conversations: d.count,
  })) || [];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'} 👋
          </h1>
          <p className="text-gray-500 mt-0.5">Here&apos;s what&apos;s happening with your chatbots</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/chatbots/new">
            <Plus className="w-4 h-4 mr-2" />
            New Chatbot
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Conversations"
          value={stats?.totalConversations.toLocaleString() ?? '0'}
          icon={MessageSquare}
          sub={`${stats?.conversationsToday ?? 0} today`}
          color="indigo"
        />
        <StatCard
          title="Total Messages"
          value={stats?.totalMessages.toLocaleString() ?? '0'}
          icon={TrendingUp}
          sub={`${stats?.messagesThisMonth.toLocaleString() ?? 0} this month`}
          color="purple"
        />
        <StatCard
          title="Leads Captured"
          value={stats?.totalLeads.toLocaleString() ?? '0'}
          icon={Users}
          color="green"
        />
        <StatCard
          title="Avg. Rating"
          value={stats?.avgRating ? `${stats.avgRating}/5` : 'N/A'}
          icon={Star}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Conversations (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="conversations"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#grad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex flex-col items-center justify-center text-gray-400">
                <MessageSquare className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">No conversations yet</p>
                <Button variant="link" size="sm" asChild className="mt-2">
                  <Link href="/dashboard/chatbots/new">Create your first chatbot</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar panel */}
        <div className="space-y-4">
          {/* Usage */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Monthly Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-600">Messages</span>
                  <span className="font-medium">
                    {usage?.usage.messages.used.toLocaleString()} / {usage?.usage.messages.limit.toLocaleString()}
                  </span>
                </div>
                <Progress value={usage?.usage.messages.percentage ?? 0} className="h-2" />
                <p className="text-xs text-gray-400 mt-1">{usage?.usage.messages.percentage ?? 0}% used</p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-600">Chatbots</span>
                  <span className="font-medium">
                    {usage?.usage.chatbots.used} / {usage?.usage.chatbots.limit}
                  </span>
                </div>
                <Progress
                  value={usage ? (usage.usage.chatbots.used / usage.usage.chatbots.limit) * 100 : 0}
                  className="h-2"
                />
              </div>
              {usage && (usage.plan === 'FREE' || usage.plan === 'STARTER') && (
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/dashboard/billing">Upgrade Plan</Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Top chatbots */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Top Chatbots</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.topChatbots.length ? (
                <div className="space-y-3">
                  {stats.topChatbots.map((bot) => (
                    <Link
                      key={bot.id}
                      href={`/dashboard/chatbots/${bot.id}`}
                      className="flex items-center gap-3 hover:bg-gray-50 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{bot.name}</p>
                        <p className="text-xs text-gray-400">{bot.conversations} conversations</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Bot className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No chatbots yet</p>
                  <Button variant="link" size="sm" asChild className="mt-1">
                    <Link href="/dashboard/chatbots/new">Create one</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
