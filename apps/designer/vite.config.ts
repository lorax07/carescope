import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import fs from "node:fs";

/** Resolve NodeNext .js imports in TS sources to sibling .ts files. */
function resolveTsFromJs() {
  return {
    name: "resolve-ts-from-js",
    enforce: "pre" as const,
    resolveId(source: string, importer?: string) {
      if (!importer || !source.endsWith(".js")) return null;
      if (!importer.includes(`${path.sep}packages${path.sep}workflow-core${path.sep}`)) {
        return null;
      }
      const candidate = path.resolve(path.dirname(importer), source.replace(/\.js$/, ".ts"));
      if (fs.existsSync(candidate)) return candidate;
      return null;
    },
  };
}

export default defineConfig({
  plugins: [resolveTsFromJs(), react()],
  resolve: {
    alias: {
      "@carescope/workflow-core": path.resolve(
        __dirname,
        "../../packages/workflow-core/src/index.ts"
      ),
    },
  },
  // Emit to apps/designer/dist so Vercel Root Directory + outputDirectory "dist" match
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
      "/graphql": "http://localhost:4000",
    },
  },
  optimizeDeps: {
    exclude: ["@carescope/workflow-core"],
  },
});
