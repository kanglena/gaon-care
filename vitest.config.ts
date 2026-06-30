import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    // Never discover tests inside git worktrees / agent scratch dirs under .claude/;
    // they carry stale copies of the source tree and double-run (or cross-resolve) tests.
    exclude: [...configDefaults.exclude, "**/.claude/**"],
  },
});
