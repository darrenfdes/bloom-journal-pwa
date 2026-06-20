import type { ReactNode } from 'react';

type Props = {
  /** Section heading (rendered as `<h2>`). */
  title: string;
  /** Optional one-line description below the title. */
  description?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * The bordered section card repeated across the settings page. Collapses the
 * duplicated `<section className="space-y-4 rounded-xl border border-parchment p-4">`
 * markup so every section shares the same shell and hierarchy.
 */
export function SettingsCard({ title, description, children, className }: Props) {
  return (
    <section className={`space-y-4 rounded-xl border border-parchment p-4${className ? ` ${className}` : ''}`}>
      <div className="space-y-1">
        <h2 className="font-display text-lg font-medium text-ink">{title}</h2>
        {description ? <p className="text-sm text-ink-soft">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
