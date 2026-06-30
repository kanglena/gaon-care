import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_COOKIE_NAME, signAdminToken } from "@/lib/auth/admin";

async function responseJson(response: Response) {
  return { status: response.status, body: await response.json() };
}

// umbrellas table mock: MAX(number) lookup chain (select→order→limit) + insert.
function umbrellasTable(opts: {
  maxRow: { number: number } | null;
  captureInsert?: (payload: Record<string, unknown>) => void;
  insertError?: unknown;
}) {
  return {
    select: (columns: string) => {
      expect(columns).toBe("number");
      return {
        order: (column: string, options: { ascending: boolean }) => {
          expect(column).toBe("number");
          expect(options).toEqual({ ascending: false });
          return {
            limit: (n: number) => {
              expect(n).toBe(1);
              return Promise.resolve({ data: opts.maxRow ? [opts.maxRow] : [], error: null });
            },
          };
        },
      };
    },
    insert: (payload: Record<string, unknown>) => {
      opts.captureInsert?.(payload);
      return Promise.resolve({ error: opts.insertError ?? null });
    },
  };
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
  return await import("@/app/api/umbrellas/route");
}

describe("POST /api/umbrellas", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.KIOSK_COOKIE_SECRET = "test-secret-for-unit-tests";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when the admin cookie is missing", async () => {
    mockCookies(undefined);
    const { POST } = await loadRoute({
      from: () => {
        throw new Error("supabase should not be touched without auth");
      },
    });

    const response = await POST();

    expect(await responseJson(response)).toEqual({
      status: 401,
      body: { ok: false, code: "unauthorized", message: "로그인이 필요합니다." },
    });
  });

  it("creates the next sequential umbrella above the current max number", async () => {
    mockCookies(signAdminToken());
    let inserted: Record<string, unknown> | undefined;
    const supabase = {
      from: (table: string) => {
        expect(table).toBe("umbrellas");
        return umbrellasTable({ maxRow: { number: 28 }, captureInsert: (p) => (inserted = p) });
      },
    };
    const { POST } = await loadRoute(supabase);

    const response = await POST();

    expect(await responseJson(response)).toEqual({
      status: 200,
      body: { ok: true, data: { id: "umb-29", number: 29 } },
    });
    expect(inserted).toEqual({
      id: "umb-29",
      label: "29번 우산",
      qr_payload: "umb-29",
      status: "available",
      number: 29,
    });
  });

  it("starts at number 1 when the inventory is empty", async () => {
    mockCookies(signAdminToken());
    let inserted: Record<string, unknown> | undefined;
    const supabase = {
      from: () => umbrellasTable({ maxRow: null, captureInsert: (p) => (inserted = p) }),
    };
    const { POST } = await loadRoute(supabase);

    const response = await POST();

    expect(response.status).toBe(200);
    expect(inserted).toEqual({
      id: "umb-1",
      label: "1번 우산",
      qr_payload: "umb-1",
      status: "available",
      number: 1,
    });
  });

  it("returns 500 when the insert fails", async () => {
    mockCookies(signAdminToken());
    const supabase = {
      from: () => umbrellasTable({ maxRow: { number: 3 }, insertError: { message: "boom" } }),
    };
    const { POST } = await loadRoute(supabase);

    const response = await POST();

    expect(response.status).toBe(500);
  });
});
