import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, signAdminToken } from "@/lib/auth/admin";
import { apiError } from "@/lib/api/errors";

export async function POST(request: Request) {
  const body = (await request.json()) as { password?: string };
  const password = body.password ?? "";
  const expected = process.env.ADMIN_PASSWORD ?? "";

  if (!expected || !process.env.KIOSK_COOKIE_SECRET?.trim()) {
    return apiError(500, "admin_auth_not_configured", "관리자 인증 설정이 필요합니다.");
  }

  let match = false;
  try {
    const a = Buffer.from(password);
    const b = Buffer.from(expected);
    if (a.length === b.length) {
      match = timingSafeEqual(a, b);
    }
  } catch {
    // lengths differ or encoding issue — stays false
  }

  if (!match) {
    return apiError(401, "invalid_password", "비밀번호가 틀렸습니다.");
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, signAdminToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return response;
}
