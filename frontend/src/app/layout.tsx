import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    template: '%s | ChatBot Builder',
    default: 'ChatBot Builder - AI Chatbots for Small Businesses',
  },
  description:
    'Build and deploy AI chatbots for your business in minutes. No coding required. Powered by GPT-4 and Claude.',
  keywords: ['AI chatbot', 'chatbot builder', 'customer support', 'small business'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://chatbotbuilder.app',
    siteName: 'ChatBot Builder',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
