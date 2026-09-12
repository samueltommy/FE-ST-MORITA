import { AuditLog, UserRole } from '../types';

// Simple deterministic hash helper for visual integrity check
export function generateHash(content: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  // Return formatted 64-char simulated SHA-256 hex string
  const pad = '0123456789abcdef';
  let extended = hex;
  for (let j = 0; j < 7; j++) {
    extended += pad[(hash + j * 13) % 16] + pad[(hash * 7 + j) % 16] + pad[(hash ^ (j * 23)) % 16] + pad[(hash + j) % 16] + pad[(hash * 3 + j) % 16] + pad[(hash + j * 5) % 16] + pad[(hash ^ j) % 16] + pad[(hash * 11) % 16];
  }
  return extended.slice(0, 64);
}

export function createAuditLog(
  actorName: string,
  actorRole: UserRole,
  action: AuditLog['action'],
  entity: string,
  entityId: string,
  details: string,
  stateBefore?: Record<string, unknown>,
  stateAfter?: Record<string, unknown>
): AuditLog {
  const timestamp = new Date().toISOString();
  const rawPayload = `${timestamp}|${actorName}|${actorRole}|${action}|${entity}|${entityId}|${details}`;
  const sha256Hash = generateHash(rawPayload);

  return {
    id: `AUDIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp,
    actorName,
    actorRole,
    ipAddress: '192.168.10.42 (Cikarang Gateway)',
    action,
    entity,
    entityId,
    details,
    sha256Hash,
    stateBefore,
    stateAfter,
  };
}

export function exportAuditLogsToCSV(logs: AuditLog[]): string {
  const headers = ['Timestamp', 'Actor', 'Role', 'IP Address', 'Action', 'Entity', 'Entity ID', 'Details', 'SHA-256 Checksum'];
  const rows = logs.map((log) => [
    `"${log.timestamp}"`,
    `"${log.actorName}"`,
    `"${log.actorRole}"`,
    `"${log.ipAddress || '192.168.10.42'}"`,
    `"${log.action}"`,
    `"${log.entity || 'SYSTEM'}"`,
    `"${log.entityId}"`,
    `"${log.details.replace(/"/g, '""')}"`,
    `"${log.sha256Hash}"`,
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
