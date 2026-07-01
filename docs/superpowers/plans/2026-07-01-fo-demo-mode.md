# FO 체험(데모) 모드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 배포 링크 방문자가 물리 우산 QR 없이, 폰 카메라로 화면의 딥링크 QR을 실제로 찍어 umb-29/30/31 데모 우산의 대여~반납 전체를 체험할 수 있게 한다.

**Architecture:** 데모 우산 3개(umb-29/30/31)를 실제 DB에 두되, `/fo/demo` 안내 화면이 열릴 때마다 리셋한다. QR은 순수 텍스트가 아니라 절대 URL 딥링크(`origin/fo?u=umb-29`)를 인코딩해 폰 기본 카메라로 열린다. `FoFlow`가 `?u=` 파라미터를 읽어(allowlist 검증) 곧바로 대여 흐름으로 착지하며, 학번은 고정값 `00000`으로 자동 입력·잠금된다.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind v4, `@supabase/supabase-js`, `qrcode`, Vitest.

## Global Constraints

- 커밋 메시지는 순수 텍스트. AI/Claude 작성·공동작성 표기 절대 금지.
- 데모 우산 id: `umb-29`, `umb-30`, `umb-31`. 데모 고정 학번: `00000` (제약 `^[0-9]{5}$` 통과).
- 딥링크 자동 시작은 **오직 데모 우산**에만 적용(그 외 `?u=`는 무시) — 실제 재고 원격 대여 구멍 차단.
- 리셋 엔드포인트 `/api/demo/reset`는 관리자 인증 없음, 대상 id를 요청으로 받지 않고 `DEMO_UMBRELLA_IDS`로 하드 스코프.
- 기존 FO 스타일(teal 팔레트, Tailwind 유틸리티) 준수. 실제 운영 대여/반납 버튼 위계는 건드리지 않음.
- 컴포넌트 테스트: 파일 상단 `@vitest-environment jsdom`, `createRoot` + `act`. API 테스트: `vi.doMock("@/lib/supabase/server", ...)`.
- 사전조건: 데모 우산 3개는 이미 prod DB에 생성됨(수동 SQL). Task 1의 마이그레이션 파일은 재현용이며 prod에 재적용하지 않는다(`on conflict do nothing`).

---

### Task 1: 데모 상수·헬퍼 모듈 + 재현용 마이그레이션

**Files:**
- Create: `src/domain/demo.ts`
- Create: `supabase/migrations/20260701000000_add_demo_umbrellas.sql`
- Test: `tests/domain/demo.test.ts`

**Interfaces:**
- Produces:
  - `DEMO_UMBRELLA_IDS: readonly ["umb-29","umb-30","umb-31"]`
  - `DEMO_STUDENT_ID: "00000"`
  - `isDemoUmbrella(umbrellaId: string): boolean`
  - `parseDemoDeepLink(search: string): string | null` — 데모 우산 id면 반환, 아니면 null
  - `demoDeepLinkPath(umbrellaId: string): string` — 예 `/fo?u=umb-29`

- [ ] **Step 1: 실패 테스트 작성** — `tests/domain/demo.test.ts`

```ts
import { describe, expect, it } from "vitest";

import {
  DEMO_STUDENT_ID,
  DEMO_UMBRELLA_IDS,
  demoDeepLinkPath,
  isDemoUmbrella,
  parseDemoDeepLink,
} from "@/domain/demo";

describe("demo domain helpers", () => {
  it("registers exactly the three demo umbrellas", () => {
    expect(DEMO_UMBRELLA_IDS).toEqual(["umb-29", "umb-30", "umb-31"]);
  });

  it("uses a fixed 5-digit demo student id", () => {
    expect(DEMO_STUDENT_ID).toBe("00000");
    expect(/^\d{5}$/.test(DEMO_STUDENT_ID)).toBe(true);
  });

  it("recognizes demo umbrellas and rejects others", () => {
    expect(isDemoUmbrella("umb-29")).toBe(true);
    expect(isDemoUmbrella("umb-31")).toBe(true);
    expect(isDemoUmbrella("umb-5")).toBe(false);
    expect(isDemoUmbrella("")).toBe(false);
  });

  it("parses a valid demo deep link", () => {
    expect(parseDemoDeepLink("?u=umb-29")).toBe("umb-29");
    expect(parseDemoDeepLink("u=umb-30")).toBe("umb-30");
  });

  it("rejects non-demo, missing, or malformed deep links", () => {
    expect(parseDemoDeepLink("?u=umb-5")).toBeNull();
    expect(parseDemoDeepLink("?u=")).toBeNull();
    expect(parseDemoDeepLink("")).toBeNull();
    expect(parseDemoDeepLink("?other=umb-29")).toBeNull();
  });

  it("builds the relative deep-link path", () => {
    expect(demoDeepLinkPath("umb-29")).toBe("/fo?u=umb-29");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/domain/demo.test.ts`
Expected: FAIL — `Cannot find module '@/domain/demo'`

- [ ] **Step 3: 구현** — `src/domain/demo.ts`

```ts
export const DEMO_UMBRELLA_IDS = ["umb-29", "umb-30", "umb-31"] as const;

export const DEMO_STUDENT_ID = "00000";

export function isDemoUmbrella(umbrellaId: string): boolean {
  return (DEMO_UMBRELLA_IDS as readonly string[]).includes(umbrellaId);
}

/**
 * URL 쿼리스트링에서 `u` 딥링크 값을 읽어, 등록된 데모 우산일 때만 그 id를
 * 반환한다. 실제 재고/오탈자/누락은 모두 null → 딥링크가 실제 인벤토리
 * 대여를 자동 시작하는 일이 없다.
 */
export function parseDemoDeepLink(search: string): string | null {
  const params = new URLSearchParams(search);
  const umbrellaId = params.get("u");
  if (umbrellaId && isDemoUmbrella(umbrellaId)) {
    return umbrellaId;
  }
  return null;
}

/** 데모 우산의 FO 딥링크 상대경로. 예: "/fo?u=umb-29" */
export function demoDeepLinkPath(umbrellaId: string): string {
  return `/fo?u=${umbrellaId}`;
}
```

- [ ] **Step 4: 재현용 마이그레이션 작성** — `supabase/migrations/20260701000000_add_demo_umbrellas.sql`

```sql
-- 체험(데모)용 우산 3개: umb-29/30/31. 실제 학생에게는 빌려주지 않는 데모 전용.
-- prod 에는 이미 수동 적용됨. 재적용 안전을 위해 on conflict do nothing.
insert into public.umbrellas (id, label, qr_payload, status, number)
values
  ('umb-29', '29번 우산 (체험용)', 'umb-29', 'available', 29),
  ('umb-30', '30번 우산 (체험용)', 'umb-30', 'available', 30),
  ('umb-31', '31번 우산 (체험용)', 'umb-31', 'available', 31)
on conflict (id) do nothing;
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run tests/domain/demo.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: 커밋**

```bash
git add src/domain/demo.ts tests/domain/demo.test.ts supabase/migrations/20260701000000_add_demo_umbrellas.sql
git commit -m "feat: 데모 우산 상수·딥링크 헬퍼 및 마이그레이션"
```

---

### Task 2: 데모 리셋 API 라우트

**Files:**
- Create: `src/app/api/demo/reset/route.ts`
- Test: `tests/api/demo-reset-route.test.ts`

**Interfaces:**
- Consumes: `DEMO_UMBRELLA_IDS` (Task 1), `apiOk`/`apiError` (`@/lib/api/errors`), `createSupabaseServiceClient` (`@/lib/supabase/server`).
- Produces: `POST(): Promise<Response>` — 활성 데모 대여를 `returned_at`으로 종료하고 데모 우산을 `available`로 되돌림. 성공 시 `{ ok: true, data: { reset: DEMO_UMBRELLA_IDS } }`.

- [ ] **Step 1: 실패 테스트 작성** — `tests/api/demo-reset-route.test.ts`

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEMO_UMBRELLA_IDS } from "@/domain/demo";

type Recorded = {
  table: string;
  update?: unknown;
  in?: [string, readonly string[]];
  is?: [string, unknown];
};

function makeSupabase(recorded: Recorded[]) {
  return {
    from(table: string) {
      const rec: Recorded = { table };
      recorded.push(rec);
      const builder = {
        update(payload: unknown) {
          rec.update = payload;
          return builder;
        },
        in(column: string, values: readonly string[]) {
          rec.in = [column, values];
          return builder;
        },
        is(column: string, value: unknown) {
          rec.is = [column, value];
          return builder;
        },
        then(onFulfilled: (v: { error: null }) => unknown) {
          return Promise.resolve({ error: null }).then(onFulfilled);
        },
      };
      return builder;
    },
  };
}

describe("POST /api/demo/reset", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("resets only the demo umbrellas and their active rentals", async () => {
    const recorded: Recorded[] = [];
    vi.doMock("@/lib/supabase/server", () => ({
      createSupabaseServiceClient: () => makeSupabase(recorded),
    }));

    const { POST } = await import("@/app/api/demo/reset/route");
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, data: { reset: DEMO_UMBRELLA_IDS } });

    const rentals = recorded.find((r) => r.table === "rentals");
    const umbrellas = recorded.find((r) => r.table === "umbrellas");

    expect(rentals?.update).toEqual({ returned_at: expect.any(String) });
    expect(rentals?.in).toEqual(["umbrella_id", DEMO_UMBRELLA_IDS]);
    expect(rentals?.is).toEqual(["returned_at", null]);

    expect(umbrellas?.update).toMatchObject({ status: "available" });
    expect(umbrellas?.in).toEqual(["id", DEMO_UMBRELLA_IDS]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/api/demo-reset-route.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/demo/reset/route'`

- [ ] **Step 3: 구현** — `src/app/api/demo/reset/route.ts`

```ts
import { DEMO_UMBRELLA_IDS } from "@/domain/demo";
import { apiError, apiOk } from "@/lib/api/errors";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

// 공개(관리자 인증 없음) 리셋. DEMO_UMBRELLA_IDS 로 하드 스코프되어 실제
// 인벤토리는 절대 건드리지 않는다. 활성 데모 대여를 반납 처리하고 데모
// 우산을 available 로 되돌려, 다음 방문자가 항상 깨끗한 상태에서 시작한다.
export async function POST() {
  const supabase = createSupabaseServiceClient();
  const now = new Date().toISOString();
  const ids = DEMO_UMBRELLA_IDS as readonly string[];

  const { error: rentalError } = await supabase
    .from("rentals")
    .update({ returned_at: now })
    .in("umbrella_id", ids)
    .is("returned_at", null);

  if (rentalError) {
    return apiError(500, "demo_reset_failed", "체험 초기화에 실패했습니다.");
  }

  const { error: umbrellaError } = await supabase
    .from("umbrellas")
    .update({ status: "available", updated_at: now })
    .in("id", ids);

  if (umbrellaError) {
    return apiError(500, "demo_reset_failed", "체험 초기화에 실패했습니다.");
  }

  return apiOk({ reset: ids });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/api/demo-reset-route.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/app/api/demo/reset/route.ts tests/api/demo-reset-route.test.ts
git commit -m "feat: 데모 우산 리셋 API 라우트"
```

---

### Task 3: StudentIdPad 잠금(데모) 모드

**Files:**
- Modify: `src/app/fo/StudentIdPad.tsx`
- Test: `tests/app/student-id-pad-locked.test.tsx`

**Interfaces:**
- Produces: `StudentIdPad` 에 옵션 prop `locked?: boolean` 추가. `locked`일 때 키패드 비활성 + "체험 모드 · 학번 자동 입력" 안내 표시, 제출 버튼은 값 5자리면 활성 유지.

- [ ] **Step 1: 실패 테스트 작성** — `tests/app/student-id-pad-locked.test.tsx`

```tsx
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/app/student-id-pad-locked.test.tsx`
Expected: FAIL — 키패드 `1` 버튼이 `disabled=false` (locked prop 미지원), 안내 문구 없음

- [ ] **Step 3: 구현** — `src/app/fo/StudentIdPad.tsx` 전체를 아래로 교체

```tsx
"use client";

type StudentIdPadProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  locked?: boolean;
};

const STUDENT_ID_LENGTH = 5;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "clear"];

export function StudentIdPad({
  value,
  onChange,
  onSubmit,
  disabled = false,
  locked = false,
}: StudentIdPadProps) {
  function press(key: string) {
    if (disabled || locked) {
      return;
    }
    if (key === "back") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === "clear") {
      onChange("");
      return;
    }
    if (value.length < STUDENT_ID_LENGTH) {
      onChange(value + key);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-md flex-col items-center gap-7 md:max-w-lg md:gap-9">
      {locked ? (
        <p className="text-sm font-semibold text-teal-700 md:text-base">체험 모드 · 학번 자동 입력</p>
      ) : null}

      <div className="flex gap-3 md:gap-4" aria-label={`학번 ${value.length}자리 입력됨`}>
        {Array.from({ length: STUDENT_ID_LENGTH }).map((_, index) => (
          <span
            key={index}
            className={`h-3.5 w-3.5 rounded-full md:h-4 md:w-4 ${index < value.length ? "bg-teal-700" : "bg-slate-300"}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 md:gap-5">
        {KEYS.map((key) => {
          const isAction = key === "back" || key === "clear";
          const label = key === "back" ? "지움" : key === "clear" ? "초기화" : key;
          return (
            <button
              key={key}
              type="button"
              className={`flex h-[72px] w-[72px] items-center justify-center rounded-full border border-slate-200 bg-white font-bold text-slate-950 shadow-sm transition active:scale-95 active:bg-teal-50 disabled:text-slate-300 md:h-[96px] md:w-[96px] ${
                isAction ? "text-sm text-slate-500 md:text-base" : "text-2xl md:text-3xl"
              }`}
              disabled={disabled || locked}
              onClick={() => press(key)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="h-16 w-full rounded-2xl bg-teal-700 text-xl font-bold text-white transition active:bg-teal-800 disabled:bg-teal-100 disabled:text-teal-900 md:h-20 md:text-2xl"
        disabled={disabled || value.length !== STUDENT_ID_LENGTH}
        onClick={onSubmit}
      >
        대여 완료
      </button>
    </section>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인 (기존 StudentIdPad 테스트 회귀 포함)**

Run: `npx vitest run tests/app/student-id-pad-locked.test.tsx tests/app/student-id-pad.test.tsx`
Expected: PASS (신규 2 + 기존 전부)

- [ ] **Step 5: 커밋**

```bash
git add src/app/fo/StudentIdPad.tsx tests/app/student-id-pad-locked.test.tsx
git commit -m "feat: StudentIdPad 잠금 모드(데모 학번 자동)"
```

---

### Task 4: ResultScreen 보조 액션 버튼

**Files:**
- Modify: `src/app/fo/ResultScreen.tsx`
- Test: `tests/app/result-screen-secondary.test.tsx`

**Interfaces:**
- Produces: `ResultScreen` 에 옵션 prop `secondaryAction?: { label: string; onClick: () => void }`. 제공 시 "처음으로" 위에 teal 버튼을 렌더.

- [ ] **Step 1: 실패 테스트 작성** — `tests/app/result-screen-secondary.test.tsx`

```tsx
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/app/result-screen-secondary.test.tsx`
Expected: FAIL — 보조 버튼이 렌더되지 않음

- [ ] **Step 3: 구현** — `src/app/fo/ResultScreen.tsx` 전체를 아래로 교체

```tsx
"use client";

import { CheckIcon } from "@/app/fo/icons";

type ResultScreenProps = {
  variant: "success" | "error";
  message: string;
  onReset: () => void;
  secondaryAction?: { label: string; onClick: () => void };
};

export function ResultScreen({ variant, message, onReset, secondaryAction }: ResultScreenProps) {
  const isSuccess = variant === "success";

  return (
    <section className="flex flex-col items-center text-center">
      <span
        className={`fo-pop flex h-24 w-24 items-center justify-center rounded-full md:h-32 md:w-32 ${
          isSuccess ? "bg-[#e6f7f3] text-teal-700" : "bg-slate-100 text-slate-500"
        }`}
      >
        {isSuccess ? (
          <CheckIcon size={50} className="md:h-16 md:w-16" pathClassName="fo-check-draw" />
        ) : (
          <svg
            viewBox="0 0 24 24"
            width={48}
            height={48}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.4}
            strokeLinecap="round"
            aria-hidden="true"
            className="md:h-16 md:w-16"
          >
            <path d="M12 7 v7" />
            <path d="M12 17 h.01" />
          </svg>
        )}
      </span>

      <p className="mt-7 whitespace-pre-line break-keep text-2xl font-bold text-slate-950 md:mt-9 md:text-4xl">
        {message}
      </p>

      {secondaryAction ? (
        <button
          type="button"
          onClick={secondaryAction.onClick}
          className="mt-9 h-14 w-full max-w-md rounded-2xl bg-teal-700 text-lg font-bold text-white transition active:bg-teal-800 md:mt-11 md:h-16 md:max-w-lg md:text-2xl"
        >
          {secondaryAction.label}
        </button>
      ) : null}

      <button
        type="button"
        onClick={onReset}
        className={`h-14 w-full max-w-md rounded-2xl border border-[#d4e6e1] bg-white text-lg font-bold text-slate-950 transition active:bg-slate-50 md:h-16 md:max-w-lg md:text-2xl ${
          secondaryAction ? "mt-4 md:mt-4" : "mt-9 md:mt-11"
        }`}
      >
        처음으로
      </button>
    </section>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인 (기존 ResultScreen 테스트 회귀 포함)**

Run: `npx vitest run tests/app/result-screen-secondary.test.tsx tests/app/result-screen.test.tsx`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/app/fo/ResultScreen.tsx tests/app/result-screen-secondary.test.tsx
git commit -m "feat: ResultScreen 보조 액션 버튼"
```

---

### Task 5: FoFlow 딥링크 처리 + 홈 진입점

**Files:**
- Modify: `src/app/fo/FoFlow.tsx`
- Modify: `src/app/fo/ModePicker.tsx`
- Test: `tests/app/fo-demo-flow.test.tsx`

**Interfaces:**
- Consumes: `parseDemoDeepLink`, `DEMO_STUDENT_ID` (Task 1); `StudentIdPad` `locked` prop (Task 3); `ResultScreen` `secondaryAction` prop (Task 4).
- Produces: `/fo?u=<demo umbrella>` 진입 시 학번 자동·잠금 대여 → 성공 후 "반납해보기" 제공. 홈(`ModePicker`)에 `🧪 테스트하러 왔어요` → `/fo/demo` 링크.

- [ ] **Step 1: 실패 테스트 작성** — `tests/app/fo-demo-flow.test.tsx`

```tsx
/**
 * @vitest-environment jsdom
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function findButton(text: string) {
  const match = Array.from(document.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === text,
  );
  if (!match) throw new Error(`Button not found: ${text}`);
  return match;
}

describe("FO demo deep-link flow", () => {
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
    act(() => root?.unmount());
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/fo");
  });

  async function renderFlowAt(url: string) {
    window.history.replaceState(null, "", url);
    vi.doMock("@/app/fo/ScannerPanel", () => ({
      ScannerPanel: () => <div>scanner</div>,
    }));
    const { FoFlow } = await import("@/app/fo/FoFlow");
    act(() => {
      root = createRoot(container);
      root.render(<FoFlow />);
    });
  }

  it("?u=umb-30 → 학번 자동(00000) 대여 → 반납까지 체험", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/rentals/borrow")) {
        return Response.json({ ok: true, data: { umbrellaId: "umb-30", studentId: "00000" } });
      }
      return Response.json({
        ok: true,
        data: { umbrellaId: "umb-30", returnedAt: "2026-07-01T00:00:00Z", blacklisted: false },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await renderFlowAt("/fo?u=umb-30");

    expect(document.body.textContent).toContain("30번 우산");
    expect(document.body.textContent).toContain("체험 모드 · 학번 자동 입력");

    await act(async () => {
      findButton("대여 완료").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/rentals/borrow",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ umbrellaId: "umb-30", studentId: "00000" }),
      }),
    );
    expect(document.body.textContent).toContain("대여 완료");

    await act(async () => {
      findButton("방금 빌린 30번 우산 반납해보기").dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/rentals/return",
      expect.objectContaining({ method: "POST" }),
    );
    expect(document.body.textContent).toContain("반납 완료");
  });

  it("데모가 아닌 ?u= 는 무시하고 홈을 보여준다", async () => {
    await renderFlowAt("/fo?u=umb-5");
    expect(document.querySelector('button[aria-label="대여하기"]')).toBeTruthy();
    expect(document.body.textContent).not.toContain("체험 모드");
  });

  it("홈에 체험 진입 링크가 있다", async () => {
    await renderFlowAt("/fo");
    const link = Array.from(document.querySelectorAll("a")).find((a) =>
      a.textContent?.includes("테스트하러 왔어요"),
    );
    expect(link).toBeTruthy();
    expect(link?.getAttribute("href")).toBe("/fo/demo");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/app/fo-demo-flow.test.tsx`
Expected: FAIL — 딥링크 미처리(홈 렌더), 진입 링크 없음

- [ ] **Step 3: FoFlow 구현** — `src/app/fo/FoFlow.tsx` 전체를 아래로 교체

```tsx
"use client";

import { useEffect, useState } from "react";

import { ModePicker } from "@/app/fo/ModePicker";
import { ResultScreen } from "@/app/fo/ResultScreen";
import { ScannerPanel } from "@/app/fo/ScannerPanel";
import { StudentIdPad } from "@/app/fo/StudentIdPad";
import { type ApiResult, type Mode, umbrellaDisplayName } from "@/app/fo/types";
import { DEMO_STUDENT_ID, parseDemoDeepLink } from "@/domain/demo";

type Step = "home" | "scan" | "student_id" | "done" | "error";

function friendlyBorrowError(code: string, fallback: string): string {
  if (code === "umbrella_not_available") {
    return "이미 대여 중인 우산이에요.\n반납하려면 처음 화면에서 '반납'을 눌러주세요.";
  }
  if (code === "umbrella_not_found") {
    return "등록되지 않은 우산이에요.";
  }
  return fallback;
}

function friendlyReturnError(code: string, fallback: string): string {
  if (code === "active_rental_not_found") {
    return "대여 중인 우산이 아니에요.";
  }
  return fallback;
}

export function FoFlow() {
  const [step, setStep] = useState<Step>("home");
  const [mode, setMode] = useState<Mode>("borrow");
  const [umbrellaId, setUmbrellaId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [demoReturnable, setDemoReturnable] = useState(false);

  // 데모 딥링크: `/fo?u=umb-29` (allowlist 통과한 데모 우산만) → 고정 학번으로
  // 대여 흐름에 곧바로 착지. 새로고침 시 홈으로 돌아가도록 쿼리를 제거한다.
  useEffect(() => {
    const demoUmbrellaId = parseDemoDeepLink(window.location.search);
    if (!demoUmbrellaId) {
      return;
    }
    setIsDemo(true);
    setMode("borrow");
    setUmbrellaId(demoUmbrellaId);
    setStudentId(DEMO_STUDENT_ID);
    setStep("student_id");
    window.history.replaceState(null, "", "/fo");
  }, []);

  function reset() {
    setStep("home");
    setMode("borrow");
    setUmbrellaId("");
    setStudentId("");
    setMessage("");
    setIsSubmitting(false);
    setIsDemo(false);
    setDemoReturnable(false);
  }

  function pickMode(picked: Mode) {
    setMode(picked);
    setUmbrellaId("");
    setStudentId("");
    setMessage("");
    setStep("scan");
  }

  function handleScan(scannedUmbrellaId: string) {
    if (isSubmitting) {
      return;
    }
    setUmbrellaId(scannedUmbrellaId);
    if (mode === "borrow") {
      setStudentId("");
      setMessage("");
      setStep("student_id");
    } else {
      void returnUmbrella(scannedUmbrellaId);
    }
  }

  async function borrow() {
    setIsSubmitting(true);
    const response = await fetch("/api/rentals/borrow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ umbrellaId, studentId }),
    });
    const result = (await response.json()) as ApiResult<{ umbrellaId: string; studentId: string }>;
    setIsSubmitting(false);

    if (!response.ok) {
      setMessage(result.ok ? "대여 처리에 실패했습니다." : friendlyBorrowError(result.code, result.message));
      setStep("error");
      return;
    }

    if (isDemo) {
      setDemoReturnable(true);
    }
    setMessage(`${umbrellaDisplayName(umbrellaId)} 대여 완료`);
    setStep("done");
  }

  async function returnUmbrella(targetUmbrellaId: string) {
    setIsSubmitting(true);
    const response = await fetch("/api/rentals/return", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ umbrellaId: targetUmbrellaId }),
    });
    const result = (await response.json()) as ApiResult<{
      umbrellaId: string;
      returnedAt?: string;
      blacklisted?: boolean;
      blacklistUntil?: string;
    }>;
    setIsSubmitting(false);

    if (!response.ok) {
      setMessage(result.ok ? "반납 처리에 실패했습니다." : friendlyReturnError(result.code, result.message));
      setStep("error");
      return;
    }

    setDemoReturnable(false);
    if (result.ok && result.data.blacklisted && result.data.blacklistUntil) {
      const until = new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "long",
        day: "numeric",
      }).format(new Date(result.data.blacklistUntil));
      setMessage(`${umbrellaDisplayName(targetUmbrellaId)} 반납 완료\n연체로 ${until}까지 대여가 정지돼요`);
    } else {
      setMessage(`${umbrellaDisplayName(targetUmbrellaId)} 반납 완료`);
    }
    setStep("done");
  }

  return (
    <main className="min-h-screen bg-[#f5f9f8] px-6 py-8 text-slate-950">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col justify-center">
        <div key={step} className="fo-step-in">
          {step === "home" ? <ModePicker onPick={pickMode} /> : null}

          {step === "scan" ? (
            <ScannerPanel mode={mode} onScan={handleScan} onBack={reset} processing={isSubmitting} />
          ) : null}

          {step === "student_id" ? (
            <section className="flex flex-col gap-6 md:gap-8">
              <div className="mx-auto w-full max-w-md rounded-2xl border border-[#d4e6e1] bg-white p-5 text-center md:max-w-lg md:p-7">
                <p className="text-sm font-semibold text-teal-700 md:text-base">스캔한 우산</p>
                <p className="mt-1 break-keep text-3xl font-bold text-slate-950 md:text-4xl">
                  {umbrellaDisplayName(umbrellaId)}
                </p>
              </div>
              <StudentIdPad
                value={studentId}
                onChange={setStudentId}
                onSubmit={borrow}
                disabled={isSubmitting}
                locked={isDemo}
              />
            </section>
          ) : null}

          {step === "done" || step === "error" ? (
            <ResultScreen
              variant={step === "error" ? "error" : "success"}
              message={message}
              onReset={reset}
              secondaryAction={
                isDemo && step === "done" && demoReturnable
                  ? {
                      label: `방금 빌린 ${umbrellaDisplayName(umbrellaId)} 반납해보기`,
                      onClick: () => returnUmbrella(umbrellaId),
                    }
                  : undefined
              }
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: ModePicker 진입 링크 추가** — `src/app/fo/ModePicker.tsx` 의 마지막 `</p>` 바로 다음, `</section>` 앞에 링크 추가

기존:
```tsx
      <p className="mt-8 text-xs font-semibold text-slate-400 md:text-base">
        우산이 필요하면 대여, 다 썼으면 반납
      </p>
    </section>
```
변경 후:
```tsx
      <p className="mt-8 text-xs font-semibold text-slate-400 md:text-base">
        우산이 필요하면 대여, 다 썼으면 반납
      </p>

      <a
        href="/fo/demo"
        className="mt-4 text-xs font-semibold text-slate-400 underline underline-offset-4 md:text-sm"
      >
        🧪 테스트하러 왔어요
      </a>
    </section>
```

- [ ] **Step 5: 테스트 통과 확인 (기존 FoFlow/ModePicker 회귀 포함)**

Run: `npx vitest run tests/app/fo-demo-flow.test.tsx tests/app/fo-flow.test.tsx tests/app/mode-picker.test.tsx`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add src/app/fo/FoFlow.tsx src/app/fo/ModePicker.tsx tests/app/fo-demo-flow.test.tsx
git commit -m "feat: FO 데모 딥링크 대여~반납 흐름 및 홈 진입점"
```

---

### Task 6: `/fo/demo` 안내 화면 (딥링크 QR + 폴백)

**Files:**
- Create: `src/app/fo/demo/page.tsx`
- Create: `src/app/fo/demo/DemoPanel.tsx`
- Test: `tests/app/demo-panel.test.tsx`

**Interfaces:**
- Consumes: `DEMO_UMBRELLA_IDS`, `demoDeepLinkPath` (Task 1); `umbrellaDisplayName` (`@/app/fo/types`); `/api/demo/reset` (Task 2); `qrcode`.
- Produces: `DemoPanel` — 마운트 시 리셋 호출, 데모 우산별 절대 URL 딥링크 QR + 탭 폴백 링크 렌더. `DemoPage` 서버 컴포넌트가 이를 감쌈.

- [ ] **Step 1: 실패 테스트 작성** — `tests/app/demo-panel.test.tsx`

```tsx
/**
 * @vitest-environment jsdom
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn(async () => "data:image/png;base64,QR") },
}));

describe("DemoPanel", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => root?.unmount());
    vi.restoreAllMocks();
  });

  async function render() {
    const { DemoPanel } = await import("@/app/fo/demo/DemoPanel");
    await act(async () => {
      root = createRoot(container);
      root.render(<DemoPanel />);
    });
  }

  it("resets demo umbrellas on mount and renders fallback deep links", async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data: { reset: [] } }));
    vi.stubGlobal("fetch", fetchMock);

    await render();
    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/demo/reset", { method: "POST" });

    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(
      expect.arrayContaining(["/fo?u=umb-29", "/fo?u=umb-30", "/fo?u=umb-31"]),
    );
    expect(container.textContent).toContain("폰 카메라로 QR을 찍어보세요");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/app/demo-panel.test.tsx`
Expected: FAIL — `Cannot find module '@/app/fo/demo/DemoPanel'`

- [ ] **Step 3: DemoPanel 구현** — `src/app/fo/demo/DemoPanel.tsx`

```tsx
"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { umbrellaDisplayName } from "@/app/fo/types";
import { DEMO_UMBRELLA_IDS, demoDeepLinkPath } from "@/domain/demo";

export function DemoPanel() {
  const [qrByUmbrella, setQrByUmbrella] = useState<Record<string, string>>({});

  // 방문자마다 깨끗한 상태에서 시작하도록 데모 우산을 리셋(best-effort).
  useEffect(() => {
    void fetch("/api/demo/reset", { method: "POST" }).catch(() => {});
  }, []);

  // 폰 기본 카메라로 열리도록 절대 URL 딥링크 QR 생성.
  useEffect(() => {
    let cancelled = false;
    const origin = window.location.origin;
    Promise.all(
      DEMO_UMBRELLA_IDS.map(
        async (id) =>
          [
            id,
            await QRCode.toDataURL(`${origin}${demoDeepLinkPath(id)}`, { margin: 1, width: 240 }),
          ] as const,
      ),
    ).then((entries) => {
      if (!cancelled) setQrByUmbrella(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f5f9f8] px-6 py-10 text-slate-950">
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-8">
        <div className="text-center">
          <p className="text-sm font-bold tracking-wide text-teal-700 md:text-base">가온케어 체험</p>
          <h1 className="mt-2 break-keep text-2xl font-bold md:text-4xl">폰 카메라로 QR을 찍어보세요</h1>
          <p className="mt-2 break-keep text-base font-semibold text-slate-500 md:text-lg">
            찍으면 폰에서 바로 대여 화면이 열려요. (체험용 우산이라 실제 재고와 무관해요)
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-3">
          {DEMO_UMBRELLA_IDS.map((id) => (
            <div
              key={id}
              className="flex flex-col items-center gap-3 rounded-2xl border border-[#d4e6e1] bg-white p-5"
            >
              {qrByUmbrella[id] ? (
                // eslint-disable-next-line @next/next/no-img-element -- 생성된 data URL, next/image 이점 없음
                <img
                  alt={`${umbrellaDisplayName(id)} 체험 QR`}
                  src={qrByUmbrella[id]}
                  className="h-auto w-full max-w-[200px]"
                />
              ) : (
                <div className="flex aspect-square w-full max-w-[200px] items-center justify-center text-slate-300">
                  QR
                </div>
              )}
              <span className="text-lg font-bold md:text-xl">{umbrellaDisplayName(id)}</span>
            </div>
          ))}
        </div>

        <div className="flex w-full flex-col items-center gap-3 border-t border-[#d4e6e1] pt-6">
          <p className="text-sm font-semibold text-slate-500 md:text-base">QR을 못 찍겠으면 눌러서 체험</p>
          <div className="flex flex-wrap justify-center gap-3">
            {DEMO_UMBRELLA_IDS.map((id) => (
              <a
                key={id}
                href={demoDeepLinkPath(id)}
                className="rounded-xl border border-[#d4e6e1] bg-white px-5 py-3 text-base font-bold text-slate-700 transition active:bg-slate-50"
              >
                {umbrellaDisplayName(id)}
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: DemoPage 구현** — `src/app/fo/demo/page.tsx`

```tsx
import { DemoPanel } from "@/app/fo/demo/DemoPanel";

export default function DemoPage() {
  return <DemoPanel />;
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run tests/app/demo-panel.test.tsx`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add src/app/fo/demo/page.tsx src/app/fo/demo/DemoPanel.tsx tests/app/demo-panel.test.tsx
git commit -m "feat: /fo/demo 딥링크 QR 안내 화면"
```

---

### Task 7: 전체 검증

**Files:** (변경 없음 — 회귀/빌드 검증)

- [ ] **Step 1: 전체 테스트**

Run: `npm test`
Expected: PASS (기존 + 신규 전부)

- [ ] **Step 2: 타입체크**

Run: `npm run typecheck`
Expected: 에러 없음

- [ ] **Step 3: 린트**

Run: `npm run lint`
Expected: 에러 없음

- [ ] **Step 4: 프로덕션 빌드**

Run: `npm run build`
Expected: 성공 (`/fo/demo`, `/api/demo/reset` 라우트 생성 확인)

- [ ] **Step 5: 수동 e2e 체크리스트** (로컬 `npm run dev`, 실제 데모 우산 필요)

1. `/fo` → `🧪 테스트하러 왔어요` → `/fo/demo` 에 QR 3개 + 폴백 버튼 표시.
2. 폰 카메라로 QR 촬영 → 폰에서 `/fo` 가 "N번 우산 → 학번 자동" 으로 열림 → `대여 완료` → 성공.
3. 결과 화면 `방금 빌린 N번 우산 반납해보기` → 반납 성공.
4. BO 우산 목록에서 29/30/31 이 대여→반납 사이 상태가 바뀌었다가 `/fo/demo` 재방문 시 available 로 리셋되는지 확인.
5. 브라우저에서 `/fo?u=umb-5` 직접 접근 → 데모로 전환되지 않고 홈이 뜨는지 확인.

- [ ] **Step 6: 최종 커밋 (필요 시)**

```bash
git add -A
git commit -m "test: FO 데모 모드 전체 검증"
```

---

## Self-Review

**Spec coverage:**
- 진입점(`🧪 테스트하러 왔어요` → `/fo/demo`) → Task 5, 6 ✅
- 딥링크 QR(절대 URL) + 폰 기본 카메라 → Task 6 ✅
- allowlist(29/30/31)만 자동 시작 → Task 1(`parseDemoDeepLink`) + Task 5 ✅
- `/fo/demo` 열 때 리셋 → Task 2 + Task 6 ✅
- 대여 시작 + "반납도 해보기" → Task 5 ✅
- 데모 학번 고정 `00000` + 자동·잠금 → Task 1, 3, 5 ✅
- BO 목록 노출(라벨 `(체험용)`) → Task 1 마이그레이션(라벨) ✅ (BO는 기존 목록이 그대로 노출)
- 테스트(파싱/allowlist, 리셋 스코프, e2e) → Task 1, 2, 5, 7 ✅

**Placeholder scan:** TBD/TODO 없음. 모든 코드 단계에 실제 코드 포함.

**Type consistency:** `DEMO_UMBRELLA_IDS`/`DEMO_STUDENT_ID`/`parseDemoDeepLink`/`demoDeepLinkPath`(Task 1) → Task 2/5/6에서 동일 시그니처로 사용. `StudentIdPad.locked`(Task 3)·`ResultScreen.secondaryAction`(Task 4) → Task 5에서 동일 prop명으로 소비. 일치 확인.
