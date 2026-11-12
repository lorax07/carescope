import { useMemo, useState } from "react";
import type { AccountStatus } from "../../crmAccounts";
import type { DirectoryContact } from "../../crm/directory";
import type { AccountWorkspaceDraft, ContactWorkspaceDraft } from "../../crm";

type DraftContact = ContactWorkspaceDraft;

function snapshot(account: AccountWorkspaceDraft, contacts: DraftContact[]) {
  return JSON.stringify({ account, contacts });
}

export function AccountEditDialog({
  account,
  contacts,
  directory,
  onClose,
  onSave,
}: {
  account: AccountWorkspaceDraft & { id: string };
  contacts: DirectoryContact[];
  directory: DirectoryContact[];
  onClose: () => void;
  onSave: (account: AccountWorkspaceDraft, contacts: DraftContact[]) => boolean;
}) {
  const initialAccount: AccountWorkspaceDraft = {
    name: account.name,
    industry: account.industry,
    owner: account.owner,
    relationship: account.relationship === "Client" ? "Account" : account.relationship,
    status: account.status,
    billTo: account.billTo === "Client" ? "Account" : account.billTo,
    payer: account.payer,
    pricing: account.pricing,
  };
  const initialContacts: DraftContact[] = contacts.map((contact) => ({
    id: contact.id,
    name: contact.name,
    role: contact.role,
    email: contact.email,
    phone: contact.phone,
    assigned: true,
  }));
  const [draftAccount, setDraftAccount] = useState(initialAccount);
  const [draftContacts, setDraftContacts] = useState(initialContacts);
  const [pick, setPick] = useState("");
  const [warning, setWarning] = useState("");
  const dirty = useMemo(() => snapshot(draftAccount, draftContacts) !== snapshot(initialAccount, initialContacts), [draftAccount, draftContacts, initialAccount, initialContacts]);
  const available = directory.filter((contact) => !draftContacts.some((item) => item.id === contact.id));

  function requestClose() {
    if (dirty) {
      setWarning("Save before closing. This contact has not been saved.");
      return;
    }
    onClose();
  }

  function updateContact(index: number, patch: Partial<DraftContact>) {
    setDraftContacts((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
    setWarning("");
  }

  return (
    <div className="lims-modal-backdrop" role="presentation" onClick={requestClose}>
      <form
        className="lims-modal client-add-dialog is-import"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-account-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          if (draftContacts.some((item) => item.assigned && !item.name.trim())) {
            setWarning("Each assigned contact needs a name before it can be saved.");
            return;
          }
          if (onSave(draftAccount, draftContacts)) onClose();
          else setWarning("Save the account name and every assigned contact name.");
        }}
      >
        <div className="lims-dialog-bar">
          <h2 id="edit-account-title">Edit {account.name}</h2>
          <button type="button" className="btn" onClick={requestClose}>Close</button>
        </div>
        <div className="account-edit-grid">
          <label>Account name<input value={draftAccount.name} onChange={(event) => setDraftAccount({ ...draftAccount, name: event.target.value })} required /></label>
          <label>Sector<input value={draftAccount.industry} onChange={(event) => setDraftAccount({ ...draftAccount, industry: event.target.value })} /></label>
          <label>Owner<input value={draftAccount.owner} onChange={(event) => setDraftAccount({ ...draftAccount, owner: event.target.value })} /></label>
          <label>Relationship<input value={draftAccount.relationship} onChange={(event) => setDraftAccount({ ...draftAccount, relationship: event.target.value })} /></label>
          <label>
            Status
            <select value={draftAccount.status} onChange={(event) => setDraftAccount({ ...draftAccount, status: event.target.value as AccountStatus })}>
              <option value="Active">Active</option>
              <option value="On hold">On hold</option>
            </select>
          </label>
          <label>From<input value={draftAccount.billTo} onChange={(event) => setDraftAccount({ ...draftAccount, billTo: event.target.value })} /></label>
          <label>Payer<input value={draftAccount.payer} onChange={(event) => setDraftAccount({ ...draftAccount, payer: event.target.value })} /></label>
          <label>Pricing<input value={draftAccount.pricing} onChange={(event) => setDraftAccount({ ...draftAccount, pricing: event.target.value })} /></label>
        </div>
        <h3>Contacts on this account</h3>
        {draftContacts.map((contact, index) => (
          <fieldset key={contact.id || `new-${index}`} className="account-edit-contact">
            <label className="account-edit-assign">
              <input type="checkbox" checked={contact.assigned} onChange={(event) => updateContact(index, { assigned: event.target.checked })} />
              Assigned
            </label>
            <label>Name<input value={contact.name} onChange={(event) => updateContact(index, { name: event.target.value })} /></label>
            <label>Role<input value={contact.role} onChange={(event) => updateContact(index, { role: event.target.value })} /></label>
            <label>Email<input value={contact.email} onChange={(event) => updateContact(index, { email: event.target.value })} /></label>
            <label>Phone<input value={contact.phone} onChange={(event) => updateContact(index, { phone: event.target.value })} /></label>
          </fieldset>
        ))}
        <div className="client-add-actions">
          <label>
            Existing contact
            <select value={pick} onChange={(event) => setPick(event.target.value)} aria-label="Add an existing contact">
              <option value="">Choose a contact</option>
              {available.map((contact) => (
                <option key={contact.id} value={contact.id}>{contact.name}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn"
            disabled={!pick}
            onClick={() => {
              const contact = directory.find((item) => item.id === pick);
              if (!contact) return;
              setDraftContacts((current) => [...current, { id: contact.id, name: contact.name, role: contact.role, email: contact.email, phone: contact.phone, assigned: true }]);
              setPick("");
              setWarning("");
            }}
          >
            Add existing
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setDraftContacts((current) => [...current, { id: "", name: "", role: "", email: "", phone: "", assigned: true }]);
              setWarning("");
            }}
          >
            Add new contact
          </button>
        </div>
        {warning ? <p className="account-save-warning" role="alert">{warning}</p> : null}
        <button type="submit" className="btn btn-primary">Save</button>
      </form>
    </div>
  );
}
