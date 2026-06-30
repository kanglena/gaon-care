import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_COOKIE_NAME } from "@/lib/auth/admin";

const ADMIN_TOKEN = "test-admin-token";

function mockAdminCookie(token: string | undefined = ADMIN_TOKEN) {
  vi.doMock("next/headers", () => ({
    cookies: async () => ({
      get: (name: string) => (token && name === ADMIN_COOKIE_NAME ? { value: token } : undefined),
    }),
  }));
}

function mockNextLink() {
  vi.doMock("next/link", () => ({
    default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
  }));
}

describe("BO dashboard page", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockAdminCookie();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("renders metrics, read-only overdue list (red), and the 대여 현황 table — no blacklist section", async () => {
    // Jun 8 01:00 KST. r1 overdue(4일), r2 due-today, r3 normal.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-07T16:00:00.000Z"));

    const data = {
      counts: { total: 28, available: 24, borrowed: 3, overdue: 1, damaged: 1 },
      activeRentals: [
        { id: "r1", umbrella_id: "umb-2", student_id: "10507", borrowed_at: "2026-06-01T01:00:00.000Z", returned_at: null, dueDate: "2026-06-03T15:00:00.000Z" },
        { id: "r2", umbrella_id: "umb-3", student_id: "20511", borrowed_at: "2026-06-05T01:00:00.000Z", returned_at: null, dueDate: "2026-06-07T15:00:00.000Z" },
        { id: "r3", umbrella_id: "umb-5", student_id: "30502", borrowed_at: "2026-06-06T01:00:00.000Z", returned_at: null, dueDate: "2026-06-08T15:00:00.000Z" },
      ],
      overdueRentals: [
        { id: "r1", umbrella_id: "umb-2", student_id: "10507", borrowed_at: "2026-06-01T01:00:00.000Z", returned_at: null, dueDate: "2026-06-03T15:00:00.000Z", overdueDays: 4 },
      ],
      blacklists: [],
    };
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data }));
    vi.stubGlobal("fetch", fetchMock);
    mockNextLink();

    const BoPage = (await import("@/app/bo/page")).default;
    const html = renderToStaticMarkup(await BoPage());

    expect(html).toContain("학생회 대시보드");
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/dashboard", {
      cache: "no-store",
      headers: { cookie: `${ADMIN_COOKIE_NAME}=${ADMIN_TOKEN}` },
    });
    expect(html).not.toContain("명찰");
    expect(html).toContain("전체 우산");
    expect(html).toContain("반납 기한 초과");

    // overdue>0 → 연체 메트릭 카드 강조(F10)
    expect(html).toContain("border-amber-300");

    // read-only overdue list: labels(F6), friendly numbers, NO 정지 처리, NO blacklist section
    expect(html).toContain("반납 기한 초과 목록");
    expect(html).toContain("우산 번호");
    expect(html).toContain("반납예정일");
    expect(html).not.toContain("정지 처리");
    expect(html).not.toContain("블랙리스트");
    expect(html).not.toContain("umb-");

    // 대여 현황 table
    expect(html).toContain("대여 현황");
    expect(html).toContain("오늘까지");
    expect(html).toContain("bg-red-50/30");
    expect(html).toContain("1학년");
    expect(html).toContain("2학년");
    expect(html).toContain("3학년");
    expect(html).toMatch(/10507[\s\S]*bg-yellow-50 text-yellow-700 ring-yellow-200[\s\S]*1학년/);
    expect(html).toContain("bg-indigo-50 text-indigo-700 ring-indigo-200");
    expect(html).toMatch(/30502[\s\S]*bg-emerald-50 text-emerald-700 ring-emerald-200[\s\S]*3학년/);

    // chip tallies after F1 (연체=red everywhere):
    // amber chip = active r2 due-state (1); teal chip = active r3 normal (1);
    // red chip = active r1 overdue + overdue-list r1 elapsed (2)
    expect((html.match(/bg-amber-100 text-amber-700/g) ?? []).length).toBe(1);
    expect((html.match(/bg-teal-100 text-teal-800/g) ?? []).length).toBe(1);
    expect((html.match(/bg-red-100 text-red-600/g) ?? []).length).toBe(2);
  });

  it("shows 정지 대상 badges on >7일 rows but no action button, sorted by overdue desc", async () => {
    const data = {
      counts: { total: 28, available: 25, borrowed: 3, overdue: 3, damaged: 0 },
      activeRentals: [],
      overdueRentals: [
        { id: "r1", umbrella_id: "umb-2", student_id: "10507", borrowed_at: "2026-06-01T00:00:00.000Z", returned_at: null, dueDate: "2026-06-03T15:00:00.000Z", overdueDays: 9 },
        { id: "r2", umbrella_id: "umb-3", student_id: "20511", borrowed_at: "2026-06-01T00:00:00.000Z", returned_at: null, dueDate: "2026-06-03T15:00:00.000Z", overdueDays: 10 },
        { id: "r3", umbrella_id: "umb-5", student_id: "30502", borrowed_at: "2026-06-05T00:00:00.000Z", returned_at: null, dueDate: "2026-06-07T15:00:00.000Z", overdueDays: 3 },
      ],
      blacklists: [],
    };
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: true, data })));
    mockNextLink();

    const BoPage = (await import("@/app/bo/page")).default;
    const html = renderToStaticMarkup(await BoPage());

    // both >7 rows get the badge; ≤7 does not; no action, no blacklist section
    expect((html.match(/정지 대상/g) ?? []).length).toBe(2);
    expect(html).not.toContain("정지 처리");
    expect(html).not.toContain("정지됨");
    expect(html).not.toContain("블랙리스트");

    // sorted desc → 10일 초과 appears before 9일 초과
    const idx10 = html.indexOf("10일 초과");
    const idx9 = html.indexOf("9일 초과");
    expect(idx10).toBeGreaterThan(-1);
    expect(idx9).toBeGreaterThan(idx10);
  });

  it("renders the API error message when the dashboard returns {ok:false}", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      Response.json({ ok: false, code: "dashboard_rentals_failed", message: "대여 현황을 불러오지 못했습니다." }),
    ));
    mockNextLink();

    const BoPage = (await import("@/app/bo/page")).default;
    const html = renderToStaticMarkup(await BoPage());

    expect(html).toContain("대여 현황을 불러오지 못했습니다.");
  });

  it("renders a fallback error message when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network error"); }));
    mockNextLink();

    const BoPage = (await import("@/app/bo/page")).default;
    const html = renderToStaticMarkup(await BoPage());

    expect(html).toContain("대시보드를 불러오지 못했습니다.");
  });
});
