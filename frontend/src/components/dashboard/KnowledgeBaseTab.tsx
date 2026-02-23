'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText, Globe, Plus, Trash2, RefreshCw, Upload,
  CheckCircle2, Clock, AlertTriangle, Loader2, X,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface KnowledgeDoc {
  id: string;
  name: string;
  type: 'file' | 'url' | 'text';
  status: 'ready' | 'processing' | 'error';
  fileSize?: number;
  sourceUrl?: string;
  errorMsg?: string;
  createdAt: string;
}

type AddMode = 'file' | 'url' | 'text' | null;

const STATUS_ICONS = {
  ready: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  processing: <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />,
  error: <AlertTriangle className="w-4 h-4 text-red-500" />,
};

const STATUS_LABELS = {
  ready: 'Ready',
  processing: 'Processing',
  error: 'Error',
};

function formatBytes(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function KnowledgeBaseTab({ chatbotId }: { chatbotId: string }) {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [uploading, setUploading] = useState(false);
  const [urlForm, setUrlForm] = useState({ url: '', name: '' });
  const [textForm, setTextForm] = useState({ name: '', content: '' });
  const [dragOver, setDragOver] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocs = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    const res = await fetch(`${API_URL}/api/knowledge/${chatbotId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const { data } = await res.json();
      setDocs(data?.documents || []);
    }
    setLoaded(true);
  }, [chatbotId]);

  // Lazy load on first open
  if (!loaded) { loadDocs(); }

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/api/knowledge/${chatbotId}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      await loadDocs();
      toast({ title: 'File uploaded!', description: `${file.name} added to knowledge base.` });
      setAddMode(null);
    } catch (err: unknown) {
      toast({ title: 'Upload failed', description: err instanceof Error ? err.message : 'Try again', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const addUrl = async () => {
    if (!urlForm.url) return;
    setUploading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/knowledge/${chatbotId}/url`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(urlForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add URL');
      await loadDocs();
      toast({ title: 'URL added!', description: 'Content is being processed...' });
      setUrlForm({ url: '', name: '' });
      setAddMode(null);
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const addText = async () => {
    if (!textForm.name || !textForm.content) return;
    setUploading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/knowledge/${chatbotId}/text`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(textForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add text');
      await loadDocs();
      toast({ title: 'Text added to knowledge base!' });
      setTextForm({ name: '', content: '' });
      setAddMode(null);
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const deleteDoc = async (docId: string) => {
    if (!confirm('Delete this document from the knowledge base?')) return;
    setDeleting(docId);
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${API_URL}/api/knowledge/${chatbotId}/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocs((d) => d.filter((doc) => doc.id !== docId));
      toast({ title: 'Document deleted' });
    } finally {
      setDeleting(null);
    }
  };

  const reprocess = async (docId: string) => {
    const token = localStorage.getItem('access_token');
    await fetch(`${API_URL}/api/knowledge/${chatbotId}/documents/${docId}/reprocess`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    await loadDocs();
    toast({ title: 'Reprocessing started' });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Knowledge Base</CardTitle>
              <CardDescription>Add documents, URLs, or text your chatbot can reference</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setAddMode('url')}><Globe className="w-3.5 h-3.5 mr-1.5" />URL</Button>
              <Button variant="outline" size="sm" onClick={() => setAddMode('text')}><FileText className="w-3.5 h-3.5 mr-1.5" />Text</Button>
              <Button size="sm" onClick={() => setAddMode('file')}><Upload className="w-3.5 h-3.5 mr-1.5" />Upload File</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-12 text-center transition-colors',
                dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600 mb-1">No documents yet</p>
              <p className="text-sm text-gray-400 mb-4">Drag & drop files here, or add a URL or text</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={() => setAddMode('file')}>Upload File</Button>
                <Button variant="outline" size="sm" onClick={() => setAddMode('url')}>Add URL</Button>
              </div>
              <p className="text-xs text-gray-300 mt-4">Supported: TXT, MD, PDF, DOCX, HTML, CSV, JSON (max 10MB)</p>
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                  <div className="flex-shrink-0">
                    {doc.type === 'url' ? <Globe className="w-5 h-5 text-blue-500" /> : doc.type === 'text' ? <FileText className="w-5 h-5 text-purple-500" /> : <FileText className="w-5 h-5 text-gray-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {STATUS_ICONS[doc.status]}
                      <span className="text-xs text-gray-400">{STATUS_LABELS[doc.status]}</span>
                      {doc.fileSize && <span className="text-xs text-gray-300">{formatBytes(doc.fileSize)}</span>}
                      {doc.sourceUrl && <span className="text-xs text-gray-400 truncate max-w-[200px]">{doc.sourceUrl}</span>}
                    </div>
                    {doc.errorMsg && <p className="text-xs text-red-500 mt-0.5">{doc.errorMsg}</p>}
                  </div>
                  <div className="flex gap-1">
                    {doc.status === 'error' && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400" onClick={() => reprocess(doc.id)}>
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => deleteDoc(doc.id)} disabled={deleting === doc.id}>
                      {deleting === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" className="hidden"
        accept=".txt,.md,.pdf,.docx,.html,.csv,.json,text/plain,application/pdf"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ''; }}
      />

      {/* Add File Modal */}
      <Dialog open={addMode === 'file'} onOpenChange={() => setAddMode(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload File</DialogTitle></DialogHeader>
          <div
            className={cn('border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors', dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300')}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f); }}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="w-8 h-8 text-indigo-500 mx-auto animate-spin" /> : <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />}
            <p className="text-sm text-gray-600 mt-2">{uploading ? 'Uploading...' : 'Click or drag & drop to upload'}</p>
            <p className="text-xs text-gray-400 mt-1">TXT, MD, PDF, DOCX, HTML, CSV, JSON — max 10MB</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add URL Modal */}
      <Dialog open={addMode === 'url'} onOpenChange={() => setAddMode(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Web Page</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Alert><AlertDescription className="text-sm">We&apos;ll crawl the URL and extract the text content for your chatbot.</AlertDescription></Alert>
            <div className="space-y-1.5">
              <Label>URL *</Label>
              <Input value={urlForm.url} onChange={(e) => setUrlForm({ ...urlForm, url: e.target.value })} placeholder="https://yoursite.com/faq" type="url" />
            </div>
            <div className="space-y-1.5">
              <Label>Label (optional)</Label>
              <Input value={urlForm.name} onChange={(e) => setUrlForm({ ...urlForm, name: e.target.value })} placeholder="FAQ Page" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAddMode(null)}>Cancel</Button>
              <Button onClick={addUrl} disabled={uploading || !urlForm.url}>
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Globe className="w-4 h-4 mr-2" />}Add URL
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Text Modal */}
      <Dialog open={addMode === 'text'} onOpenChange={() => setAddMode(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Add Text</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Document Name *</Label>
              <Input value={textForm.name} onChange={(e) => setTextForm({ ...textForm, name: e.target.value })} placeholder="e.g. Company FAQ, Product Specs..." />
            </div>
            <div className="space-y-1.5">
              <Label>Content *</Label>
              <Textarea value={textForm.content} onChange={(e) => setTextForm({ ...textForm, content: e.target.value })} placeholder="Paste or type your content here..." rows={10} className="font-mono text-sm" />
              <p className="text-xs text-gray-400">{textForm.content.length} / 50,000 characters</p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAddMode(null)}>Cancel</Button>
              <Button onClick={addText} disabled={uploading || !textForm.name || !textForm.content}>
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}Add Text
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
