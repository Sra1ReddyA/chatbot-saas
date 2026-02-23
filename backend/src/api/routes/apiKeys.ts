import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../types';
import { prisma } from '../../config/database';
import { authenticate, rateLimit } from '../middleware/auth';
import { sendSuccess, NotFoundError } from '../../utils/errors';
import { generateApiKey } from '../../utils/auth';

const router = Router();
router.use(authenticate);

// GET /api-keys
router.get('/', rateLimit('api'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { organizationId: req.auth!.organizationId },
      select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    sendSuccess(res, keys);
  } catch (error) {
    next(error);
  }
});

// POST /api-keys
router.post('/', rateLimit('strict'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, expiresAt } = req.body;
    const { key, prefix, hash: hashPromise } = generateApiKey();
    const keyHash = await hashPromise;

    const apiKey = await prisma.apiKey.create({
      data: {
        name: name || 'API Key',
        keyHash,
        keyPrefix: prefix,
        organizationId: req.auth!.organizationId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    // Return the full key ONCE - never again
    sendSuccess(res, {
      id: apiKey.id,
      name: apiKey.name,
      key, // Only shown once!
      keyPrefix: apiKey.keyPrefix,
      createdAt: apiKey.createdAt,
    }, 201, 'API key created. Save this key - it will not be shown again.');
  } catch (error) {
    next(error);
  }
});

// DELETE /api-keys/:id
router.delete('/:id', rateLimit('api'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const key = await prisma.apiKey.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!key) throw new NotFoundError('API Key');
    await prisma.apiKey.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 200, 'API key deleted');
  } catch (error) {
    next(error);
  }
});

export default router;
