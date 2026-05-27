'use client';

import Link from 'next/link';

import { PREVIEW_ROUTES } from '@/lib/scene/preview-scenes';

export default function PreviewIndexPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 py-[calc(2rem+var(--safe-top))]">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Scene previews</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fixed scenes for testing sky, weather, and panning.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {PREVIEW_ROUTES.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className="block rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
