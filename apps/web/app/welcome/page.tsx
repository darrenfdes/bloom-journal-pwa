'use client';

/**
 * New-user welcome flow — a short, skippable tour of how Bloom works, ending on a sign-in nudge.
 * Routed to from `/` for first-time visitors (zero entries + welcome unseen); see `app/page.tsx`.
 */
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { markWelcomeSeen } from '@/lib/onboarding/welcome';
import { cn } from '@/lib/utils';

const PANELS = [
  {
    emoji: '🌱',
    title: 'Welcome to Bloom',
    body: 'A journal that grows a garden. Every entry you write blooms into a flower.',
  },
  {
    emoji: '✍️',
    title: 'Write a memory',
    body: 'Jot down a thought, a mood, a small moment worth keeping. No rules, no streaks.',
  },
  {
    emoji: '🌸',
    title: 'Watch it bloom',
    body: 'Each memory becomes a flower in your garden, under a sky that shifts with the time of day and the weather.',
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(0);

  const total = PANELS.length + 1; // the final step is the sign-in nudge
  const isSignInStep = step === total - 1;
  const panel = PANELS[step];

  const leave = (to: string, replace = true) => {
    markWelcomeSeen();
    if (replace) router.replace(to);
    else router.push(to);
  };

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-cream px-6 py-8">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => leave('/garden')}
          className="text-sm text-ink-soft hover:text-ink"
        >
          Skip
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {isSignInStep ? (
          <div className="flex max-w-sm flex-col items-center gap-4">
            <span className="text-5xl" aria-hidden>
              🌷
            </span>
            <h1 className="font-display text-3xl font-semibold text-ink">
              {user ? "You're all set" : 'Keep your garden safe'}
            </h1>
            <p className="text-sm text-ink-muted">
              {user
                ? 'Your garden is synced to your account. Plant your first memory whenever you’re ready.'
                : 'Sign in to back up your garden and reach it from any device — or keep writing now and sign in later.'}
            </p>
            <div className="mt-2 flex w-full flex-col gap-3">
              {user ? (
                <Button onClick={() => leave('/garden')}>Start writing</Button>
              ) : (
                <>
                  <Button onClick={() => leave('/login', false)}>Sign in to back up</Button>
                  <Button variant="ghost" onClick={() => leave('/garden')}>
                    Maybe later
                  </Button>
                  <p className="text-xs text-ink-soft">You can sign in anytime from Settings.</p>
                </>
              )}
            </div>
          </div>
        ) : panel ? (
          <div className="flex max-w-sm flex-col items-center gap-4">
            <span className="text-5xl" aria-hidden>
              {panel.emoji}
            </span>
            <h1 className="font-display text-3xl font-semibold text-ink">{panel.title}</h1>
            <p className="text-sm text-ink-muted">{panel.body}</p>
            <Button className="mt-2" onClick={() => setStep((s) => s + 1)}>
              Next
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex justify-center gap-2 pb-2">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cn('h-1.5 w-1.5 rounded-full', i === step ? 'bg-sage' : 'bg-parchment')}
          />
        ))}
      </div>
    </div>
  );
}
