import { isDueWindow } from "@/domain/overdue";
import { studentBadgeColorOf, type StudentBadgeColorKey } from "@/domain/student-id";
import RentalStatusTable from "./RentalStatusTable";
import { gradeOf, type RentalRow as RentalRowData, type RentalStatus } from "./rental-status";
import { formatDueDate, getDashboard, umbrellaNumber } from "./dashboard-data";

export const dynamic = "force-dynamic";

const BADGE_COLOR_SCHOOL_YEAR = 2026;

export default async function BoPage() {
  const result = await getDashboard();

  if (!result.ok) {
    return (
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 p-6">
        <BoHeader />
        <p className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-lg font-semibold text-red-600">
          {result.message}
        </p>
      </main>
    );
  }

  const { counts, activeRentals, overdueRentals } = result.data;
  const now = new Date().toISOString();
  const overdueDaysById = new Map(overdueRentals.map((r) => [r.id, r.overdueDays]));
  const rentalRows: RentalRowData[] = activeRentals.map((rental) => {
    const overdueDays = overdueDaysById.get(rental.id);
    const status: RentalStatus =
      overdueDays !== undefined ? "overdue" : isDueWindow(rental.borrowed_at, now) ? "due" : "normal";
    return {
      id: rental.id,
      umbrellaLabel: umbrellaNumber(rental.umbrella_id),
      studentId: rental.student_id,
      studentGrade: gradeOf(rental.student_id),
      badgeColor: studentBadgeColorOf(rental.student_id, BADGE_COLOR_SCHOOL_YEAR),
      dueDateLabel: formatDueDate(rental.dueDate),
      status,
      overdueDays: overdueDays ?? 0,
    };
  });

  const overdueRows = [...overdueRentals]
    .sort((a, b) => b.overdueDays - a.overdueDays)
    .map((rental) => ({
      id: rental.id,
      umbrellaLabel: umbrellaNumber(rental.umbrella_id),
      studentId: rental.student_id,
      studentGrade: gradeOf(rental.student_id),
      badgeColor: studentBadgeColorOf(rental.student_id, BADGE_COLOR_SCHOOL_YEAR),
      dueDateLabel: formatDueDate(rental.dueDate),
      overdueDays: rental.overdueDays,
      isSuspendTarget: rental.overdueDays > 7,
    }));

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 p-6">
      <BoHeader />

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 min-[1128px]:grid-cols-5">
        <Metric label="전체 우산" value={counts.total} />
        <Metric label="대여 가능" value={counts.available} tone="success" />
        <Metric label="대여 중" value={counts.borrowed} tone="primary" />
        <Metric
          label="반납 기한 초과"
          value={counts.overdue}
          tone={counts.overdue > 0 ? "warning" : "default"}
          highlight={counts.overdue > 0}
        />
        <Metric label="사용불가" value={counts.damaged} />
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-5 py-4 text-xl font-bold text-slate-900">반납 기한 초과 목록</h2>
        {overdueRows.length === 0 ? (
          <p className="px-5 py-8 text-center text-slate-500">반납 기한을 초과한 우산이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid grid-cols-4 gap-4 border-b border-slate-100 bg-slate-50 px-5 py-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <span>우산 번호</span>
                <span>학번</span>
                <span>반납예정일</span>
                <span>경과</span>
              </div>
              <div className="divide-y divide-slate-100">
                {overdueRows.map((row) => (
                  <div
                    key={row.id}
                    className="grid min-h-[52px] grid-cols-4 items-center gap-4 bg-red-50/30 px-5 py-3 text-sm text-slate-700"
                  >
                    <span className="font-semibold text-slate-900">{row.umbrellaLabel}</span>
                    <span>
                      <StudentBadge
                        studentId={row.studentId}
                        studentGrade={row.studentGrade}
                        badgeColor={row.badgeColor}
                      />
                    </span>
                    <span className="text-red-600">{row.dueDateLabel}</span>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-md px-2.5 py-1 text-xs font-bold bg-red-100 text-red-600">
                        {row.overdueDays}일 초과
                      </span>
                      {row.isSuspendTarget && (
                        <span className="inline-flex rounded-md bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                          정지 대상
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <RentalStatusTable rentals={rentalRows} />
    </main>
  );
}

function BoHeader() {
  return (
    <header>
      <h1 className="text-3xl font-bold tracking-normal text-slate-900">학생회 대시보드</h1>
    </header>
  );
}

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

function StudentBadge({
  studentId,
  studentGrade,
  badgeColor,
}: {
  studentId: string;
  studentGrade: number | null;
  badgeColor: ReturnType<typeof studentBadgeColorOf>;
}) {
  if (!badgeColor || studentGrade === null) {
    return <span>{studentId}</span>;
  }

  const styles = BADGE_COLOR_STYLES[badgeColor.key];

  return (
    <span className="inline-flex flex-col gap-1">
      <span className="font-medium text-slate-700">{studentId}</span>
      <span
        className={`inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${styles.chip}`}
      >
        <span className={`size-2 rounded-full ${styles.dot}`} aria-hidden="true" />
        {studentGrade}학년
      </span>
    </span>
  );
}

const METRIC_TONES = {
  default: "text-slate-900",
  primary: "text-teal-700",
  success: "text-green-600",
  warning: "text-amber-600",
} as const;

function Metric({
  label,
  value,
  tone = "default",
  highlight = false,
}: {
  label: string;
  value: number;
  tone?: keyof typeof METRIC_TONES;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-5 ${highlight ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}
    >
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${METRIC_TONES[tone]}`}>{value}</p>
    </div>
  );
}
