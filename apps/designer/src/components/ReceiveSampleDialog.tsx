import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useCrm } from "../crm";
import { personName } from "../crm/clientWorkflow";
import { logSample, nextAccessionId, SAMPLE_ACCOUNT, useSamples, type SampleRecord } from "../samples";

const SITES = ["North Lab", "East Lab"] as const;

export function LogSampleDialog({
  onClose,
  onLogged,
  initialAccountId = "",
}: {
  onClose: () => void;
  onLogged: (sample: SampleRecord) => void;
  initialAccountId?: string;
}) {
  useSamples();
  const { accounts, patients, physicians } = useCrm();
  const nextId = nextAccessionId();
  const [orderId, setOrderId] = useState("");
  const [accountId, setAccountId] = useState(initialAccountId);
  useEffect(() => {
    if (initialAccountId) setAccountId(initialAccountId);
  }, [initialAccountId]);
  const [patientId, setPatientId] = useState("");
  const [physicianId, setPhysicianId] = useState("");
  const [matrix, setMatrix] = useState("");
  const [tests, setTests] = useState("");
  const [priority, setPriority] = useState<SampleRecord["priority"]>("Routine");
  const [site, setSite] = useState<(typeof SITES)[number]>("North Lab");
  const account = accounts.find((item) => item.id === accountId);
  const accountPatients = patients.filter((patient) => patient.accountId === accountId);
  const accountPhysicians = physicians.filter((physician) => physician.accountId === accountId);
  const patient = accountPatients.find((item) => item.id === patientId);
  const physician = accountPhysicians.find((item) => item.id === physicianId);
  const ready = orderId.trim() && account && tests.trim();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!account || !ready) return;
    const sample = logSample({
      accountId: SAMPLE_ACCOUNT.id,
      accountName: SAMPLE_ACCOUNT.name,
      orderId: orderId.trim(),
      client: account.name,
      clientAccountId: account.id,
      patientId: patient?.id,
      patientName: patient ? personName(patient) : undefined,
      physicianId: physician?.id,
      physicianName: physician ? personName(physician) : undefined,
      matrix: matrix.trim() || "—",
      tests: tests.trim(),
      priority,
      site,
    });
    onLogged(sample);
  }

  return (
    <div className="lims-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="lims-modal" role="dialog" aria-modal="true" aria-labelledby="log-sample-title" onClick={(event) => event.stopPropagation()}>
        <form onSubmit={submit}>
          <div className="receipt-form">
            <p className="lims-eyebrow">Manual intake</p>
            <h2 id="log-sample-title">Log sample</h2>
            <p className="receipt-form-lede">
              Manually create a sample when no electronic order exists. Accession {nextId} is next. Choose a Sequence Client account.
            </p>
            <div className="receive-fields">
              <label>
                Order ID
                <input aria-label="Order ID" value={orderId} onChange={(event) => setOrderId(event.target.value)} />
              </label>
              <label>
                Client account
                <select
                  aria-label="Client account"
                  value={accountId}
                  onChange={(event) => {
                    setAccountId(event.target.value);
                    setPatientId("");
                    setPhysicianId("");
                  }}
                >
                  <option value="">Select an account</option>
                  {accounts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.status === "On hold" ? " (On hold)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Patient
                <select aria-label="Patient" value={patientId} disabled={!account} onChange={(event) => setPatientId(event.target.value)}>
                  <option value="">{!account ? "Select an account first" : accountPatients.length ? "No patient" : "No patients on this account"}</option>
                  {accountPatients.map((item) => (
                    <option key={item.id} value={item.id}>
                      {personName(item)} · {item.mrn}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Ordering physician
                <select aria-label="Ordering physician" value={physicianId} disabled={!account} onChange={(event) => setPhysicianId(event.target.value)}>
                  <option value="">{!account ? "Select an account first" : accountPhysicians.length ? "No ordering physician" : "No physicians on this account"}</option>
                  {accountPhysicians.map((item) => (
                    <option key={item.id} value={item.id}>
                      {personName(item)} · {item.npi}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Matrix
                <input aria-label="Matrix" value={matrix} onChange={(event) => setMatrix(event.target.value)} />
              </label>
              <label>
                Tests
                <input aria-label="Tests" value={tests} onChange={(event) => setTests(event.target.value)} />
              </label>
              <label>
                Priority
                <select aria-label="Priority" value={priority} onChange={(event) => setPriority(event.target.value as SampleRecord["priority"])}>
                  <option>Routine</option>
                  <option>Rush</option>
                  <option>STAT</option>
                </select>
              </label>
              <label>
                Site
                <select aria-label="Site" value={site} onChange={(event) => setSite(event.target.value as (typeof SITES)[number])}>
                  {SITES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>
            {account?.status === "On hold" ? <p className="quality-error">This account is on hold. The sample can still be logged.</p> : null}
            <p className="receipt-form-lede">
              Accounts, patients, and physicians come from Sequence Client.{" "}
              <Link to="/app/connectivity/workflows">Open workflows</Link>
            </p>
          </div>
          <div className="lims-modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!ready}>
              Log sample
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
