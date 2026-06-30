import { getOverdueDays, shouldAutoBlacklist } from "@/domain/overdue";
import { apiError, apiOk } from "@/lib/api/errors";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { umbrellaId?: string };
  const umbrellaId = body.umbrellaId?.trim();

  if (!umbrellaId) {
    return apiError(400, "missing_umbrella_id", "우산 QR을 다시 찍어주세요.");
  }

  const supabase = createSupabaseServiceClient();
  const returnedAt = new Date().toISOString();

  const { data: activeRental, error: rentalLookupError } = await supabase
    .from("rentals")
    .select("id,umbrella_id,student_id,borrowed_at")
    .eq("umbrella_id", umbrellaId)
    .is("returned_at", null)
    .single();

  if (rentalLookupError || !activeRental) {
    return apiError(404, "active_rental_not_found", "대여 중인 우산이 아닙니다.");
  }

  const { error: rentalUpdateError } = await supabase
    .from("rentals")
    .update({ returned_at: returnedAt })
    .eq("id", activeRental.id);

  if (rentalUpdateError) {
    return apiError(500, "rental_return_failed", "반납 처리에 실패했습니다.");
  }

  const { error: umbrellaUpdateError } = await supabase
    .from("umbrellas")
    .update({ status: "available", updated_at: returnedAt })
    .eq("id", umbrellaId);

  if (umbrellaUpdateError) {
    return apiError(500, "umbrella_update_failed", "우산 상태 변경에 실패했습니다.");
  }

  // Auto-blacklist if overdue > 7 days
  if (shouldAutoBlacklist(activeRental.borrowed_at, returnedAt)) {
    const overdueDays = getOverdueDays(activeRental.borrowed_at, returnedAt);
    const until = new Date(new Date(returnedAt).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const { error: blacklistInsertError } = await supabase.from("blacklists").insert({
      student_id: activeRental.student_id,
      reason: `${umbrellaId} ${overdueDays}일 연체 반납`,
      starts_at: returnedAt,
      until,
      rental_id: activeRental.id,
    });

    if (blacklistInsertError) {
      console.error("blacklist insert failed on overdue return", blacklistInsertError);
      return apiOk({ umbrellaId, returnedAt, blacklisted: false });
    }

    return apiOk({ umbrellaId, returnedAt, blacklisted: true, blacklistUntil: until });
  }

  return apiOk({ umbrellaId, returnedAt, blacklisted: false });
}
