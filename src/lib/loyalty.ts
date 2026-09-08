/** Loyalty tiers and redeem rules (company-owned CRM deep — Phase 5). */

export type LoyaltyTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

export const LOYALTY_TIERS: {
  tier: LoyaltyTier;
  minPoints: number;
  label: string;
  earnBonus: number; // extra % earn
}[] = [
  { tier: "BRONZE", minPoints: 0, label: "Bronze", earnBonus: 0 },
  { tier: "SILVER", minPoints: 50, label: "Silver", earnBonus: 0.1 },
  { tier: "GOLD", minPoints: 150, label: "Gold", earnBonus: 0.2 },
  { tier: "PLATINUM", minPoints: 400, label: "Platinum", earnBonus: 0.35 },
];

/** Rs 100 spent = 1 base point */
export const POINTS_PER_RS100 = 1;
/** 1 point redeems as Rs 1 off */
export const REDEEM_VALUE_PKR = 1;
/** Cap redeem at 20% of subtotal */
export const MAX_REDEEM_PCT = 0.2;

export function getLoyaltyTier(points: number): (typeof LOYALTY_TIERS)[number] {
  let current = LOYALTY_TIERS[0];
  for (const t of LOYALTY_TIERS) {
    if (points >= t.minPoints) current = t;
  }
  return current;
}

export function earnPoints(orderTotal: number, currentPoints: number) {
  const base = Math.floor(orderTotal / 100) * POINTS_PER_RS100;
  const tier = getLoyaltyTier(currentPoints);
  return Math.max(0, Math.round(base * (1 + tier.earnBonus)));
}

export function maxRedeemable(subtotal: number, availablePoints: number) {
  const cap = Math.floor(subtotal * MAX_REDEEM_PCT);
  return Math.max(0, Math.min(availablePoints, cap));
}

export function redeemDiscountPkr(points: number) {
  return points * REDEEM_VALUE_PKR;
}

/** Birthdays in the next N days (month/day match, ignore year). */
export function isBirthdaySoon(birthday: Date | string | null | undefined, withinDays = 14) {
  if (!birthday) return false;
  const b = new Date(birthday);
  if (Number.isNaN(b.getTime())) return false;
  const now = new Date();
  const thisYear = new Date(now.getFullYear(), b.getMonth(), b.getDate());
  if (thisYear < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    thisYear.setFullYear(thisYear.getFullYear() + 1);
  }
  const diff = (thisYear.getTime() - now.getTime()) / 86400000;
  return diff >= 0 && diff <= withinDays;
}
