const KEY = "carescope.lab-resource-access.v1";

export const LAB_RESOURCE_ACCESS_EVENT = "carescope-lab-resources";

export const LAB_RESOURCES = [
  { id: "patients", label: "Patients", detail: "People the laboratory tests or treats." },
  { id: "inventory", label: "Inventory", detail: "Materials the laboratory keeps on hand." },
  { id: "sites", label: "Laboratories & sites", detail: "Sites that belong to this laboratory." },
  { id: "storage", label: "Storage locations", detail: "Where samples and materials sit." },
  { id: "lots", label: "Lots & materials", detail: "Lots in use and the materials they belong to." },
  { id: "reference", label: "Shared reference data", detail: "Lists the laboratory shares across sites." },
] as const;

export type LabResourceId = (typeof LAB_RESOURCES)[number]["id"];

export function labResourceById(id: string) {
  return LAB_RESOURCES.find((item) => item.id === id) ?? null;
}

type GrantMap = Record<string, string[]>;

function readGrants(): GrantMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as GrantMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeGrants(grants: GrantMap): void {
  localStorage.setItem(KEY, JSON.stringify(grants));
  window.dispatchEvent(new Event(LAB_RESOURCE_ACCESS_EVENT));
}

export function grantedUserIds(labId: string): string[] {
  return readGrants()[labId] ?? [];
}

export function hasLabResourceAccess(grants: GrantMap, labId: string | undefined, userId: string | undefined): boolean {
  if (!labId || !userId) return false;
  return (grants[labId] ?? []).includes(userId);
}

export function userCanSeeLabResources(labId: string | undefined, userId: string | undefined): boolean {
  return hasLabResourceAccess(readGrants(), labId, userId);
}

export function setLabResourceAccess(labId: string, userId: string, allowed: boolean): void {
  const grants = readGrants();
  const current = new Set(grants[labId] ?? []);
  if (allowed) current.add(userId);
  else current.delete(userId);
  grants[labId] = [...current];
  writeGrants(grants);
}
