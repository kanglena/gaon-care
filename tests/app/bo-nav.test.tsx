import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// next/link mock that passes through className / aria-current so active state is observable
function mockNextLink() {
  vi.doMock("next/link", () => ({
    default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
      <a href={href} {...props}>
        {children}
      </a>
    ),
  }));
}

function mockPathname(pathname: string) {
  vi.doMock("next/navigation", () => ({ usePathname: () => pathname }));
}

// Extract the <a> tag whose visible text is exactly `label`
function anchorFor(html: string, label: string): string {
  const match = html.match(new RegExp(`<a[^>]*>${label}</a>`));
  if (!match) throw new Error(`No anchor found for label "${label}"`);
  return match[0];
}

describe("BoNav", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders all three tabs and a logout submit button (POST form, not a GET link)", async () => {
    mockNextLink();
    mockPathname("/bo");
    const BoNav = (await import("@/app/bo/BoNav")).default;

    const html = renderToStaticMarkup(<BoNav />);

    expect(html).toContain("대시보드");
    expect(html).toContain("재고 관리");
    expect(html).toContain("블랙리스트");
    expect(html).not.toContain("QR 출력");
    // logout is a POST form submit, not a prefetchable GET link
    expect(html).toContain('action="/api/admin/logout"');
    expect(html).toContain('method="post"');
    expect(html).not.toContain('href="/api/admin/logout"');
  });

  it("marks 블랙리스트 active on /bo/blacklist", async () => {
    mockNextLink();
    mockPathname("/bo/blacklist");
    const BoNav = (await import("@/app/bo/BoNav")).default;

    const html = renderToStaticMarkup(<BoNav />);

    expect(anchorFor(html, "블랙리스트")).toContain('aria-current="page"');
    expect(anchorFor(html, "대시보드")).not.toContain('aria-current="page"');
  });

  it("marks 대시보드 active on /bo (and 재고 관리 inactive)", async () => {
    mockNextLink();
    mockPathname("/bo");
    const BoNav = (await import("@/app/bo/BoNav")).default;

    const html = renderToStaticMarkup(<BoNav />);

    expect(anchorFor(html, "대시보드")).toContain('aria-current="page"');
    expect(anchorFor(html, "재고 관리")).not.toContain('aria-current="page"');
  });

  it("marks 재고 관리 active on /bo/umbrellas (and 대시보드 inactive)", async () => {
    mockNextLink();
    mockPathname("/bo/umbrellas");
    const BoNav = (await import("@/app/bo/BoNav")).default;

    const html = renderToStaticMarkup(<BoNav />);

    expect(anchorFor(html, "재고 관리")).toContain('aria-current="page"');
    expect(anchorFor(html, "대시보드")).not.toContain('aria-current="page"');
  });

  it("keeps 재고 관리 active on the QR print sub-page /bo/umbrellas/print", async () => {
    mockNextLink();
    mockPathname("/bo/umbrellas/print");
    const BoNav = (await import("@/app/bo/BoNav")).default;

    const html = renderToStaticMarkup(<BoNav />);

    expect(anchorFor(html, "재고 관리")).toContain('aria-current="page"');
    expect(anchorFor(html, "대시보드")).not.toContain('aria-current="page"');
  });
});
