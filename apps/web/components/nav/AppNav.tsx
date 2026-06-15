'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sprout, Plus, Settings } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { cn } from '@/lib/utils';
import { useIdle } from '@/lib/hooks/useIdle';
import { useBloomStore } from '@/stores/useBloomStore';

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const setQuickWriteOpen = useBloomStore((s) => s.setQuickWriteOpen);
  const memoryCardOpen = useBloomStore((s) => s.memoryCardOpen);

  const isGarden = pathname === '/garden' || pathname.startsWith('/garden/');
  const isSettings = pathname === '/settings' || pathname.startsWith('/settings/');

  // In the immersive garden, tuck the nav away once the user goes idle so it
  // stops covering the meadow; the peek handle (and any interaction) brings it
  // back. A memory card forces it away too. Other routes keep the nav visible.
  const reduceMotion = useReducedMotion();
  const { idle, wake } = useIdle(2800, isGarden);
  const hidden = memoryCardOpen || (isGarden && idle);
  const showHandle = isGarden && idle && !memoryCardOpen;
  const slideTransition = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 260, damping: 30 };

  // On the garden, capture a memory inline via the quick-add modal; elsewhere fall back to
  // the full write page.
  const handleCenterAction = () => {
    if (isGarden) setQuickWriteOpen(true);
    else router.push('/write');
  };

  return (
    <>
    <motion.nav
      initial={{ y: 80, x: '-50%', opacity: 0 }}
      animate={{ y: hidden ? 120 : 0, x: '-50%', opacity: hidden ? 0 : 1 }}
      transition={slideTransition}
      aria-hidden={hidden}
      style={{ bottom: 'calc(1.5rem + var(--safe-bottom))', pointerEvents: hidden ? 'none' : 'auto' }}
      className="fixed left-1/2 z-40 w-[90%] max-w-sm rounded-full border border-white/40 bg-cream/75 px-5 py-2.5 shadow-[0_8px_32px_0_rgba(61,56,50,0.12)] backdrop-blur-md select-none"
    >
      <div className="grid grid-cols-3 items-center">
        {/* Garden Tab */}
        <Link
          href="/garden"
          className={cn(
            'relative flex flex-col items-center justify-center justify-self-center rounded-full px-4 py-1.5 transition-colors',
            isGarden ? 'text-sage-dark' : 'text-ink-muted hover:text-ink'
          )}
        >
          {isGarden && (
            <motion.div
              layoutId="activeNavTab"
              className="absolute inset-0 -z-10 rounded-full bg-sage/15"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <Sprout className="h-5 w-5" strokeWidth={isGarden ? 2.5 : 2} />
          <span className="text-[10px] font-semibold tracking-wide uppercase mt-0.5">Garden</span>
        </Link>

        {/* Spacer — FAB is absolutely centered over this column */}
        <div className="h-12 w-12 shrink-0" aria-hidden />

        {/* Settings Tab */}
        <Link
          href="/settings"
          className={cn(
            'relative flex flex-col items-center justify-center justify-self-center rounded-full px-4 py-1.5 transition-colors',
            isSettings ? 'text-sage-dark' : 'text-ink-muted hover:text-ink'
          )}
        >
          {isSettings && (
            <motion.div
              layoutId="activeNavTab"
              className="absolute inset-0 -z-10 rounded-full bg-sage/15"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <Settings className="h-5 w-5" strokeWidth={isSettings ? 2.5 : 2} />
          <span className="text-[10px] font-semibold tracking-wide uppercase mt-0.5">Settings</span>
        </Link>
      </div>

      {/* Prominent Write Center Button — fixed to nav center */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="pointer-events-auto relative">
          <div className="absolute -inset-1 rounded-full bg-sage/20 blur-md animate-pulse pointer-events-none" />
          <button
            type="button"
            onClick={handleCenterAction}
            className="relative flex h-12 w-12 items-center justify-center rounded-full bg-sage text-cream shadow-md transition-all hover:scale-105 active:scale-95"
            aria-label="New journal entry"
          >
            <Plus className="h-6 w-6" strokeWidth={3} />
          </button>
        </div>
      </div>
    </motion.nav>

      {/* Peek handle — the affordance that brings the tucked-away nav back. */}
      <AnimatePresence>
        {showHandle && (
          <motion.button
            key="nav-peek"
            type="button"
            onClick={wake}
            onFocus={wake}
            aria-label="Show navigation"
            initial={{ opacity: 0, y: 10, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 10, x: '-50%' }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-1/2 z-40 flex items-center justify-center rounded-full px-5 py-2.5"
            style={{
              bottom: 'calc(0.5rem + var(--safe-bottom))',
              background: 'rgba(22,27,36,.38)',
              border: '1px solid rgba(247,241,227,.16)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            <span className="block h-1 w-8 rounded-full" style={{ background: 'rgba(247,241,227,.55)' }} />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
