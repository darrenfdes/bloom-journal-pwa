'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/components/auth/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { exportBackup, importBackup } from '@/lib/export/backup';
import { useBloomStore } from '@/stores/useBloomStore';
import { usePwaStatus } from '@/lib/pwa/usePwaStatus';
import { getOrCreateSettings, updateSettings } from '@/lib/db/repositories/settings';
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
  const pwaStatus = usePwaStatus();
  const refreshEntries = useBloomStore((s) => s.refreshEntries);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getSyncStatus);
  const [birthday, setBirthday] = useState('');
  const [useBirthdayForStars, setUseBirthdayForStars] = useState(false);

  useEffect(() => subscribeSyncStatus(() => setSyncStatus(getSyncStatus())), []);

  useEffect(() => {
    void getOrCreateSettings().then((s) => {
      setBirthday(s.birthday ?? '');
      setUseBirthdayForStars(s.useBirthdayForStars ?? false);
    });
  }, []);

  const handleBirthdayChange = (value: string) => {
    setBirthday(value);
    void updateSettings({ birthday: value || null });
  };

  const handleUseBirthdayChange = (value: boolean) => {
    setUseBirthdayForStars(value);
    void updateSettings({ useBirthdayForStars: value });
  };

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

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      const { imported } = await importBackup(file);
      await refreshEntries();
      toast.success(
        imported === 1 ? 'Imported 1 memory' : `Imported ${imported} memories`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.message('Signed out — your local garden is still here');
    router.refresh();
  };

  const handleInstall = async () => {
    const outcome = await pwaStatus.promptInstall();
    if (outcome === 'accepted') {
      toast.success('Bloom Journal is installing');
    } else if (outcome === 'dismissed') {
      toast.message('Install dismissed');
    } else {
      toast.message('Install is not available in this browser yet');
    }
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
        <h2 className="font-display text-lg font-medium text-ink">App status</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant={pwaStatus.online ? 'default' : 'secondary'}>
            {pwaStatus.online ? 'Online' : 'Offline'}
          </Badge>
          <Badge variant={pwaStatus.installed ? 'default' : 'outline'}>
            {pwaStatus.installed ? 'Installed' : 'Browser app'}
          </Badge>
        </div>
        <p className="text-sm text-ink-soft">
          Offline support is active after the app has loaded once in production.
        </p>
        {pwaStatus.installAvailable ? (
          <Button variant="outline" onClick={() => void handleInstall()}>
            Install app
          </Button>
        ) : null}
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
        <p className="text-sm text-ink-soft">
          Export all entries and garden metadata as JSON, or import a previous backup.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={exporting} onClick={() => void handleExport()}>
            {exporting ? 'Exporting…' : 'Download backup'}
          </Button>
          <Button
            variant="outline"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            {importing ? 'Importing…' : 'Import backup'}
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => void handleImportFile(e)}
        />
      </section>

      {process.env.NODE_ENV === 'development' ? (
        <section className="space-y-4 rounded-xl border border-parchment p-4">
          <h2 className="font-display text-lg font-medium text-ink">Flower gallery</h2>
          <Button variant="outline" asChild>
            <Link href="/flowers">Preview mood blooms</Link>
          </Button>
        </section>
      ) : null}

      <section className="space-y-4 rounded-xl border border-parchment p-4">
        <h2 className="font-display text-lg font-medium text-ink">Privacy lock</h2>
        <p className="text-sm text-ink-soft">PIN lock via Web Crypto is planned for a follow-up.</p>
        <Badge variant="outline">Coming soon</Badge>
      </section>

      <section className="space-y-4 rounded-xl border border-parchment p-4">
        <h2 className="font-display text-lg font-medium text-ink">Special sky days</h2>
        <p className="text-sm text-ink-soft">
          On special days a shooting star streaks across your garden shortly after you open the app.
          Set your birthday to make it your own day instead of the default (Dec 1).
        </p>
        <label className="flex flex-col gap-1 text-sm text-ink">
          <span className="text-ink-soft">Birthday</span>
          <Input
            type="date"
            value={birthday}
            onChange={(e) => handleBirthdayChange(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={useBirthdayForStars}
            onChange={(e) => handleUseBirthdayChange(e.target.checked)}
            disabled={!birthday}
          />
          <span>Use my birthday for the yearly shooting-star day (replaces Dec 1)</span>
        </label>
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
