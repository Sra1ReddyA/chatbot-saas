import { prisma } from '../config/database';
import { logger } from '../utils/logger';

// ─── TEXT EXTRACTION ──────────────────────────────────────────────────────────

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  try {
    if (mimeType === 'text/plain' || filename.endsWith('.txt') || filename.endsWith('.md')) {
      return buffer.toString('utf-8');
    }

    if (mimeType === 'application/json' || filename.endsWith('.json')) {
      const parsed = JSON.parse(buffer.toString('utf-8'));
      return JSON.stringify(parsed, null, 2);
    }

    if (mimeType === 'text/html' || filename.endsWith('.html') || filename.endsWith('.htm')) {
      return stripHtml(buffer.toString('utf-8'));
    }

    if (mimeType === 'text/csv' || filename.endsWith('.csv')) {
      return buffer.toString('utf-8');
    }

    // PDF extraction (basic - in production use pdf-parse or pdfjs-dist)
    if (mimeType === 'application/pdf') {
      try {
        // Dynamic import to avoid startup failure if not installed
        const pdfParse = await import('pdf-parse').catch(() => null);
        if (pdfParse) {
          const result = await pdfParse.default(buffer);
          return result.text;
        }
      } catch {
        logger.warn('pdf-parse not available, storing raw content reference');
      }
      return `[PDF file: ${filename}] - Install pdf-parse to extract text content.`;
    }

    // DOCX extraction
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        const mammoth = await import('mammoth').catch(() => null);
        if (mammoth) {
          const result = await mammoth.default.extractRawText({ buffer });
          return result.value;
        }
      } catch {
        logger.warn('mammoth not available for DOCX extraction');
      }
      return `[DOCX file: ${filename}]`;
    }

    throw new Error(`Unsupported file type: ${mimeType}`);
  } catch (error) {
    logger.error('Text extraction error', { filename, mimeType, error });
    throw error;
  }
}

// ─── URL CRAWLING ─────────────────────────────────────────────────────────────

export async function crawlUrl(url: string): Promise<{ title: string; content: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ChatBotBuilder/1.0 (Knowledge Base Crawler)',
        Accept: 'text/html,text/plain',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const html = await response.text();

    if (contentType.includes('text/html')) {
      const title = extractTitle(html);
      const content = stripHtml(html);
      return { title: title || url, content };
    }

    return { title: url, content: html };
  } finally {
    clearTimeout(timeout);
  }
}

// ─── HTML PROCESSING ──────────────────────────────────────────────────────────

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() : '';
}

function stripHtml(html: string): string {
  // Remove script and style blocks
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');

  // Convert structural elements to line breaks
  text = text
    .replace(/<\/?(h[1-6]|p|div|li|tr|br)[^>]*>/gi, '\n')
    .replace(/<\/?(ul|ol|table|thead|tbody)[^>]*>/gi, '\n');

  // Remove remaining tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');

  // Normalize whitespace
  text = text
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

// ─── KNOWLEDGE BASE OPERATIONS ───────────────────────────────────────────────

export async function processKnowledgeDocument(documentId: string): Promise<void> {
  logger.info('Processing knowledge document', { documentId });

  const doc = await prisma.knowledgeDocument.findUnique({
    where: { id: documentId },
    include: { knowledgeBase: true },
  });

  if (!doc) {
    logger.warn('Document not found for processing', { documentId });
    return;
  }

  try {
    await prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: { status: 'processing' },
    });

    let content = doc.content;

    // If URL type, crawl it
    if (doc.type === 'url' && doc.sourceUrl) {
      const { title, content: crawledContent } = await crawlUrl(doc.sourceUrl);
      content = crawledContent;
      await prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: { name: doc.name || title, content },
      });
    }

    // Validate content not empty
    if (!content || content.trim().length < 10) {
      throw new Error('Document has insufficient content');
    }

    // Mark as ready
    await prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: { status: 'ready', errorMsg: null },
    });

    logger.info('Document processed successfully', { documentId, contentLength: content.length });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Processing failed';
    logger.error('Document processing failed', { documentId, error: errorMsg });

    await prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: { status: 'error', errorMsg },
    });
  }
}

export async function ensureKnowledgeBase(chatbotId: string): Promise<string> {
  let kb = await prisma.knowledgeBase.findUnique({ where: { chatbotId } });
  if (!kb) {
    kb = await prisma.knowledgeBase.create({ data: { chatbotId } });
  }
  return kb.id;
}
