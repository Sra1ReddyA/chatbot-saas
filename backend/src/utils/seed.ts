import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  // Create demo organization
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-company' },
    update: {},
    create: {
      name: 'Demo Company',
      slug: 'demo-company',
      plan: 'GROWTH',
      subscriptionStatus: 'ACTIVE',
    },
  });

  // Create demo user
  const passwordHash = await bcrypt.hash('Demo1234!', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      passwordHash,
      name: 'Demo User',
      organizationId: org.id,
      role: 'owner',
      emailVerified: true,
    },
  });

  // Create demo chatbot
  const chatbot = await prisma.chatbot.create({
    data: {
      name: 'Customer Support Bot',
      description: 'Handle customer inquiries 24/7',
      status: 'ACTIVE',
      organizationId: org.id,
      systemPrompt: `You are a helpful customer support assistant for Demo Company. 
You help customers with:
- Product questions
- Order status
- Returns and refunds
- Technical issues

Be friendly, concise, and professional. If you cannot help, offer to connect them with a human agent.`,
      model: 'gpt-4o-mini',
      aiProvider: 'openai',
      temperature: 0.7,
      maxTokens: 500,
      widgetConfig: {
        primaryColor: '#6366f1',
        textColor: '#ffffff',
        backgroundColor: '#ffffff',
        position: 'bottom-right',
        welcomeMessage: 'Hi! 👋 How can I help you today?',
        placeholder: 'Ask me anything...',
        showBranding: false,
        buttonText: 'Chat with us',
        headerTitle: 'Customer Support',
        avatar: null,
      },
      leadCaptureEnabled: true,
      leadCaptureFields: [
        { name: 'email', type: 'email', required: true, label: 'Email address' },
        { name: 'name', type: 'text', required: false, label: 'Your name' },
      ],
      totalConversations: 42,
      totalMessages: 187,
      avgRating: 4.3,
    },
  });

  console.log('✅ Seeded successfully!');
  console.log('---');
  console.log('Demo login: demo@example.com / Demo1234!');
  console.log('Chatbot ID:', chatbot.id);
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
