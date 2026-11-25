import type { Request, Response, NextFunction } from 'express';
import { getDb } from '../database/connection';

const MUTATIONS = ['POST', 'PUT', 'PATCH', 'DELETE'];
// Lecturas de PHI que deben quedar auditadas (incluidos intentos denegados → 404)
const AUDITED_READS = /^\/api\/(alerts|health-metrics)\//;
const SENSITIVE_KEYS = new Set(['password', 'password_hash', 'token']);

function redact(body: unknown): unknown {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  const copy: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    copy[k] = SENSITIVE_KEYS.has(k) ? '[REDACTED]' : v;
  }
  return copy;
}

/**
 * Extrae recurso e id de la URL original. Se usa originalUrl porque dentro de un
 * router montado req.path ya no incluye el prefijo (/api/alerts/5 → /5).
 */
export function parseAuditTarget(originalUrl: string): { path: string; resource: string; resourceId: number | null } {
  const path = originalUrl.split('?')[0];
  const parts = path.split('/').filter(Boolean);
  const offset = parts[0] === 'api' ? 1 : 0;
  const resource = parts[offset] || 'unknown';
  const idPart = parts[offset + 1];
  const resourceId = idPart && /^\d+$/.test(idPart) ? parseInt(idPart, 10) : null;
  return { path, resource, resourceId };
}

export function auditLogger(req: Request, res: Response, next: NextFunction): void {
  const originalSend = res.json.bind(res);

  res.json = function (body: unknown) {
    const isMutation = MUTATIONS.includes(req.method) && res.statusCode < 400;
    const isAuditedRead =
      req.method === 'GET' &&
      AUDITED_READS.test(req.originalUrl) &&
      (res.statusCode < 400 || res.statusCode === 404);

    if (isMutation || isAuditedRead) {
      try {
        const db = getDb();
        const { path, resource, resourceId } = parseAuditTarget(req.originalUrl);
        const details = isMutation
          ? { path, body: redact(req.body) }
          : { path, status: res.statusCode };

        db.prepare(`
          INSERT INTO audit_log (user_id, action, resource, resource_id, details, ip_address)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          req.user?.userId ?? null,
          req.method,
          resource,
          resourceId,
          JSON.stringify(details),
          req.ip || req.socket.remoteAddress || null
        );
      } catch {
        // No interrumpir la respuesta por errores de audit
      }
    }
    return originalSend(body);
  };

  next();
}
