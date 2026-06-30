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

function mockPrintableLabels() {
  vi.doMock("@/app/bo/umbrellas/print/PrintableLabels", () => ({
    PrintableLabels: ({ umbrellas }: { umbrellas: { id: string; label: string }[] }) => (
      <div data-testid="printable">
        {umbrellas.map((u) => (
          <span key={u.id}>{u.label}</span>
        ))}
      </div>
    ),
  }));
}

describe("BO QR print page (hybrid)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockAdminCookie();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("fetches the inventory on the server and hands it to the client selector", async () => {
    const umbrellas = [
      { id: "umb-1", label: "1번 우산", qr_payload: "umb-1", status: "available" },
      { id: "umb-2", label: "2번 우산", qr_payload: "umb-2", status: "available" },
    ];
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data: { umbrellas } }));
    vi.stubGlobal("fetch", fetchMock);
    mockPrintableLabels();

    const PrintPage = (await import("@/app/bo/umbrellas/print/page")).default;
    const html = renderToStaticMarkup(await PrintPage());

    expect(html).toContain("우산 QR 라벨");
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/umbrellas", {
      cache: "no-store",
      headers: { cookie: `${ADMIN_COOKIE_NAME}=${ADMIN_TOKEN}` },
    });
    expect(html).toContain("1번 우산");
    expect(html).toContain("2번 우산");
    // QR must NOT be generated on the server anymore
    expect(html).not.toContain("data:image");
  });

  it("renders an empty state when there are no umbrellas", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: true, data: { umbrellas: [] } })));
    mockPrintableLabels();

    const PrintPage = (await import("@/app/bo/umbrellas/print/page")).default;
    const html = renderToStaticMarkup(await PrintPage());

    expect(html).toContain("등록된 우산이 없습니다.");
  });

  it("renders the API error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ ok: false, code: "err", message: "우산 목록을 불러오지 못했습니다." })),
    );
    mockPrintableLabels();

    const PrintPage = (await import("@/app/bo/umbrellas/print/page")).default;
    const html = renderToStaticMarkup(await PrintPage());

    expect(html).toContain("우산 목록을 불러오지 못했습니다.");
  });
});
