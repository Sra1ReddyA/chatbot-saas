'use client';

import { useEffect, useState } from 'react';
import { apiKeysApi } from '@/lib/api';
import type { ApiKey } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Key, Plus, Trash2, Copy, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    apiKeysApi.list().then(setKeys).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const created = await apiKeysApi.create(newKeyName.trim());
      setNewKeyValue(created.key || null);
      setKeys((prev) => [{ ...created, key: undefined }, ...prev]);
      setNewKeyName('');
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to create key', variant: 'destructive' });
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this API key? Any integrations using it will stop working.')) return;
    setDeleting(id);
    try {
      await apiKeysApi.delete(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast({ title: 'API key deleted' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to delete', variant: 'destructive' });
    } finally {
      setDeleting(null);
    }
  };

  const copyKey = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    toast({ title: 'Copied!', description: 'API key copied to clipboard.' });
  };

  const handleModalClose = () => {
    setShowCreate(false);
    setNewKeyValue(null);
    setNewKeyName('');
  };

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-gray-500 mt-0.5">Use API keys to integrate chatbots programmatically</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />Create API Key
        </Button>
      </div>

      <Card className="mb-6 border-amber-200 bg-amber-50">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Keep your API keys secure</p>
              <p className="text-sm text-amber-700 mt-0.5">Never expose API keys in client-side code or public repositories. Treat them like passwords.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : keys.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Key className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No API keys yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">Create a key to integrate your chatbots via API</p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" />Create Your First Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <Card key={key.id}>
              <CardContent className="py-4 px-5">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Key className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{key.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-sm font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{key.keyPrefix}••••••••••••</span>
                      <span className="text-xs text-gray-400">Created {formatDate(key.createdAt)}</span>
                      {key.lastUsedAt && (
                        <span className="text-xs text-gray-400">Last used {formatRelativeTime(key.lastUsedAt)}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(key.id)}
                    disabled={deleting === key.id}
                  >
                    {deleting === key.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={handleModalClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{newKeyValue ? 'Save Your API Key' : 'Create API Key'}</DialogTitle>
            <DialogDescription>
              {newKeyValue
                ? 'Copy this key now — it will never be shown again.'
                : 'Give your key a descriptive name to remember what it\'s used for.'}
            </DialogDescription>
          </DialogHeader>

          {newKeyValue ? (
            <div className="space-y-4">
              <Alert variant="warning" className="border-amber-200 bg-amber-50">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  This is the only time you&apos;ll see this key. Store it somewhere safe!
                </AlertDescription>
              </Alert>
              <div className="relative">
                <Input value={newKeyValue} readOnly className="font-mono text-sm pr-12 bg-gray-50" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 p-0"
                  onClick={() => copyKey(newKeyValue)}
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <Button className="w-full" onClick={() => copyKey(newKeyValue)}>
                {copied ? <><CheckCircle2 className="w-4 h-4 mr-2" />Copied!</> : <><Copy className="w-4 h-4 mr-2" />Copy API Key</>}
              </Button>
              <Button variant="outline" className="w-full" onClick={handleModalClose}>Done</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="keyName">Key Name</Label>
                <Input
                  id="keyName"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Production, WordPress Plugin..."
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleModalClose}>Cancel</Button>
                <Button onClick={handleCreate} disabled={creating || !newKeyName.trim()}>
                  {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Create Key
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
