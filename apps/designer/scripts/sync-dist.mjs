import { cpSync, rmSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const designerDist = path.resolve(__dirname, "../dist");
const rootDist = path.resolve(__dirname, "../../../dist");

if (!existsSync(designerDist)) {
  console.error("Designer dist missing:", designerDist);
  process.exit(1);
}

// Mirror to monorepo root dist/ for Vercel projects whose Root Directory is the repo root
rmSync(rootDist, { recursive: true, force: true });
mkdirSync(rootDist, { recursive: true });
cpSync(designerDist, rootDist, { recursive: true });
console.log("Synced designer dist →", rootDist);
