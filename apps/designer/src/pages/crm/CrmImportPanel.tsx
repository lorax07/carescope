import { useState } from "react";
import { addClientAccount, addClientContact } from "../../crm";
import { previewAccountCsv, previewContactCsv, type AccountImportRow, type ContactImportRow } from "../../crmImport";
import type { CrmAccount } from "../../crmAccounts";

function template(kind: "account" | "contact"): string {
  if (kind === "account") return "Account name,Primary contact,Role,Sector\nNorthline Labs,A. Shah,Lab director,Pharmaceutical\n";
  return "Name,Role,Email,Phone,Account\nA. Shah,Lab director,a.shah@northline.example,503-555-0100,Vertex Materials\n";
}

function downloadTemplate(kind: "account" | "contact") {
  const file = new Blob([template(kind)], { type: "text/csv" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = kind === "account" ? "accounts-template.csv" : "contacts-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function CrmImportPanel({
  kind,
  accounts,
  onDone,
}: {
  kind: "account" | "contact";
  accounts: CrmAccount[];
  onDone: (accountId: string) => void;
}) {
  const [fileName, setFileName] = useState("");
  const [accountsRows, setAccountsRows] = useState<AccountImportRow[]>([]);
  const [contactRows, setContactRows] = useState<ContactImportRow[]>([]);
  const rows = kind === "account" ? accountsRows : contactRows;
  const ready = rows.filter((row) => row.ready);

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setFileName(file.name);
      if (kind === "account") setAccountsRows(previewAccountCsv(text));
      else setContactRows(previewContactCsv(text, accounts));
    };
    reader.readAsText(file);
  }

  function commitImport() {
    if (kind === "account") {
      const ids = accountsRows.filter((row) => row.ready).map((row) => addClientAccount(row)).filter((id): id is string => Boolean(id));
      const first = ids[0];
      if (first) onDone(first);
      return;
    }
    const ids = contactRows.filter((row) => row.ready).map((row) => addClientContact(row)).filter((id): id is string => Boolean(id));
    const first = ids[0];
    if (first) onDone(first);
  }

  return (
    <div className="crm-import">
      <p>Drop a CSV, or start from the template. Ready rows are imported. Rows that are missing a required field stay out.</p>
      <div className="crm-import-actions">
        <button type="button" className="btn" onClick={() => downloadTemplate(kind)}>
          Download template
        </button>
      </div>
      <label
        className="crm-import-drop"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file) readFile(file);
        }}
      >
        <span>{fileName || "Drop a CSV here, or browse"}</span>
        <input
          type="file"
          accept=".csv,text/csv"
          aria-label={kind === "account" ? "Import accounts file" : "Import contacts file"}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) readFile(file);
          }}
        />
      </label>
      {rows.length ? (
        <>
          <p>
            {ready.length} ready · {rows.length - ready.length} skipped
          </p>
          <div className="crm-import-preview">
            <table>
              <thead>
                <tr>
                  {kind === "account" ? (
                    <>
                      <th>Account</th>
                      <th>Contact</th>
                      <th>Check</th>
                    </>
                  ) : (
                    <>
                      <th>Contact</th>
                      <th>Account</th>
                      <th>Check</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 8).map((row, index) => (
                  <tr key={`${row.name}-${index}`}>
                    <td>{row.name || "—"}</td>
                    <td>{kind === "account" ? (row as AccountImportRow).contact || "—" : (row as ContactImportRow).accountName || "—"}</td>
                    <td>{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      <button type="button" className="btn btn-primary" disabled={!ready.length} onClick={commitImport}>
        {ready.length ? `Import ${ready.length} ${kind === "account" ? "accounts" : "contacts"}` : `Import ${kind === "account" ? "accounts" : "contacts"}`}
      </button>
    </div>
  );
}
