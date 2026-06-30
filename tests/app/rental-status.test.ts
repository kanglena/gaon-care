import { describe, expect, it } from "vitest";
import { filterByGrade, gradeOf } from "@/app/bo/rental-status";

describe("gradeOf", () => {
  it("reads the grade from the first digit of the student id", () => {
    expect(gradeOf("10507")).toBe(1);
    expect(gradeOf("20511")).toBe(2);
    expect(gradeOf("30502")).toBe(3);
  });

  it("returns null for an unparseable student id", () => {
    expect(gradeOf("abc")).toBeNull();
    expect(gradeOf("123")).toBeNull();
  });
});

describe("filterByGrade", () => {
  const rows = [
    { studentId: "10507" },
    { studentId: "20511" },
    { studentId: "10602" },
    { studentId: "30502" },
  ];

  it("returns all rows when the filter is 'all'", () => {
    expect(filterByGrade(rows, "all")).toEqual(rows);
  });

  it("keeps only rows whose grade matches", () => {
    expect(filterByGrade(rows, 1)).toEqual([{ studentId: "10507" }, { studentId: "10602" }]);
    expect(filterByGrade(rows, 2)).toEqual([{ studentId: "20511" }]);
  });

  it("returns an empty array when no row matches the grade", () => {
    expect(filterByGrade(rows, 3)).toEqual([{ studentId: "30502" }]);
    expect(filterByGrade([{ studentId: "10507" }], 2)).toEqual([]);
  });

  it("drops rows with an unparseable student id from a numeric filter but keeps them under 'all'", () => {
    const withBad = [{ studentId: "10507" }, { studentId: "oops" }];
    expect(filterByGrade(withBad, 1)).toEqual([{ studentId: "10507" }]);
    expect(filterByGrade(withBad, "all")).toEqual(withBad);
  });
});
