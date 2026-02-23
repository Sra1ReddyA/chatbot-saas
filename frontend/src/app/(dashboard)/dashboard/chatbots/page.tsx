'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { chatbotsApi } from '@/lib/api';
import type { Chatbot } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Bot, Plus, MessageSquare, Code2, Settings, Trash2,
  TrendingUp, Star, MoreVertical, ExternalLink,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const STATUS_COLORS = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-600',
  DRAFT: 'bg-yellow-100 text-yellow-700',
};

export default function ChatbotsPage() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    chatbotsApi.list().then((r) => setChatbots(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this chatbot? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await chatbotsApi.delete(id);
      setChatbots((c) => c.filter((bot) => bot.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(null);
    }
  };

  const handleStatusToggle = async (bot: Chatbot) => {
    const newStatus = bot.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await chatbotsApi.update(bot.id, { status: newStatus });
    setChatbots((c) => c.map((b) => b.id === bot.id ? { ...b, status: newStatus } : b));
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-32 bg-gray-100 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chatbots</h1>
          <p className="text-gray-500 mt-0.5">{chatbots.length} chatbot{chatbots.length !== 1 ? 's' : ''}</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/chatbots/new">
            <Plus className="w-4 h-4 mr-2" />
            New Chatbot
          </Link>
        </Button>
      </div>

      {chatbots.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-50 rounded-2xl mb-4">
            <Bot className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No chatbots yet</h2>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Create your first AI chatbot and embed it on your website in minutes.
          </p>
          <Button asChild>
            <Link href="/dashboard/chatbots/new">
              <Plus className="w-4 h-4 mr-2" />
              Create your first chatbot
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {chatbots.map((bot) => (
            <Card key={bot.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 leading-tight">{bot.name}</h3>
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[bot.status])}>
                        {bot.status.toLowerCase()}
                      </span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/chatbots/${bot.id}`}>
                          <Settings className="w-4 h-4 mr-2" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/chatbots/${bot.id}/embed`}>
                          <Code2 className="w-4 h-4 mr-2" />
                          Get Embed Code
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusToggle(bot)}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {bot.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDelete(bot.id)}
                        disabled={deleting === bot.id}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {bot.description && (
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{bot.description}</p>
                )}

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-600 mb-0.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-lg font-bold text-gray-900">{bot.totalConversations}</p>
                    <p className="text-xs text-gray-400">chats</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-600 mb-0.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-lg font-bold text-gray-900">{bot.totalMessages}</p>
                    <p className="text-xs text-gray-400">messages</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-600 mb-0.5">
                      <Star className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {bot.avgRating ? bot.avgRating.toFixed(1) : '—'}
                    </p>
                    <p className="text-xs text-gray-400">rating</p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
                    <Link href={`/dashboard/chatbots/${bot.id}`}>
                      <Settings className="w-3.5 h-3.5 mr-1.5" />
                      Configure
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
                    <Link href={`/dashboard/chatbots/${bot.id}/embed`}>
                      <Code2 className="w-3.5 h-3.5 mr-1.5" />
                      Embed
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
