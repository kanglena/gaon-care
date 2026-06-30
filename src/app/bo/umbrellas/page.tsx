import Link from "next/link";
import { getAdminCookieHeader } from "@/lib/auth/admin-fetch";
import { AddUmbrellaButton } from "./AddUmbrellaButton";
import { UmbrellaRack } from "./UmbrellaRack";

type Umbrella = {
  id: string;
  label: string;
  qr_payload: string;
  status: string;
  number: number;
  borrower: string | null;
  dueDate: string | null;
  dueDateLabel: string | null;
  dueBadgeLabel: string | null;
  dueTone: "normal" | "due" | "overdue" | null;
};

type UmbrellasResponse =
  | { ok: true; data: { umbrellas: Umbrella[] } }
  | { ok: false; code: string; message: string };

export const dynamic = "force-dynamic";

async function getUmbrellas(): Promise<UmbrellasResponse> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const headers = await getAdminCookieHeader();
    const response = await fetch(`${baseUrl}/api/umbrellas`, { cache: "no-store", headers });
    return (await response.json()) as UmbrellasResponse;
  } catch {
    return { ok: false, code: "umbrellas_fetch_failed", message: "우산 목록을 불러오지 못했습니다." };
  }
}

export default async function UmbrellasPage() {
  const result = await getUmbrellas();

  if (!result.ok) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <p className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-lg font-semibold text-red-600">
          {result.message}
        </p>
      </main>
    );
  }

  const { umbrellas } = result.data;
  const nextNumber = umbrellas.reduce((max, u) => Math.max(max, u.number), 0) + 1;

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 p-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-normal text-slate-900">우산 재고 관리</h1>
        <div className="flex items-center gap-2">
          <AddUmbrellaButton nextNumber={nextNumber} />
          <Link
            href="/bo/umbrellas/print"
            className="rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition active:bg-slate-100"
          >
            QR 출력
          </Link>
        </div>
      </header>

      {umbrellas.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
          등록된 우산이 없습니다.
        </p>
      ) : (
        <UmbrellaRack umbrellas={umbrellas} />
      )}
    </main>
  );
}
