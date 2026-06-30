import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifyAdminCookie } from "@/lib/auth/admin";
import { apiError } from "@/lib/api/errors";

export async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (!verifyAdminCookie(token)) {
    return apiError(401, "unauthorized", "로그인이 필요합니다.");
  }

  return null;
}
