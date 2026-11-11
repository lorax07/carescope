export type AccountImportRow = {
  name: string;
  contact: string;
  role: string;
  industry: string;
  ready: boolean;
  reason: string;
};

export type ContactImportRow = {
  name: string;
  role: string;
  email: string;
  phone: string;
  accountName: string;
  accountId: string;
  ready: boolean;
  reason: string;
};

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (char === "\n") {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") cell += char;
  }
  if (cell || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }
  return rows.filter((item) => item.some(Boolean));
}

function headerKey(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ");
}

function columnIndex(headers: string[], names: string[]): number {
  return headers.findIndex((header) => names.includes(headerKey(header)));
}

function table(text: string, aliases: Record<string, string[]>): { headers: string[]; records: Record<string, string>[] } | null {
  const grid = parseCsv(text).slice(0, 201);
  if (!grid.length) return null;
  const known = new Set(Object.values(aliases).flat());
  const first = grid[0] ?? [];
  const hasHeader = first.some((cell) => known.has(headerKey(cell)));
  const headers = hasHeader ? first : Object.keys(aliases);
  const body = hasHeader ? grid.slice(1) : grid;
  const indexes = Object.fromEntries(Object.entries(aliases).map(([field, names]) => [field, columnIndex(headers, names)]));
  return {
    headers,
    records: body.map((cells) =>
      Object.fromEntries(Object.entries(indexes).map(([field, index]) => [field, index >= 0 ? cells[index] ?? "" : ""])),
    ),
  };
}

export function previewAccountCsv(text: string): AccountImportRow[] {
  const parsed = table(text, {
    name: ["account name", "account", "name", "client"],
    contact: ["primary contact", "contact", "contact name"],
    role: ["role", "title"],
    industry: ["sector", "industry"],
  });
  if (!parsed) return [];
  return parsed.records.map((row) => {
    const name = row.name ?? "";
    const contact = row.contact ?? "";
    const ready = Boolean(name && contact);
    return {
      name,
      contact,
      role: row.role ?? "",
      industry: row.industry ?? "",
      ready,
      reason: ready ? "Ready" : "Account name and primary contact are required",
    };
  });
}

export function previewContactCsv(text: string, accounts: { id: string; name: string }[]): ContactImportRow[] {
  const parsed = table(text, {
    name: ["name", "contact", "contact name"],
    role: ["role", "title"],
    email: ["email"],
    phone: ["phone"],
    account: ["account", "account name", "client"],
  });
  if (!parsed) return [];
  return parsed.records.map((row) => {
    const name = row.name ?? "";
    const accountName = row.account ?? "";
    const account = accounts.find((item) => item.name.toLowerCase() === accountName.toLowerCase());
    const reason = !name ? "Name is required" : !account ? "Account was not found" : "Ready";
    return {
      name,
      role: row.role ?? "",
      email: row.email ?? "",
      phone: row.phone ?? "",
      accountName,
      accountId: account?.id ?? "",
      ready: Boolean(name && account),
      reason,
    };
  });
}
