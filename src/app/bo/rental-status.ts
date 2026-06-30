import type { StudentBadgeColor } from "@/domain/student-id";
import { parseStudentId } from "@/domain/student-id";

export type RentalStatus = "normal" | "due" | "overdue";

export type GradeFilter = "all" | 1 | 2 | 3;

// A rental row prepared for the 대여 현황 table. The time-dependent fields
// (status, overdueDays) are computed server-side so the client component stays
// purely presentational and the grade filter can run without re-deriving time.
export type RentalRow = {
  id: string;
  umbrellaLabel: string;
  studentId: string;
  studentGrade: number | null;
  badgeColor: StudentBadgeColor | null;
  dueDateLabel: string;
  status: RentalStatus;
  overdueDays: number;
};

export function gradeOf(studentId: string): number | null {
  const parsed = parseStudentId(studentId);
  return parsed.ok ? parsed.value.grade : null;
}

export function filterByGrade<T extends { studentId: string }>(rows: T[], grade: GradeFilter): T[] {
  if (grade === "all") return rows;
  return rows.filter((row) => gradeOf(row.studentId) === grade);
}
