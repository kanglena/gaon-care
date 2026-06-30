import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_COOKIE_NAME } from "@/lib/auth/admin";

async function responseJson(response: Response) {
  return { status: response.status, body: await response.json() };
}

async function loadRoute() {
  return await import("@/app/api/admin/login/route");
}

function postRequest(password: string) {
  return new Request("http://localhost/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
}

describe("POST /api/admin/login", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.ADMIN_PASSWORD = "admin-pass";
    process.env.KIOSK_COOKIE_SECRET = "test-secret-for-unit-tests";
  });

  afterEach(() => {
    delete process.env.ADMIN_PASSWORD;
    delete process.env.KIOSK_COOKIE_SECRET;
    vi.restoreAllMocks();
  });

  it("returns 401 for an invalid password", async () => {
    const { POST } = await loadRoute();

    const response = await POST(postRequest("wrong"));

    expect(await responseJson(response)).toEqual({
      status: 401,
      body: { ok: false, code: "invalid_password", message: "비밀번호가 틀렸습니다." },
    });
  });

  it("does not allow an empty password when ADMIN_PASSWORD is missing", async () => {
    delete process.env.ADMIN_PASSWORD;
    const { POST } = await loadRoute();

    const response = await POST(postRequest(""));

    expect(await responseJson(response)).toEqual({
      status: 500,
      body: { ok: false, code: "admin_auth_not_configured", message: "관리자 인증 설정이 필요합니다." },
    });
  });

  it("does not issue a cookie when KIOSK_COOKIE_SECRET is missing", async () => {
    delete process.env.KIOSK_COOKIE_SECRET;
    const { POST } = await loadRoute();

    const response = await POST(postRequest("admin-pass"));

    expect(await responseJson(response)).toEqual({
      status: 500,
      body: { ok: false, code: "admin_auth_not_configured", message: "관리자 인증 설정이 필요합니다." },
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("sets an httpOnly admin cookie for the correct password", async () => {
    const { POST } = await loadRoute();

    const response = await POST(postRequest("admin-pass"));
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(await responseJson(response)).toEqual({
      status: 200,
      body: { ok: true },
    });
    expect(setCookie).toContain(`${ADMIN_COOKIE_NAME}=`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=strict");
  });
});
