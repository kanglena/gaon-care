"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BoLoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const result = (await response.json()) as { ok: boolean; message?: string };
    setIsSubmitting(false);

    if (!response.ok || !result.ok) {
      setError(result.message ?? "비밀번호가 틀렸습니다.");
      return;
    }

    router.push("/bo");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-bold text-teal-700">gaon-care</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">학생회 관리자</h1>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label htmlFor="bo-password" className="sr-only">
            관리자 비밀번호
          </label>
          <input
            id="bo-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="관리자 비밀번호"
            className="h-12 rounded-md border border-slate-200 px-4 text-base focus:border-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500"
            required
            autoFocus
          />
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 rounded-md bg-teal-700 font-bold text-white transition active:bg-teal-800 disabled:bg-teal-200 disabled:text-teal-500"
          >
            {isSubmitting ? "확인 중…" : "로그인"}
          </button>
        </form>
      </div>
    </main>
  );
}
