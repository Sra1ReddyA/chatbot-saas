import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { z } from 'zod';

export function validateRequest(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array().map((e) => ({
        field: e.type === 'field' ? e.path : e.type,
        message: e.msg,
      })),
    });
    return;
  }
  next();
}

export function validateSchema<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

// Pagination helper
export function getPagination(query: Record<string, unknown>): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = Math.max(1, parseInt(String(query.page || '1'), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || '20'), 10)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

// Sanitize string input
export function sanitizeString(str: string): string {
  return str.trim().replace(/[<>]/g, '');
}

// Common validation schemas
export const schemas = {
  auth: {
    register: z.object({
      email: z.string().email().toLowerCase().trim(),
      password: z
        .string()
        .min(8)
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
          message: 'Password must contain uppercase, lowercase, and number',
        }),
      name: z.string().min(2).max(100).trim(),
      organizationName: z.string().min(2).max(100).trim(),
    }),

    login: z.object({
      email: z.string().email().toLowerCase().trim(),
      password: z.string().min(1),
    }),

    resetPassword: z.object({
      token: z.string().min(1),
      password: z
        .string()
        .min(8)
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    }),
  },

  chatbot: {
    create: z.object({
      name: z.string().min(1).max(100).trim(),
      description: z.string().max(500).trim().optional(),
      systemPrompt: z.string().min(10).max(5000).trim(),
      model: z
        .enum(['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo', 'claude-3-haiku-20240307', 'claude-3-5-sonnet-20241022'])
        .default('gpt-4o-mini'),
      aiProvider: z.enum(['openai', 'anthropic']).default('openai'),
      temperature: z.number().min(0).max(2).default(0.7),
      maxTokens: z.number().min(100).max(4000).default(500),
      allowedDomains: z.array(z.string().url()).default([]),
      widgetConfig: z
        .object({
          primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).default('#6366f1'),
          textColor: z.string().regex(/^#[0-9A-F]{6}$/i).default('#ffffff'),
          backgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i).default('#ffffff'),
          position: z.enum(['bottom-right', 'bottom-left']).default('bottom-right'),
          avatar: z.string().url().nullable().default(null),
          welcomeMessage: z.string().max(200).default('Hi! How can I help you today?'),
          placeholder: z.string().max(100).default('Type a message...'),
          showBranding: z.boolean().default(true),
          buttonText: z.string().max(50).default('Chat with us'),
          headerTitle: z.string().max(100).default('Chat Support'),
        })
        .default({}),
      leadCaptureEnabled: z.boolean().default(false),
      leadCaptureFields: z
        .array(
          z.object({
            name: z.string().min(1),
            type: z.enum(['email', 'text', 'phone']),
            required: z.boolean(),
            label: z.string().min(1),
          })
        )
        .default([]),
    }),

    update: z.object({
      name: z.string().min(1).max(100).trim().optional(),
      description: z.string().max(500).trim().optional(),
      systemPrompt: z.string().min(10).max(5000).trim().optional(),
      model: z
        .enum(['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo', 'claude-3-haiku-20240307', 'claude-3-5-sonnet-20241022'])
        .optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().min(100).max(4000).optional(),
      allowedDomains: z.array(z.string()).optional(),
      widgetConfig: z.record(z.unknown()).optional(),
      status: z.enum(['ACTIVE', 'INACTIVE', 'DRAFT']).optional(),
      leadCaptureEnabled: z.boolean().optional(),
      leadCaptureFields: z.array(z.object({
        name: z.string(),
        type: z.enum(['email', 'text', 'phone']),
        required: z.boolean(),
        label: z.string(),
      })).optional(),
    }),
  },

  chat: {
    message: z.object({
      message: z.string().min(1).max(2000).trim(),
      sessionId: z.string().optional(),
      metadata: z
        .object({
          pageUrl: z.string().url().optional(),
          referrer: z.string().optional(),
          userAgent: z.string().optional(),
        })
        .optional(),
    }),

    leadCapture: z.object({
      sessionId: z.string().min(1),
      data: z.record(z.string()),
    }),
  },
};
