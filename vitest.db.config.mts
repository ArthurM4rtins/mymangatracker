import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Testes que tocam o Postgres de verdade. Rodam por `pnpm test:db`, depois de
// `docker compose up -d`. Ficam fora do `pnpm test` para que a suíte padrão
// continue verde sem banco nenhum.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/repositories/setup.ts"],
    include: ["tests/repositories/**/*.test.ts"],
    // Uma conexão de cada vez: os testes limpam as tabelas entre si.
    fileParallelism: false,
  },
});
