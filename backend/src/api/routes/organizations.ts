import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../types';
import { prisma } from '../../config/database';
import { authenticate, rateLimit, requireRole } from '../middleware/auth';
import { validateSchema } from '../middleware/validation';
import { sendSuccess, NotFoundError } from '../../utils/errors';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

// GET /organizations
router.get('/', rateLimit('api'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.auth!.organizationId },
      select: { id: true, name: true, slug: true, logoUrl: true, plan: true, subscriptionStatus: true, chatbotCount: true, messageCount: true, createdAt: true },
    });
    if (!org) throw new NotFoundError('Organization');
    sendSuccess(res, org);
  } catch (error) { next(error); }
});

// PUT /organizations
router.put(
  '/',
  rateLimit('api'),
  requireRole('owner', 'admin'),
  validateSchema(z.object({ name: z.string().min(2).max(100).trim().optional(), logoUrl: z.string().url().optional().nullable() })),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const org = await prisma.organization.update({
        where: { id: req.auth!.organizationId },
        data: req.body,
        select: { id: true, name: true, slug: true, logoUrl: true },
      });
      sendSuccess(res, org, 200, 'Organization updated');
    } catch (error) { next(error); }
  }
);

// GET /organizations/members
router.get('/members', rateLimit('api'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const members = await prisma.user.findMany({
      where: { organizationId: req.auth!.organizationId },
      select: { id: true, name: true, email: true, role: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    sendSuccess(res, members);
  } catch (error) { next(error); }
});

export default router;
