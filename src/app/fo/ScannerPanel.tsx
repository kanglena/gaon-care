"use client";

import { BrowserQRCodeReader } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";

import { UmbrellaIcon } from "@/app/fo/icons";
import type { Mode } from "@/app/fo/types";

type ScannerPanelProps = {
  mode: Mode;
  onScan: (umbrellaId: string) => void;
  onBack: () => void;
  processing?: boolean;
};

export function ScannerPanel({ mode, onScan, onBack, processing = false }: ScannerPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  });
  const [status, setStatus] = useState<"preparing" | "ready" | "error">("preparing");
  const [scannerRun, setScannerRun] = useState(0);

  useEffect(() => {
    const reader = new BrowserQRCodeReader();
    let cancelled = false;
    let lastScan = "";
    let cleanupPromise: Promise<(() => void) | undefined> | undefined;

    async function start() {
      try {
        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
              height: { ideal: 720 },
              width: { ideal: 1280 },
            },
          },
          videoRef.current ?? undefined,
          (result) => {
            const text = result?.getText().trim();
            if (!text || cancelled || text === lastScan) {
              return;
            }
            lastScan = text;
            onScanRef.current(text);
          },
        );
        if (!cancelled) {
          setStatus("ready");
        }
        return () => controls.stop();
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
      return undefined;
    }

    const startTimer = window.setTimeout(() => {
      if (!cancelled) {
        cleanupPromise = start();
      }
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      void cleanupPromise?.then((cleanup) => cleanup?.());
    };
  }, [scannerRun]);

  const title = mode === "borrow" ? "우산 대여" : "우산 반납";
  const caption =
    mode === "borrow" ? "빌릴 우산의 QR을 비춰주세요" : "반납할 우산의 QR을 비춰주세요";

  return (
    <section className="flex w-full flex-col items-center md:min-h-[calc(100vh-4rem)]">
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 inline-flex items-center gap-1.5 self-start rounded-full px-3 py-2.5 text-base font-semibold text-slate-500 transition active:bg-slate-100 active:text-slate-700 md:text-xl"
      >
        <span aria-hidden>←</span> 처음으로
      </button>

      <div className="flex w-full flex-1 flex-col items-center justify-center">
        <p className="mt-2 text-sm font-bold tracking-wide text-teal-700 md:text-base">가온케어</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-950 md:mt-2 md:gap-3 md:text-4xl">
          <UmbrellaIcon size={22} className="md:h-9 md:w-9" />
          {title}
        </h1>

        <div className="relative mt-8 aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-slate-950 shadow-[0_4px_16px_rgba(15,23,42,0.10)] md:mt-10 md:max-w-[clamp(420px,52vh,560px)] md:rounded-[28px]">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            autoPlay
            muted
            playsInline
            onLoadedData={() => setStatus((current) => (current === "error" ? current : "ready"))}
            onPlaying={() => setStatus((current) => (current === "error" ? current : "ready"))}
          />

          <div className="pointer-events-none absolute inset-[15%]">
            <span className="absolute left-0 top-0 h-6 w-6 rounded-tl-md border-l-[3px] border-t-[3px] border-teal-400 md:h-9 md:w-9" />
            <span className="absolute right-0 top-0 h-6 w-6 rounded-tr-md border-r-[3px] border-t-[3px] border-teal-400 md:h-9 md:w-9" />
            <span className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-md border-b-[3px] border-l-[3px] border-teal-400 md:h-9 md:w-9" />
            <span className="absolute bottom-0 right-0 h-6 w-6 rounded-br-md border-b-[3px] border-r-[3px] border-teal-400 md:h-9 md:w-9" />
          </div>

          {status === "ready" ? (
            <div className="fo-sweep pointer-events-none absolute inset-x-[8%] h-0.5 bg-[linear-gradient(90deg,transparent,#2dd4bf,transparent)]" />
          ) : null}

          {status === "preparing" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/45 text-slate-100">
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-slate-600 border-t-teal-400 md:h-10 md:w-10" />
              <p className="text-sm font-semibold md:text-lg">카메라를 준비하고 있어요</p>
            </div>
          ) : null}

          {status === "error" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950 px-6 text-center text-slate-300 md:px-10">
              <p className="break-keep text-sm font-semibold md:text-lg">
                카메라를 열 수 없어요. 권한을 확인해 주세요.
              </p>
            </div>
          ) : null}

          {processing ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80 text-white">
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-slate-500 border-t-teal-300 md:h-10 md:w-10" />
              <p className="text-sm font-semibold md:text-lg">반납 처리 중…</p>
            </div>
          ) : null}
        </div>

        <p className="mt-6 break-keep text-center text-lg font-semibold text-slate-600 md:mt-8 md:text-2xl">
          {caption}
        </p>

        <div className="mt-5 flex w-full max-w-sm flex-col gap-3 md:max-w-lg">
          <button
            type="button"
            onClick={() => {
              setStatus("preparing");
              setScannerRun((run) => run + 1);
            }}
            className="h-12 rounded-xl border border-[#d4e6e1] bg-white text-base font-bold text-slate-700 transition active:bg-slate-50 md:h-14 md:text-lg"
            disabled={processing}
          >
            카메라 다시 시작
          </button>
        </div>
      </div>
    </section>
  );
}
