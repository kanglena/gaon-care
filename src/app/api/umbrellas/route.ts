import { apiError, apiOk } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/admin-route";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getDueDate, getOverdueDays, isDueWindow, isOverdueRental } from "@/domain/overdue";

const DAY_MS = 24 * 60 * 60 * 1000;
const dueDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
});

type ActiveRental = {
  umbrella_id: string;
  student_id: string;
  borrowed_at: string;
};

function formatDueDateLabel(date: Date) {
  return `${dueDateFormatter.format(date).replace(". ", "/").replace(".", "")}까지`;
}

function getDueBadge(rental: ActiveRental, nowIso: string) {
  const dueDate = getDueDate(rental.borrowed_at);
  if (isOverdueRental(rental.borrowed_at, nowIso)) {
    return {
      dueDate: dueDate.toISOString(),
      dueDateLabel: formatDueDateLabel(dueDate),
      dueBadgeLabel: `${getOverdueDays(rental.borrowed_at, nowIso)}일 초과`,
      dueTone: "overdue" as const,
    };
  }

  if (isDueWindow(rental.borrowed_at, nowIso)) {
    return {
      dueDate: dueDate.toISOString(),
      dueDateLabel: formatDueDateLabel(dueDate),
      dueBadgeLabel: "오늘까지",
      dueTone: "due" as const,
    };
  }

  const daysUntilDue = Math.max(1, Math.ceil((dueDate.getTime() - new Date(nowIso).getTime()) / DAY_MS));
  return {
    dueDate: dueDate.toISOString(),
    dueDateLabel: formatDueDateLabel(dueDate),
    dueBadgeLabel: `D-${daysUntilDue}`,
    dueTone: "normal" as const,
  };
}

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("umbrellas")
    .select("id,label,qr_payload,status,number")
    .is("archived_at", null)
    .order("number", { ascending: true });

  if (error || !data) {
    return apiError(500, "umbrellas_fetch_failed", "우산 목록을 불러오지 못했습니다.");
  }

  const { data: actives } = await supabase
    .from("rentals")
    .select("umbrella_id,student_id,borrowed_at")
    .is("returned_at", null);

  const nowIso = new Date().toISOString();
  const rentalByUmbrella = new Map((actives ?? []).map((r) => [r.umbrella_id, r]));
  const umbrellas = data.map((u) => {
    const rental = rentalByUmbrella.get(u.id);
    if (!rental) {
      return { ...u, borrower: null, dueDate: null, dueDateLabel: null, dueBadgeLabel: null, dueTone: null };
    }
    return { ...u, borrower: rental.student_id, ...getDueBadge(rental, nowIso) };
  });

  return apiOk({ umbrellas });
}

export async function POST() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const supabase = createSupabaseServiceClient();

  // Sequential numbering over the full inventory (archived rows included) so
  // numbers are never reused — always one above the highest ever assigned.
  const { data: maxRows, error: maxError } = await supabase
    .from("umbrellas")
    .select("number")
    .order("number", { ascending: false })
    .limit(1);

  if (maxError) {
    return apiError(500, "umbrella_create_failed", "우산 추가에 실패했습니다.");
  }

  const nextNumber = (maxRows?.[0]?.number ?? 0) + 1;
  const id = `umb-${nextNumber}`;

  const { error: insertError } = await supabase.from("umbrellas").insert({
    id,
    label: `${nextNumber}번 우산`,
    qr_payload: id,
    status: "available",
    number: nextNumber,
  });

  if (insertError) {
    return apiError(500, "umbrella_create_failed", "우산 추가에 실패했습니다.");
  }

  return apiOk({ id, number: nextNumber });
}
