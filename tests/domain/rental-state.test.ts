import { describe, expect, it } from "vitest";
import { getNextFoAction } from "@/domain/rental-state";

describe("FO rental state", () => {
  it("asks for student ID when umbrella is available", () => {
    expect(getNextFoAction({ umbrellaStatus: "available" })).toBe("collect_student_id");
  });

  it("returns immediately when umbrella is borrowed", () => {
    expect(getNextFoAction({ umbrellaStatus: "borrowed" })).toBe("return_umbrella");
  });

  it("blocks lost and maintenance umbrellas", () => {
    expect(getNextFoAction({ umbrellaStatus: "lost" })).toBe("blocked");
    expect(getNextFoAction({ umbrellaStatus: "maintenance" })).toBe("blocked");
  });
});
