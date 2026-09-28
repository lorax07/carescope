import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AccountLink, AccountTable } from "../components/AccountTable";
import { accountById, accountByName, CRM_ACCOUNTS } from "../crmAccounts";
import {
  aging,
  balance,
  billDespiteLabHold,
  billingRoute,
  captureAccession,
  CARC,
  CHARGE_STATUS_LABEL,
  denyCharge,
  editsFor,
  getCycle,
  ICD10,
  labReady,
  ledgerSnapshot,
  money,
  overrideAccountHold,
  placeHold,
  postPayment,
  quote,
  rebillCharge,
  releaseHold,
  rollup,
  routeLabel,
  setContractPrice,
  setDiagnosis,
  setListPrice,
  splitTests,
  stageFor,
  submitCharge,
  useRevenue,
  writeOffCharge,
  type Charge,
  type ChargeStatus,
  type WorkStage,
} from "../revenueCycle";
import { STATUS_LABEL, useSamples, type SampleRecord } from "../samples";

const STAGES: { id: WorkStage; label: string }[] = [
  { id: "awaiting", label: "Awaiting lab" },
  { id: "capture", label: "Charge capture" },
  { id: "edits", label: "Edits" },
  { id: "ready", label: "Ready to bill" },
  { id: "submitted", label: "Submitted" },
  { id: "denials", label: "Denials" },
  { id: "closed", label: "Paid and closed" },
];

type Selection = { kind: "sample" | "charge"; id: string };
type WorkRow = { kind: "sample"; id: string; sample: SampleRecord } | { kind: "charge"; id: string; charge: Charge };

function isStage(value: string | null): value is WorkStage {
  return STAGES.some((stage) => stage.id === value);
}

function statusTone(status: ChargeStatus): string {
  if (status === "denied") return " danger";
  if (status === "held" || status === "partial") return " warn";
  if (status === "written_off") return "";
  return " info";
}

function pendingTests(cycleCharges: Charge[], sample: SampleRecord, accountId: string, fees: Parameters<typeof quote>[0]) {
  return splitTests(sample.tests).filter((test) => {
    if (!quote(fees, accountId, test)) return false;
    return !cycleCharges.some((charge) => charge.accessionId === sample.accessionId && charge.test === test && charge.status !== "rebilled");
  });
}

function rowsFor(stage: WorkStage, cycle: ReturnType<typeof useRevenue>, samples: SampleRecord[], accountFilter: string): WorkRow[] {
  const allowed = (accountId: string) => accountFilter === "all" || accountId === accountFilter;
  if (stage === "awaiting" || stage === "capture") {
    return samples
      .filter((sample) => (stage === "awaiting" ? !labReady(sample.status) : labReady(sample.status)))
      .flatMap((sample) => {
        const account = accountByName(sample.client);
        if (!account || !allowed(account.id)) return [];
        if (!pendingTests(cycle.charges, sample, account.id, cycle).length) return [];
        return [{ kind: "sample" as const, id: sample.accessionId, sample }];
      });
  }
  return cycle.charges
    .filter((charge) => stageFor(charge) === stage && allowed(charge.accountId))
    .map((charge) => ({ kind: "charge" as const, id: charge.id, charge }));
}

function MoneyInput({ cents, label, onCommit }: { cents: number; label: string; onCommit: (cents: number) => void }) {
  const [text, setText] = useState((cents / 100).toFixed(2));
  useEffect(() => setText((cents / 100).toFixed(2)), [cents]);
  return (
    <input
      aria-label={label}
      inputMode="decimal"
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => {
        const next = Math.round(Number(text) * 100);
        if (!Number.isFinite(next) || next < 0) {
          setText((cents / 100).toFixed(2));
          return;
        }
        onCommit(next);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") (event.currentTarget as HTMLInputElement).blur();
      }}
    />
  );
}

function focusStage(id: string, params: URLSearchParams, setParams: (next: URLSearchParams, opts: { replace: boolean }) => void) {
  const charge = getCycle().charges.find((item) => item.id === id);
  if (!charge) return;
  const next = new URLSearchParams(params);
  next.set("stage", stageFor(charge));
  setParams(next, { replace: true });
}

export function BillingPage() {
  const cycle = useRevenue();
  const samples = useSamples();
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<Selection | null>(null);
  const [notice, setNotice] = useState("");
  const requestedAccount = params.get("account");
  const accountFilter = requestedAccount && CRM_ACCOUNTS.some((account) => account.id === requestedAccount) ? requestedAccount : "all";
  const counts = useMemo(() => {
    const tally = {} as Record<WorkStage, number>;
    for (const stage of STAGES) tally[stage.id] = rowsFor(stage.id, cycle, samples, accountFilter).length;
    return tally;
  }, [cycle, samples, accountFilter]);
  const requestedStage = params.get("stage");
  const stage: WorkStage = isStage(requestedStage)
    ? requestedStage
    : ((["denials", "edits", "ready", "capture", "submitted", "awaiting", "closed"] as const).find((item) => counts[item]) ?? "capture");
  const rows = useMemo(() => rowsFor(stage, cycle, samples, accountFilter), [stage, cycle, samples, accountFilter]);
  const current = rows.find((row) => selected && row.kind === selected.kind && row.id === selected.id) ?? rows[0] ?? null;

  function chooseStage(next: WorkStage) {
    const query = new URLSearchParams(params);
    query.set("stage", next);
    setParams(query, { replace: true });
    setNotice("");
  }

  function chooseAccount(accountId: string) {
    const query = new URLSearchParams(params);
    if (accountId === "all") query.delete("account");
    else query.set("account", accountId);
    setParams(query, { replace: true });
  }

  function focus(id: string) {
    setSelected({ kind: "charge", id });
    focusStage(id, params, setParams);
  }

  function capture(accessionId: string) {
    const result = captureAccession(accessionId);
    if (result.ids[0]) focus(result.ids[0]);
    if (result.skipped.length) setNotice(`${result.skipped.join(", ")} is not on the fee schedule.`);
    else if (!result.ids.length) setNotice("This accession has no tests waiting for a charge.");
    else setNotice("");
  }

  const books = ledgerSnapshot(cycle.charges);
  const denial = cycle.charges.find((charge) => charge.status === "denied");
  const buckets = aging(cycle.charges);
  const selectedSample = current?.kind === "sample" ? current.sample : undefined;
  const selectedCharge = current?.kind === "charge" ? current.charge : undefined;

  return (
    <div className="lims-page">
      <div className="lims-page-header">
        <div>
          <p className="lims-eyebrow">Revenue</p>
          <h1>Sequence Revenue</h1>
          <p className="lims-page-lede">
            Work each accession from charge capture through coding, edits, claim or invoice submission, payment, and denial follow-up.
          </p>
        </div>
      </div>

      <div className="lims-kpi-row">
        <div className="lims-kpi">
          <span>Unbilled</span>
          <strong>{money(books.unbilled)}</strong>
          <small>Held and ready to bill</small>
        </div>
        <div className="lims-kpi">
          <span>A/R</span>
          <strong>{money(books.ar)}</strong>
          <small>Submitted, partial, and denied</small>
        </div>
        <div className="lims-kpi">
          <span>Collected</span>
          <strong>{money(books.collected)}</strong>
          <small>Payments posted</small>
        </div>
        <div className="lims-kpi accent">
          <span>Open denials</span>
          <strong>{books.openDenials}</strong>
          <small>{denial ? `${denial.accountName} · ${denial.denialCode}` : "Denial worklist"}</small>
        </div>
      </div>

      <section className="lims-panel billing-panel">
        <div className="billing-areas" role="tablist" aria-label="Revenue cycle">
          {STAGES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === stage}
              className={`btn${item.id === stage ? " is-on" : ""}`}
              onClick={() => chooseStage(item.id)}
            >
              {item.label} ({counts[item.id]})
            </button>
          ))}
        </div>
        {notice ? <p className="billing-note" aria-live="polite">{notice}</p> : null}
      </section>

      <div className="rcm-workbench">
        <section className="lims-panel">
          <div className="lims-panel-head">
            <h2>{STAGES.find((item) => item.id === stage)?.label}</h2>
            <select aria-label="Account" value={accountFilter} onChange={(event) => chooseAccount(event.target.value)}>
              <option value="all">All accounts</option>
              {CRM_ACCOUNTS.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <WorkTable rows={rows} stage={stage} selected={current ? { kind: current.kind, id: current.id } : null} onSelect={setSelected} />
        </section>
        <section className="lims-panel">
          {selectedSample ? (
            <SampleCase sample={selectedSample} cycle={cycle} stage={stage} onCapture={capture} />
          ) : selectedCharge ? (
            <ChargeCase
              charge={selectedCharge}
              sample={samples.find((sample) => sample.accessionId === selectedCharge.accessionId)}
              cycle={cycle}
              onFocus={focus}
            />
          ) : (
            <p className="billing-note">Select a row to work it.</p>
          )}
        </section>
      </div>

      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>Fee schedule</h2>
        </div>
        <p className="billing-note">Open charges use these prices. Submitted bills keep the amount they were sent with.</p>
        <div className="lims-table-wrap">
          <table className="lims-table">
            <thead>
              <tr>
                <th>Test</th>
                <th>CPT/HCPCS</th>
                <th>Description</th>
                <th>List price</th>
              </tr>
            </thead>
            <tbody>
              {cycle.fees.map((fee) => (
                <tr key={fee.test}>
                  <td>{fee.test}</td>
                  <td className="lims-mono">{fee.cpt}</td>
                  <td>{fee.description}</td>
                  <td className="rcm-price">
                    <MoneyInput cents={fee.listCents} label={`List price for ${fee.test}`} onCommit={(cents) => setListPrice(fee.test, cents)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="lims-panel-head">
          <h2>Client prices</h2>
        </div>
        <div className="lims-table-wrap">
          <table className="lims-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Test</th>
                <th>Agreement</th>
                <th>List</th>
                <th>Contract price</th>
              </tr>
            </thead>
            <tbody>
              {cycle.contracts.map((contract) => {
                const account = accountById(contract.accountId);
                const list = cycle.fees.find((fee) => fee.test === contract.test)?.listCents ?? 0;
                return (
                  <tr key={`${contract.accountId}-${contract.test}`}>
                    <td>{account ? <AccountLink name={account.name} /> : contract.accountId}</td>
                    <td>{contract.test}</td>
                    <td className="lims-mono">{contract.agreement}</td>
                    <td>{money(list)}</td>
                    <td className="rcm-price">
                      <MoneyInput
                        cents={contract.cents}
                        label={`Contract price for ${account?.name ?? contract.accountId} ${contract.test}`}
                        onCommit={(cents) => setContractPrice(contract.accountId, contract.test, cents)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>Payers</h2>
        </div>
        <p className="billing-note">Each account bills through the payer on its Sequence Client record.</p>
        <div className="lims-table-wrap">
          <table className="lims-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Bill to</th>
                <th>Payer</th>
                <th>Payer ID</th>
                <th>Plan</th>
                <th>Route</th>
              </tr>
            </thead>
            <tbody>
              {CRM_ACCOUNTS.map((account) => {
                const route = billingRoute(account);
                return (
                  <tr key={account.id}>
                    <td>
                      <AccountLink name={account.name} />
                    </td>
                    <td>{account.billTo}</td>
                    <td>{route.payerName}</td>
                    <td className="lims-mono">{route.payerId}</td>
                    <td>{route.plan}</td>
                    <td>{routeLabel(route.route)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>Revenue</h2>
        </div>
        <div className="rcm-aging">
          <div>
            <span>Current</span>
            <strong>{money(buckets.current)}</strong>
          </div>
          <div>
            <span>31–60</span>
            <strong>{money(buckets.d31)}</strong>
          </div>
          <div>
            <span>61–90</span>
            <strong>{money(buckets.d61)}</strong>
          </div>
          <div>
            <span>90+</span>
            <strong>{money(buckets.d90)}</strong>
          </div>
        </div>
        <div className="lims-table-wrap">
          <table className="lims-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Gross</th>
                <th>Allowance</th>
                <th>Net</th>
                <th>Collected</th>
                <th>Write-off</th>
                <th>Unbilled</th>
                <th>A/R</th>
              </tr>
            </thead>
            <tbody>
              {rollup(cycle.charges).map((row) => {
                const account = accountById(row.accountId);
                return (
                  <tr key={row.accountId}>
                    <td>{account ? <AccountLink name={account.name} /> : row.accountId}</td>
                    <td>{money(row.gross)}</td>
                    <td>{money(row.allowance)}</td>
                    <td>{money(row.net)}</td>
                    <td>{money(row.collected)}</td>
                    <td>{money(row.writeOff)}</td>
                    <td>{money(row.unbilled)}</td>
                    <td>{money(row.ar)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>Accounts</h2>
        </div>
        <p className="billing-note">The Sequence Client account list. Revenue is the open balance on this ledger.</p>
        <AccountTable />
      </section>
    </div>
  );
}

function WorkTable({
  rows,
  stage,
  selected,
  onSelect,
}: {
  rows: WorkRow[];
  stage: WorkStage;
  selected: Selection | null;
  onSelect: (selection: Selection) => void;
}) {
  const chargeRows = rows.filter((row): row is Extract<WorkRow, { kind: "charge" }> => row.kind === "charge");
  const sampleRows = rows.filter((row): row is Extract<WorkRow, { kind: "sample" }> => row.kind === "sample");
  if (stage === "awaiting" || stage === "capture") {
    return (
      <div className="lims-table-wrap">
        <table className="lims-table">
          <thead>
            <tr>
              <th>Accession</th>
              <th>Account</th>
              <th>Tests</th>
              <th>Laboratory</th>
            </tr>
          </thead>
          <tbody>
            {sampleRows.length === 0 ? (
              <tr>
                <td colSpan={4}>Nothing in this stage.</td>
              </tr>
            ) : (
              sampleRows.map((row) => (
                <tr
                  key={row.id}
                  className={selected?.kind === "sample" && selected.id === row.id ? "is-selected" : undefined}
                  onClick={() => onSelect({ kind: "sample", id: row.id })}
                >
                  <td className="lims-mono">{row.sample.accessionId}</td>
                  <td>
                    <AccountLink name={row.sample.client} />
                  </td>
                  <td>{row.sample.tests}</td>
                  <td>{STATUS_LABEL[row.sample.status]}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  const columns =
    stage === "edits"
      ? ["Accession", "Account", "Test", "Edit", "Amount"]
      : stage === "ready"
        ? ["Accession", "Account", "Test", "Route", "Amount"]
        : stage === "submitted"
          ? ["Document", "Account", "Accession", "Billed", "Paid", "Balance"]
          : stage === "denials"
            ? ["Document", "Account", "Code", "Reason", "Balance"]
            : ["Document", "Account", "Test", "Status", "Paid"];

  return (
    <div className="lims-table-wrap">
      <table className="lims-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chargeRows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>Nothing in this stage.</td>
            </tr>
          ) : (
            chargeRows.map((row) => (
              <tr
                key={row.id}
                className={selected?.kind === "charge" && selected.id === row.id ? "is-selected" : undefined}
                onClick={() => onSelect({ kind: "charge", id: row.id })}
              >
                <ChargeCells charge={row.charge} stage={stage} />
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ChargeCells({ charge, stage }: { charge: Charge; stage: WorkStage }) {
  if (stage === "edits") {
    return (
      <>
        <td className="lims-mono">{charge.accessionId}</td>
        <td>
          <AccountLink name={charge.accountName} />
        </td>
        <td>{charge.test}</td>
        <td>{charge.holdReason}</td>
        <td>{money(charge.amountCents)}</td>
      </>
    );
  }
  if (stage === "ready") {
    return (
      <>
        <td className="lims-mono">{charge.accessionId}</td>
        <td>
          <AccountLink name={charge.accountName} />
        </td>
        <td>{charge.test}</td>
        <td>{routeLabel(charge.route)}</td>
        <td>{money(charge.amountCents)}</td>
      </>
    );
  }
  if (stage === "submitted") {
    return (
      <>
        <td className="lims-mono">{charge.documentId}</td>
        <td>
          <AccountLink name={charge.accountName} />
        </td>
        <td className="lims-mono">{charge.accessionId}</td>
        <td>{money(charge.amountCents)}</td>
        <td>{money(charge.paidCents)}</td>
        <td>{money(balance(charge))}</td>
      </>
    );
  }
  if (stage === "denials") {
    return (
      <>
        <td className="lims-mono">{charge.documentId}</td>
        <td>
          <AccountLink name={charge.accountName} />
        </td>
        <td className="lims-mono">{charge.denialCode}</td>
        <td>{charge.denialReason}</td>
        <td>{money(balance(charge))}</td>
      </>
    );
  }
  return (
    <>
      <td className="lims-mono">{charge.documentId || charge.id}</td>
      <td>
        <AccountLink name={charge.accountName} />
      </td>
      <td>{charge.test}</td>
      <td>
        <span className={`lims-badge${statusTone(charge.status)}`}>{CHARGE_STATUS_LABEL[charge.status]}</span>
      </td>
      <td>{money(charge.paidCents)}</td>
    </>
  );
}

function SampleCase({
  sample,
  cycle,
  stage,
  onCapture,
}: {
  sample: SampleRecord;
  cycle: ReturnType<typeof useRevenue>;
  stage: WorkStage;
  onCapture: (accessionId: string) => void;
}) {
  const account = accountByName(sample.client);
  const route = account ? billingRoute(account) : null;
  const lines = splitTests(sample.tests).map((test) => {
    const priced = account ? quote(cycle, account.id, test) : null;
    const taken = cycle.charges.some((charge) => charge.accessionId === sample.accessionId && charge.test === test && charge.status !== "rebilled");
    return { test, priced, taken };
  });
  return (
    <>
      <div className="lims-panel-head">
        <h2 className="lims-mono">{sample.accessionId}</h2>
        <span>{STATUS_LABEL[sample.status]}</span>
      </div>
      {stage === "awaiting" ? <p className="billing-note">Charge capture opens when this accession reaches review.</p> : null}
      {stage === "capture" ? (
        <div className="rcm-actions">
          <button type="button" className="btn btn-primary" onClick={() => onCapture(sample.accessionId)}>
            Capture charges
          </button>
        </div>
      ) : null}
      <dl className="account-facts">
        <div>
          <dt>Account</dt>
          <dd>
            <AccountLink name={sample.client} />
          </dd>
        </div>
        <div>
          <dt>Order</dt>
          <dd className="lims-mono">{sample.orderId}</dd>
        </div>
        <div>
          <dt>Route</dt>
          <dd>{route ? routeLabel(route.route) : "—"}</dd>
        </div>
        <div>
          <dt>Payer</dt>
          <dd>{route ? `${route.payerName} · ${route.payerId}` : "—"}</dd>
        </div>
      </dl>
      <h3>Tests</h3>
      <ul className="account-activity">
        {lines.map((line) => (
          <li key={line.test}>
            <b>{line.test}</b>
            <span>
              {line.taken
                ? "Already on the ledger"
                : line.priced
                  ? `${line.priced.cpt} · ${money(line.priced.amountCents)} · ${line.priced.agreement}`
                  : "Not on the fee schedule"}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function ChargeActions({
  charge,
  account,
  sample,
  reasons,
  replacement,
  canCode,
  onFocus,
}: {
  charge: Charge;
  account: ReturnType<typeof accountById>;
  sample: SampleRecord | undefined;
  reasons: string[];
  replacement: Charge | undefined;
  canCode: boolean;
  onFocus: (id: string) => void;
}) {
  return (
    <div className="rcm-actions">
      {canCode ? (
        <label>
          ICD-10
          <select
            aria-label="ICD-10"
            value={charge.icd10}
            onChange={(event) => {
              setDiagnosis(charge.id, event.target.value);
              onFocus(charge.id);
            }}
          >
            <option value="">Select a diagnosis</option>
            {ICD10.map((code) => (
              <option key={code.code} value={code.code}>
                {code.code} — {code.description}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {charge.status === "held" && sample?.status === "hold" && !charge.labOverride ? (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            billDespiteLabHold(charge.id);
            onFocus(charge.id);
          }}
        >
          Bill despite laboratory hold
        </button>
      ) : null}
      {charge.status === "held" && account?.status === "On hold" && !charge.accountOverride ? (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            overrideAccountHold(charge.id);
            onFocus(charge.id);
          }}
        >
          Override account hold
        </button>
      ) : null}
      {charge.manualHold && (charge.status === "held" || charge.status === "ready") ? (
        <button
          type="button"
          className="btn"
          onClick={() => {
            releaseHold(charge.id);
            onFocus(charge.id);
          }}
        >
          Release manual hold
        </button>
      ) : null}
      {charge.status === "ready" ? (
        <>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              submitCharge(charge.id);
              onFocus(charge.id);
            }}
          >
            Submit {routeLabel(charge.route).toLowerCase()}
          </button>
          <HoldBox chargeId={charge.id} onFocus={onFocus} />
        </>
      ) : null}
      {charge.status === "submitted" || charge.status === "partial" ? (
        <PaymentBox key={`${charge.id}-${charge.paidCents}`} charge={charge} onFocus={onFocus} />
      ) : null}
      {charge.status === "denied" ? (
        <button
          type="button"
          className="btn btn-primary"
          disabled={reasons.length > 0}
          onClick={() => {
            const id = rebillCharge(charge.id);
            if (id) onFocus(id);
          }}
        >
          Rebill
        </button>
      ) : null}
      {charge.status === "submitted" || charge.status === "partial" || charge.status === "denied" ? (
        <button
          type="button"
          className="btn"
          onClick={() => {
            writeOffCharge(charge.id);
            onFocus(charge.id);
          }}
        >
          Write off balance
        </button>
      ) : null}
      {replacement ? (
        <button type="button" className="btn" onClick={() => onFocus(replacement.id)}>
          Open {replacement.id}
        </button>
      ) : null}
    </div>
  );
}

function ChargeCase({
  charge,
  sample,
  cycle,
  onFocus,
}: {
  charge: Charge;
  sample: SampleRecord | undefined;
  cycle: ReturnType<typeof useRevenue>;
  onFocus: (id: string) => void;
}) {
  const account = accountById(charge.accountId);
  const reasons = editsFor(charge, account, sample);
  const replacement = cycle.charges.find((item) => charge.documentId && item.replacesId === charge.documentId);
  const canCode = (charge.route === "837P" || charge.route === "Statement") && (charge.status === "held" || charge.status === "ready" || charge.status === "denied");
  return (
    <>
      <div className="lims-panel-head">
        <h2 className="lims-mono">{charge.documentId || charge.accessionId}</h2>
        <span className={`lims-badge${statusTone(charge.status)}`}>{CHARGE_STATUS_LABEL[charge.status]}</span>
      </div>
      <p className="rcm-balance">
        <span>Balance</span>
        {money(balance(charge))}
      </p>
      {reasons.length > 0 && (charge.status === "held" || charge.status === "denied") ? (
        <ul className="rcm-edits">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
      <ChargeActions charge={charge} account={account} sample={sample} reasons={reasons} replacement={replacement} canCode={canCode} onFocus={onFocus} />
      <dl className="account-facts">
        <div>
          <dt>Accession</dt>
          <dd className="lims-mono">
            {sample ? (
              <Link className="lims-linkish" to={`/app/samples/${charge.accessionId}`}>
                {charge.accessionId}
              </Link>
            ) : (
              charge.accessionId
            )}
          </dd>
        </div>
        <div>
          <dt>Account</dt>
          <dd>
            <AccountLink name={charge.accountName} />
          </dd>
        </div>
        <div>
          <dt>Test</dt>
          <dd>{charge.test}</dd>
        </div>
        <div>
          <dt>CPT/HCPCS</dt>
          <dd className="lims-mono">{charge.cpt}</dd>
        </div>
        <div>
          <dt>ICD-10</dt>
          <dd className="lims-mono">{charge.icd10 || "—"}</dd>
        </div>
        <div>
          <dt>Payer</dt>
          <dd>
            {charge.payerName} · {charge.payerId}
          </dd>
        </div>
        <div>
          <dt>Route</dt>
          <dd>{routeLabel(charge.route)}</dd>
        </div>
        <div>
          <dt>Agreement</dt>
          <dd>{charge.agreement}</dd>
        </div>
        <div>
          <dt>List</dt>
          <dd>{money(charge.listCents)}</dd>
        </div>
        <div>
          <dt>Charge</dt>
          <dd>{money(charge.amountCents)}</dd>
        </div>
        <div>
          <dt>Allowance</dt>
          <dd>{money(charge.listCents - charge.amountCents)}</dd>
        </div>
        <div>
          <dt>Paid</dt>
          <dd>{money(charge.paidCents)}</dd>
        </div>
        {charge.replacesId ? (
          <div>
            <dt>Replaces</dt>
            <dd className="lims-mono">{charge.replacesId}</dd>
          </div>
        ) : null}
        {charge.denialCode ? (
          <div>
            <dt>Denial</dt>
            <dd>
              {charge.denialCode} · {charge.denialReason}
            </dd>
          </div>
        ) : null}
      </dl>
      <h3>Ledger</h3>
      <ul className="account-activity">
        {charge.events.map((event, index) => (
          <li key={`${event.at}-${index}`}>
            <b>{event.text}</b>
            <small>{event.at}</small>
          </li>
        ))}
      </ul>
    </>
  );
}

function HoldBox({ chargeId, onFocus }: { chargeId: string; onFocus: (id: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <>
      <input aria-label="Hold reason" placeholder="Hold reason" value={reason} onChange={(event) => setReason(event.target.value)} />
      <button
        type="button"
        className="btn"
        disabled={!reason.trim()}
        onClick={() => {
          placeHold(chargeId, reason);
          onFocus(chargeId);
        }}
      >
        Place hold
      </button>
    </>
  );
}

function PaymentBox({ charge, onFocus }: { charge: Charge; onFocus: (id: string) => void }) {
  const [amount, setAmount] = useState((balance(charge) / 100).toFixed(2));
  const [code, setCode] = useState<string>(CARC[0].code);
  return (
    <>
      <input aria-label="Payment amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          const cents = Math.round(Number(amount) * 100);
          if (!Number.isFinite(cents) || cents <= 0) return;
          postPayment(charge.id, cents);
          onFocus(charge.id);
        }}
      >
        Post payment
      </button>
      <select aria-label="Denial code" value={code} onChange={(event) => setCode(event.target.value)}>
        {CARC.map((item) => (
          <option key={item.code} value={item.code}>
            {item.code} {item.reason}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn"
        onClick={() => {
          denyCharge(charge.id, code);
          onFocus(charge.id);
        }}
      >
        Deny
      </button>
    </>
  );
}
