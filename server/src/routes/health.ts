/**
 * server/src/routes/health.ts
 *
 * GET /api/health — returns {ok:true}.
 * Used by the client to verify server connectivity.
 */

import { Router } from 'express';
import type { HealthResponse } from '@getitdone/shared';

const router = Router();

router.get('/', (_req, res) => {
  const body: HealthResponse = { ok: true };
  res.json(body);
});

export default router;
