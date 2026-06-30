import { apiError, apiOk } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/admin-route";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
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
    return apiError(409, "umbrella_borrowed", "대여 중인 우산은 삭제할 수 없습니다.");
  }

  const { error: updateError } = await supabase
    .from("umbrellas")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    return apiError(500, "umbrella_delete_failed", "우산 삭제에 실패했습니다.");
  }

  return apiOk({ id });
}
