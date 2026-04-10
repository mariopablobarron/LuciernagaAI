import { getPrismaClient } from "@/db/prisma";

type AuditEntry = {
  actorId: string;
  actorType: "user" | "admin" | "orgAdmin" | "system";
  action: "read" | "create" | "update" | "delete" | "export" | "login";
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
};

/**
 * Record an audit log entry. Fire-and-forget — never throws.
 */
export function audit(entry: AuditEntry): void {
  const prisma = getPrismaClient();
  prisma.auditLog.create({
    data: {
      actorId: entry.actorId,
      actorType: entry.actorType,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId ?? null,
      metadata: entry.metadata ? JSON.parse(JSON.stringify(entry.metadata)) : undefined,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
    },
  }).catch(() => {
    // Never let audit failures break the app
  });
}
