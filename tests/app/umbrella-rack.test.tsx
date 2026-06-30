/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
type U = {
  id: string;
  status: string;
  number: number;
  borrower: string | null;
  dueDate?: string | null;
  dueDateLabel?: string | null;
  dueBadgeLabel?: string | null;
  dueTone?: "normal" | "due" | "overdue" | null;
};
const htmlText = () => document.body.innerHTML;

describe("UmbrellaRack — rendering", () => {
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

  async function render(umbrellas: U[]) {
    const { UmbrellaRack } = await import("@/app/bo/umbrellas/UmbrellaRack");
    act(() => {
      root = createRoot(container);
      root.render(<UmbrellaRack umbrellas={umbrellas} />);
    });
  }

  function tileButton(n: number) {
    return Array.from(document.querySelectorAll("button")).find((b) =>
      b.getAttribute("aria-label")?.startsWith(`${n}번 우산`),
    );
  }

  it("renders a '빈 자리' placeholder for deleted (gap) numbers so later tiles don't shift", async () => {
    await render([
      { id: "u1", status: "available", number: 1, borrower: null },
      { id: "u3", status: "available", number: 3, borrower: null },
    ]);
    expect(htmlText()).toContain("빈 자리"); // position 2 is a gap
    expect(htmlText()).toContain(">1<");
    expect(htmlText()).toContain(">3<");
  });

  it("colors tiles by status, greys out 사용불가, shows borrower for 대여중", async () => {
    await render([
      { id: "u1", status: "available", number: 1, borrower: null },
      { id: "u2", status: "borrowed", number: 2, borrower: "10507" },
      { id: "u3", status: "maintenance", number: 3, borrower: null },
      { id: "u4", status: "lost", number: 4, borrower: null },
    ]);
    expect(htmlText()).toContain("bg-green-100");
    expect(htmlText()).toContain("bg-teal-100");
    expect(htmlText()).toContain("bg-slate-100");
    expect(htmlText()).toContain("10507");
    expect(htmlText()).toContain("사용불가");
  });

  it("shows the return deadline and D-day on borrowed tiles", async () => {
    await render([
      {
        id: "u2",
        status: "borrowed",
        number: 2,
        borrower: "10507",
        dueDate: "2026-06-16T15:00:00.000Z",
        dueDateLabel: "6/17까지",
        dueBadgeLabel: "D-2",
        dueTone: "normal",
      },
    ]);
    expect(htmlText()).toContain("10507");
    expect(htmlText()).toContain("6/17까지");
    expect(htmlText()).toContain("D-2");
    expect(htmlText()).toContain("2번 우산, 대여중, 대여자 10507, 6/17까지 반납, D-2");
  });

  it("makes 대여가능/사용불가 tiles buttons and 대여중 non-interactive", async () => {
    await render([
      { id: "u1", status: "available", number: 1, borrower: null },
      { id: "u2", status: "borrowed", number: 2, borrower: "10507" },
      { id: "u3", status: "maintenance", number: 3, borrower: null },
    ]);
    expect(tileButton(1)).toBeTruthy();
    expect(tileButton(3)).toBeTruthy();
    expect(tileButton(2)).toBeUndefined(); // borrowed → not a button
  });

  it("renders the legend with each status label", async () => {
    await render([{ id: "u1", status: "available", number: 1, borrower: null }]);
    expect(htmlText()).toContain("대여 가능");
    expect(htmlText()).toContain("대여중");
    expect(htmlText()).toContain("사용불가");
    expect(htmlText()).not.toContain("타일을 눌러 관리");
  });
});

describe("UmbrellaRack — tile menu interaction", () => {
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

  async function render(umbrellas: U[]) {
    const { UmbrellaRack } = await import("@/app/bo/umbrellas/UmbrellaRack");
    act(() => {
      root = createRoot(container);
      root.render(<UmbrellaRack umbrellas={umbrellas} />);
    });
  }
  function tileButton(n: number) {
    const b = Array.from(document.querySelectorAll("button")).find((x) =>
      x.getAttribute("aria-label")?.startsWith(`${n}번 우산`),
    );
    if (!b) throw new Error(`tile ${n} not found`);
    return b;
  }
  function menuItem(text: string) {
    return Array.from(document.querySelectorAll('[role="menuitem"]')).find(
      (x) => x.textContent?.trim() === text,
    ) as HTMLButtonElement | undefined;
  }
  async function click(el: Element) {
    await act(async () => {
      el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  }
  const AVAIL: U = { id: "u1", status: "available", number: 1, borrower: null };
  const MAINT: U = { id: "u3", status: "maintenance", number: 3, borrower: null };
  const LOST: U = { id: "u5", status: "lost", number: 5, borrower: null };

  it("does not render an extra ellipsis affordance on actionable tiles", async () => {
    await render([AVAIL]);
    expect(tileButton(1).textContent).not.toContain("⋮");
  });

  it("opens only 사용불가 처리 for an available tile", async () => {
    await render([AVAIL]);
    await click(tileButton(1));
    expect(menuItem("사용불가 처리")).toBeTruthy();
    expect(menuItem("정상 복구")).toBeUndefined();
    expect(menuItem("삭제")).toBeUndefined();
  });

  it("opens only 정상 복구 for a 사용불가 tile", async () => {
    await render([MAINT]);
    await click(tileButton(3));
    expect(menuItem("정상 복구")).toBeTruthy();
    expect(menuItem("사용불가 처리")).toBeUndefined();
    expect(menuItem("삭제")).toBeUndefined();
  });

  it("opens only 정상 복구 for a lost tile (same branch as maintenance)", async () => {
    await render([LOST]);
    await click(tileButton(5));
    expect(menuItem("정상 복구")).toBeTruthy();
    expect(menuItem("사용불가 처리")).toBeUndefined();
    expect(menuItem("삭제")).toBeUndefined();
  });

  it("PATCHes status to maintenance and refreshes on 사용불가 처리", async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data: {} }));
    vi.stubGlobal("fetch", fetchMock);
    await render([AVAIL]);
    await click(tileButton(1));
    await click(menuItem("사용불가 처리")!);
    expect(fetchMock).toHaveBeenCalledWith("/api/umbrellas/u1/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "maintenance" }),
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("re-syncs via refresh when a status change fails", async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: false, message: "충돌" }, { status: 409 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("alert", vi.fn());
    await render([AVAIL]);
    await click(tileButton(1));
    await click(menuItem("사용불가 처리")!);
    expect(window.alert).toHaveBeenCalledWith("충돌");
    expect(refresh).toHaveBeenCalled(); // truth re-sync even on failure
  });

  it("keeps only one menu open at a time", async () => {
    await render([AVAIL, MAINT]);
    await click(tileButton(1));
    expect(document.querySelectorAll('[role="menu"]').length).toBe(1);
    await click(tileButton(3));
    expect(document.querySelectorAll('[role="menu"]').length).toBe(1);
  });

  it("closes on Escape", async () => {
    await render([AVAIL]);
    await click(tileButton(1));
    expect(document.querySelector('[role="menu"]')).toBeTruthy();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(document.querySelector('[role="menu"]')).toBeNull();
  });
});
