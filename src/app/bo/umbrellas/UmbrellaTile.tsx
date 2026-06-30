"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type Umbrella = {
  id: string;
  status: string;
  number: number;
  borrower: string | null;
  dueDate?: string | null;
  dueDateLabel?: string | null;
  dueBadgeLabel?: string | null;
  dueTone?: "normal" | "due" | "overdue" | null;
};

const TILE_BASE =
  "relative flex min-h-[74px] flex-col items-center justify-center rounded-md border text-center transition";

const HATCH = {
  backgroundImage:
    "repeating-linear-gradient(45deg, rgba(100,116,139,0.10) 0 6px, transparent 6px 12px)",
};

export function UmbrellaTile({ umbrella, alignRight }: { umbrella: Umbrella; alignRight: boolean }) {
  if (umbrella.status === "borrowed") {
    const dueClass =
      umbrella.dueTone === "overdue"
        ? "border-red-200 bg-red-50 text-red-700"
        : umbrella.dueTone === "due"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-teal-200 bg-white/70 text-teal-800";
    const dueAria =
      umbrella.dueDateLabel && umbrella.dueBadgeLabel
        ? `, ${umbrella.dueDateLabel} 반납, ${umbrella.dueBadgeLabel}`
        : "";
    return (
      <div
        aria-label={`${umbrella.number}번 우산, 대여중${umbrella.borrower ? `, 대여자 ${umbrella.borrower}` : ""}${dueAria}`}
        title={
          umbrella.borrower && umbrella.dueDateLabel && umbrella.dueBadgeLabel
            ? `${umbrella.borrower} · ${umbrella.dueDateLabel} · ${umbrella.dueBadgeLabel}`
            : (umbrella.borrower ?? undefined)
        }
        className={`${TILE_BASE} cursor-default border-teal-300 bg-teal-100`}
      >
        <span className="text-lg font-bold tabular-nums leading-none text-slate-900">{umbrella.number}</span>
        {umbrella.borrower && (
          <span className="mt-0.5 max-w-full truncate px-1 text-[11px] font-semibold text-teal-700">
            {umbrella.borrower}
          </span>
        )}
        {umbrella.dueDateLabel && umbrella.dueBadgeLabel && (
          <span
            className={`mt-1 flex max-w-[calc(100%-0.5rem)] items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-bold leading-none ${dueClass}`}
          >
            <span className="truncate">{umbrella.dueDateLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="shrink-0 tabular-nums">{umbrella.dueBadgeLabel}</span>
          </span>
        )}
      </div>
    );
  }
  return <ActionableTile umbrella={umbrella} alignRight={alignRight} />;
}

function ActionableTile({ umbrella, alignRight }: { umbrella: Umbrella; alignRight: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  const isUnavailable = umbrella.status === "maintenance" || umbrella.status === "lost";
  const statusLabel = isUnavailable ? "사용불가" : "대여 가능";

  const closeMenu = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    function handlePointer(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) closeMenu();
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("click", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("click", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, closeMenu]);

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();
  }, [open]);

  async function changeStatus(newStatus: string) {
    setIsLoading(true);
    const response = await fetch(`/api/umbrellas/${umbrella.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setIsLoading(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      window.alert(body.message ?? "상태 변경에 실패했습니다.");
      router.refresh();
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${umbrella.number}번 우산, ${statusLabel}, 상태 변경 메뉴 열기`}
        className={`group ${TILE_BASE} w-full cursor-pointer hover:-translate-y-px hover:shadow-md ${
          isUnavailable ? "border-slate-300 bg-slate-100" : "border-green-300 bg-green-100"
        }`}
        style={isUnavailable ? HATCH : undefined}
      >
        <span
          className={`text-lg font-bold tabular-nums leading-none ${isUnavailable ? "text-slate-400" : "text-slate-900"}`}
        >
          {umbrella.number}
        </span>
        {isUnavailable && <span className="mt-0.5 text-[11px] font-semibold text-slate-400">사용불가</span>}
      </button>

      {open && (
        <div
          className={`absolute top-full z-10 mt-1 w-44 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl ${
            alignRight ? "right-0" : "left-0"
          }`}
        >
          <div className="border-b border-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
            {umbrella.number}번 ·{" "}
            <span className={isUnavailable ? "text-slate-500" : "text-green-700"}>{statusLabel}</span>
          </div>

          <div role="menu">
            <button
              ref={firstItemRef}
              type="button"
              role="menuitem"
              onClick={() => changeStatus(isUnavailable ? "available" : "maintenance")}
              disabled={isLoading}
              className={`flex min-h-[44px] w-full items-center px-3 text-left text-sm font-medium transition disabled:opacity-40 ${
                isUnavailable ? "text-teal-700 hover:bg-teal-50" : "text-amber-700 hover:bg-amber-50"
              }`}
            >
              {isLoading ? "처리 중…" : isUnavailable ? "정상 복구" : "사용불가 처리"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
