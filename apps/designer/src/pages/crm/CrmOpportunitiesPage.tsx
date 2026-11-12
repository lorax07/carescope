import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useCrm } from "../../crm";
import { ProjectTable } from "./clientStudio";
import { CrmShell } from "./CrmShell";

export function CrmOpportunitiesPage() {
  const { opportunities, accounts } = useCrm();
  const [params] = useSearchParams();
  const client = params.get("client") || "all";
  const [filters, setFilters] = useState<string[]>(["active"]);
  const [query, setQuery] = useState("");
  const rows = opportunities.filter((item) => client === "all" || item.accountId === client);

  return (
    <CrmShell title="Projects" lede="Laboratory work in motion: new tests, locations, integrations, and renewals.">
      <ProjectTable rows={rows} accounts={accounts} filters={filters} onFilter={setFilters} query={query} onQuery={setQuery} />
    </CrmShell>
  );
}

