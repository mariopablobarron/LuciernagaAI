/**
 * Role-Based Access Control (RBAC) — permission matrix for admin panel.
 *
 * Each permission string follows the pattern "resource" or "resource:action".
 * The wildcard "*" grants unrestricted access (superadmin only).
 */

import type { SystemRole } from "@prisma/client";

// ─── Permission definitions ──────────────────────────────────────────────────

export const PERMISSIONS: Record<SystemRole, string[]> = {
  superadmin: ["*"],

  admin: [
    "dashboard",
    "analytics",
    "audit",
    "crisis",
    "crm",
    "operations",
    "research",
    "status",
    "docs",
    "users:read",
    "users:update",
    "users:delete",
    "users:change-plan",
    "users:reset-password",
    "users:send-email",
    "users:export-pdf",
    "users:emotional-history",
    "users:tag",
    "conversations:read",
    "insights:read",
    "retention",
    "notifications",
    "tasks",
    "telegram:stats",
    "telegram:usuarios",
    "telegram:crisis",
    "telegram:retencion",
    "telegram:estado",
    "telegram:tareas",
    "telegram:chat",
  ],

  clinical: [
    "dashboard:read",
    "crisis",
    "research",
    "docs",
    "users:read",
    "users:export-pdf",
    "users:emotional-history",
    "conversations:read",
    "insights:read",
    "clinical:read",
    "clinical:write",
    "clinical-notes",
    "interventions",
    "assessments",
    "telegram:crisis",
    "telegram:estado",
  ],

  marketing: [
    "analytics",
    "crm",
    "retention",
    "docs",
    "marketing:broadcast",
    "marketing:campaign",
    "marketing:metrics",
    "marketing:history",
    "marketing:segments",
    "marketing:avatar_videos",
    "marketing:site_content",
    "marketing:referrals",
    "notifications",
    "users:send-email",
    "users:tag",
    "telegram:stats",
    "telegram:retencion",
  ],

  support: [
    "crisis",
    "docs",
    "users:read",
    "users:reset-password",
    "users:send-email",
    "conversations:read",
    "telegram:usuarios",
    "telegram:crisis",
  ],

  content: [
    "journeys",
    "exercises",
    "challenges",
    "resources",
    "docs",
  ],

  ops: [
    "dashboard:read",
    "analytics",
    "audit",
    "operations",
    "status",
    "docs",
    "llm-usage",
    "backup",
    "insights:read",
    "tasks",
    "telegram:stats",
    "telegram:tareas",
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Check if a role has a specific permission.
 * Superadmin ("*") passes every check.
 */
export function hasPermission(role: SystemRole, permission: string): boolean {
  const perms = PERMISSIONS[role];
  if (!perms) return false;
  if (perms.includes("*")) return true;
  if (perms.includes(permission)) return true;

  // Check base resource — e.g. "users:read" is covered by "users" permission
  const base = permission.split(":")[0];
  return perms.includes(base);
}

/**
 * Check if a role has ANY of the given permissions.
 */
export function hasAnyPermission(role: SystemRole, permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Returns all permissions for a role (resolved, no wildcards).
 */
export function getEffectivePermissions(role: SystemRole): string[] {
  const perms = PERMISSIONS[role];
  if (!perms) return [];
  if (perms.includes("*")) return ["*"];
  return [...perms];
}
