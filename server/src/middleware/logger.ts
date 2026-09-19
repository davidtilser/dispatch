/**
 * server/src/middleware/logger.ts
 *
 * Request logger: logs METHOD PATH STATUS only.
 * Never logs bodies, cookies, query strings, or headers.
 */

import type { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  res.on('finish', () => {
    // Log only: method, path (no query string), status
    console.log(`[req] ${req.method} ${req.path} ${res.statusCode}`);
  });
  next();
}
