import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("BoLoginForm accessibility", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.doMock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("labels the password input and uses a visible focus ring", async () => {
    const BoLoginForm = (await import("@/app/bo/BoLoginForm")).default;
    const html = renderToStaticMarkup(<BoLoginForm />);

    expect(html).toMatch(/<label[^>]*for="bo-password"[^>]*>/);
    expect(html).toContain('id="bo-password"');
    expect(html).toContain("focus-visible:ring-2");
    expect(html).not.toContain("focus:outline-none");
  });
});
