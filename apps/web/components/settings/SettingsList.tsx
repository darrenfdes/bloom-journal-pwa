'use client';

import Link from 'next/link';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Native-style grouped "inset list" used to rebuild Settings: an uppercase
 * section label above a rounded, hairline-divided container of rows. Mix
 * `SettingsRow`s with plain children (e.g. a search field) — `divide-y` draws
 * the separators between direct children either way.
 */
export function SettingsSection({
  title,
  footnote,
  children,
  className,
}: {
  title?: string;
  /** Muted caption rendered under the group (native-style footer note). */
  footnote?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-2', className)}>
      {title ? (
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {title}
        </h2>
      ) : null}
      <div className="divide-y divide-parchment overflow-hidden rounded-2xl border border-parchment bg-cream">
        {children}
      </div>
      {footnote ? <p className="px-1 text-xs text-ink-muted">{footnote}</p> : null}
    </section>
  );
}

type RowProps = {
  icon?: LucideIcon;
  label: React.ReactNode;
  /** Secondary line under the label. */
  secondary?: React.ReactNode;
  /** Muted value text on the right, before any trailing control. */
  value?: React.ReactNode;
  /** Trailing slot — a `Switch`, `Badge`, etc. Replaces the auto chevron. */
  trailing?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  /** Force-hide the auto chevron on an interactive row. */
  chevron?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  className?: string;
};

export function SettingsRow({
  icon: Icon,
  label,
  secondary,
  value,
  trailing,
  href,
  onClick,
  chevron = true,
  destructive = false,
  disabled = false,
  className,
}: RowProps) {
  const interactive = Boolean(href || onClick) && !disabled;
  const rowCls = cn(
    'flex w-full items-center gap-3 px-4 py-3 text-left min-h-[3.25rem] transition-colors',
    interactive && 'hover:bg-parchment/40 active:bg-parchment/60',
    disabled && 'opacity-60',
    className
  );

  const showChevron = interactive && chevron && !trailing && value === undefined;

  const content = (
    <>
      {Icon ? (
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            destructive ? 'bg-danger/10 text-danger' : 'bg-sage/15 text-sage-dark'
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-sm font-medium',
            destructive ? 'text-danger' : 'text-ink'
          )}
        >
          {label}
        </span>
        {secondary ? (
          <span className="mt-0.5 block text-xs text-ink-muted">{secondary}</span>
        ) : null}
      </span>
      {value !== undefined ? (
        <span className="shrink-0 text-sm text-ink-muted">{value}</span>
      ) : null}
      {trailing ?? (showChevron ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
      ) : null)}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={rowCls} onClick={onClick}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={rowCls}>
        {content}
      </button>
    );
  }
  return <div className={rowCls}>{content}</div>;
}
