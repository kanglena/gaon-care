import { beforeEach, describe, expect, it, vi } from "vitest";

type MockCall = {
  table: string;
  action: string;
  payload?: unknown;
};

function jsonRequest(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function responseJson(response: Response) {
  return {
    status: response.status,
    body: await response.json(),
  };
}

async function loadBorrowRoute(supabase: unknown) {
  vi.doMock("@/lib/supabase/server", () => ({
    createSupabaseServiceClient: () => supabase,
  }));

  return await import("@/app/api/rentals/borrow/route");
}

async function loadReturnRoute(supabase: unknown) {
  vi.doMock("@/lib/supabase/server", () => ({
    createSupabaseServiceClient: () => supabase,
  }));

  return await import("@/app/api/rentals/return/route");
}

describe("rental API routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("rejects borrow requests with invalid student IDs before opening the service client", async () => {
    const createSupabaseServiceClient = vi.fn();
    vi.doMock("@/lib/supabase/server", () => ({ createSupabaseServiceClient }));
    const { POST } = await import("@/app/api/rentals/borrow/route");

    const response = await POST(jsonRequest("/api/rentals/borrow", { umbrellaId: "UMB-001", studentId: "1057" }));

    expect(await responseJson(response)).toEqual({
      status: 400,
      body: {
        ok: false,
        code: "student_id_must_be_5_digits",
        message: "학번 5자리를 입력해주세요.",
      },
    });
    expect(createSupabaseServiceClient).not.toHaveBeenCalled();
  });

  it("creates an active rental and marks the umbrella borrowed", async () => {
    const calls: MockCall[] = [];
    const supabase = {
      from(table: string) {
        if (table === "blacklists") {
          return {
            select: () => ({
              eq: () => ({
                is: () => ({
                  gt: () => ({
                    limit: async () => ({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          };
        }

        if (table === "umbrellas") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: { id: "UMB-001", label: "1번 우산", status: "available" },
                  error: null,
                }),
              }),
            }),
            update: (payload: unknown) => ({
              eq: async () => {
                calls.push({ table, action: "update", payload });
                return { error: null };
              },
            }),
          };
        }

        return {
          insert: async (payload: unknown) => {
            calls.push({ table, action: "insert", payload });
            return { error: null };
          },
        };
      },
    };
    const { POST } = await loadBorrowRoute(supabase);

    const response = await POST(jsonRequest("/api/rentals/borrow", { umbrellaId: " UMB-001 ", studentId: "1-05-07" }));

    const result = await responseJson(response);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      ok: true,
      data: { umbrellaId: "UMB-001", label: "1번 우산", studentId: "10507" },
    });
    expect(calls).toEqual([
      {
        table: "rentals",
        action: "insert",
        payload: { umbrella_id: "UMB-001", student_id: "10507" },
      },
      {
        table: "umbrellas",
        action: "update",
        payload: expect.objectContaining({ status: "borrowed" }),
      },
    ]);
  });

  it("returns a conflict when the umbrella is not available to borrow", async () => {
    const supabase = {
      from(table: string) {
        if (table === "blacklists") {
          return {
            select: () => ({
              eq: () => ({
                is: () => ({
                  gt: () => ({
                    limit: async () => ({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          };
        }

        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: "UMB-001", label: "1번 우산", status: "borrowed" },
                error: null,
              }),
            }),
          }),
        };
      },
    };
    const { POST } = await loadBorrowRoute(supabase);

    const response = await POST(jsonRequest("/api/rentals/borrow", { umbrellaId: "UMB-001", studentId: "10507" }));

    expect(await responseJson(response)).toEqual({
      status: 409,
      body: {
        ok: false,
        code: "umbrella_not_available",
        message: "대여 가능한 우산이 아닙니다.",
      },
    });
  });

  it("returns the active rental and marks the umbrella available", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-06T00:00:00.000Z"));
    const calls: MockCall[] = [];
    const supabase = {
      from(table: string) {
        if (table === "rentals") {
          return {
            select: () => ({
              eq: () => ({
                is: () => ({
                  single: async () => ({
                    data: {
                      id: "rental-1",
                      umbrella_id: "UMB-001",
                      student_id: "10507",
                      borrowed_at: "2026-06-05T00:00:00.000Z",
                    },
                    error: null,
                  }),
                }),
              }),
            }),
            update: (payload: unknown) => ({
              eq: async () => {
                calls.push({ table, action: "update", payload });
                return { error: null };
              },
            }),
          };
        }

        return {
          update: (payload: unknown) => ({
            eq: async () => {
              calls.push({ table, action: "update", payload });
              return { error: null };
            },
          }),
        };
      },
    };
    const { POST } = await loadReturnRoute(supabase);

    const response = await POST(jsonRequest("/api/rentals/return", { umbrellaId: " UMB-001 " }));

    const result = await responseJson(response);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      ok: true,
      data: { umbrellaId: "UMB-001", returnedAt: expect.any(String), blacklisted: false },
    });
    expect(calls).toEqual([
      {
        table: "rentals",
        action: "update",
        payload: { returned_at: result.body.data.returnedAt },
      },
      {
        table: "umbrellas",
        action: "update",
        payload: { status: "available", updated_at: result.body.data.returnedAt },
      },
    ]);
    vi.useRealTimers();
  });

  it("returns a not-found error when no active rental exists", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            is: () => ({
              single: async () => ({ data: null, error: { message: "not found" } }),
            }),
          }),
        }),
      }),
    };
    const { POST } = await loadReturnRoute(supabase);

    const response = await POST(jsonRequest("/api/rentals/return", { umbrellaId: "UMB-001" }));

    expect(await responseJson(response)).toEqual({
      status: 404,
      body: {
        ok: false,
        code: "active_rental_not_found",
        message: "대여 중인 우산이 아닙니다.",
      },
    });
  });

  it("blocks borrow when the student has an active blacklist", async () => {
    const supabase = {
      from(table: string) {
        if (table === "blacklists") {
          return {
            select: () => ({
              eq: () => ({
                is: () => ({
                  gt: () => ({
                    limit: async () => ({
                      data: [{ id: "bl-1", until: "2026-12-31T00:00:00.000Z" }],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }

        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: "UMB-001", label: "1번 우산", status: "available" },
                error: null,
              }),
            }),
          }),
        };
      },
    };
    const { POST } = await loadBorrowRoute(supabase);

    const response = await POST(jsonRequest("/api/rentals/borrow", { umbrellaId: "UMB-001", studentId: "10507" }));

    const result = await responseJson(response);
    expect(result.status).toBe(403);
    expect(result.body.ok).toBe(false);
    expect(result.body.code).toBe("student_blacklisted");
    expect(result.body.message).toContain("대여 정지");
  });

  it("auto-blacklists the student on a >7-day overdue return", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T00:00:00.000Z"));
    const calls: MockCall[] = [];
    let blacklistPayload: Record<string, unknown> | undefined;
    const supabase = {
      from(table: string) {
        if (table === "rentals") {
          return {
            select: () => ({
              eq: () => ({
                is: () => ({
                  single: async () => ({
                    data: {
                      id: "rental-1",
                      umbrella_id: "UMB-001",
                      student_id: "10507",
                      borrowed_at: "2026-06-01T00:00:00.000Z",
                    },
                    error: null,
                  }),
                }),
              }),
            }),
            update: (payload: unknown) => ({
              eq: async () => {
                calls.push({ table, action: "update", payload });
                return { error: null };
              },
            }),
          };
        }

        if (table === "blacklists") {
          return {
            insert: async (payload: Record<string, unknown>) => {
              blacklistPayload = payload;
              return { error: null };
            },
          };
        }

        return {
          update: (payload: unknown) => ({
            eq: async () => {
              calls.push({ table, action: "update", payload });
              return { error: null };
            },
          }),
        };
      },
    };
    const { POST } = await loadReturnRoute(supabase);

    const response = await POST(jsonRequest("/api/rentals/return", { umbrellaId: "UMB-001" }));

    const result = await responseJson(response);
    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
    expect(result.body.data.blacklisted).toBe(true);
    expect(typeof result.body.data.blacklistUntil).toBe("string");
    expect(blacklistPayload).toBeDefined();
    expect(blacklistPayload?.student_id).toBe("10507");
    expect(String(blacklistPayload?.reason)).toContain("연체 반납");
    vi.useRealTimers();
  });
});
