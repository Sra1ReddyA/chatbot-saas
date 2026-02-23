'use client';

import { useEffect, useState } from 'react';
import { chatbotsApi } from '@/lib/api';
import type { Chatbot, Lead } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';

function exportLeadsCSV(leads: Lead[], botName: string) {
  if (!leads.length) return;
  const allKeys = Array.from(new Set(leads.flatMap((l) => Object.keys(l.data))));
  const header = ['Date', ...allKeys];
  const rows = leads.map((l) => [
    formatDate(l.createdAt),
    ...allKeys.map((k) => `"${(l.data[k] || '').replace(/"/g, '""')}"`),
  ]);
  const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-${botName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LeadsPage() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [selectedBot, setSelectedBot] = useState<string>('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const limit = 25;

  useEffect(() => {
    chatbotsApi.list({ limit: 100 }).then((r) => {
      setChatbots(r.data);
      if (r.data.length > 0) setSelectedBot(r.data[0].id);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedBot) return;
    setLoading(true);
    chatbotsApi.getLeads(selectedBot, { page, limit })
      .then((r) => { setLeads(r.data); setTotal(r.pagination.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedBot, page]);

  const selectedBotName = chatbots.find((b) => b.id === selectedBot)?.name || 'leads';
  const totalPages = Math.ceil(total / limit);
  const allFieldKeys = Array.from(new Set(leads.flatMap((l) => Object.keys(l.data))));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 mt-0.5">{total} lead{total !== 1 ? 's' : ''} captured</p>
        </div>
        <Button variant="outline" onClick={() => exportLeadsCSV(leads, selectedBotName)} disabled={!leads.length}>
          <Download className="w-4 h-4 mr-2" />Export CSV
        </Button>
      </div>

      <div className="mb-5">
        <Select value={selectedBot} onValueChange={(v) => { setSelectedBot(v); setPage(1); }}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select chatbot" />
          </SelectTrigger>
          <SelectContent>
            {chatbots.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium mb-1">No leads yet</p>
          <p className="text-sm text-gray-400">Enable lead capture in your chatbot settings to collect visitor info</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  {allFieldKeys.map((k) => (
                    <th key={k} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(lead.createdAt)}</td>
                    {allFieldKeys.map((k) => (
                      <td key={k} className="px-4 py-3 text-gray-800">
                        {k === 'email' ? (
                          <a href={`mailto:${lead.data[k]}`} className="text-indigo-600 hover:underline">{lead.data[k] || '—'}</a>
                        ) : lead.data[k] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
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
