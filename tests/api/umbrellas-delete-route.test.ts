import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_COOKIE_NAME, signAdminToken } from "@/lib/auth/admin";

async function responseJson(response: Response) {
  return { status: response.status, body: await response.json() };
}

function umbrellaRow(opts: {
  umbrella: { id: string; status: string } | null;
  captureUpdate?: (payload: Record<string, unknown>) => void;
  updateError?: unknown;
}) {
  return {
    select: (columns: string) => {
      expect(columns).toBe("id,status");
      return {
        eq: (column: string) => {
          expect(column).toBe("id");
          return {
            single: () =>
              Promise.resolve(
                opts.umbrella
                  ? { data: opts.umbrella, error: null }
                  : { data: null, error: { message: "not found" } },
              ),
          };
        },
      };
    },
    update: (payload: Record<string, unknown>) => {
      opts.captureUpdate?.(payload);
      return {
        eq: (column: string) => {
          expect(column).toBe("id");
          return Promise.resolve({ error: opts.updateError ?? null });
        },
      };
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
  return await import("@/app/api/umbrellas/[id]/route");
}

function deleteRequest() {
  return new Request("http://localhost/api/umbrellas/umb-5", { method: "DELETE" });
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("DELETE /api/umbrellas/[id]", () => {
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
    const { DELETE } = await loadRoute({
      from: () => {
        throw new Error("supabase should not be touched without auth");
      },
    });

    const response = await DELETE(deleteRequest(), params("umb-5"));

    expect(await responseJson(response)).toEqual({
      status: 401,
      body: { ok: false, code: "unauthorized", message: "로그인이 필요합니다." },
    });
  });

  it("returns 404 when the umbrella does not exist", async () => {
    mockCookies(signAdminToken());
    const supabase = { from: () => umbrellaRow({ umbrella: null }) };
    const { DELETE } = await loadRoute(supabase);

    const response = await DELETE(deleteRequest(), params("umb-999"));

    expect(response.status).toBe(404);
  });

  it("returns 409 and does not archive a borrowed umbrella", async () => {
    mockCookies(signAdminToken());
    let updated: Record<string, unknown> | undefined;
    const supabase = {
      from: () =>
        umbrellaRow({ umbrella: { id: "umb-5", status: "borrowed" }, captureUpdate: (p) => (updated = p) }),
    };
    const { DELETE } = await loadRoute(supabase);

    const response = await DELETE(deleteRequest(), params("umb-5"));

    expect(response.status).toBe(409);
    expect(updated).toBeUndefined();
  });

  it("soft-deletes an available umbrella by stamping archived_at", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-07T09:00:00.000Z"));
    mockCookies(signAdminToken());
    let updated: Record<string, unknown> | undefined;
    const supabase = {
      from: () =>
        umbrellaRow({ umbrella: { id: "umb-5", status: "available" }, captureUpdate: (p) => (updated = p) }),
    };
    const { DELETE } = await loadRoute(supabase);

    const response = await DELETE(deleteRequest(), params("umb-5"));

    expect(await responseJson(response)).toEqual({
      status: 200,
      body: { ok: true, data: { id: "umb-5" } },
    });
    expect(updated).toEqual({ archived_at: "2026-06-07T09:00:00.000Z" });
  });

  it("returns 500 when the archive update fails", async () => {
    mockCookies(signAdminToken());
    const supabase = {
      from: () => umbrellaRow({ umbrella: { id: "umb-5", status: "maintenance" }, updateError: { message: "boom" } }),
    };
    const { DELETE } = await loadRoute(supabase);

    const response = await DELETE(deleteRequest(), params("umb-5"));

    expect(response.status).toBe(500);
  });
});
