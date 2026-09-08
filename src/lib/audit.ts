import type { SessionUser } from "./auth";
import type { Role } from "./roles";
import { prisma } from "./prisma";

export async function writeAudit(input: {
  actor?: SessionUser | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  branchId?: string | null;
  summary: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actor?.id || null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId || null,
        branchId: input.branchId || input.actor?.branchId || null,
        summary: input.summary,
        meta: input.meta ? JSON.stringify(input.meta) : null,
      },
    });
  } catch {
    /* never block business flow on audit failure */
  }
}
