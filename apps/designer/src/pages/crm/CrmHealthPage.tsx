import { useCrm } from "../../crm";
import { CrmEmpty, CrmShell, SignalList } from "./CrmShell";
import { CrmAccountLink } from "./CrmRecordStrip";

export function CrmHealthPage() {
  const { cards } = useCrm();
  const watched = cards.filter((card) => card.health !== "Healthy").sort((a, b) => b.signals.length - a.signals.length);

  return (
    <CrmShell title="Account health" lede="Health is a set of explainable signals from holds, denials, agreements, laboratory problems, issues, and overdue tasks. There is no opaque score.">
      <section className="lims-panel billing-panel">
        <div className="lims-panel-head">
          <h2>Accounts with a signal</h2>
        </div>
        {watched.length ? (
          watched.map((card) => (
            <div key={card.account.id} className="rcm-health-block">
              <div className="lims-panel-head">
                <h3>
                  <CrmAccountLink className="lims-linkish" accountId={card.account.id} title={card.account.name}>
                    {card.account.name}
                  </CrmAccountLink>
                </h3>
                <span>
                  {card.health} · {card.account.owner}
                </span>
              </div>
              <SignalList items={card.signals} />
            </div>
          ))
        ) : (
          <CrmEmpty title="Every account is healthy." detail="Signals appear when a hold, denial, issue, or overdue follow-up is on the account." />
        )}
      </section>
    </CrmShell>
  );
}
