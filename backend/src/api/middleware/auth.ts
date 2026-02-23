import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../types';
import { verifyAccessToken } from '../../utils/auth';
import { AuthError, ForbiddenError } from '../../utils/errors';
import { rateLimiters } from '../../config/redis';
import { logger } from '../../utils/logger';
import { prisma } from '../../config/database';

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthError('Missing authentication token');
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifyAccessToken(token);

    req.auth = payload;
    req.organizationId = payload.organizationId;

    next();
  } catch (error) {
    if (error instanceof AuthError) {
      next(error);
    } else {
      next(new AuthError('Invalid or expired token'));
    }
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      return next(new AuthError());
    }
    if (!roles.includes(req.auth.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  };
}

// Authenticate via API key (for widget + API access)
export async function authenticateApiKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.headers['x-api-key'] as string || req.query.apiKey as string;

    if (!apiKey) {
      throw new AuthError('Missing API key');
    }

    // Look up by key prefix first (performance optimization)
    const prefix = apiKey.substring(0, 12);
    const apiKeys = await prisma.apiKey.findMany({
      where: { keyPrefix: prefix },
      include: { organization: true },
    });

    // Find matching key by bcrypt comparison
    const bcrypt = await import('bcryptjs');
    let matchedKey = null;
    for (const k of apiKeys) {
      if (await bcrypt.compare(apiKey, k.keyHash)) {
        matchedKey = k;
        break;
      }
    }

    if (!matchedKey) {
      throw new AuthError('Invalid API key');
    }

    if (matchedKey.expiresAt && matchedKey.expiresAt < new Date()) {
      throw new AuthError('API key has expired');
    }

    // Update last used
    await prisma.apiKey.update({
      where: { id: matchedKey.id },
      data: { lastUsedAt: new Date() },
    });

    req.auth = {
      userId: 'api-key',
      organizationId: matchedKey.organizationId,
      email: '',
      role: 'api',
    };
    req.organizationId = matchedKey.organizationId;

    next();
  } catch (error) {
    next(error);
  }
}

// Rate limiting middleware factory
export function rateLimit(limiterKey: keyof typeof rateLimiters) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const identifier = req.auth?.userId || req.ip || 'unknown';
      const { success, limit, remaining, reset } = await rateLimiters[limiterKey].limit(identifier);

      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', new Date(reset).toISOString());

      if (!success) {
        res.status(429).json({
          success: false,
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((reset - Date.now()) / 1000),
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Rate limit error', { error });
      // Fail open - don't block requests if rate limiter errors
      next();
    }
  };
}
