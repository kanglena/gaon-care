/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const UMBRELLAS = [
  { id: "umb-1", label: "1번 우산", qr_payload: "umb-1", number: 1 },
  { id: "umb-2", label: "2번 우산", qr_payload: "umb-2", number: 2 },
  { id: "umb-3", label: "3번 우산", qr_payload: "umb-3", number: 3 },
];

function findButton(text: string) {
  const match = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === text,
  );
  if (!match) throw new Error(`Button not found: ${text}`);
  return match;
}

function cardButton(label: string) {
  const match = Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.includes(label));
  if (!match) throw new Error(`Card not found: ${label}`);
  return match;
}

function imgCount() {
  return document.querySelectorAll("img").length;
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("PrintableLabels selective QR printing", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    document.body.innerHTML = "";
    container = document.createElement("div");
    document.body.appendChild(container);
    vi.doMock("qrcode", () => ({
      default: { toDataURL: vi.fn(async () => "data:image/png;base64,FAKE") },
    }));
  });

  afterEach(() => {
    act(() => root?.unmount());
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function flush() {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  async function render() {
    const { PrintableLabels } = await import("@/app/bo/umbrellas/print/PrintableLabels");
    act(() => {
      root = createRoot(container);
      root.render(<PrintableLabels umbrellas={UMBRELLAS} />);
    });
    await flush();
  }

  it("selects every umbrella on entry and renders a QR for each", async () => {
    await render();
    expect(imgCount()).toBe(3);
    expect(findButton("선택 3개 인쇄 (⌘P)")).toBeTruthy();
  });

  it("toggles a single umbrella off by clicking its card", async () => {
    await render();
    await act(async () => {
      cardButton("2번 우산").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(imgCount()).toBe(2);
    expect(findButton("선택 2개 인쇄 (⌘P)")).toBeTruthy();
  });

  it("clears and re-selects via the 전체 buttons", async () => {
    await render();
    await act(async () => {
      findButton("전체 해제").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(imgCount()).toBe(0);
    expect((findButton("선택 0개 인쇄 (⌘P)") as HTMLButtonElement).disabled).toBe(true);

    await act(async () => {
      findButton("전체 선택").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(imgCount()).toBe(3);
  });

  it("selects only the umbrellas matched by a comma list", async () => {
    await render();
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    await act(async () => {
      setInputValue(input, "1,3");
    });
    await flush();
    expect(imgCount()).toBe(2);
  });

  it("selects an inclusive range from the range input", async () => {
    await render();
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    await act(async () => {
      setInputValue(input, "2-3");
    });
    await flush();
    expect(imgCount()).toBe(2);
  });

  it("keeps the current selection when the range input is cleared", async () => {
    await render();
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    await act(async () => {
      setInputValue(input, "1");
    });
    await flush();
    expect(imgCount()).toBe(1);
    await act(async () => {
      setInputValue(input, "");
    });
    await flush();
    expect(imgCount()).toBe(1); // empty = no-op, selection unchanged
  });

  it("calls window.print when the print button is pressed", async () => {
    const printMock = vi.fn();
    vi.stubGlobal("print", printMock);
    await render();
    await act(async () => {
      findButton("선택 3개 인쇄 (⌘P)").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(printMock).toHaveBeenCalled();
  });

  it("shows 'QR 생성 중…' and disables print until generation completes", async () => {
    let resolveQr: (v: string) => void = () => {};
    vi.doMock("qrcode", () => ({
      default: { toDataURL: vi.fn(() => new Promise<string>((resolve) => { resolveQr = resolve; })) },
    }));
    const { PrintableLabels } = await import("@/app/bo/umbrellas/print/PrintableLabels");
    act(() => {
      root = createRoot(container);
      root.render(<PrintableLabels umbrellas={[{ id: "umb-1", label: "1번 우산", qr_payload: "umb-1", number: 1 }]} />);
    });

    const pending = findButton("QR 생성 중…");
    expect((pending as HTMLButtonElement).disabled).toBe(true);

    await act(async () => {
      resolveQr("data:image/png;base64,FAKE");
      await Promise.resolve();
    });
    expect(findButton("선택 1개 인쇄 (⌘P)")).toBeTruthy();
  });
});
