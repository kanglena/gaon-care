/**
 * @vitest-environment jsdom
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ModePicker } from "@/app/fo/ModePicker";

function findByLabel(label: string) {
  const el = document.querySelector(`button[aria-label="${label}"]`);
  if (!el) {
    throw new Error(`Button not found: ${label}`);
  }
  return el;
}

function click(element: Element) {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("ModePicker", () => {
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

  function render(onPick: (mode: "borrow" | "return") => void) {
    act(() => {
      root = createRoot(container);
      root.render(<ModePicker onPick={onPick} />);
    });
  }

  it("대여하기/반납하기 버튼을 보여준다", () => {
    render(() => {});
    expect(document.body.textContent).toContain("대여하기");
    expect(document.body.textContent).toContain("반납하기");
  });

  it("대여하기 클릭 시 onPick('borrow')", () => {
    const onPick = vi.fn();
    render(onPick);
    click(findByLabel("대여하기"));
    expect(onPick).toHaveBeenCalledWith("borrow");
  });

  it("반납하기 클릭 시 onPick('return')", () => {
    const onPick = vi.fn();
    render(onPick);
    click(findByLabel("반납하기"));
    expect(onPick).toHaveBeenCalledWith("return");
  });
});
