import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Só o que roda sem banco. Os testes de repositório vão no
    // `vitest.db.config.mts`, por `pnpm test:db`.
    include: ["tests/domain/**/*.test.ts"],
  },
});
