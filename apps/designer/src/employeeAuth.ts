const EMPLOYEE_AUTH_KEY = "carescope.employee.auth";

export type EmployeeUser = {
  name: string;
  email: string;
  department?: string;
};

export function readEmployeeUser(): EmployeeUser | null {
  try {
    const raw = localStorage.getItem(EMPLOYEE_AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EmployeeUser;
    if (!parsed?.email || !parsed?.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isEmployeeSignedIn(): boolean {
  return readEmployeeUser() !== null;
}

export function writeEmployeeUser(user: EmployeeUser): void {
  localStorage.setItem(EMPLOYEE_AUTH_KEY, JSON.stringify(user));
}

export function clearEmployeeUser(): void {
  localStorage.removeItem(EMPLOYEE_AUTH_KEY);
}
