import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE_NAME = "admin_session";

function getCookieSecret(): string | null {
  const secret = process.env.KIOSK_COOKIE_SECRET?.trim();
  return secret ? secret : null;
}

export function signAdminToken(): string {
  const secret = getCookieSecret();
  if (!secret) {
    throw new Error("Missing KIOSK_COOKIE_SECRET");
  }

  return createHmac("sha256", secret).update("admin").digest("hex");
}

export function verifyAdminCookie(value: string | undefined): boolean {
  if (!value) return false;
  const secret = getCookieSecret();
  if (!secret) return false;

  const expected = createHmac("sha256", secret).update("admin").digest("hex");
  try {
    return timingSafeEqual(Buffer.from(value, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}
