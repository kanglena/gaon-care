import { ADMIN_COOKIE_NAME } from "@/lib/auth/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const redirectUrl = new URL("/bo", request.url);
  const response = NextResponse.redirect(redirectUrl, 303);
  response.cookies.delete(ADMIN_COOKIE_NAME);
  return response;
}
