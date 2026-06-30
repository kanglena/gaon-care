import { getDueDate, getOverdueDays, isOverdueRental } from "@/domain/overdue";
import { apiError, apiOk } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/auth/admin-route";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const supabase = createSupabaseServiceClient();
  const now = new Date().toISOString();

  const { data: umbrellas, error: umbrellasError } = await supabase
    .from("umbrellas")
    .select("id,label,status")
    .is("archived_at", null)
    .order("number", { ascending: true });

  if (umbrellasError || !umbrellas) {
    return apiError(500, "dashboard_umbrellas_failed", "우산 현황을 불러오지 못했습니다.");
  }

  const { data: rentals, error: rentalsError } = await supabase
    .from("rentals")
    .select("id,umbrella_id,student_id,borrowed_at,returned_at")
    .is("returned_at", null)
    .order("borrowed_at", { ascending: true });

  if (rentalsError || !rentals) {
    return apiError(500, "dashboard_rentals_failed", "대여 현황을 불러오지 못했습니다.");
  }

  const { data: blacklists } = await supabase
    .from("blacklists")
    .select("id,student_id,reason,starts_at,until")
    .is("released_at", null)
    .gt("until", now)
    .order("starts_at", { ascending: false });

  const overdueRentals = rentals
    .filter((rental) => isOverdueRental(rental.borrowed_at, now))
    .map((rental) => ({
      ...rental,
      overdueDays: getOverdueDays(rental.borrowed_at, now),
      dueDate: getDueDate(rental.borrowed_at).toISOString(),
    }));

  const activeRentals = rentals.map((rental) => ({
    ...rental,
    dueDate: getDueDate(rental.borrowed_at).toISOString(),
  }));

  return apiOk({
    counts: {
      total: umbrellas.length,
      available: umbrellas.filter((u) => u.status === "available").length,
      borrowed: umbrellas.filter((u) => u.status === "borrowed").length,
      overdue: overdueRentals.length,
      damaged: umbrellas.filter((u) => u.status === "maintenance" || u.status === "lost").length,
    },
    activeRentals,
    overdueRentals,
    blacklists: blacklists ?? [],
  });
}
