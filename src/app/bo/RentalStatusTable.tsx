"use client";

import { useState } from "react";
import type { StudentBadgeColorKey } from "@/domain/student-id";
import { filterByGrade, type GradeFilter, type RentalRow, type RentalStatus } from "./rental-status";

const GRADE_FILTERS: { label: string; value: GradeFilter }[] = [
  { label: "전체", value: "all" },
  { label: "1학년", value: 1 },
  { label: "2학년", value: 2 },
  { label: "3학년", value: 3 },
];

const CHIP_TONE: Record<RentalStatus, string> = {
  normal: "bg-teal-100 text-teal-800",
  due: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-600",
};

const CHIP_LABEL: Record<RentalStatus, string> = {
  normal: "대여중",
  due: "대여중",
  overdue: "연체중",
};

const BADGE_COLOR_STYLES: Record<StudentBadgeColorKey, { dot: string; chip: string }> = {
  green: {
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  navy: {
    dot: "bg-indigo-900",
    chip: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  },
  yellow: {
    dot: "bg-yellow-400",
    chip: "bg-yellow-50 text-yellow-700 ring-yellow-200",
  },
};

// 반납예정일 / 경과 text color by state (B-2 색 규칙).
const ACCENT: Record<RentalStatus, string> = {
  normal: "text-slate-500",
  due: "text-amber-600",
  overdue: "text-red-600 font-semibold",
};

function elapsedLabel(row: RentalRow): string {
  if (row.status === "overdue") return `${row.overdueDays}일 초과`;
  if (row.status === "due") return "오늘까지";
  return "-";
}

export default function RentalStatusTable({ rentals }: { rentals: RentalRow[] }) {
  const [grade, setGrade] = useState<GradeFilter>("all");
  const visible = filterByGrade(rentals, grade);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <h2 className="text-xl font-bold text-slate-900">대여 현황</h2>
        <div className="flex gap-2">
          {GRADE_FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              onClick={() => setGrade(filter.value)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                grade === filter.value
                  ? "bg-teal-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {rentals.length === 0 ? (
        <p className="px-5 py-8 text-center text-slate-500">현재 대여 중인 우산이 없습니다.</p>
      ) : visible.length === 0 ? (
        <p className="px-5 py-8 text-center text-slate-500">해당 학년 대여 중인 우산이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-5 gap-4 border-b border-slate-100 bg-slate-50 px-5 py-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <span>우산 번호</span>
              <span>학번</span>
              <span>반납예정일</span>
              <span>경과</span>
              <span>상태</span>
            </div>
            <div className="divide-y divide-slate-100">
              {visible.map((row) => (
                <div
                  key={row.id}
                  className={`grid min-h-[52px] grid-cols-5 items-center gap-4 px-5 py-3 text-sm text-slate-700${
                    row.status === "overdue" ? " bg-red-50/30" : ""
                  }`}
                >
                  <span className="font-semibold text-slate-900">{row.umbrellaLabel}</span>
                  <span>
                    <StudentBadge row={row} />
                  </span>
                  <span className={ACCENT[row.status]}>{row.dueDateLabel}</span>
                  <span className={row.status === "normal" ? "text-slate-400" : ACCENT[row.status]}>
                    {elapsedLabel(row)}
                  </span>
                  <span>
                    <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-bold ${CHIP_TONE[row.status]}`}>
                      {CHIP_LABEL[row.status]}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function StudentBadge({ row }: { row: RentalRow }) {
  if (!row.badgeColor || row.studentGrade === null) {
    return <span>{row.studentId}</span>;
  }

  const styles = BADGE_COLOR_STYLES[row.badgeColor.key];

  return (
    <span className="inline-flex flex-col gap-1">
      <span className="font-medium text-slate-700">{row.studentId}</span>
      <span
        className={`inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${styles.chip}`}
      >
        <span className={`size-2 rounded-full ${styles.dot}`} aria-hidden="true" />
        {row.studentGrade}학년
      </span>
    </span>
  );
}
