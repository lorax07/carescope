export const LIMS_USERNAME = "admin";
export const LIMS_PASSWORD = "password";

const KEY = "carescope.lims.session";

export type LimsSession = {
  username: string;
  clientName: string;
  labName: string;
  envLabel: string;
};

export function readLimsSession(): LimsSession | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LimsSession;
    if (!parsed.username || !parsed.envLabel) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLimsSession(session: LimsSession): void {
  sessionStorage.setItem(KEY, JSON.stringify(session));
}
