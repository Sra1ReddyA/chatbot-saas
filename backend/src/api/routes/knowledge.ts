import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../types';
import { prisma } from '../../config/database';
import { authenticate, rateLimit } from '../middleware/auth';
import { sendSuccess, NotFoundError, AppError, PlanLimitError } from '../../utils/errors';
import { extractTextFromBuffer, crawlUrl, processKnowledgeDocument, ensureKnowledgeBase } from '../../services/knowledgeService';
import { PLAN_LIMITS } from '../../config';
import { z } from 'zod';
import multer from 'multer';
import { logger } from '../../utils/logger';

const router = Router();
router.use(authenticate);

// File upload: memory storage (max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'text/plain', 'text/html', 'text/csv', 'application/json',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(txt|md|html|csv|json|pdf|docx)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  },
});

// Verify chatbot ownership middleware
async function verifyChatbot(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const chatbot = await prisma.chatbot.findFirst({
    where: { id: req.params.chatbotId, organizationId: req.auth!.organizationId },
    include: { organization: true },
  });
  if (!chatbot) return next(new NotFoundError('Chatbot'));
  (req as AuthenticatedRequest & { chatbot: typeof chatbot }).chatbot = chatbot;
  next();
}

// GET /knowledge/:chatbotId
router.get('/:chatbotId', rateLimit('api'), verifyChatbot, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const kb = await prisma.knowledgeBase.findUnique({
      where: { chatbotId: req.params.chatbotId },
      include: {
        documents: {
          select: { id: true, name: true, type: true, status: true, fileSize: true, sourceUrl: true, errorMsg: true, createdAt: true, updatedAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    sendSuccess(res, kb || { documents: [] });
  } catch (error) { next(error); }
});

// POST /knowledge/:chatbotId/upload - File upload
router.post(
  '/:chatbotId/upload',
  rateLimit('api'),
  verifyChatbot,
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError('No file uploaded', 400);

      const orgPlan = (req as AuthenticatedRequest & { chatbot: { organization: { plan: string } } }).chatbot.organization.plan as keyof typeof PLAN_LIMITS;
      const limits = PLAN_LIMITS[orgPlan];
      const kbId = await ensureKnowledgeBase(req.params.chatbotId);
      const docCount = await prisma.knowledgeDocument.count({ where: { knowledgeBaseId: kbId } });

      if (docCount >= limits.knowledgeDocuments) {
        throw new PlanLimitError('knowledge documents');
      }

      // Extract text immediately for small files
      let content = '';
      try {
        content = await extractTextFromBuffer(req.file.buffer, req.file.mimetype, req.file.originalname);
      } catch (err) {
        content = `[File: ${req.file.originalname}]`;
      }

      const doc = await prisma.knowledgeDocument.create({
        data: {
          knowledgeBaseId: kbId,
          name: req.file.originalname,
          type: 'file',
          content,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
          status: content.length > 10 ? 'ready' : 'processing',
        },
      });

      // Process async if needed
      if (doc.status === 'processing') {
        setImmediate(() => processKnowledgeDocument(doc.id));
      }

      logger.info('Knowledge document uploaded', { docId: doc.id, chatbotId: req.params.chatbotId, size: req.file.size });

      sendSuccess(res, {
        id: doc.id, name: doc.name, type: doc.type, status: doc.status, fileSize: doc.fileSize,
      }, 201, 'File uploaded successfully');
    } catch (error) { next(error); }
  }
);

// POST /knowledge/:chatbotId/url - Add URL
router.post(
  '/:chatbotId/url',
  rateLimit('api'),
  verifyChatbot,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({ url: z.string().url(), name: z.string().max(200).optional() });
      const { url, name } = schema.parse(req.body);

      const orgPlan = (req as AuthenticatedRequest & { chatbot: { organization: { plan: string } } }).chatbot.organization.plan as keyof typeof PLAN_LIMITS;
      const limits = PLAN_LIMITS[orgPlan];
      const kbId = await ensureKnowledgeBase(req.params.chatbotId);
      const docCount = await prisma.knowledgeDocument.count({ where: { knowledgeBaseId: kbId } });

      if (docCount >= limits.knowledgeDocuments) {
        throw new PlanLimitError('knowledge documents');
      }

      // Create doc in processing state
      const doc = await prisma.knowledgeDocument.create({
        data: {
          knowledgeBaseId: kbId,
          name: name || url,
          type: 'url',
          content: '',
          sourceUrl: url,
          status: 'processing',
        },
      });

      // Crawl URL in background
      setImmediate(() => processKnowledgeDocument(doc.id));

      sendSuccess(res, { id: doc.id, name: doc.name, type: doc.type, status: doc.status, sourceUrl: doc.sourceUrl }, 201, 'URL added and processing');
    } catch (error) { next(error); }
  }
);

// POST /knowledge/:chatbotId/text - Add raw text
router.post(
  '/:chatbotId/text',
  rateLimit('api'),
  verifyChatbot,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({ name: z.string().min(1).max(200), content: z.string().min(10).max(50000) });
      const { name, content } = schema.parse(req.body);

      const orgPlan = (req as AuthenticatedRequest & { chatbot: { organization: { plan: string } } }).chatbot.organization.plan as keyof typeof PLAN_LIMITS;
      const limits = PLAN_LIMITS[orgPlan];
      const kbId = await ensureKnowledgeBase(req.params.chatbotId);
      const docCount = await prisma.knowledgeDocument.count({ where: { knowledgeBaseId: kbId } });

      if (docCount >= limits.knowledgeDocuments) throw new PlanLimitError('knowledge documents');

      const doc = await prisma.knowledgeDocument.create({
        data: { knowledgeBaseId: kbId, name, type: 'text', content, status: 'ready' },
      });

      sendSuccess(res, { id: doc.id, name: doc.name, status: doc.status }, 201, 'Text document added');
    } catch (error) { next(error); }
  }
);

// DELETE /knowledge/:chatbotId/documents/:docId
router.delete(
  '/:chatbotId/documents/:docId',
  rateLimit('api'),
  verifyChatbot,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const kbId = (await prisma.knowledgeBase.findUnique({ where: { chatbotId: req.params.chatbotId } }))?.id;
      if (!kbId) throw new NotFoundError('Knowledge base');

      const doc = await prisma.knowledgeDocument.findFirst({ where: { id: req.params.docId, knowledgeBaseId: kbId } });
      if (!doc) throw new NotFoundError('Document');

      await prisma.knowledgeDocument.delete({ where: { id: doc.id } });
      sendSuccess(res, null, 200, 'Document deleted');
    } catch (error) { next(error); }
  }
);

// POST /knowledge/:chatbotId/documents/:docId/reprocess
router.post(
  '/:chatbotId/documents/:docId/reprocess',
  rateLimit('api'),
  verifyChatbot,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const kbId = (await prisma.knowledgeBase.findUnique({ where: { chatbotId: req.params.chatbotId } }))?.id;
      if (!kbId) throw new NotFoundError('Knowledge base');
      const doc = await prisma.knowledgeDocument.findFirst({ where: { id: req.params.docId, knowledgeBaseId: kbId } });
      if (!doc) throw new NotFoundError('Document');
      setImmediate(() => processKnowledgeDocument(doc.id));
      sendSuccess(res, null, 200, 'Reprocessing started');
    } catch (error) { next(error); }
  }
);

export default router;
