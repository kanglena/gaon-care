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
