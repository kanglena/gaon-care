/**
 * @vitest-environment jsdom
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { StudentIdPad } from "@/app/fo/StudentIdPad";

describe("StudentIdPad locked (demo) mode", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    document.body.innerHTML = "";
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => root?.unmount());
  });

  function render() {
    act(() => {
      root = createRoot(container);
      root.render(<StudentIdPad value="00000" onChange={() => {}} onSubmit={() => {}} locked />);
    });
  }

  function button(text: string) {
    return Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === text,
    ) as HTMLButtonElement | undefined;
  }

  it("disables the keypad but keeps 대여 완료 enabled", () => {
    render();
    expect(button("1")?.disabled).toBe(true);
    expect(button("대여 완료")?.disabled).toBe(false);
  });

  it("shows the demo auto-entry note", () => {
    render();
    expect(container.textContent).toContain("체험 모드 · 학번 자동 입력");
  });
});
