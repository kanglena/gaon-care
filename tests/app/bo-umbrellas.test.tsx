import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_COOKIE_NAME } from "@/lib/auth/admin";

const ADMIN_TOKEN = "test-admin-token";

function mockAdminCookie(token: string | undefined = ADMIN_TOKEN) {
  vi.doMock("next/headers", () => ({
    cookies: async () => ({
      get: (name: string) => (token && name === ADMIN_COOKIE_NAME ? { value: token } : undefined),
    }),
  }));
}

function mockNextLink() {
  vi.doMock("next/link", () => ({
    default: ({ href, children }: { href: string; children: React.ReactNode }) => (
      <a href={href}>{children}</a>
    ),
  }));
}

function mockChildren() {
  vi.doMock("@/app/bo/umbrellas/AddUmbrellaButton", () => ({
    AddUmbrellaButton: ({ nextNumber }: { nextNumber: number }) => <button>+ 우산 추가 ({nextNumber})</button>,
  }));
  vi.doMock("@/app/bo/umbrellas/UmbrellaRack", () => ({
    UmbrellaRack: ({ umbrellas }: { umbrellas: { id: string; number: number; status: string; borrower: string | null }[] }) => (
      <div data-testid="rack">
        {umbrellas.map((u) => (
          <span key={u.id}>
            타일-{u.number}-{u.status}-{u.borrower ?? ""}
          </span>
        ))}
      </div>
    ),
  }));
}

describe("BO umbrellas management page", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockAdminCookie();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("passes all umbrellas (incl. borrower) to the rack and the next number to the add button", async () => {
    const umbrellas = [
      { id: "umb-1", label: "1번", qr_payload: "umb-1", status: "available", number: 1, borrower: null },
      { id: "umb-2", label: "2번", qr_payload: "umb-2", status: "borrowed", number: 2, borrower: "10507" },
      { id: "umb-4", label: "4번", qr_payload: "umb-4", status: "maintenance", number: 4, borrower: null },
    ];
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data: { umbrellas } }));
    vi.stubGlobal("fetch", fetchMock);
    mockNextLink();
    mockChildren();

    const UmbrellasPage = (await import("@/app/bo/umbrellas/page")).default;
    const html = renderToStaticMarkup(await UmbrellasPage());

    expect(html).toContain("우산 재고 관리");
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/umbrellas", {
      cache: "no-store",
      headers: { cookie: `${ADMIN_COOKIE_NAME}=${ADMIN_TOKEN}` },
    });
    expect(html).toContain("타일-1-available-");
    expect(html).toContain("타일-2-borrowed-10507");
    expect(html).toContain("타일-4-maintenance-");
    expect(html).toContain("+ 우산 추가 (5)"); // max(4)+1
  });

  it("links to the QR print page from the header", async () => {
    const umbrellas = [{ id: "umb-1", label: "1번", qr_payload: "umb-1", status: "available", number: 1, borrower: null }];
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: true, data: { umbrellas } })));
    mockNextLink();
    mockChildren();

    const UmbrellasPage = (await import("@/app/bo/umbrellas/page")).default;
    const html = renderToStaticMarkup(await UmbrellasPage());
    expect(html).toContain("QR 출력");
    expect(html).toContain('href="/bo/umbrellas/print"');
  });

  it("shows the empty state when there are no umbrellas", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: true, data: { umbrellas: [] } })));
    mockNextLink();
    mockChildren();

    const UmbrellasPage = (await import("@/app/bo/umbrellas/page")).default;
    const html = renderToStaticMarkup(await UmbrellasPage());
    expect(html).toContain("등록된 우산이 없습니다.");
  });

  it("renders error when API returns {ok:false}", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: false, code: "err", message: "우산 목록 오류" })));
    mockNextLink();
    mockChildren();

    const UmbrellasPage = (await import("@/app/bo/umbrellas/page")).default;
    const html = renderToStaticMarkup(await UmbrellasPage());
    expect(html).toContain("우산 목록 오류");
  });
});
