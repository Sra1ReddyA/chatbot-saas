'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { chatbotsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Copy, CheckCircle2, Code2, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function EmbedCodePage() {
  const { id } = useParams<{ id: string }>();
  const [embedData, setEmbedData] = useState<{ embedCode: string; chatbotId: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    chatbotsApi.getEmbedCode(id).then(setEmbedData).catch(console.error);
  }, [id]);

  const copyCode = async () => {
    if (!embedData?.embedCode) return;
    await navigator.clipboard.writeText(embedData.embedCode);
    setCopied(true);
    toast({ title: 'Copied!', description: 'Embed code copied to clipboard.' });
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/chatbots/${id}`}><ArrowLeft className="w-4 h-4 mr-1" />Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Code2 className="w-6 h-6 text-indigo-600" />Embed Your Chatbot</h1>
          <p className="text-gray-500 text-sm mt-0.5">Copy this code and paste it into your website</p>
        </div>
      </div>

      <Alert className="mb-6 border-indigo-200 bg-indigo-50">
        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
        <AlertDescription className="text-indigo-800">
          Make sure your chatbot status is set to <strong>Active</strong> before embedding, otherwise it won&apos;t appear on your site.
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 1: Copy the embed code</CardTitle>
            <CardDescription>Paste this snippet just before your closing &lt;/body&gt; tag</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-gray-950 text-green-400 rounded-xl p-5 text-sm overflow-x-auto leading-relaxed font-mono">
                {embedData?.embedCode || '<!-- Loading embed code... -->'}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-3 right-3 text-gray-400 hover:text-white hover:bg-white/10"
                onClick={copyCode}
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <Button className="mt-4 w-full" onClick={copyCode}>
              {copied ? <><CheckCircle2 className="w-4 h-4 mr-2" />Copied!</> : <><Copy className="w-4 h-4 mr-2" />Copy Embed Code</>}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 2: Paste into your website</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                platform: 'WordPress',
                instruction: 'Go to Appearance → Theme Editor → footer.php, and paste the code just before </body>. Or use a plugin like "Insert Headers and Footers".',
              },
              {
                platform: 'Shopify',
                instruction: 'Go to Online Store → Themes → Edit Code → theme.liquid, and paste just before </body>.',
              },
              {
                platform: 'Squarespace',
                instruction: 'Go to Settings → Advanced → Code Injection → Footer, and paste the code there.',
              },
              {
                platform: 'Wix',
                instruction: 'Go to Settings → Custom Code → Add Custom Code → Body, and paste the code.',
              },
              {
                platform: 'HTML / Static',
                instruction: 'Paste the code just before the closing </body> tag in your HTML file.',
              },
            ].map((item) => (
              <div key={item.platform} className="flex gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                <div className="w-24 text-sm font-semibold text-gray-700 flex-shrink-0 pt-0.5">{item.platform}</div>
                <p className="text-sm text-gray-500">{item.instruction}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 3: Test it out</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">After adding the code, visit your website. You should see the chat button in the corner. Click it to start a conversation.</p>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link href={`/dashboard/chatbots/${id}`}>
                  Edit Configuration
                </Link>
              </Button>
              <Button variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />Test on Your Site
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
