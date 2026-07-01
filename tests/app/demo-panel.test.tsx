/**
 * @vitest-environment jsdom
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn(async () => "data:image/png;base64,QR") },
}));

describe("DemoPanel", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => root?.unmount());
    vi.restoreAllMocks();
  });

  async function render() {
    const { DemoPanel } = await import("@/app/fo/demo/DemoPanel");
    await act(async () => {
      root = createRoot(container);
      root.render(<DemoPanel />);
    });
  }

  it("resets demo umbrellas on mount and renders fallback deep links", async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data: { reset: [] } }));
    vi.stubGlobal("fetch", fetchMock);

    await render();
    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/demo/reset", { method: "POST" });

    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(
      expect.arrayContaining(["/fo?u=umb-29", "/fo?u=umb-30", "/fo?u=umb-31"]),
    );
    expect(container.textContent).toContain("폰 카메라로 QR을 찍어보세요");
  });
});
