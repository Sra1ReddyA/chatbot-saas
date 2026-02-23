'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { chatbotsApi } from '@/lib/api';
import type { Chatbot, WidgetConfig } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2, Save, Code2, BarChart2, MessageSquare, Eye, Plus, Trash2, Globe } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { KnowledgeBaseTab } from '@/components/dashboard/KnowledgeBaseTab';

const WIDGET_POSITIONS = [
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
];

export default function ChatbotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Partial<Chatbot>>({});
  const [newDomain, setNewDomain] = useState('');

  useEffect(() => {
    chatbotsApi.get(id).then((c) => {
      setChatbot(c);
      setForm({
        name: c.name,
        description: c.description,
        systemPrompt: c.systemPrompt,
        model: c.model,
        aiProvider: c.aiProvider,
        temperature: c.temperature,
        maxTokens: c.maxTokens,
        widgetConfig: c.widgetConfig,
        allowedDomains: c.allowedDomains,
        leadCaptureEnabled: c.leadCaptureEnabled,
        leadCaptureFields: c.leadCaptureFields,
        status: c.status,
      });
    }).catch(() => router.push('/dashboard/chatbots')).finally(() => setLoading(false));
  }, [id, router]);

  const updateField = (field: string, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  const updateWidget = (field: string, value: unknown) =>
    setForm((f) => ({ ...f, widgetConfig: { ...(f.widgetConfig as WidgetConfig), [field]: value } }));

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await chatbotsApi.update(id, form);
      setChatbot(updated);
      toast({ title: 'Saved!', description: 'Chatbot updated successfully.', variant: 'default' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    const newStatus = form.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await chatbotsApi.update(id, { status: newStatus });
    updateField('status', newStatus);
    toast({ title: newStatus === 'ACTIVE' ? 'Chatbot activated' : 'Chatbot deactivated' });
  };

  const addDomain = () => {
    const d = newDomain.trim();
    if (!d) return;
    const current = (form.allowedDomains as string[]) || [];
    if (!current.includes(d)) {
      updateField('allowedDomains', [...current, d]);
    }
    setNewDomain('');
  };

  const removeDomain = (domain: string) => {
    updateField('allowedDomains', ((form.allowedDomains as string[]) || []).filter((d) => d !== domain));
  };

  const addLeadField = () => {
    const fields = [...(form.leadCaptureFields || [])];
    fields.push({ name: `field_${fields.length + 1}`, type: 'text', required: false, label: 'New Field' });
    updateField('leadCaptureFields', fields);
  };

  const removeLeadField = (idx: number) => {
    const fields = [...(form.leadCaptureFields || [])];
    fields.splice(idx, 1);
    updateField('leadCaptureFields', fields);
  };

  const updateLeadField = (idx: number, key: string, value: unknown) => {
    const fields = [...(form.leadCaptureFields || [])] as Record<string, unknown>[];
    fields[idx] = { ...fields[idx], [key]: value };
    updateField('leadCaptureFields', fields);
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!chatbot) return null;

  const widgetCfg = form.widgetConfig as WidgetConfig;

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/chatbots"><ArrowLeft className="w-4 h-4 mr-1" />Back</Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{chatbot.name}</h1>
              <Badge variant={form.status === 'ACTIVE' ? 'success' : form.status === 'DRAFT' ? 'warning' : 'secondary'}>
                {form.status?.toLowerCase()}
              </Badge>
            </div>
            <p className="text-gray-500 text-sm">Configure your chatbot settings</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/chatbots/${id}/embed`}>
              <Code2 className="w-4 h-4 mr-2" />Embed Code
            </Link>
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}

      <Tabs defaultValue="config">
        <TabsList className="mb-6">
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="widget">Widget Design</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
          <TabsTrigger value="leads">Lead Capture</TabsTrigger>
          <TabsTrigger value="domains">Domains</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* ── CONFIG TAB ── */}
        <TabsContent value="config" className="space-y-5">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b">
                <div>
                  <p className="font-medium">Chatbot Status</p>
                  <p className="text-sm text-gray-400">Toggle to make this chatbot live on your website</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('text-sm font-medium', form.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-400')}>
                    {form.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                  </span>
                  <Switch checked={form.status === 'ACTIVE'} onCheckedChange={toggleStatus} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Chatbot Name</Label>
                  <Input value={form.name || ''} onChange={(e) => updateField('name', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Input value={form.description || ''} onChange={(e) => updateField('description', e.target.value)} placeholder="Optional description" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>AI Model</Label>
                <Select value={form.model} onValueChange={(v) => {
                  const provider = v.startsWith('claude') ? 'anthropic' : 'openai';
                  updateField('model', v);
                  updateField('aiProvider', provider);
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast, affordable)</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o (Most capable)</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Budget)</SelectItem>
                    <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku (Fast)</SelectItem>
                    <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Best quality)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>System Prompt</Label>
                <Textarea
                  value={form.systemPrompt || ''}
                  onChange={(e) => updateField('systemPrompt', e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Temperature: <span className="font-mono text-indigo-600">{form.temperature}</span></Label>
                  <input type="range" min="0" max="1" step="0.1" value={form.temperature}
                    onChange={(e) => updateField('temperature', parseFloat(e.target.value))}
                    className="w-full accent-indigo-600" />
                  <div className="flex justify-between text-xs text-gray-400"><span>Precise</span><span>Creative</span></div>
                </div>
                <div className="space-y-1.5">
                  <Label>Max Tokens</Label>
                  <Select value={String(form.maxTokens)} onValueChange={(v) => updateField('maxTokens', parseInt(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="200">Short (200)</SelectItem>
                      <SelectItem value="500">Medium (500)</SelectItem>
                      <SelectItem value="1000">Long (1000)</SelectItem>
                      <SelectItem value="2000">Extended (2000)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── WIDGET TAB ── */}
        <TabsContent value="widget">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Appearance</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Primary Color</Label>
                    <div className="flex gap-2">
                      <input type="color" value={widgetCfg?.primaryColor || '#6366f1'}
                        onChange={(e) => updateWidget('primaryColor', e.target.value)}
                        className="h-10 w-12 rounded border cursor-pointer" />
                      <Input value={widgetCfg?.primaryColor || '#6366f1'} onChange={(e) => updateWidget('primaryColor', e.target.value)} className="font-mono" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Position</Label>
                    <Select value={widgetCfg?.position || 'bottom-right'} onValueChange={(v) => updateWidget('position', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {WIDGET_POSITIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Header Title</Label>
                  <Input value={widgetCfg?.headerTitle || ''} onChange={(e) => updateWidget('headerTitle', e.target.value)} placeholder="Chat Support" />
                </div>

                <div className="space-y-1.5">
                  <Label>Welcome Message</Label>
                  <Textarea value={widgetCfg?.welcomeMessage || ''} onChange={(e) => updateWidget('welcomeMessage', e.target.value)} rows={3} placeholder="Hi! How can I help you today? 👋" />
                </div>

                <div className="space-y-1.5">
                  <Label>Input Placeholder</Label>
                  <Input value={widgetCfg?.placeholder || ''} onChange={(e) => updateWidget('placeholder', e.target.value)} placeholder="Type a message..." />
                </div>

                <div className="flex items-center justify-between py-2 border-t">
                  <div>
                    <p className="text-sm font-medium">Show Branding</p>
                    <p className="text-xs text-gray-400">Display &quot;Powered by ChatBot Builder&quot;</p>
                  </div>
                  <Switch checked={widgetCfg?.showBranding !== false} onCheckedChange={(v) => updateWidget('showBranding', v)} />
                </div>
              </CardContent>
            </Card>

            {/* Live Preview */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700 flex items-center gap-2"><Eye className="w-4 h-4" />Live Preview</p>
              <div className="bg-gray-100 rounded-xl p-4 h-[500px] relative overflow-hidden">
                <div className="absolute bottom-4 right-4 w-72">
                  <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="p-4 text-white text-sm font-semibold" style={{ background: widgetCfg?.primaryColor || '#6366f1' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-base">🤖</div>
                        <div>
                          <p>{widgetCfg?.headerTitle || 'Chat Support'}</p>
                          <p className="text-xs opacity-80">Online</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 space-y-3 bg-gray-50 min-h-[160px]">
                      {widgetCfg?.welcomeMessage && (
                        <div className="flex gap-2">
                          <div className="max-w-[85%] bg-white rounded-2xl rounded-bl-sm px-3 py-2 text-sm shadow-sm">
                            {widgetCfg.welcomeMessage}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-white border-t">
                      <div className="flex gap-2">
                        <div className="flex-1 h-9 rounded-xl bg-gray-100 px-3 flex items-center text-xs text-gray-400">
                          {widgetCfg?.placeholder || 'Type a message...'}
                        </div>
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm" style={{ background: widgetCfg?.primaryColor || '#6366f1' }}>→</div>
                      </div>
                    </div>
                    {widgetCfg?.showBranding !== false && (
                      <div className="text-center text-xs text-gray-400 py-1.5 bg-white border-t">Powered by ChatBot Builder</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── KNOWLEDGE BASE TAB ── */}
        <TabsContent value="knowledge">
          <KnowledgeBaseTab chatbotId={id} />
        </TabsContent>

        {/* ── LEADS TAB ── */}
        <TabsContent value="leads">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead Capture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium">Enable Lead Capture</p>
                  <p className="text-sm text-gray-400">Collect visitor info after the 3rd message</p>
                </div>
                <Switch
                  checked={form.leadCaptureEnabled || false}
                  onCheckedChange={(v) => updateField('leadCaptureEnabled', v)}
                />
              </div>

              {form.leadCaptureEnabled && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Form Fields</p>
                    <Button variant="outline" size="sm" onClick={addLeadField}>
                      <Plus className="w-3.5 h-3.5 mr-1" />Add Field
                    </Button>
                  </div>
                  {(form.leadCaptureFields || []).map((field, idx) => (
                    <div key={idx} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <Input
                          placeholder="Field label"
                          value={field.label}
                          onChange={(e) => updateLeadField(idx, 'label', e.target.value)}
                        />
                        <Select value={field.type} onValueChange={(v) => updateLeadField(idx, 'type', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Switch checked={field.required} onCheckedChange={(v) => updateLeadField(idx, 'required', v)} />
                          <span className="text-xs text-gray-500">Required</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600" onClick={() => removeLeadField(idx)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── DOMAINS TAB ── */}
        <TabsContent value="domains">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" />Allowed Domains</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">Restrict which websites can embed your chatbot. Leave empty to allow all domains.</p>
              <div className="flex gap-2">
                <Input
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDomain())}
                />
                <Button variant="outline" onClick={addDomain}>Add</Button>
              </div>
              <div className="space-y-2">
                {((form.allowedDomains as string[]) || []).map((domain) => (
                  <div key={domain} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                    <span className="text-sm font-mono text-gray-700">{domain}</span>
                    <Button variant="ghost" size="sm" className="text-red-400 h-7 w-7 p-0" onClick={() => removeDomain(domain)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                {((form.allowedDomains as string[]) || []).length === 0 && (
                  <p className="text-sm text-gray-400 italic">No domain restrictions — widget loads on any website</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ANALYTICS TAB ── */}
        <TabsContent value="analytics">
          <ChatbotAnalyticsTab chatbotId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChatbotAnalyticsTab({ chatbotId }: { chatbotId: string }) {
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [days, setDays] = useState('30');

  const load = useCallback(() => {
    chatbotsApi.getAnalytics(chatbotId, parseInt(days)).then(setAnalytics).catch(console.error);
  }, [chatbotId, days]);

  useEffect(() => { load(); }, [load]);

  if (!analytics) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>;

  const stats = analytics as { conversations: number; messages: number; leads: number; avgRating?: number };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Conversations', value: stats.conversations, icon: MessageSquare },
          { label: 'Messages', value: stats.messages, icon: BarChart2 },
          { label: 'Leads', value: stats.leads, icon: BarChart2 },
          { label: 'Avg Rating', value: stats.avgRating ? `${stats.avgRating.toFixed(1)}/5` : 'N/A', icon: BarChart2 },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5">
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
