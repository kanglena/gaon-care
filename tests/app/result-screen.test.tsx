/**
 * @vitest-environment jsdom
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ResultScreen } from "@/app/fo/ResultScreen";

function findButton(text: string) {
  const match = Array.from(document.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === text,
  );
  if (!match) {
    throw new Error(`Button not found: ${text}`);
  }
  return match;
}

describe("ResultScreen", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => root?.unmount());
    container.remove();
  });

  function render(props: React.ComponentProps<typeof ResultScreen>) {
    act(() => {
      root = createRoot(container);
      root.render(<ResultScreen {...props} />);
    });
  }

  it("메시지와 처음으로 버튼을 보여준다", () => {
    render({ variant: "success", message: "3번 우산 대여 완료", onReset: () => {} });
    expect(document.body.textContent).toContain("3번 우산 대여 완료");
    expect(() => findButton("처음으로")).not.toThrow();
  });

  it("처음으로 클릭 시 onReset 호출", () => {
    const onReset = vi.fn();
    render({ variant: "error", message: "대여 중인 우산이 아니에요.", onReset });
    act(() => {
      findButton("처음으로").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onReset).toHaveBeenCalled();
  });
});
