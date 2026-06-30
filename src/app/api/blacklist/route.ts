import { getOverdueDays } from "@/domain/overdue";
import { apiError, apiOk } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/admin-route";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const BLACKLIST_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as { umbrellaId?: string; studentId?: string };
  const umbrellaId = body.umbrellaId?.trim();
  const studentId = body.studentId?.trim();

  if (!umbrellaId || !studentId) {
    return apiError(400, "missing_fields", "우산과 학번 정보가 필요합니다.");
  }

  const supabase = createSupabaseServiceClient();
  const now = new Date();
  const nowIso = now.toISOString();

  // Already actively blacklisted → nothing to do.
  const { data: existing, error: existingError } = await supabase
    .from("blacklists")
    .select("id")
    .eq("student_id", studentId)
    .is("released_at", null)
    .gt("until", nowIso)
    .limit(1);

  if (existingError) {
    return apiError(500, "blacklist_check_failed", "정지 처리에 실패했습니다.");
  }

  if (existing && existing.length > 0) {
    return apiError(409, "already_blacklisted", "이미 대여 정지된 학생입니다.");
  }

  // Link the active (unreturned) rental and compute the overdue days for the reason.
  const { data: rentals, error: rentalError } = await supabase
    .from("rentals")
    .select("id,borrowed_at")
    .eq("umbrella_id", umbrellaId)
    .eq("student_id", studentId)
    .is("returned_at", null)
    .order("borrowed_at", { ascending: false })
    .limit(1);

  if (rentalError) {
    return apiError(500, "rental_lookup_failed", "정지 처리에 실패했습니다.");
  }

  if (!rentals || rentals.length === 0) {
    return apiError(404, "rental_not_found", "진행 중인 대여를 찾지 못했습니다.");
  }

  const rental = rentals[0];
  const overdueDays = getOverdueDays(rental.borrowed_at, nowIso);
  const until = new Date(now.getTime() + BLACKLIST_DAYS * DAY_MS).toISOString();

  const { error: insertError } = await supabase.from("blacklists").insert({
    student_id: studentId,
    reason: `${umbrellaId} ${overdueDays}일 연체 (미반납)`,
    starts_at: nowIso,
    until,
    rental_id: rental.id,
  });

  if (insertError) {
    return apiError(500, "blacklist_create_failed", "정지 처리에 실패했습니다.");
  }

  return apiOk({ studentId, until, overdueDays });
}
