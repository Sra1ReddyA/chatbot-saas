'use client';

import { useEffect, useState } from 'react';
import { chatbotsApi } from '@/lib/api';
import type { Chatbot, Conversation } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Star, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatRelativeTime, cn } from '@/lib/utils';

export default function ConversationsPage() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [selectedBot, setSelectedBot] = useState<string>('all');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const limit = 20;

  useEffect(() => {
    chatbotsApi.list({ limit: 100 }).then((r) => setChatbots(r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedBot === 'all' || !selectedBot) return;
    setLoading(true);
    chatbotsApi.getConversations(selectedBot, { page, limit })
      .then((r) => { setConversations(r.data); setTotal(r.pagination.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedBot, page]);

  const totalPages = Math.ceil(total / limit);
  const filtered = search
    ? conversations.filter((c) => c.pageUrl?.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
          <p className="text-gray-500 mt-0.5">Browse all chat sessions</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <Select value={selectedBot} onValueChange={(v) => { setSelectedBot(v); setPage(1); }}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select a chatbot" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Chatbots</SelectItem>
            {chatbots.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {selectedBot === 'all' ? (
        <div className="text-center py-20">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Select a chatbot to view its conversations</p>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No conversations yet</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {filtered.map((conv) => (
              <Card key={conv.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-4 px-5">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      conv.isActive ? 'bg-green-500' : 'bg-gray-300'
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          Session: <span className="font-mono text-xs">{conv.sessionId.substring(0, 20)}...</span>
                        </p>
                        {conv.lead && <Badge variant="success" className="text-xs">Lead captured</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{conv._count.messages} messages</span>
                        {conv.pageUrl && <span className="truncate max-w-[200px]">{conv.pageUrl}</span>}
                        <span>{formatRelativeTime(conv.startedAt)}</span>
                      </div>
                    </div>
                    {conv.rating && (
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span className="text-sm font-medium">{conv.rating}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-500">Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
