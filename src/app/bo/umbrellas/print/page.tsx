import { getAdminCookieHeader } from "@/lib/auth/admin-fetch";
import { PrintableLabels } from "./PrintableLabels";

type Umbrella = { id: string; label: string; qr_payload: string; status: string; number: number };

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

export default async function UmbrellaPrintPage() {
  const result = await getUmbrellas();

  if (!result.ok) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <p className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-lg font-semibold text-red-600">
          {result.message}
        </p>
      </main>
    );
  }

  const { umbrellas } = result.data;

  return (
    <main className="mx-auto max-w-5xl p-6 print:max-w-none print:p-0">
      <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
        <h1 className="text-3xl font-bold text-slate-900">우산 QR 라벨</h1>
        <p className="text-sm text-slate-500">인쇄할 우산을 선택한 뒤 인쇄하세요.</p>
      </div>

      {umbrellas.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
          등록된 우산이 없습니다.
        </p>
      ) : (
        <PrintableLabels umbrellas={umbrellas} />
      )}
    </main>
  );
}
