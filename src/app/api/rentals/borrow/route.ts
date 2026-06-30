import { validateStudentId } from "@/domain/student-id";
import { apiError, apiOk } from "@/lib/api/errors";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { umbrellaId?: string; studentId?: string };
  const umbrellaId = body.umbrellaId?.trim();
  const studentId = validateStudentId(body.studentId ?? "");

  if (!umbrellaId) {
    return apiError(400, "missing_umbrella_id", "우산 QR을 다시 찍어주세요.");
  }

  if (!studentId.ok) {
    return apiError(400, studentId.reason, "학번 5자리를 입력해주세요.");
  }

  const supabase = createSupabaseServiceClient();

  // Check active blacklist
  const now = new Date().toISOString();
  const { data: blacklistRows, error: blacklistError } = await supabase
    .from("blacklists")
    .select("id,until")
    .eq("student_id", studentId.value)
    .is("released_at", null)
    .gt("until", now)
    .limit(1);

  if (blacklistError) {
    return apiError(500, "blacklist_check_failed", "대여 처리에 실패했습니다.");
  }

  if (blacklistRows && blacklistRows.length > 0) {
    const until = new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "long",
      day: "numeric",
    }).format(new Date(blacklistRows[0].until));
    return apiError(
      403,
      "student_blacklisted",
      `대여 정지 상태입니다 (해제 예정: ${until}). 학생회에 문의하세요.`,
    );
  }

  const { data: umbrella, error: umbrellaError } = await supabase
    .from("umbrellas")
    .select("id,label,status")
    .eq("id", umbrellaId)
    .single();

  if (umbrellaError || !umbrella) {
    return apiError(404, "umbrella_not_found", "등록되지 않은 우산입니다.");
  }

  if (umbrella.status !== "available") {
    return apiError(409, "umbrella_not_available", "대여 가능한 우산이 아닙니다.");
  }

  const { error: rentalError } = await supabase.from("rentals").insert({
    umbrella_id: umbrellaId,
    student_id: studentId.value,
  });

  if (rentalError) {
    return apiError(409, "rental_create_failed", "대여 처리에 실패했습니다.");
  }

  const { error: updateError } = await supabase
    .from("umbrellas")
    .update({ status: "borrowed", updated_at: new Date().toISOString() })
    .eq("id", umbrellaId);

  if (updateError) {
    return apiError(500, "umbrella_update_failed", "우산 상태 변경에 실패했습니다.");
  }

  return apiOk({ umbrellaId, label: umbrella.label, studentId: studentId.value });
}
