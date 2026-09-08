import type { Role } from "./roles";
import type { SessionUser } from "./auth";

/** ERP nav + capability matrix */
export const permissions = {
  dashboard: ["HQ_ADMIN", "BRANCH_MANAGER", "CASHIER"] as Role[],
  pos: ["HQ_ADMIN", "BRANCH_MANAGER", "CASHIER"] as Role[],
  products: ["HQ_ADMIN", "BRANCH_MANAGER"] as Role[],
  inventory: ["HQ_ADMIN", "BRANCH_MANAGER"] as Role[],
  transfers: ["HQ_ADMIN", "BRANCH_MANAGER"] as Role[],
  purchases: ["HQ_ADMIN", "BRANCH_MANAGER"] as Role[],
  production: ["HQ_ADMIN", "BRANCH_MANAGER"] as Role[],
  wastage: ["HQ_ADMIN", "BRANCH_MANAGER"] as Role[],
  orders: ["HQ_ADMIN", "BRANCH_MANAGER", "CASHIER"] as Role[],
  reports: ["HQ_ADMIN", "BRANCH_MANAGER"] as Role[],
  branches: ["HQ_ADMIN"] as Role[],
  dayClose: ["HQ_ADMIN", "BRANCH_MANAGER", "CASHIER"] as Role[],
  audit: ["HQ_ADMIN"] as Role[],
  voidSale: ["HQ_ADMIN", "BRANCH_MANAGER"] as Role[],
  adjustStock: ["HQ_ADMIN", "BRANCH_MANAGER"] as Role[],
  costing: ["HQ_ADMIN", "BRANCH_MANAGER"] as Role[],
  reorder: ["HQ_ADMIN", "BRANCH_MANAGER"] as Role[],
};

export function can(role: Role, capability: keyof typeof permissions) {
  return permissions[capability].includes(role);
}

export function assertBranchAccess(user: SessionUser, branchId: string) {
  if (user.role === "HQ_ADMIN") return;
  if (user.branchId !== branchId) {
    throw new Error("FORBIDDEN_BRANCH");
  }
}

export function whatsappOrderLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("0") ? `92${digits.slice(1)}` : digits;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "COMPLETED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_FLOW: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  // legacy
  ACCEPTED: ["PREPARING", "READY", "CANCELLED"],
};
