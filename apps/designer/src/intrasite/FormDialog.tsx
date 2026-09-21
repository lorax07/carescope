import { FormEvent, ReactNode, useEffect, useId } from "react";

export function IntrasiteFormDialog({
  title,
  eyebrow,
  description,
  submitLabel,
  savingLabel = "Saving…",
  saving,
  disabled,
  error,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  eyebrow: string;
  description: string;
  submitLabel: string;
  savingLabel?: string;
  saving: boolean;
  disabled?: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: () => Promise<void> | void;
  children: ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit();
  }

  return (
    <div className="is-case-overlay" role="presentation" onClick={onClose}>
      <div
        className="is-form-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="is-case-head">
          <div>
            <p className="is-eyebrow">{eyebrow}</p>
            <h2 id={titleId}>{title}</h2>
            <p>{description}</p>
          </div>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </header>
        <form className="is-dialog-form" onSubmit={handleSubmit}>
          {children}
          {error ? <p className="is-error">{error}</p> : null}
          <div className="is-form-dialog-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || disabled}>
              {saving ? savingLabel : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
