"use client";

import { UmbrellaTile, type Umbrella } from "./UmbrellaTile";

const LEGEND = [
  { key: "available", label: "대여 가능", swatch: "border-green-300 bg-green-100" },
  { key: "borrowed", label: "대여중", swatch: "border-teal-300 bg-teal-100" },
  { key: "unavailable", label: "사용불가", swatch: "border-slate-300 bg-slate-100" },
] as const;

function counts(umbrellas: Umbrella[]) {
  let available = 0;
  let borrowed = 0;
  let unavailable = 0;
  for (const u of umbrellas) {
    if (u.status === "available") available += 1;
    else if (u.status === "borrowed") borrowed += 1;
    else unavailable += 1;
  }
  return { available, borrowed, unavailable };
}

export function UmbrellaRack({ umbrellas }: { umbrellas: Umbrella[] }) {
  const maxNumber = umbrellas.reduce((m, u) => Math.max(m, u.number), 0);
  const byNumber = new Map(umbrellas.map((u) => [u.number, u]));
  const c = counts(umbrellas);
  const positions = Array.from({ length: maxNumber }, (_, i) => i + 1);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        {LEGEND.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className={`inline-block h-3.5 w-3.5 rounded-sm border ${s.swatch}`} aria-hidden="true" />
            {s.label}{" "}
            <b className="text-slate-900">
              {s.key === "available" ? c.available : s.key === "borrowed" ? c.borrowed : c.unavailable}
            </b>
          </span>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-7">
        {positions.map((n) => {
          const umbrella = byNumber.get(n);
          if (!umbrella) {
            return (
              <div
                key={`gap-${n}`}
                aria-hidden="true"
                className="flex min-h-[74px] items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/40"
              >
                <span className="text-xs text-slate-300">빈 자리</span>
              </div>
            );
          }
          return <UmbrellaTile key={umbrella.id} umbrella={umbrella} alignRight={(n - 1) % 7 >= 4} />;
        })}
      </div>
    </section>
  );
}
