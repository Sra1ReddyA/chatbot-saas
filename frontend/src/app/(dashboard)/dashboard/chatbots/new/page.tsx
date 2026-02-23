'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { chatbotsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Bot, Loader2, Sparkles } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const SYSTEM_PROMPT_TEMPLATES = [
  {
    label: 'Customer Support',
    prompt: `You are a friendly and helpful customer support assistant. Your role is to:
- Answer questions about our products and services clearly and accurately
- Help customers troubleshoot issues step by step
- Process common requests like order status and returns
- Escalate complex issues by saying "I'll connect you with our team"
Keep responses concise (2-3 sentences). Always be polite and empathetic.`,
  },
  {
    label: 'Sales Assistant',
    prompt: `You are an enthusiastic sales assistant helping potential customers. Your role is to:
- Understand customer needs by asking relevant questions
- Highlight product benefits that match their needs
- Address objections with facts and reassurance
- Guide interested customers toward booking a demo or starting a trial
Be conversational, not pushy. Focus on value, not features.`,
  },
  {
    label: 'FAQ Bot',
    prompt: `You are a knowledgeable FAQ assistant. Answer questions based on the information provided. 
If asked something outside your knowledge, say "I don't have that information, but you can contact support@company.com"
Be brief and direct. Use bullet points for multi-step answers.`,
  },
  {
    label: 'Lead Qualifier',
    prompt: `You are a friendly business development assistant. Your goal is to understand visitor needs and qualify them as potential customers.
Ask about: their company size, current challenges, timeline, and budget range.
Be conversational and genuinely curious. After 3-4 exchanges, offer to have a team member follow up.`,
  },
];

const AI_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast, affordable)', provider: 'openai' },
  { value: 'gpt-4o', label: 'GPT-4o (Most capable)', provider: 'openai' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Budget)', provider: 'openai' },
  { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (Fast)', provider: 'anthropic' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Best quality)', provider: 'anthropic' },
];

export default function NewChatbotPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    model: 'gpt-4o-mini',
    aiProvider: 'openai',
    temperature: 0.7,
    maxTokens: 500,
  });

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleModelChange = (value: string) => {
    const model = AI_MODELS.find((m) => m.value === value);
    setForm((f) => ({ ...f, model: value, aiProvider: model?.provider || 'openai' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.systemPrompt.trim()) {
      setError('Name and system prompt are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const chatbot = await chatbotsApi.create({
        ...form,
        temperature: Number(form.temperature),
        maxTokens: Number(form.maxTokens),
        status: 'DRAFT',
        widgetConfig: {
          primaryColor: '#6366f1',
          textColor: '#ffffff',
          backgroundColor: '#ffffff',
          position: 'bottom-right',
          welcomeMessage: 'Hi! How can I help you today? 👋',
          placeholder: 'Type a message...',
          showBranding: true,
          buttonText: 'Chat with us',
          headerTitle: form.name,
          avatar: null,
        },
      });
      toast({ title: 'Chatbot created!', description: 'Configure your widget and go live.' });
      router.push(`/dashboard/chatbots/${chatbot.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create chatbot');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/chatbots"><ArrowLeft className="w-4 h-4 mr-1" />Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Chatbot</h1>
          <p className="text-gray-500 text-sm mt-0.5">Set up your AI assistant in minutes</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-600" /> Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Chatbot Name *</Label>
              <Input id="name" value={form.name} onChange={update('name')} placeholder="e.g. Customer Support Bot" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={form.description} onChange={update('description')} placeholder="What does this chatbot do?" />
            </div>
          </CardContent>
        </Card>

        {/* AI Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" /> AI Configuration
            </CardTitle>
            <CardDescription>Choose your model and define how the AI should behave</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label>AI Model</Label>
              <Select value={form.model} onValueChange={handleModelChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">GPT-4o Mini is recommended for most use cases — fast and cost-effective.</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>System Prompt *</Label>
                <div className="flex gap-1 flex-wrap justify-end">
                  {SYSTEM_PROMPT_TEMPLATES.map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      className="text-xs px-2 py-1 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                      onClick={() => setForm((f) => ({ ...f, systemPrompt: t.prompt }))}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <Textarea
                value={form.systemPrompt}
                onChange={update('systemPrompt')}
                placeholder="You are a helpful assistant for [Company Name]. Your role is to..."
                rows={8}
                required
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-400">This defines your chatbot&apos;s personality, knowledge, and behavior. Be specific about what it should and shouldn&apos;t do.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="temperature">
                  Temperature: <span className="text-indigo-600 font-mono">{form.temperature}</span>
                </Label>
                <input
                  id="temperature"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={form.temperature}
                  onChange={(e) => setForm((f) => ({ ...f, temperature: parseFloat(e.target.value) }))}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="maxTokens">Max Response Length</Label>
                <Select
                  value={String(form.maxTokens)}
                  onValueChange={(v) => setForm((f) => ({ ...f, maxTokens: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="200">Short (~150 words)</SelectItem>
                    <SelectItem value="500">Medium (~375 words)</SelectItem>
                    <SelectItem value="1000">Long (~750 words)</SelectItem>
                    <SelectItem value="2000">Extended (~1500 words)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" type="button" asChild>
            <Link href="/dashboard/chatbots">Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : 'Create Chatbot'}
          </Button>
        </div>
      </form>
    </div>
  );
}
