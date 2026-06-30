import { describe, expect, it } from "vitest";

import FoPage from "@/app/fo/page";
import { FoFlow } from "@/app/fo/FoFlow";

describe("FO page", () => {
  it("renders the FO tablet flow route target used by the home redirect", () => {
    expect(FoPage().type).toBe(FoFlow);
  });
});
