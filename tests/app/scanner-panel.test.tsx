/**
 * @vitest-environment jsdom
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("ScannerPanel", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.resetModules();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => root?.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function mockReader(impl: () => Promise<{ stop: () => void }>) {
    vi.doMock("@zxing/browser", () => ({
      BrowserQRCodeReader: class {
        decodeFromConstraints = impl;
        decodeFromVideoDevice = impl;
      },
    }));
  }

  async function render(mode: "borrow" | "return") {
    const { ScannerPanel } = await import("@/app/fo/ScannerPanel");
    await act(async () => {
      root = createRoot(container);
      root.render(
        <ScannerPanel mode={mode} onScan={() => {}} onBack={() => {}} />,
      );
    });
  }

  it("대여 모드 캡션을 보여준다", async () => {
    mockReader(async () => ({ stop() {} }));
    await render("borrow");
    expect(document.body.textContent).toContain("빌릴 우산의 QR을 비춰주세요");
  });

  it("반납 모드 캡션을 보여준다", async () => {
    mockReader(async () => ({ stop() {} }));
    await render("return");
    expect(document.body.textContent).toContain("반납할 우산의 QR을 비춰주세요");
  });

  it("카메라 실패 시 권한 안내를 보여준다", async () => {
    vi.useFakeTimers();
    mockReader(async () => {
      throw new Error("no camera");
    });
    await render("borrow");
    await act(async () => {
      vi.runOnlyPendingTimers();
    });
    expect(document.body.textContent).toContain("카메라를 열 수 없어요");
  });

  it("같은 QR은 한 번만, 최신 onScan 핸들러로 전달한다", async () => {
    vi.useFakeTimers();
    let scanCb: ((result: { getText: () => string }) => void) | undefined;
    vi.doMock("@zxing/browser", () => ({
      BrowserQRCodeReader: class {
        decodeFromConstraints = async (
          _constraints: unknown,
          _video: unknown,
          cb: (result: { getText: () => string }) => void,
        ) => {
          scanCb = cb;
          return { stop() {} };
        };
        decodeFromVideoDevice = async (
          _device: unknown,
          _video: unknown,
          cb: (result: { getText: () => string }) => void,
        ) => {
          scanCb = cb;
          return { stop() {} };
        };
      },
    }));

    const { ScannerPanel } = await import("@/app/fo/ScannerPanel");
    const first = vi.fn();
    const second = vi.fn();

    await act(async () => {
      root = createRoot(container);
      root.render(<ScannerPanel mode="borrow" onScan={first} onBack={() => {}} />);
    });
    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    // duplicate same text → fires once
    act(() => {
      scanCb?.({ getText: () => "umb-7" });
      scanCb?.({ getText: () => "umb-7" });
    });
    expect(first).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledWith("umb-7");

    // re-render with a new handler; next distinct scan routes to it (ref decoupling)
    await act(async () => {
      root.render(<ScannerPanel mode="borrow" onScan={second} onBack={() => {}} />);
    });
    act(() => {
      scanCb?.({ getText: () => "umb-9" });
    });
    expect(second).toHaveBeenCalledWith("umb-9");
    expect(first).toHaveBeenCalledTimes(1);
  });

  it("QR 스캔 화면에서 우산 번호 직접 입력을 허용하지 않는다", async () => {
    mockReader(async () => ({ stop() {} }));
    const { ScannerPanel } = await import("@/app/fo/ScannerPanel");

    await act(async () => {
      root = createRoot(container);
      root.render(<ScannerPanel mode="borrow" onScan={() => {}} onBack={() => {}} />);
    });

    expect(document.body.textContent).not.toContain("직접 입력");
    expect(document.querySelector("input")).toBeNull();
  });

  it("첫 렌더 직후에는 비디오 엘리먼트가 안정된 뒤 스캐너를 시작한다", async () => {
    vi.useFakeTimers();
    const decodeFromConstraints = vi.fn(async () => ({ stop() {} }));
    vi.doMock("@zxing/browser", () => ({
      BrowserQRCodeReader: class {
        decodeFromConstraints = decodeFromConstraints;
      },
    }));

    const { ScannerPanel } = await import("@/app/fo/ScannerPanel");

    await act(async () => {
      root = createRoot(container);
      root.render(<ScannerPanel mode="borrow" onScan={() => {}} onBack={() => {}} />);
    });

    expect(decodeFromConstraints).not.toHaveBeenCalled();

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    expect(decodeFromConstraints).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
