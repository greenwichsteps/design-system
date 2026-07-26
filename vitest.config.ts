import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["test/**/*.spec.ts"],
    // Builds dist/ before collection, so dist-contract.spec.ts can import the
    // published artifacts directly. See test/global-setup.ts.
    globalSetup: ["./test/global-setup.ts"],
  },
});
