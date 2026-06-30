import { apiError, apiOk } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/admin-route";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as { blacklistId?: string };
  const blacklistId = body.blacklistId?.trim();

  if (!blacklistId) {
    return apiError(400, "missing_blacklist_id", "블랙리스트 ID가 필요합니다.");
  }

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("blacklists")
    .update({ released_at: new Date().toISOString() })
    .eq("id", blacklistId)
    .is("released_at", null);

  if (error) {
    return apiError(500, "release_failed", "해제 처리에 실패했습니다.");
  }

  return apiOk({ blacklistId });
}
