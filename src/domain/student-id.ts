export type StudentIdParts = {
  grade: number;
  classNumber: number;
  studentNumber: number;
};

export type StudentBadgeColorKey = "green" | "navy" | "yellow";

export type StudentBadgeColor = {
  key: StudentBadgeColorKey;
  label: string;
};

export type StudentIdValidation =
  | { ok: true; value: string }
  | { ok: false; reason: "student_id_must_be_5_digits" };

export type StudentIdParseResult =
  | { ok: true; value: StudentIdParts }
  | { ok: false; reason: "student_id_must_be_5_digits" };

export function normalizeStudentId(input: string): string {
  return input.replace(/[\s-]/g, "");
}

export function validateStudentId(input: string): StudentIdValidation {
  const normalized = normalizeStudentId(input);

  if (/^\d{5}$/.test(normalized)) {
    return { ok: true, value: normalized };
  }

  return { ok: false, reason: "student_id_must_be_5_digits" };
}

export function parseStudentId(input: string): StudentIdParseResult {
  const validation = validateStudentId(input);

  if (!validation.ok) {
    return validation;
  }

  return {
    ok: true,
    value: {
      grade: Number(validation.value.slice(0, 1)),
      classNumber: Number(validation.value.slice(1, 3)),
      studentNumber: Number(validation.value.slice(3, 5)),
    },
  };
}

const BASE_BADGE_COLOR_SCHOOL_YEAR = 2026;

const BADGE_COLORS_BY_2026_GRADE: StudentBadgeColor[] = [
  { key: "yellow", label: "노란 명찰" },
  { key: "navy", label: "남색 명찰" },
  { key: "green", label: "초록 명찰" },
];

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

export function gradeBadgeColorForSchoolYear(
  grade: number,
  schoolYear = new Date().getFullYear(),
): StudentBadgeColor | null {
  if (!Number.isInteger(grade) || grade < 1 || grade > 3) {
    return null;
  }

  const yearOffset = schoolYear - BASE_BADGE_COLOR_SCHOOL_YEAR;
  const colorIndex = positiveModulo(grade - 1 - yearOffset, BADGE_COLORS_BY_2026_GRADE.length);
  return BADGE_COLORS_BY_2026_GRADE[colorIndex];
}

export function studentBadgeColorOf(studentId: string, schoolYear?: number): StudentBadgeColor | null {
  const parsed = parseStudentId(studentId);
  return parsed.ok ? gradeBadgeColorForSchoolYear(parsed.value.grade, schoolYear) : null;
}
