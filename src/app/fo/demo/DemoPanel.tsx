"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { umbrellaDisplayName } from "@/app/fo/types";
import { DEMO_UMBRELLA_IDS, demoDeepLinkPath } from "@/domain/demo";

export function DemoPanel() {
  const [qrByUmbrella, setQrByUmbrella] = useState<Record<string, string>>({});

  // 방문자마다 깨끗한 상태에서 시작하도록 데모 우산을 리셋(best-effort).
  useEffect(() => {
    void fetch("/api/demo/reset", { method: "POST" }).catch(() => {});
  }, []);

  // 폰 기본 카메라로 열리도록 절대 URL 딥링크 QR 생성.
  useEffect(() => {
    let cancelled = false;
    const origin = window.location.origin;
    Promise.all(
      DEMO_UMBRELLA_IDS.map(
        async (id) =>
          [
            id,
            await QRCode.toDataURL(`${origin}${demoDeepLinkPath(id)}`, { margin: 1, width: 240 }),
          ] as const,
      ),
    ).then((entries) => {
      if (!cancelled) setQrByUmbrella(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f5f9f8] px-6 py-10 text-slate-950">
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-8">
        <div className="text-center">
          <p className="text-sm font-bold tracking-wide text-teal-700 md:text-base">가온케어 체험</p>
          <h1 className="mt-2 break-keep text-2xl font-bold md:text-4xl">폰 카메라로 QR을 찍어보세요</h1>
          <p className="mt-2 break-keep text-base font-semibold text-slate-500 md:text-lg">
            찍으면 폰에서 바로 대여 화면이 열려요. (체험용 우산이라 실제 재고와 무관해요)
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-3">
          {DEMO_UMBRELLA_IDS.map((id) => (
            <div
              key={id}
              className="flex flex-col items-center gap-3 rounded-2xl border border-[#d4e6e1] bg-white p-5"
            >
              {qrByUmbrella[id] ? (
                // eslint-disable-next-line @next/next/no-img-element -- 생성된 data URL, next/image 이점 없음
                <img
                  alt={`${umbrellaDisplayName(id)} 체험 QR`}
                  src={qrByUmbrella[id]}
                  className="h-auto w-full max-w-[200px]"
                />
              ) : (
                <div className="flex aspect-square w-full max-w-[200px] items-center justify-center text-slate-300">
                  QR
                </div>
              )}
              <span className="text-lg font-bold md:text-xl">{umbrellaDisplayName(id)}</span>
            </div>
          ))}
        </div>

        <div className="flex w-full flex-col items-center gap-3 border-t border-[#d4e6e1] pt-6">
          <p className="text-sm font-semibold text-slate-500 md:text-base">QR을 못 찍겠으면 눌러서 체험</p>
          <div className="flex flex-wrap justify-center gap-3">
            {DEMO_UMBRELLA_IDS.map((id) => (
              <a
                key={id}
                href={demoDeepLinkPath(id)}
                className="rounded-xl border border-[#d4e6e1] bg-white px-5 py-3 text-base font-bold text-slate-700 transition active:bg-slate-50"
              >
                {umbrellaDisplayName(id)}
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
