import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../types';
import { prisma } from '../../config/database';
import { authenticate, rateLimit } from '../middleware/auth';
import { validateSchema, schemas, getPagination } from '../middleware/validation';
import { sendSuccess, NotFoundError, ForbiddenError, PlanLimitError } from '../../utils/errors';
import { PLAN_LIMITS } from '../../config';
import { logger } from '../../utils/logger';
import { invalidatePattern } from '../../config/redis';

const router = Router();

// All routes require auth
router.use(authenticate);

// GET /chatbots
router.get(
  '/',
  rateLimit('api'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { page, limit, offset } = getPagination(req.query as Record<string, unknown>);
      const orgId = req.auth!.organizationId;

      const [chatbots, total] = await Promise.all([
        prisma.chatbot.findMany({
          where: { organizationId: orgId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            model: true,
            aiProvider: true,
            widgetConfig: true,
            totalConversations: true,
            totalMessages: true,
            avgRating: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.chatbot.count({ where: { organizationId: orgId } }),
      ]);

      sendSuccess(res, {
        data: chatbots,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /chatbots
router.post(
  '/',
  rateLimit('api'),
  validateSchema(schemas.chatbot.create),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const orgId = req.auth!.organizationId;

      // Check plan limits
      const org = await prisma.organization.findUnique({ where: { id: orgId } });
      if (!org) throw new ForbiddenError();

      const limit = PLAN_LIMITS[org.plan].chatbots;
      const currentCount = await prisma.chatbot.count({ where: { organizationId: orgId } });

      if (currentCount >= limit) {
        throw new PlanLimitError('chatbots');
      }

      const chatbot = await prisma.chatbot.create({
        data: {
          ...req.body,
          organizationId: orgId,
          status: 'DRAFT',
        },
      });

      await prisma.organization.update({
        where: { id: orgId },
        data: { chatbotCount: { increment: 1 } },
      });

      logger.info('Chatbot created', { chatbotId: chatbot.id, orgId });

      sendSuccess(res, chatbot, 201, 'Chatbot created successfully');
    } catch (error) {
      next(error);
    }
  }
);

// GET /chatbots/:id
router.get(
  '/:id',
  rateLimit('api'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const chatbot = await prisma.chatbot.findFirst({
        where: { id: req.params.id, organizationId: req.auth!.organizationId },
        include: {
          knowledgeBase: {
            include: {
              documents: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  status: true,
                  fileSize: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      });

      if (!chatbot) throw new NotFoundError('Chatbot');

      sendSuccess(res, chatbot);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /chatbots/:id
router.put(
  '/:id',
  rateLimit('api'),
  validateSchema(schemas.chatbot.update),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.chatbot.findFirst({
        where: { id: req.params.id, organizationId: req.auth!.organizationId },
      });

      if (!existing) throw new NotFoundError('Chatbot');

      const chatbot = await prisma.chatbot.update({
        where: { id: req.params.id },
        data: req.body,
      });

      await invalidatePattern(`chatbot:${req.params.id}:*`);

      sendSuccess(res, chatbot, 200, 'Chatbot updated');
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /chatbots/:id
router.delete(
  '/:id',
  rateLimit('api'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.chatbot.findFirst({
        where: { id: req.params.id, organizationId: req.auth!.organizationId },
      });

      if (!existing) throw new NotFoundError('Chatbot');

      await prisma.chatbot.delete({ where: { id: req.params.id } });

      await prisma.organization.update({
        where: { id: req.auth!.organizationId },
        data: { chatbotCount: { decrement: 1 } },
      });

      logger.info('Chatbot deleted', { chatbotId: req.params.id });

      sendSuccess(res, null, 200, 'Chatbot deleted');
    } catch (error) {
      next(error);
    }
  }
);

// GET /chatbots/:id/embed-code
router.get(
  '/:id/embed-code',
  rateLimit('api'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const chatbot = await prisma.chatbot.findFirst({
        where: { id: req.params.id, organizationId: req.auth!.organizationId },
      });

      if (!chatbot) throw new NotFoundError('Chatbot');

      const widgetCdnUrl = process.env.WIDGET_CDN_URL || 'https://cdn.yourdomain.com';
      const apiUrl = process.env.API_URL || 'https://api.yourdomain.com';

      const embedCode = `<!-- ChatBot Builder Widget -->
<script>
  window.ChatBotConfig = {
    chatbotId: "${chatbot.id}",
    apiUrl: "${apiUrl}"
  };
</script>
<script src="${widgetCdnUrl}/widget.js" async defer></script>`;

      sendSuccess(res, { embedCode, chatbotId: chatbot.id });
    } catch (error) {
      next(error);
    }
  }
);

// GET /chatbots/:id/analytics
router.get(
  '/:id/analytics',
  rateLimit('api'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const chatbot = await prisma.chatbot.findFirst({
        where: { id: req.params.id, organizationId: req.auth!.organizationId },
      });

      if (!chatbot) throw new NotFoundError('Chatbot');

      const { days = '30' } = req.query;
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(String(days), 10));

      const [conversations, messages, leads, conversationsByDay] = await Promise.all([
        prisma.conversation.count({
          where: { chatbotId: chatbot.id, startedAt: { gte: daysAgo } },
        }),
        prisma.message.count({
          where: {
            conversation: { chatbotId: chatbot.id },
            createdAt: { gte: daysAgo },
          },
        }),
        prisma.lead.count({
          where: { chatbotId: chatbot.id, createdAt: { gte: daysAgo } },
        }),
        prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
          SELECT DATE(started_at) as date, COUNT(*) as count
          FROM conversations
          WHERE chatbot_id = ${chatbot.id}
            AND started_at >= ${daysAgo}
          GROUP BY DATE(started_at)
          ORDER BY date ASC
        `,
      ]);

      sendSuccess(res, {
        period: `${days} days`,
        conversations,
        messages,
        leads,
        avgRating: chatbot.avgRating,
        conversationsByDay: conversationsByDay.map((r) => ({
          date: r.date,
          count: Number(r.count),
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /chatbots/:id/conversations
router.get(
  '/:id/conversations',
  rateLimit('api'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const chatbot = await prisma.chatbot.findFirst({
        where: { id: req.params.id, organizationId: req.auth!.organizationId },
      });

      if (!chatbot) throw new NotFoundError('Chatbot');

      const { page, limit, offset } = getPagination(req.query as Record<string, unknown>);

      const [conversations, total] = await Promise.all([
        prisma.conversation.findMany({
          where: { chatbotId: chatbot.id },
          orderBy: { startedAt: 'desc' },
          take: limit,
          skip: offset,
          include: {
            lead: true,
            _count: { select: { messages: true } },
          },
        }),
        prisma.conversation.count({ where: { chatbotId: chatbot.id } }),
      ]);

      sendSuccess(res, {
        data: conversations,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /chatbots/:id/leads
router.get(
  '/:id/leads',
  rateLimit('api'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const chatbot = await prisma.chatbot.findFirst({
        where: { id: req.params.id, organizationId: req.auth!.organizationId },
      });

      if (!chatbot) throw new NotFoundError('Chatbot');

      const { page, limit, offset } = getPagination(req.query as Record<string, unknown>);

      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where: { chatbotId: chatbot.id },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.lead.count({ where: { chatbotId: chatbot.id } }),
      ]);

      sendSuccess(res, {
        data: leads,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
