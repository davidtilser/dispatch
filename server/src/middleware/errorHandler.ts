/**
 * server/src/middleware/errorHandler.ts
 *
 * Central error handler.
 * - Sends a generic {error:{code,message}} response to the client.
 * - Prints full error details to the console (server-side only).
 */

import type { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  // Express requires 4-arg signature for error handlers
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500;
  const code = err.code ?? 'INTERNAL_ERROR';

  // Full details go to the server console only — never to the client
  console.error(`[error] ${req.method} ${req.path} → ${statusCode} ${code}`, err);

  // Generic message to the client
  res.status(statusCode).json({
    error: {
      code,
      message: statusCode >= 500
        ? 'An internal error occurred.'
        : (err.message || 'Request error.'),
    },
  });
}
