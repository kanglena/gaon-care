import { describe, expect, it } from "vitest";
import {
  gradeBadgeColorForSchoolYear,
  normalizeStudentId,
  parseStudentId,
  studentBadgeColorOf,
  validateStudentId,
} from "@/domain/student-id";

describe("student ID validation", () => {
  it("accepts exactly 5 digits in grade/class/number format", () => {
    expect(validateStudentId("10507")).toEqual({ ok: true, value: "10507" });
  });

  it("normalizes spaces and hyphens before validation", () => {
    expect(normalizeStudentId("1-05-07")).toBe("10507");
    expect(normalizeStudentId("1 05 07")).toBe("10507");
  });

  it("rejects non-5-digit values", () => {
    expect(validateStudentId("1057")).toEqual({
      ok: false,
      reason: "student_id_must_be_5_digits",
    });
    expect(validateStudentId("105007")).toEqual({
      ok: false,
      reason: "student_id_must_be_5_digits",
    });
    expect(validateStudentId("a0507")).toEqual({
      ok: false,
      reason: "student_id_must_be_5_digits",
    });
  });

  it("parses grade, class, and student number from a valid ID", () => {
    expect(parseStudentId("10507")).toEqual({
      ok: true,
      value: {
        grade: 1,
        classNumber: 5,
        studentNumber: 7,
      },
    });
  });

  it("maps the current grade badge colors for the 2026 school year", () => {
    expect(gradeBadgeColorForSchoolYear(1, 2026)).toEqual({ key: "yellow", label: "노란 명찰" });
    expect(gradeBadgeColorForSchoolYear(2, 2026)).toEqual({ key: "navy", label: "남색 명찰" });
    expect(gradeBadgeColorForSchoolYear(3, 2026)).toEqual({ key: "green", label: "초록 명찰" });
  });

  it("rotates badge colors with cohorts in the next school year", () => {
    expect(gradeBadgeColorForSchoolYear(1, 2027)).toEqual({ key: "green", label: "초록 명찰" });
    expect(gradeBadgeColorForSchoolYear(2, 2027)).toEqual({ key: "yellow", label: "노란 명찰" });
    expect(gradeBadgeColorForSchoolYear(3, 2027)).toEqual({ key: "navy", label: "남색 명찰" });
  });

  it("returns the student badge color from a valid student id", () => {
    expect(studentBadgeColorOf("10507", 2026)).toEqual({ key: "yellow", label: "노란 명찰" });
    expect(studentBadgeColorOf("oops", 2026)).toBeNull();
  });
});
