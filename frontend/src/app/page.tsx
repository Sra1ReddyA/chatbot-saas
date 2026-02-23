import Link from 'next/link';
import { Bot, CheckCircle2, MessageSquare, Zap, Shield, BarChart2, Code2, ArrowRight, Star } from 'lucide-react';

const FEATURES = [
  { icon: Zap, title: 'Live in 5 minutes', desc: 'Paste one snippet of code and your chatbot is on your site. No developer needed.' },
  { icon: Bot, title: 'GPT-4 & Claude powered', desc: 'Choose from the best AI models. Your chatbot learns from your own content.' },
  { icon: BarChart2, title: 'Capture leads & analytics', desc: 'Collect emails, phone numbers, and custom fields. Track every conversation.' },
  { icon: Shield, title: 'Enterprise secure', desc: 'SOC2-ready. Rate limiting, JWT auth, domain restrictions, audit logs.' },
  { icon: Code2, title: 'Fully customizable', desc: 'Match your brand colors, position, avatar, and messaging perfectly.' },
  { icon: MessageSquare, title: 'Knowledge base', desc: 'Upload PDFs, connect URLs, paste text — your bot answers from your content.' },
];

const TESTIMONIALS = [
  { name: 'Sarah K.', company: 'Bloom Boutique', text: 'Cut our support tickets by 60% in the first month. Setup took 10 minutes.', stars: 5 },
  { name: 'Marcus T.', company: 'TechFlow Agency', text: 'We now deploy chatbots for our clients in a day. The white-label option is fantastic.', stars: 5 },
  { name: 'Priya R.', company: 'LegalDocs Pro', text: 'The knowledge base feature is a game-changer. Clients get accurate answers 24/7.', stars: 5 },
];

const PRICING_HIGHLIGHTS = [
  { plan: 'Free', price: '$0', feature: '1 chatbot · 500 msgs/mo', cta: 'Get started', href: '/register' },
  { plan: 'Starter', price: '$29/mo', feature: '3 chatbots · 5K msgs/mo', cta: 'Start trial', href: '/register', popular: true },
  { plan: 'Growth', price: '$79/mo', feature: '10 chatbots · 25K msgs/mo', cta: 'Start trial', href: '/register' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-7 h-7 text-indigo-600" />
            <span className="font-bold text-gray-900 text-lg">ChatBot Builder</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2">Sign in</Link>
            <Link href="/register" className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium">Start free →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-sm font-medium px-3 py-1.5 rounded-full mb-6">
          <Zap className="w-3.5 h-3.5" />14-day free trial · No credit card required
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-gray-900 leading-tight mb-6">
          AI chatbots for your<br />
          <span className="text-indigo-600">small business</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Build an AI assistant trained on your content. Embed it on your website in minutes. Capture leads, answer questions, and support customers 24/7.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white text-base font-semibold px-7 py-3.5 rounded-xl hover:bg-indigo-700 transition-colors">
            Start building for free <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="#pricing" className="inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-700 text-base font-medium px-7 py-3.5 rounded-xl hover:bg-gray-50 transition-colors">
            See pricing
          </Link>
        </div>
        <p className="text-sm text-gray-400 mt-4">Trusted by 1,000+ small businesses</p>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Everything you need to automate support</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">What businesses are saying</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(t.stars)].map((_, i) => <Star key={i} className="w-4 h-4 text-amber-400 fill-current" />)}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-4">&quot;{t.text}&quot;</p>
                <div>
                  <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-3">Simple, transparent pricing</h2>
          <p className="text-center text-gray-500 mb-12">Start free. Upgrade as you grow. Cancel anytime.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRICING_HIGHLIGHTS.map((p) => (
              <div key={p.plan} className={`bg-white rounded-2xl p-6 border-2 ${p.popular ? 'border-indigo-500 shadow-lg relative' : 'border-gray-200'}`}>
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</span>
                  </div>
                )}
                <p className="font-bold text-lg text-gray-900 mb-1">{p.plan}</p>
                <p className="text-3xl font-black text-gray-900 mb-2">{p.price}</p>
                <p className="text-sm text-gray-400 mb-6">{p.feature}</p>
                <Link href={p.href} className={`block text-center py-2.5 rounded-lg font-semibold text-sm transition-colors ${p.popular ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-8">
            All plans include a 14-day free trial.{' '}
            <Link href="/register" className="text-indigo-600 hover:underline">Compare full features →</Link>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-indigo-600">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-black text-white mb-4">Ready to automate your support?</h2>
          <p className="text-indigo-200 mb-8 text-lg">Start your free trial. Your first chatbot takes 5 minutes.</p>
          <Link href="/register" className="inline-flex items-center gap-2 bg-white text-indigo-600 font-bold px-8 py-4 rounded-xl hover:bg-indigo-50 text-base transition-colors">
            Create your free account <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-gray-700">ChatBot Builder</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="/login" className="hover:text-gray-600">Sign in</Link>
            <Link href="/register" className="hover:text-gray-600">Get started</Link>
            <a href="mailto:support@chatbotbuilder.app" className="hover:text-gray-600">Support</a>
          </div>
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} ChatBot Builder. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
