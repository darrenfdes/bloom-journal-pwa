'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { hasSeenWelcome } from '@/lib/onboarding/welcome';
import { useBloomStore } from '@/stores/useBloomStore';

export default function HomePage() {
  const router = useRouter();
  const ready = useBloomStore((s) => s.ready);
  const entries = useBloomStore((s) => s.entries);

  useEffect(() => {
    if (!ready) return;
    // Entries are loaded before `ready` flips, so this count is settled by now.
    const isNewUser = entries.length === 0 && !hasSeenWelcome();
    router.replace(isNewUser ? '/welcome' : '/garden');
  }, [ready, entries.length, router]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh flex-1 items-center justify-center bg-cream">
        <p className="font-display text-lg text-ink-muted">Opening your garden…</p>
      </div>
    );
  }

  return null;
}
