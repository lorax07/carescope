import type { PatientRecord, PhysicianRecord } from "./types";

export function personName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`.replace(/\s+/g, " ").trim();
}

export function sameAccountName(accounts: { name: string }[], name: string): boolean {
  const key = name.trim().toLowerCase();
  if (!key) return false;
  return accounts.some((account) => account.name.trim().toLowerCase() === key);
}

export function accountSuggestions<T extends { name: string }>(accounts: T[], query: string): T[] {
  const key = query.trim().toLowerCase();
  if (key.length < 2) return [];
  return accounts.filter((account) => account.name.toLowerCase().includes(key)).slice(0, 6);
}

export function npiError(npi: string): string {
  const trimmed = npi.trim();
  if (!trimmed) return "Enter the 10-digit NPI.";
  if (!/^\d{10}$/.test(trimmed)) return "An NPI is 10 digits.";
  return "";
}

export function dobError(dob: string, today = new Date()): string {
  if (!dob) return "Enter a date of birth.";
  const parsed = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "Enter a valid date of birth.";
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (parsed > start) return "Date of birth cannot be in the future.";
  if (parsed.getFullYear() < 1900) return "Date of birth is too far in the past.";
  return "";
}

export function patientDuplicate(
  patients: PatientRecord[],
  accountId: string,
  firstName: string,
  lastName: string,
  dob: string,
): PatientRecord | undefined {
  const first = firstName.trim().toLowerCase();
  const last = lastName.trim().toLowerCase();
  return patients.find(
    (patient) =>
      patient.accountId === accountId &&
      patient.firstName.trim().toLowerCase() === first &&
      patient.lastName.trim().toLowerCase() === last &&
      patient.dob === dob,
  );
}

export function mrnTaken(patients: PatientRecord[], accountId: string, mrn: string): boolean {
  const key = mrn.trim().toLowerCase();
  if (!key) return false;
  return patients.some((patient) => patient.accountId === accountId && patient.mrn.trim().toLowerCase() === key);
}

export function physicianByNpi(physicians: PhysicianRecord[], npi: string): PhysicianRecord | undefined {
  const key = npi.trim();
  if (!/^\d{10}$/.test(key)) return undefined;
  return physicians.find((physician) => physician.npi === key);
}
