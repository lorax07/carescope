import { MemoryIntrasiteStore } from "./memory-store.js";
import { PostgresIntrasiteStore } from "./postgres-store.js";
import type { IntrasiteStore } from "./types.js";

let store: IntrasiteStore | null = null;

export function adminSeed(): { email: string; password: string; name: string } {
  return {
    email: process.env["INTRASITE_ADMIN_EMAIL"] ?? "admin@carescope.local",
    password: process.env["INTRASITE_ADMIN_PASSWORD"] ?? "ChangeMeNow!",
    name: process.env["INTRASITE_ADMIN_NAME"] ?? "Intrasite Admin",
  };
}

export function tenantHeader(): string {
  return process.env["INTRASITE_TENANT_HEADER"] ?? "x-tenant-id";
}

export function labHeader(): string {
  return process.env["INTRASITE_LAB_HEADER"] ?? "x-lab-id";
}

export function instanceHostPattern(): string {
  return process.env["INTRASITE_INSTANCE_HOST_PATTERN"] ?? "{slug}.intrasite.local";
}

export async function initIntrasite(options?: {
  store?: "memory" | "postgres";
  reset?: boolean;
}): Promise<IntrasiteStore> {
  if (store && !options?.reset) return store;

  const kind =
    options?.store ??
    (process.env["INTRASITE_STORE"] as "memory" | "postgres" | undefined) ??
    (process.env["DATABASE_URL"] ? "postgres" : "memory");

  if (kind === "postgres") {
    const databaseUrl = process.env["DATABASE_URL"];
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required when INTRASITE_STORE=postgres");
    }
    const postgres = new PostgresIntrasiteStore(databaseUrl);
    await postgres.init(adminSeed());
    store = postgres;
    return store;
  }

  const memory = new MemoryIntrasiteStore();
  await memory.seed(adminSeed());
  store = memory;
  return store;
}

export function getIntrasiteStore(): IntrasiteStore {
  if (!store) {
    throw new Error("Intrasite store is not initialized. Call initIntrasite() first.");
  }
  return store;
}

export async function resetIntrasiteForTests(): Promise<IntrasiteStore> {
  process.env["INTRASITE_SEED_DEMO"] = "false";
  store = null;
  return initIntrasite({ store: "memory", reset: true });
}
