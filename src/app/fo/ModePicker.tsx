"use client";

import { CheckIcon, UmbrellaIcon } from "@/app/fo/icons";
import type { Mode } from "@/app/fo/types";

type ModePickerProps = {
  onPick: (mode: Mode) => void;
};

export function ModePicker({ onPick }: ModePickerProps) {
  return (
    <section className="flex w-full flex-col items-center md:min-h-[calc(100vh-4rem)]">
      <p className="text-sm font-bold tracking-wide text-teal-700 md:text-base">가온케어</p>
      <h1 className="mt-2 break-keep text-2xl font-bold text-slate-950 md:mt-3 md:text-4xl">
        우산 대여 · 반납
      </h1>

      <div className="mt-10 flex w-full gap-4 md:mt-8 md:flex-1 md:flex-col md:justify-center md:gap-6">
        <button
          type="button"
          aria-label="대여하기"
          onClick={() => onPick("borrow")}
          className="flex h-44 flex-1 flex-col items-center justify-center gap-3.5 rounded-[22px] bg-teal-700 text-white shadow-[0_10px_22px_rgba(15,118,110,0.24)] transition active:scale-[0.97] md:h-[clamp(220px,30vh,380px)] md:flex-none md:flex-row md:gap-8 md:rounded-[28px] md:px-14"
        >
          <span className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-white/15 md:h-32 md:w-32">
            <UmbrellaIcon size={32} className="md:h-16 md:w-16" />
          </span>
          <span className="text-center md:text-left">
            <span className="block text-xl font-bold md:text-5xl">대여하기</span>
            <span className="mt-1 block text-sm font-semibold text-teal-50 md:mt-2 md:text-2xl">
              우산을 빌려요
            </span>
          </span>
        </button>

        <button
          type="button"
          aria-label="반납하기"
          onClick={() => onPick("return")}
          className="flex h-44 flex-1 flex-col items-center justify-center gap-3.5 rounded-[22px] border border-[#d4e6e1] bg-white text-slate-950 transition active:scale-[0.97] md:h-[clamp(220px,30vh,380px)] md:flex-none md:flex-row md:gap-8 md:rounded-[28px] md:px-14"
        >
          <span className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-[#e6f7f3] text-teal-700 md:h-32 md:w-32">
            <CheckIcon size={30} className="md:h-14 md:w-14" />
          </span>
          <span className="text-center md:text-left">
            <span className="block text-xl font-bold md:text-5xl">반납하기</span>
            <span className="mt-1 block text-sm font-semibold text-slate-500 md:mt-2 md:text-2xl">
              다 쓴 우산 반납
            </span>
          </span>
        </button>
      </div>

      <p className="mt-8 text-xs font-semibold text-slate-400 md:text-base">
        우산이 필요하면 대여, 다 썼으면 반납
      </p>
    </section>
  );
}
