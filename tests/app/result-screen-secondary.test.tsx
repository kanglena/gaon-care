/**
 * @vitest-environment jsdom
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ResultScreen } from "@/app/fo/ResultScreen";

describe("ResultScreen secondary action", () => {
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

  function render(props: Partial<React.ComponentProps<typeof ResultScreen>>) {
    act(() => {
      root = createRoot(container);
      root.render(
        <ResultScreen variant="success" message="30번 우산 대여 완료" onReset={() => {}} {...props} />,
      );
    });
  }

  function button(text: string) {
    return Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === text,
    );
  }

  it("renders the secondary action and fires its handler", () => {
    const onClick = vi.fn();
    render({ secondaryAction: { label: "방금 빌린 30번 우산 반납해보기", onClick } });

    const btn = button("방금 빌린 30번 우산 반납해보기");
    expect(btn).toBeTruthy();
    act(() => btn!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("omits the secondary action when not provided", () => {
    render({});
    expect(button("방금 빌린 30번 우산 반납해보기")).toBeUndefined();
    expect(button("처음으로")).toBeTruthy();
  });
});
