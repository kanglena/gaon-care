"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/bo", label: "대시보드" },
  { href: "/bo/umbrellas", label: "재고 관리" },
  { href: "/bo/blacklist", label: "블랙리스트" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/bo") return pathname === "/bo";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function BoNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-slate-200 bg-white print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="text-sm font-bold text-teal-700">gaon-care</span>
          <div className="flex items-center gap-1">
            {TABS.map((tab) => {
              const active = isActive(pathname, tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-md px-3 py-1.5 text-sm font-bold transition ${
                    active
                      ? "bg-teal-50 text-teal-700"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
        <form action="/api/admin/logout" method="post">
          <button
            type="submit"
            className="rounded-md bg-slate-100 px-4 py-2 text-sm font-bold text-slate-500 transition active:bg-slate-200"
          >
            로그아웃
          </button>
        </form>
      </div>
    </nav>
  );
}
