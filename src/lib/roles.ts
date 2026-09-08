export type Role = "HQ_ADMIN" | "BRANCH_MANAGER" | "CASHIER";
export type BranchType = "RETAIL" | "WAREHOUSE" | "CENTRAL_KITCHEN";
export type ProductType = "RAW" | "FINISHED" | "SEMI";

export const Role = {
  HQ_ADMIN: "HQ_ADMIN",
  BRANCH_MANAGER: "BRANCH_MANAGER",
  CASHIER: "CASHIER",
} as const;

export const BranchType = {
  RETAIL: "RETAIL",
  WAREHOUSE: "WAREHOUSE",
  CENTRAL_KITCHEN: "CENTRAL_KITCHEN",
} as const;

export const ProductType = {
  RAW: "RAW",
  FINISHED: "FINISHED",
  SEMI: "SEMI",
} as const;
