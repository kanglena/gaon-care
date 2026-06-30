"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type OverdueRowProps = {
  umbrellaLabel: string;
  umbrellaId: string;
  studentId: string;
  dueDateLabel: string;
  overdueDays: number;
  isSuspendTarget: boolean;
  alreadyBlacklisted: boolean;
};

export default function OverdueRow({
  umbrellaLabel,
  umbrellaId,
  studentId,
  dueDateLabel,
  overdueDays,
  isSuspendTarget,
  alreadyBlacklisted,
}: OverdueRowProps) {
  const [expanded, setExpanded] = useState(false);
  const canSuspend = isSuspendTarget && !alreadyBlacklisted;

  return (
    <div>
      <div className="grid min-h-[52px] grid-cols-5 items-center gap-4 px-5 py-3 text-sm text-slate-700">
        <span className="font-semibold text-slate-900">{umbrellaLabel}</span>
        <span>{studentId}</span>
        <span className="text-slate-500">{dueDateLabel}</span>
        <span className="flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-md px-2.5 py-1 text-xs font-bold bg-red-100 text-red-600">
            {overdueDays}일 초과
          </span>
          {canSuspend && (
            <span className="inline-flex rounded-md px-2.5 py-1 text-xs font-bold bg-red-100 text-red-700">
              정지 대상
            </span>
          )}
        </span>
        <span>
          {alreadyBlacklisted ? (
            <span className="text-xs font-medium text-slate-400">정지됨</span>
          ) : canSuspend ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 active:bg-red-100"
            >
              정지 처리
            </button>
          ) : (
            <span className="text-slate-400">-</span>
          )}
        </span>
      </div>

      {expanded && canSuspend && (
        <SuspendConfirm umbrellaId={umbrellaId} studentId={studentId} onCancel={() => setExpanded(false)} />
      )}
    </div>
  );
}

function SuspendConfirm({
  umbrellaId,
  studentId,
  onCancel,
}: {
  umbrellaId: string;
  studentId: string;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleConfirm() {
    setIsLoading(true);
    const response = await fetch("/api/blacklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ umbrellaId, studentId }),
    });
    setIsLoading(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      alert(body.message ?? "정지 처리에 실패했습니다.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-amber-50/50 px-5 py-3">
      <p className="text-sm text-slate-700">{studentId} 학생을 14일 대여 정지합니다. 계속할까요?</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isLoading}
          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-40"
        >
          {isLoading ? "처리 중…" : "확인"}
        </button>
      </div>
    </div>
  );
}
