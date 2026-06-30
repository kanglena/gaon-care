import { apiError, apiOk } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/admin-route";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const ALLOWED_STATUSES = ["available", "maintenance", "lost"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = (await request.json()) as { status?: string };
  const status = body.status;

  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return apiError(400, "invalid_status", "유효하지 않은 상태입니다.");
  }

  const supabase = createSupabaseServiceClient();

  const { data: umbrella, error: fetchError } = await supabase
    .from("umbrellas")
    .select("id,status")
    .eq("id", id)
    .single();

  if (fetchError || !umbrella) {
    return apiError(404, "umbrella_not_found", "등록되지 않은 우산입니다.");
  }

  if (umbrella.status === "borrowed") {
    return apiError(409, "umbrella_borrowed", "대여 중인 우산의 상태는 변경할 수 없습니다.");
  }

  const { error: updateError } = await supabase
    .from("umbrellas")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    return apiError(500, "status_update_failed", "상태 변경에 실패했습니다.");
  }

  return apiOk({ id, status });
}
