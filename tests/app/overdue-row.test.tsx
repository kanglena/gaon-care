/**
 * @vitest-environment jsdom
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OverdueRowProps } from "@/app/bo/OverdueRow";

function findButton(text: string) {
  const match = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === text,
  );
  if (!match) throw new Error(`Button not found: ${text}`);
  return match;
}

function queryButton(text: string) {
  return Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.trim() === text);
}

function click(element: Element) {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

const refresh = vi.fn();

const TARGET_PROPS: OverdueRowProps = {
  umbrellaLabel: "2번",
  umbrellaId: "umb-2",
  studentId: "10507",
  dueDateLabel: "6월 4일",
  overdueDays: 9,
  isSuspendTarget: true,
  alreadyBlacklisted: false,
};

describe("OverdueRow suspend flow", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    document.body.innerHTML = "";
    container = document.createElement("div");
    document.body.appendChild(container);
    vi.doMock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
  });

  afterEach(() => {
    act(() => root?.unmount());
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function render(props: OverdueRowProps) {
    const OverdueRow = (await import("@/app/bo/OverdueRow")).default;
    act(() => {
      root = createRoot(container);
      root.render(<OverdueRow {...props} />);
    });
  }

  it("shows a 정지 처리 button and no confirm prompt before interaction", async () => {
    await render(TARGET_PROPS);

    expect(queryButton("정지 처리")).toBeTruthy();
    expect(document.body.textContent).not.toContain("계속할까요?");
  });

  it("posts to /api/blacklist on 확인 and refreshes the dashboard", async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data: {} }));
    vi.stubGlobal("fetch", fetchMock);

    await render(TARGET_PROPS);
    click(findButton("정지 처리"));

    expect(document.body.textContent).toContain("10507 학생을 14일 대여 정지합니다. 계속할까요?");

    await act(async () => {
      findButton("확인").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/blacklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ umbrellaId: "umb-2", studentId: "10507" }),
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("collapses the confirm on 취소 without posting", async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data: {} }));
    vi.stubGlobal("fetch", fetchMock);

    await render(TARGET_PROPS);
    click(findButton("정지 처리"));
    expect(document.body.textContent).toContain("계속할까요?");

    click(findButton("취소"));

    expect(document.body.textContent).not.toContain("계속할까요?");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(queryButton("정지 처리")).toBeTruthy();
  });

  it("disables the confirm button and shows 처리 중… while the request is in flight", async () => {
    let resolveFetch: (value: Response) => void = () => {};
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => (resolveFetch = resolve)));
    vi.stubGlobal("fetch", fetchMock);

    await render(TARGET_PROPS);
    click(findButton("정지 처리"));

    await act(async () => {
      findButton("확인").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const pending = findButton("처리 중…");
    expect((pending as HTMLButtonElement).disabled).toBe(true);

    await act(async () => {
      resolveFetch(Response.json({ ok: true, data: {} }));
    });
    expect(refresh).toHaveBeenCalled();
  });
});
