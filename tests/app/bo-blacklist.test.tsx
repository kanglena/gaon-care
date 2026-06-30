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

function mockBlacklistReleaseButton() {
  vi.doMock("@/app/bo/BlacklistReleaseButton", () => ({
    default: ({ blacklistId }: { blacklistId: string }) => <button data-id={blacklistId}>해제</button>,
  }));
}

const EMPTY = { total: 28, available: 28, borrowed: 0, overdue: 0, damaged: 0 };

describe("BO blacklist hub page", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockAdminCookie();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("lists >7일 정지 대상 (정지 처리) and 정지됨 (해제), excluding ≤7일", async () => {
    const data = {
      counts: { total: 28, available: 25, borrowed: 3, overdue: 3, damaged: 0 },
      activeRentals: [],
      overdueRentals: [
        { id: "r1", umbrella_id: "umb-2", student_id: "10507", borrowed_at: "2026-06-01T00:00:00.000Z", returned_at: null, dueDate: "2026-06-03T15:00:00.000Z", overdueDays: 9 },
        { id: "r2", umbrella_id: "umb-3", student_id: "20511", borrowed_at: "2026-06-01T00:00:00.000Z", returned_at: null, dueDate: "2026-06-03T15:00:00.000Z", overdueDays: 10 },
        { id: "r3", umbrella_id: "umb-5", student_id: "30502", borrowed_at: "2026-06-05T00:00:00.000Z", returned_at: null, dueDate: "2026-06-07T15:00:00.000Z", overdueDays: 3 },
      ],
      blacklists: [
        { id: "bl-1", student_id: "20511", reason: "umb-3 10일 연체 (미반납)", starts_at: "2026-06-11T00:00:00.000Z", until: "2026-06-25T00:00:00.000Z" },
      ],
    };
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data }));
    vi.stubGlobal("fetch", fetchMock);
    mockBlacklistReleaseButton();

    const BlacklistPage = (await import("@/app/bo/blacklist/page")).default;
    const html = renderToStaticMarkup(await BlacklistPage());

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/dashboard", {
      cache: "no-store",
      headers: { cookie: `${ADMIN_COOKIE_NAME}=${ADMIN_TOKEN}` },
    });
    expect(html).toContain("정지 대상");
    expect(html).toContain("정지됨");
    // r1(9일, not blacklisted) → 정지 대상에 정지 처리 버튼; r2(10일, blacklisted)는
    // 정지 대상에서 제외되고 정지됨 섹션에만 나타남; r3(3일)은 ≤7이라 제외.
    // 따라서 "정지 처리"는 r1 1건, "정지됨"은 섹션 제목 1건뿐.
    expect((html.match(/정지 처리/g) ?? []).length).toBe(1);
    expect((html.match(/정지됨/g) ?? []).length).toBe(1);
    expect(html).toContain("2번"); // r1 umbrella
    expect(html).not.toContain("5번"); // r3 ≤7 제외
    // 정지됨 섹션
    expect(html).toContain("20511");
    expect(html).toContain("umb-3 10일 연체 (미반납)");
    expect(html).toContain("해제");
  });

  it("shows both empty states when nothing is overdue or blacklisted", async () => {
    const data = { counts: EMPTY, activeRentals: [], overdueRentals: [], blacklists: [] };
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: true, data })));
    mockBlacklistReleaseButton();

    const BlacklistPage = (await import("@/app/bo/blacklist/page")).default;
    const html = renderToStaticMarkup(await BlacklistPage());

    expect(html).toContain("현재 정지 대상인 학생이 없습니다.");
    expect(html).toContain("현재 정지된 학생이 없습니다.");
  });

  it("renders the API error message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      Response.json({ ok: false, code: "err", message: "대시보드를 불러오지 못했습니다." }),
    ));
    mockBlacklistReleaseButton();

    const BlacklistPage = (await import("@/app/bo/blacklist/page")).default;
    const html = renderToStaticMarkup(await BlacklistPage());

    expect(html).toContain("대시보드를 불러오지 못했습니다.");
  });
});
