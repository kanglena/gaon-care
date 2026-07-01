import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEMO_UMBRELLA_IDS } from "@/domain/demo";

type Recorded = {
  table: string;
  update?: unknown;
  in?: [string, readonly string[]];
  is?: [string, unknown];
};

function makeSupabase(recorded: Recorded[]) {
  return {
    from(table: string) {
      const rec: Recorded = { table };
      recorded.push(rec);
      const builder = {
        update(payload: unknown) {
          rec.update = payload;
          return builder;
        },
        in(column: string, values: readonly string[]) {
          rec.in = [column, values];
          return builder;
        },
        is(column: string, value: unknown) {
          rec.is = [column, value];
          return builder;
        },
        then(onFulfilled: (v: { error: null }) => unknown) {
          return Promise.resolve({ error: null }).then(onFulfilled);
        },
      };
      return builder;
    },
  };
}

describe("POST /api/demo/reset", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("resets only the demo umbrellas and their active rentals", async () => {
    const recorded: Recorded[] = [];
    vi.doMock("@/lib/supabase/server", () => ({
      createSupabaseServiceClient: () => makeSupabase(recorded),
    }));

    const { POST } = await import("@/app/api/demo/reset/route");
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, data: { reset: DEMO_UMBRELLA_IDS } });

    const rentals = recorded.find((r) => r.table === "rentals");
    const umbrellas = recorded.find((r) => r.table === "umbrellas");

    expect(rentals?.update).toEqual({ returned_at: expect.any(String) });
    expect(rentals?.in).toEqual(["umbrella_id", DEMO_UMBRELLA_IDS]);
    expect(rentals?.is).toEqual(["returned_at", null]);

    expect(umbrellas?.update).toMatchObject({ status: "available" });
    expect(umbrellas?.in).toEqual(["id", DEMO_UMBRELLA_IDS]);
  });
});
