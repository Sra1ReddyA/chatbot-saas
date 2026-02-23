import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../types';
import { prisma } from '../../config/database';
import { rateLimiters } from '../../config/redis';
import { validateSchema, schemas } from '../middleware/validation';
import { sendSuccess, AppError, NotFoundError } from '../../utils/errors';
import { generateChatCompletion, estimateCost, searchKnowledgeBase } from '../../services/chatService';
import { logger } from '../../utils/logger';
import crypto from 'crypto';

const router = Router();

// Widget CORS - allow all origins (domain check happens in service)
router.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Id');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

// GET /chat/:chatbotId/config - load widget config
router.get(
  '/:chatbotId/config',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const chatbot = await prisma.chatbot.findFirst({
        where: { id: req.params.chatbotId, status: 'ACTIVE' },
        select: {
          id: true,
          name: true,
          widgetConfig: true,
          leadCaptureEnabled: true,
          leadCaptureFields: true,
          organization: {
            select: { plan: true, subscriptionStatus: true },
          },
        },
      });

      if (!chatbot) throw new NotFoundError('Chatbot');

      // Check subscription is active
      const { subscriptionStatus } = chatbot.organization;
      if (subscriptionStatus !== 'ACTIVE' && subscriptionStatus !== 'TRIALING') {
        throw new AppError('Chatbot is temporarily unavailable', 403, 'SUBSCRIPTION_INACTIVE');
      }

      sendSuccess(res, {
        chatbotId: chatbot.id,
        name: chatbot.name,
        widgetConfig: chatbot.widgetConfig,
        leadCaptureEnabled: chatbot.leadCaptureEnabled,
        leadCaptureFields: chatbot.leadCaptureFields,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /chat/:chatbotId/message
router.post(
  '/:chatbotId/message',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Rate limit by session
      const sessionId = req.headers['x-session-id'] as string || req.body.sessionId || 'anon';
      const { success } = await rateLimiters.chat.limit(sessionId);
      if (!success) {
        res.status(429).json({ success: false, error: 'Too many messages', code: 'RATE_LIMIT_EXCEEDED' });
        return;
      }

      const result = schemas.chat.message.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ success: false, error: 'Invalid request', details: result.error.errors });
        return;
      }

      const { message, sessionId: bodySession, metadata } = result.data;
      const actualSessionId = sessionId !== 'anon' ? sessionId : (bodySession || crypto.randomUUID());

      const chatbot = await prisma.chatbot.findFirst({
        where: { id: req.params.chatbotId, status: 'ACTIVE' },
        include: {
          organization: {
            select: {
              id: true,
              plan: true,
              subscriptionStatus: true,
              messageCount: true,
            },
          },
          knowledgeBase: {
            include: {
              documents: {
                where: { status: 'ready' },
                select: { content: true, name: true },
              },
            },
          },
        },
      });

      if (!chatbot) throw new NotFoundError('Chatbot');

      const org = chatbot.organization;

      // Check subscription
      if (org.subscriptionStatus !== 'ACTIVE' && org.subscriptionStatus !== 'TRIALING') {
        throw new AppError('Service unavailable', 503, 'SUBSCRIPTION_INACTIVE');
      }

      // Check domain allowlist
      const origin = req.headers.origin;
      if (chatbot.allowedDomains.length > 0 && origin) {
        const hostname = new URL(origin).hostname;
        const isAllowed = chatbot.allowedDomains.some((d) => {
          const domain = d.replace(/^https?:\/\//, '').replace(/\/.*/, '');
          return hostname === domain || hostname.endsWith(`.${domain}`);
        });
        if (!isAllowed) {
          throw new AppError('Domain not allowed', 403, 'DOMAIN_NOT_ALLOWED');
        }
      }

      // Get or create conversation
      let conversation = await prisma.conversation.findUnique({
        where: { sessionId: actualSessionId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 20, // Last 20 messages for context
          },
        },
      });

      if (!conversation) {
        const ipHash = req.ip
          ? crypto.createHash('sha256').update(req.ip).digest('hex').substring(0, 16)
          : null;

        conversation = await prisma.conversation.create({
          data: {
            sessionId: actualSessionId,
            chatbotId: chatbot.id,
            ipHash,
            userAgent: metadata?.userAgent || req.headers['user-agent'],
            referrer: metadata?.referrer,
            pageUrl: metadata?.pageUrl,
            isActive: true,
          },
          include: { messages: true },
        });

        await prisma.chatbot.update({
          where: { id: chatbot.id },
          data: { totalConversations: { increment: 1 } },
        });

        await prisma.organization.update({
          where: { id: org.id },
          data: { conversationCount: { increment: 1 } },
        });
      }

      // Save user message
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'USER',
          content: message,
        },
      });

      // Build message history for AI
      const history = conversation.messages.map((m) => ({
        role: m.role.toLowerCase() as 'user' | 'assistant',
        content: m.content,
      }));
      history.push({ role: 'user', content: message });

      // Search knowledge base
      const contextDocs = chatbot.knowledgeBase?.documents?.length
        ? searchKnowledgeBase(chatbot.knowledgeBase.documents, message)
        : undefined;

      // Generate AI response
      const aiResult = await generateChatCompletion(
        chatbot.aiProvider as 'openai' | 'anthropic',
        chatbot.model,
        chatbot.systemPrompt,
        history,
        chatbot.temperature,
        chatbot.maxTokens,
        contextDocs
      );

      // Save assistant message
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'ASSISTANT',
          content: aiResult.content,
          tokens: aiResult.tokens,
          latency: aiResult.latency,
        },
      });

      // Update stats
      const cost = estimateCost(chatbot.model, aiResult.tokens);
      await Promise.all([
        prisma.conversation.update({
          where: { id: conversation.id },
          data: { messageCount: { increment: 2 } },
        }),
        prisma.chatbot.update({
          where: { id: chatbot.id },
          data: { totalMessages: { increment: 2 } },
        }),
        prisma.organization.update({
          where: { id: org.id },
          data: { messageCount: { increment: 2 } },
        }),
        prisma.usageLog.create({
          data: {
            organizationId: org.id,
            chatbotId: chatbot.id,
            type: 'message',
            tokensUsed: aiResult.tokens,
            cost,
          },
        }),
      ]);

      logger.info('Chat message processed', {
        chatbotId: chatbot.id,
        conversationId: conversation.id,
        tokens: aiResult.tokens,
        latency: aiResult.latency,
      });

      sendSuccess(res, {
        message: aiResult.content,
        sessionId: actualSessionId,
        conversationId: conversation.id,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /chat/:chatbotId/lead
router.post(
  '/:chatbotId/lead',
  validateSchema(schemas.chat.leadCapture),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, data } = req.body;

      const conversation = await prisma.conversation.findUnique({
        where: { sessionId },
        include: { chatbot: true },
      });

      if (!conversation) throw new NotFoundError('Conversation');
      if (conversation.chatbot.id !== req.params.chatbotId) {
        throw new AppError('Invalid session', 400);
      }

      // Check if lead already captured
      const existingLead = await prisma.lead.findUnique({
        where: { conversationId: conversation.id },
      });

      if (existingLead) {
        sendSuccess(res, { leadId: existingLead.id }, 200, 'Lead already captured');
        return;
      }

      const lead = await prisma.lead.create({
        data: {
          chatbotId: req.params.chatbotId,
          conversationId: conversation.id,
          data,
        },
      });

      await prisma.usageLog.create({
        data: {
          organizationId: conversation.chatbot.organizationId,
          chatbotId: req.params.chatbotId,
          type: 'lead',
        },
      });

      sendSuccess(res, { leadId: lead.id }, 201, 'Lead captured');
    } catch (error) {
      next(error);
    }
  }
);

// POST /chat/:chatbotId/rating
router.post(
  '/:chatbotId/rating',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, rating } = req.body;

      if (!sessionId || typeof rating !== 'number' || rating < 1 || rating > 5) {
        res.status(400).json({ success: false, error: 'Invalid rating data' });
        return;
      }

      const conversation = await prisma.conversation.findUnique({
        where: { sessionId },
      });

      if (!conversation) throw new NotFoundError('Conversation');

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { rating, isActive: false, endedAt: new Date() },
      });

      // Update chatbot avg rating
      const avgResult = await prisma.conversation.aggregate({
        where: { chatbotId: req.params.chatbotId, rating: { not: null } },
        _avg: { rating: true },
      });

      await prisma.chatbot.update({
        where: { id: req.params.chatbotId },
        data: { avgRating: avgResult._avg.rating },
      });

      sendSuccess(res, null, 200, 'Rating submitted');
    } catch (error) {
      next(error);
    }
  }
);

export default router;
