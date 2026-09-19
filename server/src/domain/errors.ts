/**
 * server/src/domain/errors.ts
 *
 * DomainError — typed error class for all domain rule violations.
 * Codes map to HTTP status codes at the route layer.
 */

import type { DomainErrorCode } from '@getitdone/shared/types.js';

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}
