import { NextResponse } from "next/server";

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

export function apiOk<T>(data: T) {
  return NextResponse.json({ ok: true, data });
}
