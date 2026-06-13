'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sprout, Plus, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  const isGarden = pathname === '/garden' || pathname.startsWith('/garden/');
  const isSettings = pathname === '/settings' || pathname.startsWith('/settings/');

  const handleCenterAction = () => {
    router.push('/write');
  };

  return (
    <motion.nav
      initial={{ y: 80, x: '-50%', opacity: 0 }}
      animate={{ y: 0, x: '-50%', opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30, delay: 0.1 }}
      className="fixed bottom-6 left-1/2 z-40 w-[90%] max-w-sm rounded-full border border-white/40 bg-cream/75 px-5 py-2.5 shadow-[0_8px_32px_0_rgba(61,56,50,0.12)] backdrop-blur-md select-none"
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
  );
}
