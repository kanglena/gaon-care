import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME } from "@/lib/auth/admin";

export async function getAdminCookieHeader(): Promise<HeadersInit | undefined> {
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return undefined;

  return { cookie: `${ADMIN_COOKIE_NAME}=${token}` };
}
