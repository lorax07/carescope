import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useRcm, type ClaimWorkflow } from "../../rcm";
import { WORKFLOW_LABEL } from "../../rcm/types";
import { RcmShell } from "./RcmShell";
import { RevenueAssist, RevenueClaimTable, claimMatches, type ClaimFilter } from "./revenueStudio";

function filterForWorkflow(workflow: string): ClaimFilter {
  if (workflow === "paid" || workflow === "resolved") return "paid";
  if (workflow === "denied" || workflow === "appealed") return "denied";
  if (workflow === "all" || !workflow) return "open";
  return "all";
}

export function RcmClaimsPage() {
  const { claims, actor } = useRcm();
  const [params] = useSearchParams();
  const workflow = params.get("workflow") || "";
  const [filter, setFilter] = useState<ClaimFilter>(filterForWorkflow(workflow));
  const [query, setQuery] = useState(params.get("q") || "");
  const rows = workflow && workflow in WORKFLOW_LABEL ? claims.filter((claim) => claim.workflow === (workflow as ClaimWorkflow)) : claims;

  return (
    <RcmShell studio title="Claims" lede="Every claim moving through capture, scrubbing, submission, payment, and denial.">
      <div className="client-home">
        <div className="client-home-main">
          <header className="client-board-head">
            <h1>Claims</h1>
          </header>
          <div className="client-board-links">
            <Link to="/app/billing/capture">Charge capture</Link>
            <Link to="/app/billing/queues">Exceptions</Link>
            <Link to="/app/billing/denials">Denials</Link>
          </div>
          <RevenueClaimTable scroll rows={rows} filter={workflow && workflow in WORKFLOW_LABEL ? "all" : filter} onFilter={setFilter} query={query} onQuery={setQuery} />
          {workflow && workflow in WORKFLOW_LABEL ? <p className="client-empty">Showing {WORKFLOW_LABEL[workflow as ClaimWorkflow]} claims. {rows.filter((row) => claimMatches(row, "all")).length} in this workflow.</p> : null}
        </div>
        <aside className="client-home-side">
          <RevenueAssist actor={actor} hint="Workflow, financial status, and record status stay separate on each claim." />
        </aside>
      </div>
    </RcmShell>
  );
}
