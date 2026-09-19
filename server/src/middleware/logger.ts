/**
 * server/src/middleware/logger.ts
 *
 * Request logger: logs METHOD PATH STATUS only.
 * Never logs bodies, cookies, query strings, or headers.
 *
 * Uses req.originalUrl (not req.path/req.url) because Express mutates
 * req.url as a request descends into a mounted sub-router, and never
 * restores it if the sub-router ends the response without calling
 * next() — req.path would then read back the router-relative path
 * (e.g. "/" instead of "/api/health"). req.originalUrl is left alone
 * by that mechanism, so it stays accurate. Its query string is still
 * stripped before logging.
 */

import type { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  res.on('finish', () => {
    // Log only: method, path (query string stripped), status
    const path = req.originalUrl.split('?')[0];
    console.log(`[req] ${req.method} ${path} ${res.statusCode}`);
  });
  next();
}
