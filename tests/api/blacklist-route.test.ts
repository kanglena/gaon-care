import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_COOKIE_NAME, signAdminToken } from "@/lib/auth/admin";

async function responseJson(response: Response) {
  return { status: response.status, body: await response.json() };
}

// Minimal awaitable PostgREST-style builder: filter methods chain, `limit` resolves.
function chain(result: unknown) {
  const builder: Record<string, unknown> = {};
  for (const method of ["eq", "is", "gt", "order"]) {
    builder[method] = () => builder;
  }
  builder.limit = () => Promise.resolve(result);
  return builder;
}

function blacklistTable(opts: { existing: unknown[]; captureInsert?: (payload: Record<string, unknown>) => void }) {
  return {
    select: () => chain({ data: opts.existing, error: null }),
    insert: (payload: Record<string, unknown>) => {
      opts.captureInsert?.(payload);
      return Promise.resolve({ error: null });
    },
  };
}

function rentalsTable(rentals: unknown[]) {
  return { select: () => chain({ data: rentals, error: null }) };
}

function mockCookies(token: string | undefined) {
  vi.doMock("next/headers", () => ({
    cookies: async () => ({
      get: (name: string) => (token && name === ADMIN_COOKIE_NAME ? { value: token } : undefined),
    }),
  }));
}

async function loadRoute(supabase: unknown) {
  vi.doMock("@/lib/supabase/server", () => ({
    createSupabaseServiceClient: () => supabase,
  }));
  return await import("@/app/api/blacklist/route");
}

function postRequest(body: unknown) {
  return new Request("http://localhost/api/blacklist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/blacklist", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.KIOSK_COOKIE_SECRET = "test-secret-for-unit-tests";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns 401 when the admin cookie is missing", async () => {
    mockCookies(undefined);
    const { POST } = await loadRoute({
      from: () => {
        throw new Error("supabase should not be touched without auth");
      },
    });

    const response = await POST(postRequest({ umbrellaId: "umb-2", studentId: "10507" }));

    expect(await responseJson(response)).toEqual({
      status: 401,
      body: { ok: false, code: "unauthorized", message: "로그인이 필요합니다." },
    });
  });

  it("returns 409 when the student already has an active blacklist", async () => {
    mockCookies(signAdminToken());
    const supabase = {
      from: (table: string) => {
        expect(table).toBe("blacklists");
        return blacklistTable({ existing: [{ id: "bl-existing" }] });
      },
    };
    const { POST } = await loadRoute(supabase);

    const response = await POST(postRequest({ umbrellaId: "umb-2", studentId: "10507" }));

    expect(response.status).toBe(409);
  });

  it("creates a 14-day blacklist linked to the active rental with an overdue reason", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T00:00:00.000Z"));
    mockCookies(signAdminToken());

    let inserted: Record<string, unknown> | undefined;
    const supabase = {
      from: (table: string) => {
        if (table === "rentals") {
          // borrowed 6/1 → due 6/4 KST → 11일 초과 at 6/15
          return rentalsTable([{ id: "rental-1", borrowed_at: "2026-06-01T00:00:00.000Z" }]);
        }
        expect(table).toBe("blacklists");
        return blacklistTable({ existing: [], captureInsert: (p) => (inserted = p) });
      },
    };
    const { POST } = await loadRoute(supabase);

    const response = await POST(postRequest({ umbrellaId: "umb-2", studentId: "10507" }));

    expect(response.status).toBe(200);
    expect(inserted).toEqual({
      student_id: "10507",
      reason: "umb-2 11일 연체 (미반납)",
      starts_at: "2026-06-15T00:00:00.000Z",
      until: "2026-06-29T00:00:00.000Z",
      rental_id: "rental-1",
    });
  });

  it("returns 404 when there is no active rental for the umbrella and student", async () => {
    mockCookies(signAdminToken());
    const supabase = {
      from: (table: string) => {
        if (table === "rentals") {
          return rentalsTable([]);
        }
        return blacklistTable({ existing: [] });
      },
    };
    const { POST } = await loadRoute(supabase);

    const response = await POST(postRequest({ umbrellaId: "umb-2", studentId: "10507" }));

    expect(response.status).toBe(404);
  });
});
