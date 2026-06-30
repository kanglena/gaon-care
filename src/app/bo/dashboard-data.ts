export type ActiveRental = {
  id: string;
  umbrella_id: string;
  student_id: string;
  borrowed_at: string;
  returned_at: string | null;
  dueDate: string;
};

export type OverdueRental = ActiveRental & { overdueDays: number };

export type Blacklist = {
  id: string;
  student_id: string;
  reason: string;
  starts_at: string;
  until: string;
};

export type DashboardData = {
  counts: { total: number; available: number; borrowed: number; overdue: number; damaged: number };
  activeRentals: ActiveRental[];
  overdueRentals: OverdueRental[];
  blacklists: Blacklist[];
};

export type DashboardResponse =
  | { ok: true; data: DashboardData }
  | { ok: false; code: string; message: string };

export async function getDashboard(): Promise<DashboardResponse> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const headers = await getAdminCookieHeader();
    const response = await fetch(`${baseUrl}/api/dashboard`, { cache: "no-store", headers });
    return (await response.json()) as DashboardResponse;
  } catch {
    return { ok: false, code: "dashboard_fetch_failed", message: "대시보드를 불러오지 못했습니다." };
  }
}

const dueDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
});

export function formatDueDate(iso: string): string {
  return dueDateFormatter.format(new Date(iso));
}

export function umbrellaNumber(id: string): string {
  const match = /^umb-(\d+)$/.exec(id);
  return match ? `${match[1]}번` : id;
}
import { getAdminCookieHeader } from "@/lib/auth/admin-fetch";
