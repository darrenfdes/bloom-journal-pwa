'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const links = [
  { href: '/write', label: 'Write' },
  { href: '/garden', label: 'Garden' },
  { href: '/settings', label: 'Settings' },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="border-t border-parchment bg-cream px-4 py-2">
      <ul className="mx-auto flex max-w-lg items-center justify-around gap-2">
        {links.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-sage text-cream'
                    : 'text-ink-muted hover:bg-parchment hover:text-ink'
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
