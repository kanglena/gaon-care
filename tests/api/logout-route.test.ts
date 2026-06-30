import { describe, expect, it } from "vitest";
import { ADMIN_COOKIE_NAME } from "@/lib/auth/admin";

describe("POST /api/admin/logout", () => {
  it("exposes POST (not GET) so logout cannot be prefetched", async () => {
    const mod = await import("@/app/api/admin/logout/route");
    expect(mod.POST).toBeTypeOf("function");
    expect("GET" in mod).toBe(false);
  });

  it("clears the admin cookie and redirects to /bo with 303", async () => {
    const { POST } = await import("@/app/api/admin/logout/route");
    const response = await POST(new Request("http://localhost/api/admin/logout", { method: "POST" }));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/bo");
    expect(response.headers.get("set-cookie") ?? "").toContain(ADMIN_COOKIE_NAME);
  });
});
