import { useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { CrmAccount } from "../../crmAccounts";
import {
  addClientAccount,
  addPatient,
  addPhysician,
  useCrm,
  type PatientRecord,
  type PatientSex,
  type PhysicianRecord,
} from "../../crm";
import {
  accountSuggestions,
  dobError,
  mrnTaken,
  npiError,
  patientDuplicate,
  personName,
  physicianByNpi,
  sameAccountName,
} from "../../crm/clientWorkflow";
import { CrmShell } from "./CrmShell";

const FLOWS = [
  {
    id: "account",
    title: "New client account",
    detail: "Search, then account, primary contact, and billing.",
  },
  {
    id: "patient",
    title: "New patient",
    detail: "Choose the account, check for a duplicate, then register demographics.",
  },
  {
    id: "physician",
    title: "New physician",
    detail: "Choose the practice, check the NPI, then save the ordering physician.",
  },
] as const;

type FlowId = (typeof FLOWS)[number]["id"];

function isFlow(value: string | null): value is FlowId {
  return value === "account" || value === "patient" || value === "physician";
}

function FlowSteps({ labels, step }: { labels: string[]; step: number }) {
  return (
    <ol className="client-flow-steps" aria-label="Workflow steps">
      {labels.map((label, index) => (
        <li key={label} className={index < step ? "is-done" : index === step ? "is-current" : undefined} aria-current={index === step ? "step" : undefined}>
          <span>{index < step ? "✓" : index + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

function FlowActions({
  step,
  last,
  error,
  canNext,
  nextLabel,
  onBack,
  onNext,
}: {
  step: number;
  last: boolean;
  error: string;
  canNext: boolean;
  nextLabel: string;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="client-flow-actions">
      {error ? <p className="quality-error">{error}</p> : null}
      <div>
        {step > 0 ? (
          <button type="button" className="btn" onClick={onBack}>
            Back
          </button>
        ) : null}
        <button type="button" className="btn btn-primary" disabled={!canNext} onClick={onNext}>
          {last ? nextLabel : "Next"}
        </button>
      </div>
    </div>
  );
}

function ReviewList({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="client-flow-review">
      {rows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function AccountFlow({ accounts, canWrite }: { accounts: CrmAccount[]; canWrite: boolean }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [phone, setPhone] = useState("");
  const [contact, setContact] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [billTo, setBillTo] = useState<"Client" | "Insurance" | "Self-pay">("Client");
  const [payer, setPayer] = useState("");
  const [created, setCreated] = useState<CrmAccount | null>(null);
  const labels = ["Find", "Account", "Contact", "Billing", "Review"];
  const duplicate = sameAccountName(accounts, name);
  const matches = accountSuggestions(accounts, name);
  let error = "";
  if (!canWrite) error = "A client-success role is required to create records.";
  else if ((step === 0 || step === 1 || step === 4) && name.trim() && duplicate) error = "An account with this name already exists. Open it instead of creating a second one.";
  else if (step === 3 && billTo === "Insurance" && !payer.trim()) error = "Enter the payer.";
  const missing =
    ((step === 0 || step === 1 || step === 4) && !name.trim()) || ((step === 2 || step === 4) && !contact.trim());
  const canNext = canWrite && !error && !missing;

  function create() {
    const account = addClientAccount({
      name,
      industry,
      phone,
      contact,
      role,
      email,
      contactPhone,
      billTo,
      payer,
    });
    if (account) setCreated(account);
  }

  if (created) {
    return (
      <section className="client-flow-card">
        <h2>Account created</h2>
        <p>
          {created.number} · {created.name} is on Sequence Client. It is available when you log a sample.
        </p>
        <div className="client-flow-actions">
          <div>
            <Link className="btn btn-primary" to={`/app/connectivity/clients/${created.id}`}>
              Open account
            </Link>
            <Link className="btn" to={`/app/ops/home?account=${created.id}`}>
              Log a sample
            </Link>
            <Link className="btn" to="/app/connectivity/workflows?flow=patient">
              Add a patient
            </Link>
            <Link className="btn" to="/app/connectivity/workflows?flow=physician">
              Add a physician
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="client-flow-card">
      <h2>New client account</h2>
      <FlowSteps labels={labels} step={step} />
      {step === 0 ? (
        <div className="client-flow-fields">
          <label>
            Account name
            <input value={name} onChange={(event) => setName(event.target.value)} aria-label="Account name" autoFocus />
          </label>
          {matches.length ? (
            <ul className="client-flow-matches">
              {matches.map((account) => (
                <li key={account.id}>
                  <Link to={`/app/connectivity/clients/${account.id}`}>{account.name}</Link>
                  <small>{account.number}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p>Search first so the laboratory does not open a second account for the same client.</p>
          )}
        </div>
      ) : null}
      {step === 1 ? (
        <div className="client-flow-fields">
          <label>
            Account name
            <input value={name} onChange={(event) => setName(event.target.value)} aria-label="Account name" />
          </label>
          <label>
            Industry
            <input value={industry} onChange={(event) => setIndustry(event.target.value)} placeholder="Pharmaceutical" aria-label="Industry" />
          </label>
          <label>
            Account phone
            <input value={phone} onChange={(event) => setPhone(event.target.value)} aria-label="Account phone" />
          </label>
        </div>
      ) : null}
      {step === 2 ? (
        <div className="client-flow-fields">
          <label>
            Primary contact
            <input value={contact} onChange={(event) => setContact(event.target.value)} aria-label="Primary contact" />
          </label>
          <label>
            Role
            <input value={role} onChange={(event) => setRole(event.target.value)} placeholder="Lab director" aria-label="Contact role" />
          </label>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" aria-label="Contact email" />
          </label>
          <label>
            Direct phone
            <input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} aria-label="Contact phone" />
          </label>
        </div>
      ) : null}
      {step === 3 ? (
        <div className="client-flow-fields">
          <label>
            Bill to
            <select value={billTo} aria-label="Bill to" onChange={(event) => setBillTo(event.target.value as typeof billTo)}>
              <option value="Client">Client</option>
              <option value="Insurance">Insurance</option>
              <option value="Self-pay">Self-pay</option>
            </select>
          </label>
          <label>
            Payer
            <input value={payer} onChange={(event) => setPayer(event.target.value)} placeholder={billTo === "Self-pay" ? "Patient" : `${name || "Account"} AP`} aria-label="Payer" />
          </label>
        </div>
      ) : null}
      {step === 4 ? (
        <ReviewList
          rows={[
            { label: "Account", value: name.trim() },
            { label: "Industry", value: industry.trim() || "Laboratory" },
            { label: "Phone", value: phone.trim() },
            { label: "Primary contact", value: contact.trim() },
            { label: "Role", value: role.trim() || "Primary contact" },
            { label: "Email", value: email.trim() },
            { label: "Bill to", value: billTo },
            { label: "Payer", value: payer.trim() || (billTo === "Self-pay" ? "Patient" : `${name.trim()} AP`) },
          ]}
        />
      ) : null}
      <FlowActions
        step={step}
        last={step === 4}
        error={error}
        canNext={canNext}
        nextLabel="Create account"
        onBack={() => setStep((current) => current - 1)}
        onNext={() => (step === 4 ? create() : setStep((current) => current + 1))}
      />
    </section>
  );
}

function PatientFlow({
  accounts,
  patients,
  canWrite,
}: {
  accounts: CrmAccount[];
  patients: PatientRecord[];
  canWrite: boolean;
}) {
  const [step, setStep] = useState(0);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<PatientSex>("Unknown");
  const [phone, setPhone] = useState("");
  const [mrn, setMrn] = useState("");
  const [address, setAddress] = useState("");
  const [created, setCreated] = useState<PatientRecord | null>(null);
  const account = accounts.find((item) => item.id === accountId);
  const labels = ["Account", "Find", "Demographics", "Record", "Review"];
  const duplicate = account && dob ? patientDuplicate(patients, account.id, firstName, lastName, dob) : undefined;
  const nameMatches = patients.filter((patient) => {
    if (!account || patient.accountId !== account.id) return false;
    const needle = `${firstName} ${lastName}`.trim().toLowerCase();
    if (needle.length < 2) return false;
    return personName(patient).toLowerCase().includes(needle);
  });
  let error = "";
  if (!canWrite) error = "A client-success role is required to create records.";
  else if (!account) error = "Choose a client account.";
  else if ((step === 2 || step === 4) && dob && dobError(dob)) error = dobError(dob);
  else if ((step === 2 || step === 4) && !dob) error = step === 4 ? dobError(dob) : "";
  else if (duplicate && (step === 4 || (step === 2 && dob))) error = `${personName(duplicate)} is already registered on ${account.name} with this date of birth.`;
  else if (step === 3 && account && mrn.trim() && mrnTaken(patients, account.id, mrn)) error = "That MRN is already used on this account.";
  const missingName = (step === 1 || step === 4) && (!firstName.trim() || !lastName.trim());
  const missingDob = (step === 2 || step === 4) && !dob;
  const canNext = canWrite && !error && !missingName && !missingDob;

  function create() {
    if (!account) return;
    const patient = addPatient({ accountId: account.id, firstName, lastName, dob, sex, mrn, phone, address });
    if (patient) setCreated(patient);
  }

  if (created) {
    return (
      <section className="client-flow-card">
        <h2>Patient registered</h2>
        <p>
          {personName(created)} · {created.mrn} is on {created.accountName}. The patient can be chosen when you log a sample for that account.
        </p>
        <div className="client-flow-actions">
          <div>
            <Link className="btn btn-primary" to={`/app/connectivity/clients/${created.accountId}`}>
              Open account
            </Link>
            <Link className="btn" to={`/app/ops/home?account=${created.accountId}`}>
              Log a sample
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="client-flow-card">
      <h2>New patient</h2>
      <FlowSteps labels={labels} step={step} />
      {step === 0 ? (
        <div className="client-flow-fields">
          <label>
            Client account
            <select value={accountId} aria-label="Client account" onChange={(event) => setAccountId(event.target.value)}>
              {accounts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.status === "On hold" ? " (On hold)" : ""}
                </option>
              ))}
            </select>
          </label>
          <p>The patient is registered on one client account, the same way a person account belongs to a practice.</p>
        </div>
      ) : null}
      {step === 1 ? (
        <div className="client-flow-fields">
          <label>
            First name
            <input value={firstName} onChange={(event) => setFirstName(event.target.value)} aria-label="First name" />
          </label>
          <label>
            Last name
            <input value={lastName} onChange={(event) => setLastName(event.target.value)} aria-label="Last name" />
          </label>
          {nameMatches.length ? (
            <ul className="client-flow-matches">
              {nameMatches.map((patient) => (
                <li key={patient.id}>
                  <b>{personName(patient)}</b>
                  <small>
                    {patient.dob} · {patient.mrn}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No one on {account?.name} matches this name yet.</p>
          )}
        </div>
      ) : null}
      {step === 2 ? (
        <div className="client-flow-fields">
          <label>
            Date of birth
            <input type="date" value={dob} onChange={(event) => setDob(event.target.value)} aria-label="Date of birth" />
          </label>
          <label>
            Sex
            <select value={sex} aria-label="Sex" onChange={(event) => setSex(event.target.value as PatientSex)}>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Unknown">Unknown</option>
            </select>
          </label>
          <label>
            Phone
            <input value={phone} onChange={(event) => setPhone(event.target.value)} aria-label="Patient phone" />
          </label>
        </div>
      ) : null}
      {step === 3 ? (
        <div className="client-flow-fields">
          <label>
            MRN
            <input value={mrn} onChange={(event) => setMrn(event.target.value)} placeholder="Assigned at save if left blank" aria-label="MRN" />
          </label>
          <label>
            Address
            <input value={address} onChange={(event) => setAddress(event.target.value)} aria-label="Address" />
          </label>
        </div>
      ) : null}
      {step === 4 && account ? (
        <ReviewList
          rows={[
            { label: "Account", value: account.name },
            { label: "Patient", value: `${firstName.trim()} ${lastName.trim()}` },
            { label: "Date of birth", value: dob },
            { label: "Sex", value: sex },
            { label: "Phone", value: phone.trim() },
            { label: "MRN", value: mrn.trim() || "Assigned at save" },
            { label: "Address", value: address.trim() },
          ]}
        />
      ) : null}
      <FlowActions
        step={step}
        last={step === 4}
        error={error}
        canNext={canNext}
        nextLabel="Register patient"
        onBack={() => setStep((current) => current - 1)}
        onNext={() => (step === 4 ? create() : setStep((current) => current + 1))}
      />
    </section>
  );
}

function PhysicianFlow({
  accounts,
  physicians,
  canWrite,
}: {
  accounts: CrmAccount[];
  physicians: PhysicianRecord[];
  canWrite: boolean;
}) {
  const [step, setStep] = useState(0);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [npi, setNpi] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [phone, setPhone] = useState("");
  const [fax, setFax] = useState("");
  const [email, setEmail] = useState("");
  const [created, setCreated] = useState<PhysicianRecord | null>(null);
  const account = accounts.find((item) => item.id === accountId);
  const labels = ["Practice", "Identity", "Specialty", "Reach", "Review"];
  const existing = physicianByNpi(physicians, npi);
  let error = "";
  if (!canWrite) error = "A client-success role is required to create records.";
  else if (!account) error = "Choose the practice account.";
  else if ((step === 1 || step === 4) && npi.trim() && npiError(npi)) error = npiError(npi);
  else if ((step === 1 || step === 4) && existing) error = `${personName(existing)} already uses NPI ${existing.npi} on ${existing.accountName}.`;
  const missingIdentity = (step === 1 || step === 4) && (!firstName.trim() || !lastName.trim() || !npi.trim());
  const missingSpecialty = (step === 2 || step === 4) && !specialty.trim();
  const canNext = canWrite && !error && !missingIdentity && !missingSpecialty;

  function create() {
    if (!account) return;
    const physician = addPhysician({ accountId: account.id, firstName, lastName, npi, specialty, phone, fax, email });
    if (physician) setCreated(physician);
  }

  if (created) {
    return (
      <section className="client-flow-card">
        <h2>Physician added</h2>
        <p>
          {personName(created)} · NPI {created.npi} can be chosen as the ordering physician when you log a sample for {created.accountName}.
        </p>
        <div className="client-flow-actions">
          <div>
            <Link className="btn btn-primary" to={`/app/connectivity/clients/${created.accountId}`}>
              Open account
            </Link>
            <Link className="btn" to={`/app/ops/home?account=${created.accountId}`}>
              Log a sample
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="client-flow-card">
      <h2>New physician</h2>
      <FlowSteps labels={labels} step={step} />
      {step === 0 ? (
        <div className="client-flow-fields">
          <label>
            Practice account
            <select value={accountId} aria-label="Practice account" onChange={(event) => setAccountId(event.target.value)}>
              {accounts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <p>The physician orders for this client account. One NPI can only be saved once.</p>
        </div>
      ) : null}
      {step === 1 ? (
        <div className="client-flow-fields">
          <label>
            First name
            <input value={firstName} onChange={(event) => setFirstName(event.target.value)} aria-label="First name" />
          </label>
          <label>
            Last name
            <input value={lastName} onChange={(event) => setLastName(event.target.value)} aria-label="Last name" />
          </label>
          <label>
            NPI
            <input value={npi} onChange={(event) => setNpi(event.target.value)} inputMode="numeric" aria-label="NPI" />
          </label>
        </div>
      ) : null}
      {step === 2 ? (
        <div className="client-flow-fields">
          <label>
            Specialty
            <input value={specialty} onChange={(event) => setSpecialty(event.target.value)} placeholder="Oncology" aria-label="Specialty" />
          </label>
        </div>
      ) : null}
      {step === 3 ? (
        <div className="client-flow-fields">
          <label>
            Phone
            <input value={phone} onChange={(event) => setPhone(event.target.value)} aria-label="Physician phone" />
          </label>
          <label>
            Fax
            <input value={fax} onChange={(event) => setFax(event.target.value)} aria-label="Fax" />
          </label>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" aria-label="Physician email" />
          </label>
        </div>
      ) : null}
      {step === 4 && account ? (
        <ReviewList
          rows={[
            { label: "Practice", value: account.name },
            { label: "Physician", value: `${firstName.trim()} ${lastName.trim()}` },
            { label: "NPI", value: npi.trim() },
            { label: "Specialty", value: specialty.trim() },
            { label: "Phone", value: phone.trim() },
            { label: "Fax", value: fax.trim() },
            { label: "Email", value: email.trim() },
          ]}
        />
      ) : null}
      <FlowActions
        step={step}
        last={step === 4}
        error={error}
        canNext={canNext}
        nextLabel="Add physician"
        onBack={() => setStep((current) => current - 1)}
        onNext={() => (step === 4 ? create() : setStep((current) => current + 1))}
      />
    </section>
  );
}

export function ClientWorkflowsPage() {
  const { accounts, patients, physicians, canWrite } = useCrm();
  const [params, setParams] = useSearchParams();
  const requested = params.get("flow");
  const flow: FlowId = isFlow(requested) ? requested : "account";

  function choose(next: FlowId) {
    const copy = new URLSearchParams(params);
    copy.set("flow", next);
    setParams(copy, { replace: true });
  }

  let body: ReactNode = null;
  if (flow === "account") body = <AccountFlow key="account" accounts={accounts} canWrite={canWrite} />;
  if (flow === "patient") body = <PatientFlow key="patient" accounts={accounts} patients={patients} canWrite={canWrite} />;
  if (flow === "physician") body = <PhysicianFlow key="physician" accounts={accounts} physicians={physicians} canWrite={canWrite} />;

  return (
    <CrmShell title="Workflows" lede="Create a client account, a patient, or an ordering physician. Each workflow searches first, then saves the record onto the account.">
      <div className="client-flow-picker" role="tablist" aria-label="Client workflows">
        {FLOWS.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={flow === item.id} className={flow === item.id ? "is-on" : undefined} onClick={() => choose(item.id)}>
            <strong>{item.title}</strong>
            <span>{item.detail}</span>
          </button>
        ))}
      </div>
      {body}
    </CrmShell>
  );
}
