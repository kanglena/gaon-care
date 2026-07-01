"use client";

type StudentIdPadProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  locked?: boolean;
};

const STUDENT_ID_LENGTH = 5;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "clear"];

export function StudentIdPad({
  value,
  onChange,
  onSubmit,
  disabled = false,
  locked = false,
}: StudentIdPadProps) {
  function press(key: string) {
    if (disabled || locked) {
      return;
    }
    if (key === "back") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === "clear") {
      onChange("");
      return;
    }
    if (value.length < STUDENT_ID_LENGTH) {
      onChange(value + key);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-md flex-col items-center gap-7 md:max-w-lg md:gap-9">
      {locked ? (
        <p className="text-sm font-semibold text-teal-700 md:text-base">체험 모드 · 학번 자동 입력</p>
      ) : null}

      <div className="flex gap-3 md:gap-4" aria-label={`학번 ${value.length}자리 입력됨`}>
        {Array.from({ length: STUDENT_ID_LENGTH }).map((_, index) => (
          <span
            key={index}
            className={`h-3.5 w-3.5 rounded-full md:h-4 md:w-4 ${index < value.length ? "bg-teal-700" : "bg-slate-300"}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 md:gap-5">
        {KEYS.map((key) => {
          const isAction = key === "back" || key === "clear";
          const label = key === "back" ? "지움" : key === "clear" ? "초기화" : key;
          return (
            <button
              key={key}
              type="button"
              className={`flex h-[72px] w-[72px] items-center justify-center rounded-full border border-slate-200 bg-white font-bold text-slate-950 shadow-sm transition active:scale-95 active:bg-teal-50 disabled:text-slate-300 md:h-[96px] md:w-[96px] ${
                isAction ? "text-sm text-slate-500 md:text-base" : "text-2xl md:text-3xl"
              }`}
              disabled={disabled || locked}
              onClick={() => press(key)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="h-16 w-full rounded-2xl bg-teal-700 text-xl font-bold text-white transition active:bg-teal-800 disabled:bg-teal-100 disabled:text-teal-900 md:h-20 md:text-2xl"
        disabled={disabled || value.length !== STUDENT_ID_LENGTH}
        onClick={onSubmit}
      >
        대여 완료
      </button>
    </section>
  );
}
