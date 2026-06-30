"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BlacklistReleaseButton({ blacklistId }: { blacklistId: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleRelease() {
    setIsLoading(true);
    const response = await fetch("/api/blacklist/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blacklistId }),
    });
    setIsLoading(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      alert(body.message ?? "해제에 실패했습니다.");
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={handleRelease}
      disabled={isLoading}
      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:bg-slate-100 disabled:opacity-40"
    >
      {isLoading ? "처리 중…" : "해제"}
    </button>
  );
}
