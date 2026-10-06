import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fileAppeal, formatMoney, rcmCanWrite, setDenialRootCause, useRcm } from "../../rcm";
import { RcmEmpty, RcmShell } from "./RcmShell";

export function RcmDenialsPage() {
  const { overlay, claims } = useRcm();
  const [cause, setCause] = useState("Missing diagnosis");
  const canWrite = rcmCanWrite();
  const roots = useMemo(() => {
    const tally = new Map<string, { count: number; cents: number }>();
    for (const denial of overlay.denials) {
      const key = denial.rootCause || "Unassigned";
      const current = tally.get(key) ?? { count: 0, cents: 0 };
      current.count += 1;
      current.cents += denial.impactCents;
      tally.set(key, current);
    }
    return [...tally.entries()].sort((a, b) => b[1].cents - a[1].cents);
  }, [overlay.denials]);

  return (
    <RcmShell title="Denials" lede="Why money was refused, who owns recovery, and which patterns keep coming back.">
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>Denial work queue</h2>
        </div>
        {overlay.denials.length ? (
          <div className="lims-table-wrap">
            <table className="lims-table">
              <thead>
                <tr>
                  <th>Claim</th>
                  <th>CARC / RARC</th>
                  <th>Reason</th>
                  <th>Root cause</th>
                  <th>Impact</th>
                  <th>Deadline</th>
                  <th>Appeal</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {overlay.denials.map((item) => {
                  const claim = claims.find((row) => row.id === item.claimId);
                  return (
                    <tr key={item.id}>
                      <td>
                        <Link className="lims-linkish" to={`/app/billing/claims/${encodeURIComponent(item.claimId)}`}>
                          {item.claimId}
                        </Link>
                        <div className="rcm-muted">
                          {item.payerName} · {item.cpt} · {claim?.accountName}
                        </div>
                      </td>
                      <td>
                        {item.carc} / {item.rarc}
                      </td>
                      <td>{item.reason}</td>
                      <td>{item.rootCause || "Unassigned"}</td>
                      <td>{formatMoney(item.impactCents)}</td>
                      <td>{item.appealDeadline}</td>
                      <td>{item.appealStatus}</td>
                      <td>
                        <button
                          type="button"
                          className="btn"
                          disabled={!canWrite}
                          onClick={() => setDenialRootCause(item.id, cause, "RCM")}
                        >
                          Set cause
                        </button>
                        {item.appealStatus === "none" ? (
                          <button type="button" className="btn btn-primary" disabled={!canWrite} onClick={() => fileAppeal(item.id, "Timely appeal")}>
                            Appeal
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <RcmEmpty title="No denials." detail="Payer refusals will land here with CARC/RARC, impact, and an appeal deadline." />
        )}
        <label className="rcm-field">
          Root cause for assignment
          <input value={cause} onChange={(event) => setCause(event.target.value)} />
        </label>
      </section>
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>Root-cause pattern</h2>
        </div>
        {roots.length ? (
          <div className="lims-table-wrap">
            <table className="lims-table">
              <thead>
                <tr>
                  <th>Cause</th>
                  <th>Count</th>
                  <th>Impact</th>
                </tr>
              </thead>
              <tbody>
                {roots.map(([label, stats]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{stats.count}</td>
                    <td>{formatMoney(stats.cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <RcmEmpty title="No patterns yet." detail="Assign root causes on denials to see recurrence." />
        )}
      </section>
    </RcmShell>
  );
}
