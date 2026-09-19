/**
 * server/src/app.ts
 *
 * Express app factory — pure setup, no listening.
 * Keeps app.ts testable and separates concerns from index.ts.
 */

import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { requestLogger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';

export function createApp(): express.Express {
  const app = express();

  // ── Security headers ─────────────────────────────────────────────────────
  app.use(helmet());

  // ── Rate limiting (global) ────────────────────────────────────────────────
  app.use(
    rateLimit({
      windowMs: 60_000, // 1 minute
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: { code: 'RATE_LIMITED', message: 'Too many requests.' } },
    }),
  );

  // ── Body parsing with 10 kb limit ────────────────────────────────────────
  app.use(express.json({ limit: '10kb' }));

  // ── Request logger (method/path/status only) ──────────────────────────────
  app.use(requestLogger);

  // ── Routes ────────────────────────────────────────────────────────────────
  app.use('/api/health', healthRouter);

  // ── 404 handler ───────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });
  });

  // ── Central error handler (must be last) ─────────────────────────────────
  app.use(errorHandler);

  return app;
}
