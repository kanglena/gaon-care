import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_COOKIE_NAME, signAdminToken } from "@/lib/auth/admin";

async function responseJson(response: Response) {
  return {
    status: response.status,
    body: await response.json(),
  };
}

async function loadUmbrellasRoute(supabase: unknown) {
  vi.doMock("@/lib/supabase/server", () => ({
    createSupabaseServiceClient: () => supabase,
  }));

  return await import("@/app/api/umbrellas/route");
}

async function loadDashboardRoute(supabase: unknown) {
  vi.doMock("@/lib/supabase/server", () => ({
    createSupabaseServiceClient: () => supabase,
  }));

  return await import("@/app/api/dashboard/route");
}

function mockCookies(token: string | undefined) {
  vi.doMock("next/headers", () => ({
    cookies: async () => ({
      get: (name: string) => (token && name === ADMIN_COOKIE_NAME ? { value: token } : undefined),
    }),
  }));
}

describe("dashboard and umbrella API routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.KIOSK_COOKIE_SECRET = "test-secret-for-unit-tests";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns 401 for umbrella inventory when the admin cookie is missing", async () => {
    mockCookies(undefined);
    const { GET } = await loadUmbrellasRoute({
      from: () => {
        throw new Error("supabase should not be touched without auth");
      },
    });

    const response = await GET();

    expect(await responseJson(response)).toEqual({
      status: 401,
      body: { ok: false, code: "unauthorized", message: "로그인이 필요합니다." },
    });
  });

  it("returns the umbrella inventory with the active borrower attached", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T03:00:00.000Z"));
    mockCookies(signAdminToken());

    const umbrellas = [
      { id: "umb-1", label: "1번 우산", qr_payload: "umb-1", status: "available", number: 1 },
      { id: "umb-2", label: "2번 우산", qr_payload: "umb-2", status: "borrowed", number: 2 },
    ];
    const rentals = [{ umbrella_id: "umb-2", student_id: "10507", borrowed_at: "2026-06-14T01:00:00.000Z" }];
    const supabase = {
      from: (table: string) => {
        if (table === "umbrellas") {
          return {
            select: (columns: string) => {
              expect(columns).toBe("id,label,qr_payload,status,number");
              return {
                is: (column: string, value: null) => {
                  expect(column).toBe("archived_at");
                  expect(value).toBeNull();
                  return {
                    order: async (orderColumn: string, options: { ascending: boolean }) => {
                      expect(orderColumn).toBe("number");
                      expect(options).toEqual({ ascending: true });
                      return { data: umbrellas, error: null };
                    },
                  };
                },
              };
            },
          };
        }
        if (table === "rentals") {
          return {
            select: (columns: string) => {
              expect(columns).toBe("umbrella_id,student_id,borrowed_at");
              return {
                is: (column: string, value: null) => {
                  expect(column).toBe("returned_at");
                  expect(value).toBeNull();
                  return Promise.resolve({ data: rentals, error: null });
                },
              };
            },
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    };
    const { GET } = await loadUmbrellasRoute(supabase);

    const response = await GET();

    expect(await responseJson(response)).toEqual({
      status: 200,
      body: {
        ok: true,
        data: {
          umbrellas: [
            { ...umbrellas[0], borrower: null, dueDate: null, dueDateLabel: null, dueBadgeLabel: null, dueTone: null },
            {
              ...umbrellas[1],
              borrower: "10507",
              dueDate: "2026-06-16T15:00:00.000Z",
              dueDateLabel: "6/17까지",
              dueBadgeLabel: "D-2",
              dueTone: "normal",
            },
          ],
        },
      },
    });
  });

  it("returns dashboard counts, active rentals, and overdue rentals", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-05T12:00:00.000Z"));
    mockCookies(signAdminToken());

    const umbrellas = [
      { id: "UMB-001", label: "1번 우산", status: "available" },
      { id: "UMB-002", label: "2번 우산", status: "borrowed" },
      { id: "UMB-003", label: "3번 우산", status: "borrowed" },
    ];
    const rentals = [
      {
        id: "rental-1",
        umbrella_id: "UMB-002",
        student_id: "10507",
        borrowed_at: "2026-06-01T12:00:00.000Z",
        returned_at: null,
      },
      {
        id: "rental-2",
        umbrella_id: "UMB-003",
        student_id: "20511",
        borrowed_at: "2026-06-04T12:00:00.000Z",
        returned_at: null,
      },
    ];
    const supabase = {
      from: (table: string) => {
        if (table === "umbrellas") {
          return {
            select: (columns: string) => {
              expect(columns).toBe("id,label,status");
              return {
                is: (column: string, value: null) => {
                  expect(column).toBe("archived_at");
                  expect(value).toBeNull();
                  return {
                    order: async (orderColumn: string, options: { ascending: boolean }) => {
                      expect(orderColumn).toBe("number");
                      expect(options).toEqual({ ascending: true });
                      return { data: umbrellas, error: null };
                    },
                  };
                },
              };
            },
          };
        }

        if (table === "rentals") {
          return {
            select: (columns: string) => {
              expect(columns).toBe("id,umbrella_id,student_id,borrowed_at,returned_at");
              return {
                is: (column: string, value: null) => {
                  expect(column).toBe("returned_at");
                  expect(value).toBeNull();
                  return {
                    order: async (orderColumn: string, options: { ascending: boolean }) => {
                      expect(orderColumn).toBe("borrowed_at");
                      expect(options).toEqual({ ascending: true });
                      return { data: rentals, error: null };
                    },
                  };
                },
              };
            },
          };
        }

        expect(table).toBe("blacklists");
        return {
          select: (columns: string) => {
            expect(columns).toBe("id,student_id,reason,starts_at,until");
            return {
              is: (column: string, value: null) => {
                expect(column).toBe("released_at");
                expect(value).toBeNull();
                return {
                  gt: (gtColumn: string) => {
                    expect(gtColumn).toBe("until");
                    return {
                      order: async (orderColumn: string, options: { ascending: boolean }) => {
                        expect(orderColumn).toBe("starts_at");
                        expect(options).toEqual({ ascending: false });
                        return { data: [], error: null };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      },
    };
    const { GET } = await loadDashboardRoute(supabase);

    const response = await GET();

    expect(await responseJson(response)).toEqual({
      status: 200,
      body: {
        ok: true,
        data: {
          counts: {
            total: 3,
            available: 1,
            borrowed: 2,
            overdue: 1,
            damaged: 0,
          },
          activeRentals: [
            { ...rentals[0], dueDate: "2026-06-03T15:00:00.000Z" },
            { ...rentals[1], dueDate: "2026-06-06T15:00:00.000Z" },
          ],
          overdueRentals: [{ ...rentals[0], overdueDays: 1, dueDate: "2026-06-03T15:00:00.000Z" }],
          blacklists: [],
        },
      },
    });
  });

  it("returns a dashboard error when rentals cannot be loaded", async () => {
    mockCookies(signAdminToken());
    const supabase = {
      from: (table: string) => {
        if (table === "umbrellas") {
          return {
            select: () => ({
              is: () => ({
                order: async () => ({
                  data: [{ id: "UMB-001", label: "1번 우산", status: "available" }],
                  error: null,
                }),
              }),
            }),
          };
        }

        expect(table).toBe("rentals");
        return {
          select: () => ({
            is: () => ({
              order: async () => ({ data: null, error: { message: "boom" } }),
            }),
          }),
        };
      },
    };
    const { GET } = await loadDashboardRoute(supabase);

    const response = await GET();

    expect(await responseJson(response)).toEqual({
      status: 500,
      body: {
        ok: false,
        code: "dashboard_rentals_failed",
        message: "대여 현황을 불러오지 못했습니다.",
      },
    });
  });

  it("returns 401 for dashboard data when the admin cookie is missing", async () => {
    mockCookies(undefined);
    const { GET } = await loadDashboardRoute({
      from: () => {
        throw new Error("supabase should not be touched without auth");
      },
    });

    const response = await GET();

    expect(await responseJson(response)).toEqual({
      status: 401,
      body: { ok: false, code: "unauthorized", message: "로그인이 필요합니다." },
    });
  });
});
