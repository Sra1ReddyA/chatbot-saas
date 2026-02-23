import winston from 'winston';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const isProduction = process.env.NODE_ENV === 'production';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'chatbot-saas-api' },
  transports: [
    new winston.transports.Console({
      format: isProduction ? combine(timestamp(), json()) : combine(colorize(), simple()),
      silent: process.env.NODE_ENV === 'test',
    }),
  ],
});

if (isProduction) {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    })
  );
}

export function logRequest(req: { method: string; path: string; ip?: string; userId?: string }) {
  logger.info('HTTP Request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: req.userId,
  });
}

export function logError(error: unknown, context?: Record<string, unknown>) {
  if (error instanceof Error) {
    logger.error(error.message, {
      stack: error.stack,
      name: error.name,
      ...context,
    });
  } else {
    logger.error('Unknown error', { error, ...context });
  }
}
