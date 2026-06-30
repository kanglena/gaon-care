"use client";

import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";

type Umbrella = { id: string; label: string; qr_payload: string; number: number };

function parseRange(text: string, validNumbers: Set<number>): Set<number> {
  const result = new Set<number>();
  for (const token of text.split(",")) {
    const trimmed = token.trim();
    if (!trimmed) continue;
    const range = /^(\d+)\s*-\s*(\d+)$/.exec(trimmed);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      for (let n = Math.min(start, end); n <= Math.max(start, end); n++) {
        if (validNumbers.has(n)) result.add(n);
      }
      continue;
    }
    if (/^\d+$/.test(trimmed)) {
      const n = Number(trimmed);
      if (validNumbers.has(n)) result.add(n);
    }
  }
  return result;
}

export function PrintableLabels({ umbrellas }: { umbrellas: Umbrella[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(umbrellas.map((u) => u.id)));
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [rangeText, setRangeText] = useState("");

  const validNumbers = useMemo(() => new Set(umbrellas.map((u) => u.number)), [umbrellas]);
  const idByNumber = useMemo(() => new Map(umbrellas.map((u) => [u.number, u.id])), [umbrellas]);

  // Lazily generate QR data URLs for selected umbrellas only, caching results.
  useEffect(() => {
    const missing = umbrellas.filter((u) => selectedIds.has(u.id) && !qrMap[u.id]);
    if (missing.length === 0) return;

    let cancelled = false;
    Promise.all(
      missing.map(async (u) => [u.id, await QRCode.toDataURL(u.qr_payload, { margin: 1, width: 220 })] as const),
    ).then((entries) => {
      if (!cancelled) setQrMap((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    });

    return () => {
      cancelled = true;
    };
  }, [selectedIds, umbrellas, qrMap]);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onRangeChange(value: string) {
    setRangeText(value);
    if (value.trim() === "") return; // empty input = no-op, keep current selection
    const numbers = parseRange(value, validNumbers);
    const ids = new Set<string>();
    for (const n of numbers) {
      const id = idByNumber.get(n);
      if (id) ids.add(id);
    }
    setSelectedIds(ids);
  }

  const selectedCount = selectedIds.size;
  const selectedReady = umbrellas.every((u) => !selectedIds.has(u.id) || Boolean(qrMap[u.id]));
  const printDisabled = selectedCount === 0 || !selectedReady;
  // 범위 입력값이 실제로 매칭하는 우산 개수(실시간) — 요약 줄에 보조 표기.
  const rangeMatchCount = useMemo(() => parseRange(rangeText, validNumbers).size, [rangeText, validNumbers]);
  const rangeActive = rangeText.trim() !== "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 print:hidden">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
              인쇄 범위
              {rangeActive && (
                <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-700">적용 중</span>
              )}
            </span>
            <div
              className={`flex items-center gap-2.5 rounded-md border-2 px-3.5 py-2.5 transition focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/40 ${
                rangeActive ? "border-teal-500 bg-teal-50/60" : "border-slate-300 bg-white"
              }`}
            >
              <svg
                viewBox="0 0 20 20"
                aria-hidden="true"
                className={`h-5 w-5 shrink-0 transition ${rangeActive ? "text-teal-600" : "text-slate-400"}`}
              >
                <path
                  fill="currentColor"
                  d="M3 5.75A.75.75 0 0 1 3.75 5h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 5.75Zm0 4.25a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5A.75.75 0 0 1 3 10Zm.75 3.5a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5h-5.5Z"
                />
              </svg>
              <input
                type="text"
                value={rangeText}
                onChange={(e) => onRangeChange(e.target.value)}
                placeholder="1,3,5 또는 12-28"
                className="w-56 min-w-0 bg-transparent text-base font-medium text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-slate-700">빠른 선택</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds(new Set(umbrellas.map((u) => u.id)))}
                className="rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                전체 선택
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                전체 해제
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            disabled={printDisabled}
            className="ml-auto rounded-md bg-teal-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-700 active:bg-teal-800 focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-40"
          >
            {selectedReady ? `선택 ${selectedCount}개 인쇄 (⌘P)` : "QR 생성 중…"}
          </button>
        </div>

        <p className="flex flex-wrap items-center gap-x-1.5 border-t border-slate-100 pt-3 text-sm text-slate-600">
          전체 <b className="text-base text-slate-900">{umbrellas.length}</b>개 중{" "}
          <b className="text-base text-slate-900">{selectedCount}</b>개 선택됨
          {rangeActive && (
            <span className="ml-1 text-slate-500">
              · 범위 <b className="text-base text-teal-700">{rangeMatchCount}</b>개 일치
            </span>
          )}
        </p>
      </div>

      {umbrellas.length === 0 ? null : (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
          {umbrellas.map((umbrella) => {
            const selected = selectedIds.has(umbrella.id);
            return (
              <button
                type="button"
                key={umbrella.id}
                onClick={() => toggle(umbrella.id)}
                aria-pressed={selected}
                className={`flex break-inside-avoid flex-col items-center gap-1 rounded-lg border bg-white p-3 text-center transition print:p-2 ${
                  selected ? "border-teal-500 ring-2 ring-teal-200" : "border-slate-200 opacity-40 print:hidden"
                }`}
              >
                {selected && qrMap[umbrella.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- QR is a generated data URL; next/image adds no value for print labels.
                  <img
                    alt={`${umbrella.label} QR 코드`}
                    src={qrMap[umbrella.id]}
                    className="h-auto w-full max-w-[160px] print:max-w-[110px]"
                  />
                ) : (
                  <div className="flex aspect-square w-full max-w-[160px] items-center justify-center text-slate-300 print:max-w-[110px]">
                    QR
                  </div>
                )}
                <span className="text-lg font-bold text-slate-900 print:text-sm">{umbrella.label}</span>
              </button>
            );
          })}
        </section>
      )}
    </div>
  );
}
