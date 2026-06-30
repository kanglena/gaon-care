/**
 * @vitest-environment jsdom
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StudentIdPad } from "@/app/fo/StudentIdPad";

function findButton(text: string) {
  const match = Array.from(document.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === text,
  );
  if (!match) {
    throw new Error(`Button not found: ${text}`);
  }
  return match;
}

function click(element: Element) {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("StudentIdPad", () => {
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

  function render(props: Partial<React.ComponentProps<typeof StudentIdPad>> = {}) {
    const merged = {
      value: "",
      onChange: () => {},
      onSubmit: () => {},
      ...props,
    };
    act(() => {
      root = createRoot(container);
      root.render(<StudentIdPad {...merged} />);
    });
  }

  it("숫자/지움/초기화/대여 완료 버튼을 렌더한다", () => {
    render();
    for (const key of ["1", "2", "3", "0", "지움", "초기화", "대여 완료"]) {
      expect(() => findButton(key)).not.toThrow();
    }
  });

  it("입력 자릿수를 점(aria-label)으로 표시한다", () => {
    render({ value: "12" });
    expect(document.querySelector('[aria-label="학번 2자리 입력됨"]')).not.toBeNull();
  });

  it("숫자 키 입력 시 기존 값에 덧붙여 onChange 호출", () => {
    const onChange = vi.fn();
    render({ value: "10", onChange });
    click(findButton("5"));
    expect(onChange).toHaveBeenCalledWith("105");
  });

  it("5자리 미만이면 대여 완료 비활성, 5자리면 활성", () => {
    const onSubmit = vi.fn();
    render({ value: "1234", onSubmit });
    expect((findButton("대여 완료") as HTMLButtonElement).disabled).toBe(true);

    act(() => root.unmount());
    render({ value: "12345", onSubmit });
    const submit = findButton("대여 완료") as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    click(submit);
    expect(onSubmit).toHaveBeenCalled();
  });
});
