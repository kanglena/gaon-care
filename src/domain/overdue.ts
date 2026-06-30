const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function getDueDate(borrowedAt: string): Date {
  const borrowedMs = new Date(borrowedAt).getTime();
  // Shift to KST to extract the calendar date
  const kstMs = borrowedMs + KST_OFFSET_MS;
  const kstDate = new Date(kstMs);
  const year = kstDate.getUTCFullYear();
  const month = kstDate.getUTCMonth(); // 0-indexed
  const day = kstDate.getUTCDate();

  // Add 3 calendar days, then express as KST midnight (= UTC midnight - 9h)
  const dueDayMs = Date.UTC(year, month, day + 3); // JS handles month overflow
  return new Date(dueDayMs - KST_OFFSET_MS);
}

// The due date itself is a grace/warning day; a rental only becomes overdue at
// the next KST midnight (due date + 1 day).
export function isOverdueRental(borrowedAt: string, now: string): boolean {
  return new Date(now).getTime() >= getDueDate(borrowedAt).getTime() + DAY_MS;
}

// True during the warning window [dueDate, dueDate + 1 day) — "due today".
export function isDueWindow(borrowedAt: string, now: string): boolean {
  const nowMs = new Date(now).getTime();
  const dueMs = getDueDate(borrowedAt).getTime();
  return nowMs >= dueMs && nowMs < dueMs + DAY_MS;
}

export function getOverdueDays(borrowedAt: string, now: string): number {
  const dueMs = getDueDate(borrowedAt).getTime();
  const nowMs = new Date(now).getTime();
  if (nowMs <= dueMs) return 0;
  return Math.floor((nowMs - dueMs) / DAY_MS);
}

export function shouldAutoBlacklist(borrowedAt: string, returnedAt: string): boolean {
  return getOverdueDays(borrowedAt, returnedAt) > 7;
}
