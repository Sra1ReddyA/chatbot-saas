import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../types';
import { authenticate, rateLimit } from '../middleware/auth';
import { sendSuccess, AppError } from '../../utils/errors';
import { createCheckoutSession, createBillingPortalSession, handleStripeWebhook } from '../../services/stripeService';
import { prisma } from '../../config/database';
import { config, PRICING, PLAN_LIMITS } from '../../config';

const router = Router();

// GET /billing/plans
router.get('/plans', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      plans: [
        {
          id: 'FREE',
          name: 'Free',
          price: PRICING.FREE,
          limits: PLAN_LIMITS.FREE,
          features: [
            '1 chatbot',
            '500 messages/month',
            'Basic widget customization',
            'ChatBot Builder branding',
          ],
        },
        {
          id: 'STARTER',
          name: 'Starter',
          price: PRICING.STARTER,
          priceId: config.STRIPE_PRICE_STARTER,
          limits: PLAN_LIMITS.STARTER,
          popular: false,
          features: [
            '3 chatbots',
            '5,000 messages/month',
            'Remove branding',
            'Lead capture',
            'Analytics dashboard',
            'API access',
            '1 custom domain',
          ],
        },
        {
          id: 'GROWTH',
          name: 'Growth',
          price: PRICING.GROWTH,
          priceId: config.STRIPE_PRICE_GROWTH,
          limits: PLAN_LIMITS.GROWTH,
          popular: true,
          features: [
            '10 chatbots',
            '25,000 messages/month',
            'Webhooks',
            'Advanced analytics',
            'Knowledge base (100 docs)',
            'API access',
            '5 custom domains',
            'Priority support',
          ],
        },
        {
          id: 'ENTERPRISE',
          name: 'Enterprise',
          price: PRICING.ENTERPRISE,
          priceId: config.STRIPE_PRICE_ENTERPRISE,
          limits: PLAN_LIMITS.ENTERPRISE,
          features: [
            '100 chatbots',
            '500,000 messages/month',
            'Custom AI models',
            'SSO / SAML',
            'SLA guarantee',
            'Dedicated support',
            'Custom contracts',
          ],
        },
      ],
    },
  });
});

// POST /billing/checkout
router.post(
  '/checkout',
  authenticate,
  rateLimit('api'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { priceId } = req.body;
      if (!priceId) throw new AppError('Missing priceId', 400);

      const validPrices = [
        config.STRIPE_PRICE_STARTER,
        config.STRIPE_PRICE_GROWTH,
        config.STRIPE_PRICE_ENTERPRISE,
      ];

      if (!validPrices.includes(priceId)) {
        throw new AppError('Invalid plan', 400);
      }

      const url = await createCheckoutSession(
        req.auth!.organizationId,
        priceId,
        `${config.FRONTEND_URL}/dashboard/billing?success=true`,
        `${config.FRONTEND_URL}/dashboard/billing?canceled=true`
      );

      sendSuccess(res, { url });
    } catch (error) {
      next(error);
    }
  }
);

// POST /billing/portal
router.post(
  '/portal',
  authenticate,
  rateLimit('api'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const url = await createBillingPortalSession(
        req.auth!.organizationId,
        `${config.FRONTEND_URL}/dashboard/billing`
      );
      sendSuccess(res, { url });
    } catch (error) {
      next(error);
    }
  }
);

// GET /billing/usage
router.get(
  '/usage',
  authenticate,
  rateLimit('api'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: req.auth!.organizationId },
      });

      if (!org) throw new AppError('Organization not found', 404);

      const limits = PLAN_LIMITS[org.plan];
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [messagesThisMonth, conversationsThisMonth] = await Promise.all([
        prisma.usageLog.count({
          where: {
            organizationId: org.id,
            type: 'message',
            createdAt: { gte: startOfMonth },
          },
        }),
        prisma.usageLog.count({
          where: {
            organizationId: org.id,
            type: 'conversation',
            createdAt: { gte: startOfMonth },
          },
        }),
      ]);

      sendSuccess(res, {
        plan: org.plan,
        subscriptionStatus: org.subscriptionStatus,
        currentPeriodEnd: org.currentPeriodEnd,
        trialEndsAt: org.trialEndsAt,
        usage: {
          messages: {
            used: messagesThisMonth,
            limit: limits.messagesPerMonth,
            percentage: Math.round((messagesThisMonth / limits.messagesPerMonth) * 100),
          },
          conversations: {
            used: conversationsThisMonth,
            limit: limits.conversationsPerMonth,
            percentage: Math.round((conversationsThisMonth / limits.conversationsPerMonth) * 100),
          },
          chatbots: {
            used: org.chatbotCount,
            limit: limits.chatbots,
          },
        },
        limits,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /billing/invoices
router.get(
  '/invoices',
  authenticate,
  rateLimit('api'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const invoices = await prisma.invoice.findMany({
        where: { organizationId: req.auth!.organizationId },
        orderBy: { createdAt: 'desc' },
        take: 24,
      });
      sendSuccess(res, invoices);
    } catch (error) {
      next(error);
    }
  }
);

// POST /billing/webhook (Stripe webhook - no auth)
router.post(
  '/webhook',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      if (!signature) {
        res.status(400).json({ error: 'Missing signature' });
        return;
      }

      await handleStripeWebhook(req.body as Buffer, signature);

      res.json({ received: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
