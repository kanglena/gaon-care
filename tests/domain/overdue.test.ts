import { describe, expect, it } from "vitest";
import { getDueDate, getOverdueDays, isDueWindow, isOverdueRental, shouldAutoBlacklist } from "@/domain/overdue";

// All KST examples: KST = UTC+9
// Borrowed Mon 2026-06-01 10:00 KST → dueDate = Thu 2026-06-04 00:00 KST = Wed 2026-06-03 15:00 UTC

describe("getDueDate", () => {
  it("returns midnight KST 3 calendar days after borrow date", () => {
    const due = getDueDate("2026-06-01T01:00:00.000Z"); // 10:00 KST
    expect(due.toISOString()).toBe("2026-06-03T15:00:00.000Z");
  });

  it("uses the KST calendar date, not UTC date", () => {
    const due = getDueDate("2026-06-01T15:30:00.000Z");
    expect(due.toISOString()).toBe("2026-06-04T15:00:00.000Z");
  });

  it("handles month overflow correctly (Jun 30 + 3 days = Jul 3)", () => {
    const due = getDueDate("2026-06-30T01:00:00.000Z"); // Jun 30 10:00 KST
    expect(due.toISOString()).toBe("2026-07-02T15:00:00.000Z");
  });
});

// B-2: the due date itself is a grace/warning day. Overdue begins at the NEXT
// KST midnight (due date + 1 day). Borrowed Jun 1 10:00 KST → dueDate Jun 4 00:00
// KST; Jun 4 is "due today" (warning), overdue starts Jun 5 00:00 KST.
describe("isOverdueRental", () => {
  it("is not overdue 1 second before due date midnight KST", () => {
    expect(isOverdueRental("2026-06-01T01:00:00.000Z", "2026-06-03T14:59:59.000Z")).toBe(false);
  });

  it("is NOT overdue at exactly due date midnight KST (due-day is a warning, not overdue)", () => {
    expect(isOverdueRental("2026-06-01T01:00:00.000Z", "2026-06-03T15:00:00.000Z")).toBe(false);
  });

  it("is NOT overdue 1 second before the day after due date (still within due-day window)", () => {
    expect(isOverdueRental("2026-06-01T01:00:00.000Z", "2026-06-04T14:59:59.000Z")).toBe(false);
  });

  it("is overdue at exactly midnight KST the day after due date", () => {
    expect(isOverdueRental("2026-06-01T01:00:00.000Z", "2026-06-04T15:00:00.000Z")).toBe(true);
  });

  it("is overdue 1 week after due date", () => {
    expect(isOverdueRental("2026-06-01T01:00:00.000Z", "2026-06-10T01:00:00.000Z")).toBe(true);
  });
});

// isDueWindow marks the warning day: [dueDate, dueDate + 1 day).
describe("isDueWindow", () => {
  it("is false before due date midnight KST", () => {
    expect(isDueWindow("2026-06-01T01:00:00.000Z", "2026-06-03T14:59:59.000Z")).toBe(false);
  });

  it("is true at exactly due date midnight KST", () => {
    expect(isDueWindow("2026-06-01T01:00:00.000Z", "2026-06-03T15:00:00.000Z")).toBe(true);
  });

  it("is true 1 second before the day after due date", () => {
    expect(isDueWindow("2026-06-01T01:00:00.000Z", "2026-06-04T14:59:59.000Z")).toBe(true);
  });

  it("is false once overdue (at midnight KST the day after due date)", () => {
    expect(isDueWindow("2026-06-01T01:00:00.000Z", "2026-06-04T15:00:00.000Z")).toBe(false);
  });

  it("is false long after the due date", () => {
    expect(isDueWindow("2026-06-01T01:00:00.000Z", "2026-06-10T01:00:00.000Z")).toBe(false);
  });
});

describe("getOverdueDays", () => {
  it("returns 0 when not yet overdue", () => {
    expect(getOverdueDays("2026-06-01T01:00:00.000Z", "2026-06-03T14:00:00.000Z")).toBe(0);
  });

  it("returns 1 when 1 day past due date", () => {
    expect(getOverdueDays("2026-06-01T01:00:00.000Z", "2026-06-04T15:00:00.000Z")).toBe(1);
  });

  it("returns 7 when 7 days past due date", () => {
    expect(getOverdueDays("2026-06-01T01:00:00.000Z", "2026-06-10T15:00:00.000Z")).toBe(7);
  });

  it("returns 8 when 8 days past due date", () => {
    expect(getOverdueDays("2026-06-01T01:00:00.000Z", "2026-06-11T15:00:00.000Z")).toBe(8);
  });
});

describe("shouldAutoBlacklist", () => {
  it("returns false when exactly 7 overdue days (threshold is >7, not >=7)", () => {
    expect(shouldAutoBlacklist("2026-06-01T01:00:00.000Z", "2026-06-10T15:00:00.000Z")).toBe(false);
  });

  it("returns true when 8 overdue days", () => {
    expect(shouldAutoBlacklist("2026-06-01T01:00:00.000Z", "2026-06-11T15:00:00.000Z")).toBe(true);
  });

  it("returns false when not overdue at all", () => {
    expect(shouldAutoBlacklist("2026-06-01T01:00:00.000Z", "2026-06-02T01:00:00.000Z")).toBe(false);
  });
});
