import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["agents/**/*.test.ts", "apps/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@adaptlearn/shared": path.resolve(__dirname, "agents/shared"),
      "@adaptlearn/agent-master": path.resolve(__dirname, "agents/master"),
    },
  },
});
