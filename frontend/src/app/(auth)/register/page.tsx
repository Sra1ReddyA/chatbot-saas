'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bot, Loader2, CheckCircle2 } from 'lucide-react';

const FEATURES = [
  'Free 14-day trial, no credit card required',
  'AI-powered chatbots in minutes',
  'Easy embed on any website',
  'Lead capture & analytics',
];

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    organizationName: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await register(form);
      router.push('/dashboard');
    } catch {
      // error handled in store
    }
  };

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [field]: e.target.value });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 flex-col justify-between p-12">
        <div className="flex items-center gap-2">
          <Bot className="w-8 h-8 text-white" />
          <span className="text-white font-bold text-xl">ChatBot Builder</span>
        </div>
        <div>
          <h2 className="text-white text-4xl font-bold leading-tight mb-6">
            Build AI chatbots<br />your customers love
          </h2>
          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-indigo-100">
                <CheckCircle2 className="w-5 h-5 text-indigo-300 flex-shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-indigo-200 text-sm">
          Trusted by 1,000+ small businesses
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl mb-4">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold">ChatBot Builder</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h2>
            <p className="text-gray-500 text-sm mb-6">Start your free 14-day trial</p>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Your name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={update('name')}
                    placeholder="Jane Smith"
                    required
                    disabled={isLoading}
                    minLength={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="orgName">Company name</Label>
                  <Input
                    id="orgName"
                    value={form.organizationName}
                    onChange={update('organizationName')}
                    placeholder="Acme Inc."
                    required
                    disabled={isLoading}
                    minLength={2}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Work email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={update('email')}
                  placeholder="jane@acme.com"
                  autoComplete="email"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={update('password')}
                  placeholder="Min. 8 chars, uppercase & number"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Start free trial'
                )}
              </Button>

              <p className="text-center text-xs text-gray-400">
                By signing up, you agree to our{' '}
                <Link href="/terms" className="underline hover:text-gray-600">Terms</Link> and{' '}
                <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
              </p>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{' '}
              <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
