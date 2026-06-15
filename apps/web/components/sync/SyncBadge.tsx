'use client';

import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

import { usePwaStatus } from '@/lib/pwa/usePwaStatus';
import { getSyncStatus, subscribeSyncStatus, type SyncStatus } from '@/lib/sync/status';
import { cn } from '@/lib/utils';

type Tone = 'online' | 'offline' | 'syncing' | 'pending';

function resolve(online: boolean, status: SyncStatus): { label: string; tone: Tone } {
  if (!online || status.offline) return { label: 'Offline', tone: 'offline' };
  if (status.syncing) return { label: 'Syncing…', tone: 'syncing' };
  if (status.pendingChanges > 0) {
    return {
      label: status.pendingChanges === 1 ? '1 pending' : `${status.pendingChanges} pending`,
      tone: 'pending',
    };
  }
  return { label: 'Online', tone: 'online' };
}

/** Small always-visible connection + sync indicator. Richer detail lives on the Settings page. */
export function SyncBadge() {
  const { online } = usePwaStatus();
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus);

  useEffect(() => subscribeSyncStatus(() => setStatus(getSyncStatus())), []);

  const { label, tone } = resolve(online, status);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{ top: 'calc(var(--safe-top) + 0.75rem)' }}
      className={cn(
        'fixed right-3 z-40 flex items-center gap-1.5 rounded-full border bg-cream/75 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur-md select-none',
        tone === 'offline' && 'border-danger/40 text-danger',
        tone === 'syncing' && 'border-sage/40 text-sage-dark',
        tone === 'pending' && 'border-parchment text-ink-muted',
        tone === 'online' && 'border-success/40 text-success'
      )}
    >
      {tone === 'syncing' ? (
        <RefreshCw className="h-3 w-3 animate-spin" />
      ) : tone === 'offline' ? (
        <CloudOff className="h-3 w-3" />
      ) : tone === 'pending' ? (
        <Cloud className="h-3 w-3" />
      ) : (
        <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
      )}
      <span>{label}</span>
    </div>
  );
}
