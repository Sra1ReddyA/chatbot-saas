import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../types';
import { prisma } from '../../config/database';
import { generateTokens, verifyRefreshToken, hashPassword, comparePassword, generateSecureToken } from '../../utils/auth';
import { sendSuccess, AppError, AuthError } from '../../utils/errors';
import { validateSchema, schemas } from '../middleware/validation';
import { authenticate, rateLimit } from '../middleware/auth';
import { logger } from '../../utils/logger';
import { redis, setCacheValue, deleteCacheValue } from '../../config/redis';
import { sendPasswordResetEmail, sendWelcomeEmail } from '../../services/emailService';
import { config } from '../../config';
import { z } from 'zod';

const router = Router();

// POST /auth/register
router.post(
  '/register',
  rateLimit('auth'),
  validateSchema(schemas.auth.register),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { email, password, name, organizationName } = req.body;

      // Check if email exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
      }

      // Generate org slug
      let slug = organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').substring(0, 50);
      const slugExists = await prisma.organization.findUnique({ where: { slug } });
      if (slugExists) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }

      const passwordHash = await hashPassword(password);
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day trial

      // Create org + user in transaction
      const { user, organization } = await prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: organizationName,
            slug,
            plan: 'FREE',
            subscriptionStatus: 'TRIALING',
            trialEndsAt,
          },
        });

        const newUser = await tx.user.create({
          data: {
            email,
            passwordHash,
            name,
            organizationId: org.id,
            role: 'owner',
          },
        });

        return { user: newUser, organization: org };
      });

      const tokens = await generateTokens({
        userId: user.id,
        organizationId: organization.id,
        email: user.email,
        role: user.role,
      });

      // Store refresh token in Redis (TTL = 7 days)
      await setCacheValue(`refresh:${user.id}`, tokens.refreshToken, 7 * 24 * 60 * 60);

      // Fire-and-forget welcome email
      sendWelcomeEmail(user.email, user.name, organization.name, config.FRONTEND_URL).catch(() => {});

      logger.info('User registered', { userId: user.id, organizationId: organization.id });

      sendSuccess(res, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          plan: organization.plan,
          trialEndsAt: organization.trialEndsAt,
        },
        tokens,
      }, 201, 'Account created successfully');
    } catch (error) {
      next(error);
    }
  }
);

// POST /auth/login
router.post(
  '/login',
  rateLimit('auth'),
  validateSchema(schemas.auth.login),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
        include: { organization: true },
      });

      if (!user || !(await comparePassword(password, user.passwordHash))) {
        throw new AuthError('Invalid email or password');
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const tokens = await generateTokens({
        userId: user.id,
        organizationId: user.organizationId,
        email: user.email,
        role: user.role,
      });

      await setCacheValue(`refresh:${user.id}`, tokens.refreshToken, 7 * 24 * 60 * 60);

      logger.info('User logged in', { userId: user.id });

      sendSuccess(res, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          slug: user.organization.slug,
          plan: user.organization.plan,
          subscriptionStatus: user.organization.subscriptionStatus,
          trialEndsAt: user.organization.trialEndsAt,
        },
        tokens,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /auth/refresh
router.post(
  '/refresh',
  rateLimit('api'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        throw new AuthError('Missing refresh token');
      }

      const userId = await verifyRefreshToken(refreshToken);

      // Verify token matches stored value
      const storedToken = await redis.get<string>(`refresh:${userId}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new AuthError('Invalid refresh token');
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { organization: true },
      });

      if (!user) {
        throw new AuthError('User not found');
      }

      const tokens = await generateTokens({
        userId: user.id,
        organizationId: user.organizationId,
        email: user.email,
        role: user.role,
      });

      await setCacheValue(`refresh:${user.id}`, tokens.refreshToken, 7 * 24 * 60 * 60);

      sendSuccess(res, { tokens });
    } catch (error) {
      next(error);
    }
  }
);

// POST /auth/logout
router.post(
  '/logout',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (req.auth) {
        await deleteCacheValue(`refresh:${req.auth.userId}`);
      }
      sendSuccess(res, null, 200, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }
);

// GET /auth/me
router.get(
  '/me',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.auth!.userId },
        include: { organization: true },
      });

      if (!user) {
        throw new AuthError('User not found');
      }

      sendSuccess(res, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
          lastLoginAt: user.lastLoginAt,
        },
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          slug: user.organization.slug,
          plan: user.organization.plan,
          subscriptionStatus: user.organization.subscriptionStatus,
          trialEndsAt: user.organization.trialEndsAt,
          currentPeriodEnd: user.organization.currentPeriodEnd,
          messageCount: user.organization.messageCount,
          chatbotCount: user.organization.chatbotCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /auth/profile
router.put(
  '/profile',
  authenticate,
  rateLimit('api'),
  validateSchema(z.object({ name: z.string().min(2).max(100).trim(), email: z.string().email().optional() })),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { name, email } = req.body;
      if (email && email !== req.auth!.email) {
        const exists = await prisma.user.findUnique({ where: { email } });
        if (exists && exists.id !== req.auth!.userId) throw new AppError('Email already in use', 409);
      }
      const user = await prisma.user.update({ where: { id: req.auth!.userId }, data: { name, ...(email ? { email } : {}) } });
      sendSuccess(res, { id: user.id, name: user.name, email: user.email });
    } catch (error) { next(error); }
  }
);

// PUT /auth/password
router.put(
  '/password',
  authenticate,
  rateLimit('strict'),
  validateSchema(z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/) })),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
      if (!user || !(await comparePassword(currentPassword, user.passwordHash))) {
        throw new AppError('Current password is incorrect', 400, 'WRONG_PASSWORD');
      }
      const newHash = await hashPassword(newPassword);
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
      await deleteCacheValue(`refresh:${user.id}`);
      sendSuccess(res, null, 200, 'Password updated. Please log in again.');
    } catch (error) { next(error); }
  }
);

// POST /auth/forgot-password
router.post(
  '/forgot-password',
  rateLimit('strict'),
  validateSchema(z.object({ email: z.string().email().toLowerCase() })),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        const token = generateSecureToken(48);
        const expiry = new Date(Date.now() + 60 * 60 * 1000);
        await prisma.user.update({ where: { id: user.id }, data: { resetToken: token, resetTokenExp: expiry } });
        sendPasswordResetEmail(user.email, user.name, token, config.FRONTEND_URL).catch(() => {});
        logger.info('Password reset requested', { userId: user.id });
      }
      sendSuccess(res, null, 200, 'If that email exists, a reset link has been sent.');
    } catch (error) { next(error); }
  }
);

// POST /auth/reset-password
router.post(
  '/reset-password',
  rateLimit('strict'),
  validateSchema(schemas.auth.resetPassword),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body;
      const user = await prisma.user.findFirst({ where: { resetToken: token, resetTokenExp: { gt: new Date() } } });
      if (!user) throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
      const passwordHash = await hashPassword(password);
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash, resetToken: null, resetTokenExp: null } });
      await deleteCacheValue(`refresh:${user.id}`);
      logger.info('Password reset completed', { userId: user.id });
      sendSuccess(res, null, 200, 'Password has been reset. You can now log in.');
    } catch (error) { next(error); }
  }
);

// Register welcome email hook (called after register in original auth.ts)
export async function triggerWelcomeEmail(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { organization: true } });
  if (user) sendWelcomeEmail(user.email, user.name, user.organization.name, config.FRONTEND_URL).catch(() => {});
}

export default router;
