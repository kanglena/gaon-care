import type { UmbrellaStatus } from "./types";

export type FoAction = "collect_student_id" | "return_umbrella" | "blocked";

export function getNextFoAction({ umbrellaStatus }: { umbrellaStatus: UmbrellaStatus }): FoAction {
  if (umbrellaStatus === "available") {
    return "collect_student_id";
  }

  if (umbrellaStatus === "borrowed") {
    return "return_umbrella";
  }

  return "blocked";
}
