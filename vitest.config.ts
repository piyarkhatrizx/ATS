import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "node:path";

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

  return {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
        // next-auth's env module imports the extensionless specifier, which
        // Vite will not resolve on its own.
        "next/server": "next/server.js",
      },
    },
    test: {
      environment: "node",
      include: ["test/**/*.test.ts"],
      // next-auth is ESM with extensionless internal imports; inlining it lets
      // the alias above resolve them.
      server: { deps: { inline: ["next-auth"] } },
    },
  };
});
