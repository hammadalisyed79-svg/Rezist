import type { Role } from "./roles";
import type { SessionUser } from "./auth";

export function canAccessHQ(role: Role) {
  return role === "HQ_ADMIN";
}

export function canManageBranch(user: SessionUser, branchId: string) {
  if (user.role === "HQ_ADMIN") return true;
  return user.branchId === branchId;
}

export function resolveBranchScope(user: SessionUser, requestedBranchId?: string | null) {
  if (user.role === "HQ_ADMIN") return requestedBranchId || null;
  return user.branchId;
}

export function formatPKR(amount: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function nextDocNo(prefix: string, seq: number) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${prefix}-${ymd}-${String(seq).padStart(4, "0")}`;
}
