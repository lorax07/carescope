import type { ApprovalStep } from "./api";

const MODULE_STEPS: Array<{ key: ApprovalStep; label: string; detail: string }> = [
  { key: "requested", label: "Requested", detail: "Operator opens the add-module case" },
  { key: "secondary", label: "Secondary approval", detail: "Internal reviewer signs off" },
  { key: "business", label: "Business contact approval", detail: "Client business contact confirms" },
  { key: "provisioned", label: "Provisioned", detail: "Module is installed on the lab" },
];

const CLOSE_STEPS: Array<{ key: ApprovalStep; label: string; detail: string }> = [
  { key: "requested", label: "Requested", detail: "Operator opens the close-account case" },
  { key: "secondary", label: "Secondary approval", detail: "Internal reviewer signs off" },
  { key: "business", label: "Business contact approval", detail: "Client business contact confirms" },
  { key: "provisioned", label: "Closed", detail: "The account is closed" },
];

function stepStatus(
  current: ApprovalStep | null,
  key: ApprovalStep
): "complete" | "current" | "pending" {
  const order: ApprovalStep[] = ["requested", "secondary", "business", "provisioned"];
  if (!current) {
    return key === "requested" ? "current" : "pending";
  }
  const live: ApprovalStep =
    current === "requested" ? "secondary" : current === "secondary" ? "business" : "provisioned";
  const currentIndex = order.indexOf(current === "provisioned" ? "provisioned" : live);
  const keyIndex = order.indexOf(key);
  if (current === "provisioned") return "complete";
  if (keyIndex < currentIndex) return "complete";
  if (keyIndex === currentIndex) return "current";
  return "pending";
}

export function ApprovalMap({
  step,
  moduleLabel,
  variant = "module",
}: {
  step: ApprovalStep | null;
  moduleLabel?: string;
  variant?: "module" | "close";
}) {
  const steps = variant === "close" ? CLOSE_STEPS : MODULE_STEPS;
  return (
    <section className="is-approval" aria-label="Approval process">
      <div className="is-approval-copy">
        <h3>Approval process</h3>
        <p>
          {variant === "close"
            ? "Closing an account requires secondary approval and business contact approval."
            : "Adding a module requires secondary approval and business contact approval before it is provisioned."}
          {moduleLabel ? (
            <>
              {" "}
              Current request: <strong>{moduleLabel}</strong>.
            </>
          ) : null}
        </p>
      </div>
      <ol className="is-approval-map">
        {steps.map((item, index) => {
          const status = stepStatus(step, item.key);
          return (
            <li key={item.key} className={`is-approval-step ${status}`}>
              <span className="is-approval-index">{index + 1}</span>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
              <em>{status === "complete" ? "Complete" : status === "current" ? "Current" : "Pending"}</em>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
