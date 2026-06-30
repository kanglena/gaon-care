"use client";

import { useState } from "react";

import { ModePicker } from "@/app/fo/ModePicker";
import { ResultScreen } from "@/app/fo/ResultScreen";
import { ScannerPanel } from "@/app/fo/ScannerPanel";
import { StudentIdPad } from "@/app/fo/StudentIdPad";
import { type ApiResult, type Mode, umbrellaDisplayName } from "@/app/fo/types";

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

  function reset() {
    setStep("home");
    setMode("borrow");
    setUmbrellaId("");
    setStudentId("");
    setMessage("");
    setIsSubmitting(false);
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
              />
            </section>
          ) : null}

          {step === "done" || step === "error" ? (
            <ResultScreen
              variant={step === "error" ? "error" : "success"}
              message={message}
              onReset={reset}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}
