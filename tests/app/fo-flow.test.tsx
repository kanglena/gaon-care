/**
 * @vitest-environment jsdom
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function click(element: Element) {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function findButton(text: string) {
  const match = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === text,
  );
  if (!match) {
    throw new Error(`Button not found: ${text}`);
  }
  return match;
}

function findByLabel(label: string) {
  const el = document.querySelector(`button[aria-label="${label}"]`);
  if (!el) {
    throw new Error(`Button not found: ${label}`);
  }
  return el;
}

function expectText(text: string) {
  expect(document.body.textContent).toContain(text);
}

describe("FO tablet flow", () => {
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
    act(() => {
      root?.unmount();
    });
    vi.restoreAllMocks();
  });

  async function renderFlow() {
    vi.doMock("@/app/fo/ScannerPanel", () => ({
      ScannerPanel: ({ onScan }: { onScan: (umbrellaId: string) => void }) => (
        <button onClick={() => onScan("umb-1")}>scan umb-1</button>
      ),
    }));

    const { FoFlow } = await import("@/app/fo/FoFlow");

    act(() => {
      root = createRoot(container);
      root.render(<FoFlow />);
    });
  }

  it("대여: 모드 선택 → 스캔 → 학번 5자리 → 대여 완료", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ ok: true, data: { umbrellaId: "umb-1", studentId: "10507" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await renderFlow();
    click(findByLabel("대여하기"));
    click(findButton("scan umb-1"));
    expectText("1번 우산");

    for (const key of ["1", "0", "5", "0", "7"]) {
      click(findButton(key));
    }

    await act(async () => {
      findButton("대여 완료").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/rentals/borrow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ umbrellaId: "umb-1", studentId: "10507" }),
    });
    expectText("1번 우산 대여 완료");
  });

  it("반납: 모드 선택 → 스캔 즉시 반납 완료(학번/확인 없음)", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ ok: true, data: { umbrellaId: "umb-1", returnedAt: "2026-06-09T00:00:00Z" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await renderFlow();
    click(findByLabel("반납하기"));

    await act(async () => {
      findButton("scan umb-1").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/rentals/return", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ umbrellaId: "umb-1" }),
    });
    expectText("1번 우산 반납 완료");
  });

  it("반납: 연체 반납이면 정지 안내를 함께 보여준다", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        ok: true,
        data: {
          umbrellaId: "umb-1",
          returnedAt: "2026-06-09T00:00:00Z",
          blacklisted: true,
          blacklistUntil: "2026-06-23T00:00:00Z",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await renderFlow();
    click(findByLabel("반납하기"));

    await act(async () => {
      findButton("scan umb-1").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expectText("1번 우산 반납 완료");
    expectText("대여가 정지돼요");
  });

  it("대여 모드에서 이미 나간 우산이면 안내(반납 분기 없음)", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json(
        { ok: false, code: "umbrella_not_available", message: "대여 가능한 우산이 아닙니다." },
        { status: 409 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await renderFlow();
    click(findByLabel("대여하기"));
    click(findButton("scan umb-1"));
    for (const key of ["1", "0", "5", "0", "7"]) {
      click(findButton(key));
    }

    await act(async () => {
      findButton("대여 완료").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expectText("이미 대여 중인 우산이에요");
    expect(document.querySelector('button[aria-label="반납하기"]')).toBeNull();
  });

  it("반납 모드에서 대여 중이 아닌 우산이면 안내", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json(
        { ok: false, code: "active_rental_not_found", message: "대여 중인 우산이 아닙니다." },
        { status: 404 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await renderFlow();
    click(findByLabel("반납하기"));

    await act(async () => {
      findButton("scan umb-1").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expectText("대여 중인 우산이 아니에요");
  });
});
