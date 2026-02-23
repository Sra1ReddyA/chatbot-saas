import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../types';
import { prisma } from '../../config/database';
import { authenticate, rateLimit } from '../middleware/auth';
import { sendSuccess } from '../../utils/errors';

const router = Router();
router.use(authenticate);

// GET /dashboard/stats
router.get('/stats', rateLimit('api'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = req.auth!.organizationId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalConversations,
      totalMessages,
      totalLeads,
      conversationsToday,
      messagesThisMonth,
      topChatbots,
      conversationsByDay,
      avgRatingResult,
    ] = await Promise.all([
      prisma.conversation.count({ where: { chatbot: { organizationId: orgId } } }),
      prisma.message.count({ where: { conversation: { chatbot: { organizationId: orgId } } } }),
      prisma.lead.count({ where: { chatbot: { organizationId: orgId } } }),
      prisma.conversation.count({
        where: { chatbot: { organizationId: orgId }, startedAt: { gte: today } },
      }),
      prisma.message.count({
        where: {
          conversation: { chatbot: { organizationId: orgId } },
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.chatbot.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true, totalConversations: true, totalMessages: true },
        orderBy: { totalConversations: 'desc' },
        take: 5,
      }),
      prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT DATE(c.started_at) as date, COUNT(*) as count
        FROM conversations c
        JOIN chatbots cb ON c.chatbot_id = cb.id
        WHERE cb.organization_id = ${orgId}
          AND c.started_at >= ${thirtyDaysAgo}
        GROUP BY DATE(c.started_at)
        ORDER BY date ASC
      `,
      prisma.conversation.aggregate({
        where: { chatbot: { organizationId: orgId }, rating: { not: null } },
        _avg: { rating: true },
      }),
    ]);

    sendSuccess(res, {
      totalConversations,
      totalMessages,
      totalLeads,
      conversationsToday,
      messagesThisMonth,
      avgRating: avgRatingResult._avg.rating
        ? Math.round(avgRatingResult._avg.rating * 10) / 10
        : null,
      topChatbots: topChatbots.map((c) => ({
        id: c.id,
        name: c.name,
        conversations: c.totalConversations,
        messages: c.totalMessages,
      })),
      conversationsByDay: conversationsByDay.map((r) => ({
        date: r.date,
        count: Number(r.count),
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
