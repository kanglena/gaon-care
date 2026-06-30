/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function findButton(text: string) {
  const match = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === text,
  );
  if (!match) throw new Error(`Button not found: ${text}`);
  return match;
}

const refresh = vi.fn();

describe("umbrella inventory action buttons", () => {
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

  it("AddUmbrellaButton confirms, posts, alerts the created number, and refreshes", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    const alertMock = vi.fn();
    vi.stubGlobal("alert", alertMock);
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data: { id: "umb-29", number: 29 } }));
    vi.stubGlobal("fetch", fetchMock);
    const { AddUmbrellaButton } = await import("@/app/bo/umbrellas/AddUmbrellaButton");

    act(() => {
      root = createRoot(container);
      root.render(<AddUmbrellaButton nextNumber={29} />);
    });

    await act(async () => {
      findButton("+ 우산 추가").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/umbrellas", { method: "POST" });
    expect(alertMock).toHaveBeenCalledWith("29번 우산이 추가되었습니다.");
    expect(refresh).toHaveBeenCalled();
  });

  it("AddUmbrellaButton does nothing when the confirm is dismissed", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { AddUmbrellaButton } = await import("@/app/bo/umbrellas/AddUmbrellaButton");

    act(() => {
      root = createRoot(container);
      root.render(<AddUmbrellaButton nextNumber={5} />);
    });

    await act(async () => {
      findButton("+ 우산 추가").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
