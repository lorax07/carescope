import type { ReactNode } from "react";
import { ScreenTitle } from "./ScreenTitle";

export function ModuleHeader({
  title,
  name,
  subtitle,
  action,
  sheet,
  id,
}: {
  title: ReactNode;
  name?: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  sheet?: ReactNode;
  id?: string;
}) {
  return (
    <header className="client-hero">
      <div className="client-hero-banner">
        <div>
          <ScreenTitle name={name} id={id}>
            {title}
          </ScreenTitle>
          {subtitle ? <small>{subtitle}</small> : null}
        </div>
      </div>
      <div className="client-hero-sheet">
        {sheet}
        {action ? <div className="client-hero-action">{action}</div> : null}
      </div>
    </header>
  );
}
