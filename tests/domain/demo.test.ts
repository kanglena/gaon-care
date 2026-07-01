import { describe, expect, it } from "vitest";

import {
  DEMO_STUDENT_ID,
  DEMO_UMBRELLA_IDS,
  demoDeepLinkPath,
  isDemoUmbrella,
  parseDemoDeepLink,
} from "@/domain/demo";

describe("demo domain helpers", () => {
  it("registers exactly the three demo umbrellas", () => {
    expect(DEMO_UMBRELLA_IDS).toEqual(["umb-29", "umb-30", "umb-31"]);
  });

  it("uses a fixed 5-digit demo student id", () => {
    expect(DEMO_STUDENT_ID).toBe("00000");
    expect(/^\d{5}$/.test(DEMO_STUDENT_ID)).toBe(true);
  });

  it("recognizes demo umbrellas and rejects others", () => {
    expect(isDemoUmbrella("umb-29")).toBe(true);
    expect(isDemoUmbrella("umb-31")).toBe(true);
    expect(isDemoUmbrella("umb-5")).toBe(false);
    expect(isDemoUmbrella("")).toBe(false);
  });

  it("parses a valid demo deep link", () => {
    expect(parseDemoDeepLink("?u=umb-29")).toBe("umb-29");
    expect(parseDemoDeepLink("u=umb-30")).toBe("umb-30");
  });

  it("rejects non-demo, missing, or malformed deep links", () => {
    expect(parseDemoDeepLink("?u=umb-5")).toBeNull();
    expect(parseDemoDeepLink("?u=")).toBeNull();
    expect(parseDemoDeepLink("")).toBeNull();
    expect(parseDemoDeepLink("?other=umb-29")).toBeNull();
  });

  it("builds the relative deep-link path", () => {
    expect(demoDeepLinkPath("umb-29")).toBe("/fo?u=umb-29");
  });
});
