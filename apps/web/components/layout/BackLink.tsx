'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

type Props = {
  /** Where “back” goes. */
  href: string;
  /** What sits at that destination, e.g. "Settings" or "Garden". */
  label: string;
};

/** A consistent back affordance for the settings-area pages. */
export function BackLink({ href, label }: Props) {
  return (
    <Link
      href={href}
      className="-ml-1 inline-flex w-fit items-center gap-1 text-sm text-ink-soft transition-colors hover:text-ink"
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
