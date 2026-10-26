import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useCrm } from "../../crm";
import { ProjectTable, type ProjectFilter } from "./clientStudio";
import { CrmShell } from "./CrmShell";

export function CrmOpportunitiesPage() {
  const { opportunities, accounts } = useCrm();
  const [params] = useSearchParams();
  const client = params.get("client") || "all";
  const [filter, setFilter] = useState<ProjectFilter>("active");
  const [query, setQuery] = useState("");
  const rows = opportunities.filter((item) => client === "all" || item.accountId === client);

  return (
    <CrmShell title="Projects" lede="Laboratory work in motion: new tests, locations, integrations, and renewals.">
      <ProjectTable rows={rows} accounts={accounts} filter={filter} onFilter={setFilter} query={query} onQuery={setQuery} />
    </CrmShell>
  );
}

