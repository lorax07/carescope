import type { CrmAccount } from "../crmAccounts";
import { balance, type Charge } from "../revenueCycle";
import type { SampleRecord } from "../samples";
import type { CrmIssue, CrmTask, DerivedHealth, HealthSignal } from "./types";

export function signalsFor(
  account: CrmAccount,
  charges: Charge[],
  samples: SampleRecord[],
  issues: CrmIssue[],
  tasks: CrmTask[],
): HealthSignal[] {
  const items: HealthSignal[] = [];
  const href = `/app/connectivity/clients/${account.id}`;
  const denied = charges.filter((charge) => charge.accountId === account.id && charge.status === "denied");
  const held = charges.filter((charge) => charge.accountId === account.id && charge.status === "held");
  const work = samples.filter((sample) => sample.client === account.name);
  const openIssues = issues.filter((issue) => issue.accountId === account.id && issue.status !== "resolved");
  const overdue = tasks.filter((task) => task.accountId === account.id && task.status !== "done" && task.due < stampDay());
  const agreementHold = account.agreements.some((item) => item.status === "On hold" || item.status === "Renewal due");

  if (account.status === "On hold") {
    items.push({
      code: "HOLD",
      level: "critical",
      message: "The account is on hold.",
      why: "Work and billing stay blocked until the hold is cleared.",
      action: "Call the owner and resolve the agreement or billing hold.",
      href,
      owner: account.owner,
    });
  }
  if (denied.length) {
    const cents = denied.reduce((sum, charge) => sum + balance(charge), 0);
    items.push({
      code: "DENIAL",
      level: "risk",
      message: `${denied.length} denied claim${denied.length === 1 ? "" : "s"} ($${(cents / 100).toFixed(2)}).`,
      why: "Denied balances sit in A/R and often become client-visible service issues.",
      action: "Open Sequence Revenue denials and assign a recovery owner.",
      href: "/app/billing/denials",
      owner: account.owner,
    });
  }
  if (held.length) {
    items.push({
      code: "BILLING_HOLD",
      level: "watch",
      message: `${held.length} charge${held.length === 1 ? "" : "s"} on billing hold.`,
      why: "Unbilled work delays cash and usually means missing coding or an account hold.",
      action: "Clear the hold or complete the missing claim data.",
      href: `/app/billing/capture?account=${account.id}`,
      owner: account.owner,
    });
  }
  if (agreementHold) {
    items.push({
      code: "AGREEMENT",
      level: "risk",
      message: "An agreement is on hold or due for renewal.",
      why: "The commercial relationship is the reason laboratory work is allowed to continue.",
      action: "Work the renewal opportunity before the next accession.",
      href: `/app/connectivity/opportunities?client=${account.id}`,
      owner: account.owner,
    });
  }
  if (work.some((sample) => sample.condition === "on_hold" || sample.condition === "problem")) {
    items.push({
      code: "LAB_HOLD",
      level: "watch",
      message: "Laboratory work is on hold or in a problem condition.",
      why: "Held accessions delay TAT and usually generate a client call.",
      action: "Open the accession and the related quality record.",
      href: "/app/ops/home",
      owner: account.owner,
    });
  }
  for (const issue of openIssues) {
    items.push({
      code: `ISSUE-${issue.id}`,
      level: issue.priority === "high" ? "risk" : "watch",
      message: issue.title,
      why: issue.description,
      action: "Work the issue queue and record a next step.",
      href: `/app/connectivity/issues?issue=${issue.id}`,
      owner: issue.owner,
    });
  }
  if (overdue.length) {
    items.push({
      code: "TASKS",
      level: "watch",
      message: `${overdue.length} overdue CRM task${overdue.length === 1 ? "" : "s"}.`,
      why: "Promised follow-up has passed without a recorded close.",
      action: "Open the task queue for today.",
      href: `/app/connectivity/tasks?client=${account.id}`,
      owner: account.owner,
    });
  }
  return items;
}

export function derivedHealth(account: CrmAccount, signals: HealthSignal[]): DerivedHealth {
  if (account.status === "On hold" || signals.some((item) => item.level === "critical")) return "Critical";
  if (account.health === "At risk" || signals.some((item) => item.level === "risk")) return "At risk";
  if (account.health === "Watch" || signals.some((item) => item.level === "watch")) return "Watch";
  return "Healthy";
}

function stampDay(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
