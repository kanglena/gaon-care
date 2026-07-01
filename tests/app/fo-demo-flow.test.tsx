/**
 * @vitest-environment jsdom
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function findButton(text: string) {
  const match = Array.from(document.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === text,
  );
  if (!match) throw new Error(`Button not found: ${text}`);
  return match;
}

describe("FO demo deep-link flow", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    document.body.innerHTML = "";
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => root?.unmount());
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/fo");
  });

  async function renderFlowAt(url: string) {
    window.history.replaceState(null, "", url);
    vi.doMock("@/app/fo/ScannerPanel", () => ({
      ScannerPanel: () => <div>scanner</div>,
    }));
    const { FoFlow } = await import("@/app/fo/FoFlow");
    act(() => {
      root = createRoot(container);
      root.render(<FoFlow />);
    });
  }

  it("?u=umb-30 → 학번 자동(00000) 대여 → 반납까지 체험", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/rentals/borrow")) {
        return Response.json({ ok: true, data: { umbrellaId: "umb-30", studentId: "00000" } });
      }
      return Response.json({
        ok: true,
        data: { umbrellaId: "umb-30", returnedAt: "2026-07-01T00:00:00Z", blacklisted: false },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await renderFlowAt("/fo?u=umb-30");

    expect(document.body.textContent).toContain("30번 우산");
    expect(document.body.textContent).toContain("체험 모드 · 학번 자동 입력");

    await act(async () => {
      findButton("대여 완료").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/rentals/borrow",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ umbrellaId: "umb-30", studentId: "00000" }),
      }),
    );
    expect(document.body.textContent).toContain("대여 완료");

    await act(async () => {
      findButton("방금 빌린 30번 우산 반납해보기").dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/rentals/return",
      expect.objectContaining({ method: "POST" }),
    );
    expect(document.body.textContent).toContain("반납 완료");
  });

  it("데모가 아닌 ?u= 는 무시하고 홈을 보여준다", async () => {
    await renderFlowAt("/fo?u=umb-5");
    expect(document.querySelector('button[aria-label="대여하기"]')).toBeTruthy();
    expect(document.body.textContent).not.toContain("체험 모드");
  });

  it("홈에 체험 진입 링크가 있다", async () => {
    await renderFlowAt("/fo");
    const link = Array.from(document.querySelectorAll("a")).find((a) =>
      a.textContent?.includes("테스트하러 왔어요"),
    );
    expect(link).toBeTruthy();
    expect(link?.getAttribute("href")).toBe("/fo/demo");
  });
});
