'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/components/auth/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { exportBackup } from '@/lib/export/backup';
import { searchEntries } from '@/lib/db/repositories/entries';
import { signOut } from '@/lib/auth/session';
import { getSyncStatus, subscribeSyncStatus, type SyncStatus } from '@/lib/sync/status';
import { isSupabaseConfigured } from '@/lib/auth/session';

function formatSyncTime(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString();
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, configured } = useAuth();
  const supabaseConfigured = isSupabaseConfigured();
  const [query, setQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getSyncStatus);

  useEffect(() => subscribeSyncStatus(() => setSyncStatus(getSyncStatus())), []);

  const handleSearch = async () => {
    const results = await searchEntries(query);
    if (results.length === 0) {
      toast.message('No memories found');
      return;
    }
    router.push(`/entry/${results[0]!.id}`);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportBackup();
      toast.success('Backup downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.message('Signed out — your local garden is still here');
    router.refresh();
  };

  const syncLabel = syncStatus.offline
    ? 'Offline'
    : syncStatus.syncing
      ? 'Syncing…'
      : syncStatus.pendingChanges > 0
        ? `${syncStatus.pendingChanges} pending change(s)`
        : `Last synced ${formatSyncTime(syncStatus.lastSyncedAt)}`;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-ink">Settings</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Your journal stays on this device. Sign in to back up and sync across devices.
        </p>
      </header>

      <section className="space-y-4 rounded-xl border border-parchment p-4">
        <h2 className="font-display text-lg font-medium text-ink">Account</h2>
        {authLoading ? (
          <p className="text-sm text-ink-soft">Loading account…</p>
        ) : user ? (
          <>
            <p className="text-sm text-ink">{user.email}</p>
            <Button variant="outline" onClick={() => void handleSignOut()}>
              Sign out
            </Button>
          </>
        ) : configured ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/login">Create account</Link>
            </Button>
          </div>
        ) : (
          <p className="text-sm text-ink-soft">
            Copy <code className="text-xs">.env.local.example</code> to enable cloud backup.
          </p>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-parchment p-4">
        <h2 className="font-display text-lg font-medium text-ink">Cloud sync</h2>
        <p className="text-sm text-ink-soft">{syncLabel}</p>
        <Badge variant={supabaseConfigured ? 'default' : 'secondary'}>
          {supabaseConfigured ? (user ? 'Signed in' : 'Ready — not signed in') : 'Local only'}
        </Badge>
      </section>

      <section className="space-y-4 rounded-xl border border-parchment p-4">
        <h2 className="font-display text-lg font-medium text-ink">Search memories</h2>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, content, tags…"
            onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
          />
          <Button variant="outline" onClick={() => void handleSearch()}>
            Go
          </Button>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-parchment p-4">
        <h2 className="font-display text-lg font-medium text-ink">Backup</h2>
        <p className="text-sm text-ink-soft">Export all entries and garden metadata as JSON.</p>
        <Button variant="outline" disabled={exporting} onClick={() => void handleExport()}>
          {exporting ? 'Exporting…' : 'Download backup'}
        </Button>
      </section>

      <section className="space-y-4 rounded-xl border border-parchment p-4">
        <h2 className="font-display text-lg font-medium text-ink">Flower gallery</h2>
        <Button variant="outline" asChild>
          <Link href="/flowers">Preview mood blooms</Link>
        </Button>
      </section>

      <section className="space-y-4 rounded-xl border border-parchment p-4">
        <h2 className="font-display text-lg font-medium text-ink">Privacy lock</h2>
        <p className="text-sm text-ink-soft">PIN lock via Web Crypto is planned for a follow-up.</p>
        <Badge variant="outline">Coming soon</Badge>
      </section>

      <section className="space-y-4 rounded-xl border border-parchment p-4">
        <h2 className="font-display text-lg font-medium text-ink">Reminders</h2>
        <p className="text-sm text-ink-soft">
          Daily journal reminders will use browser notifications when supported.
        </p>
        <Badge variant="outline">Stub — not scheduled yet</Badge>
      </section>
    </div>
  );
}
