import { DEMO_UMBRELLA_IDS } from "@/domain/demo";
import { apiError, apiOk } from "@/lib/api/errors";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

// 공개(관리자 인증 없음) 리셋. DEMO_UMBRELLA_IDS 로 하드 스코프되어 실제
// 인벤토리는 절대 건드리지 않는다. 활성 데모 대여를 반납 처리하고 데모
// 우산을 available 로 되돌려, 다음 방문자가 항상 깨끗한 상태에서 시작한다.
export async function POST() {
  const supabase = createSupabaseServiceClient();
  const now = new Date().toISOString();
  const ids = DEMO_UMBRELLA_IDS as readonly string[];

  const { error: rentalError } = await supabase
    .from("rentals")
    .update({ returned_at: now })
    .in("umbrella_id", ids)
    .is("returned_at", null);

  if (rentalError) {
    return apiError(500, "demo_reset_failed", "체험 초기화에 실패했습니다.");
  }

  const { error: umbrellaError } = await supabase
    .from("umbrellas")
    .update({ status: "available", updated_at: now })
    .in("id", ids);

  if (umbrellaError) {
    return apiError(500, "demo_reset_failed", "체험 초기화에 실패했습니다.");
  }

  return apiOk({ reset: ids });
}
