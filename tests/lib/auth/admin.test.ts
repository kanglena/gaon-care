import { beforeEach, describe, expect, it } from "vitest";

// Tests run outside Next.js context — set env vars before importing
const TEST_SECRET = "test-secret-for-unit-tests";

describe("admin cookie helpers", () => {
  beforeEach(() => {
    process.env.KIOSK_COOKIE_SECRET = TEST_SECRET;
  });

  it("signAdminToken returns a hex string", async () => {
    const { signAdminToken } = await import("@/lib/auth/admin");
    const token = signAdminToken();
    expect(typeof token).toBe("string");
    expect(token).toMatch(/^[0-9a-f]{64}$/); // sha256 hex = 64 chars
  });

  it("verifyAdminCookie returns true for a valid token", async () => {
    const { signAdminToken, verifyAdminCookie } = await import("@/lib/auth/admin");
    const token = signAdminToken();
    expect(verifyAdminCookie(token)).toBe(true);
  });

  it("verifyAdminCookie returns false for a tampered token", async () => {
    const { signAdminToken, verifyAdminCookie } = await import("@/lib/auth/admin");
    const token = signAdminToken();
    const tampered = token.slice(0, -2) + "ff";
    expect(verifyAdminCookie(tampered)).toBe(false);
  });

  it("verifyAdminCookie returns false for undefined", async () => {
    const { verifyAdminCookie } = await import("@/lib/auth/admin");
    expect(verifyAdminCookie(undefined)).toBe(false);
  });

  it("verifyAdminCookie returns false for empty string", async () => {
    const { verifyAdminCookie } = await import("@/lib/auth/admin");
    expect(verifyAdminCookie("")).toBe(false);
  });

  it("signAdminToken throws when the cookie secret is missing", async () => {
    delete process.env.KIOSK_COOKIE_SECRET;
    const { signAdminToken } = await import("@/lib/auth/admin");

    expect(() => signAdminToken()).toThrow("Missing KIOSK_COOKIE_SECRET");
  });

  it("verifyAdminCookie returns false when the cookie secret is missing", async () => {
    const { signAdminToken, verifyAdminCookie } = await import("@/lib/auth/admin");
    const token = signAdminToken();

    delete process.env.KIOSK_COOKIE_SECRET;

    expect(verifyAdminCookie(token)).toBe(false);
  });
});
