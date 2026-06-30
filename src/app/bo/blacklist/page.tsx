import BlacklistReleaseButton from "../BlacklistReleaseButton";
import OverdueRow from "../OverdueRow";
import { type Blacklist, formatDueDate, getDashboard, umbrellaNumber } from "../dashboard-data";

export const dynamic = "force-dynamic";

export default async function BlacklistPage() {
  const result = await getDashboard();

  if (!result.ok) {
    return (
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 p-6">
        <h1 className="text-3xl font-bold tracking-normal text-slate-900">블랙리스트</h1>
        <p className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-lg font-semibold text-red-600">
          {result.message}
        </p>
      </main>
    );
  }

  const { overdueRentals, blacklists } = result.data;
  const blacklistedStudentIds = new Set(blacklists.map((bl) => bl.student_id));
  const suspendTargets = [...overdueRentals]
    .filter((rental) => rental.overdueDays > 7 && !blacklistedStudentIds.has(rental.student_id))
    .sort((a, b) => b.overdueDays - a.overdueDays)
    .map((rental) => ({
      id: rental.id,
      umbrellaLabel: umbrellaNumber(rental.umbrella_id),
      umbrellaId: rental.umbrella_id,
      studentId: rental.student_id,
      dueDateLabel: formatDueDate(rental.dueDate),
      overdueDays: rental.overdueDays,
      isSuspendTarget: true,
      alreadyBlacklisted: blacklistedStudentIds.has(rental.student_id),
    }));

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 p-6">
      <h1 className="text-3xl font-bold tracking-normal text-slate-900">블랙리스트</h1>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-5 py-4 text-xl font-bold text-slate-900">정지 대상</h2>
        {suspendTargets.length === 0 ? (
          <p className="px-5 py-8 text-center text-slate-500">현재 정지 대상인 학생이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid grid-cols-5 gap-4 border-b border-slate-100 bg-slate-50 px-5 py-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <span>우산 번호</span>
                <span>학번</span>
                <span>반납예정일</span>
                <span>경과</span>
                <span>조치</span>
              </div>
              <div className="divide-y divide-slate-100">
                {suspendTargets.map((row) => (
                  <OverdueRow key={row.id} {...row} />
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-5 py-4 text-xl font-bold text-slate-900">정지됨</h2>
        {blacklists.length === 0 ? (
          <p className="px-5 py-8 text-center text-slate-500">현재 정지된 학생이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid grid-cols-4 gap-4 border-b border-slate-100 bg-slate-50 px-5 py-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <span>학번</span>
                <span>사유</span>
                <span>해제 예정일</span>
                <span>조치</span>
              </div>
              <div className="divide-y divide-slate-100">
                {blacklists.map((bl) => (
                  <BlacklistRow key={bl.id} blacklist={bl} />
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function BlacklistRow({ blacklist }: { blacklist: Blacklist }) {
  const until = formatDueDate(blacklist.until);
  return (
    <div className="grid min-h-[52px] grid-cols-4 items-center gap-4 px-5 py-3 text-sm text-slate-700">
      <span className="font-semibold text-slate-900">{blacklist.student_id}</span>
      <span className="text-slate-500">{blacklist.reason}</span>
      <span className="text-slate-500">{until}</span>
      <span>
        <BlacklistReleaseButton blacklistId={blacklist.id} />
      </span>
    </div>
  );
}
