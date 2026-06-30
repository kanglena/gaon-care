"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddUmbrellaButton({ nextNumber }: { nextNumber: number }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    if (!window.confirm(`다음 번호인 ${nextNumber}번 우산을 추가할까요?`)) return;

    setIsLoading(true);
    const response = await fetch("/api/umbrellas", { method: "POST" });
    setIsLoading(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      window.alert(body.message ?? "우산 추가에 실패했습니다.");
      return;
    }

    const body = (await response.json().catch(() => ({}))) as { data?: { number?: number } };
    const created = body.data?.number ?? nextNumber;
    window.alert(`${created}번 우산이 추가되었습니다.`);
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="rounded-md border border-teal-200 bg-white px-4 py-2.5 text-sm font-bold text-teal-700 transition hover:bg-teal-50 active:bg-teal-100 disabled:opacity-40"
    >
      {isLoading ? "추가 중…" : "+ 우산 추가"}
    </button>
  );
}
