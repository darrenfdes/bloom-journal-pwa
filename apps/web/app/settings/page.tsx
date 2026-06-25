'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/components/auth/AuthProvider';
import { BackLink } from '@/components/layout/BackLink';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { exportBackup, importBackup } from '@/lib/export/backup';
import { useSettingsField } from '@/lib/hooks/useSettingsField';
import { useSyncStatus } from '@/lib/hooks/useSyncStatus';
import { useBloomStore } from '@/stores/useBloomStore';
import { usePwaStatus } from '@/lib/pwa/usePwaStatus';
import { getOrCreateSettings } from '@/lib/db/repositories/settings';
import { searchEntries } from '@/lib/db/repositories/entries';
import { signOut } from '@/lib/auth/session';
import { isSupabaseConfigured } from '@/lib/auth/session';
import { useIsAdmin } from '@/lib/auth/useIsAdmin';

function formatSyncTime(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString();
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, configured } = useAuth();
  const isAdmin = useIsAdmin();
  const supabaseConfigured = isSupabaseConfigured();
  const pwaStatus = usePwaStatus();
  const refreshEntries = useBloomStore((s) => s.refreshEntries);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const syncStatus = useSyncStatus();

  // Birthday settings load asynchronously from Dexie; the field hooks reset to
  // the loaded value once `initial` arrives.
  const [birthdayInitial, setBirthdayInitial] = useState('');
  const [useBirthdayForStarsInitial, setUseBirthdayForStarsInitial] = useState(false);
  const [birthday, setBirthday, birthdaySaveState] = useSettingsField('birthday', birthdayInitial);
  const [useBirthdayForStars, setUseBirthdayForStars, starsSaveState] = useSettingsField(
    'useBirthdayForStars',
    useBirthdayForStarsInitial
  );

  useEffect(() => {
    void getOrCreateSettings().then((s) => {
      setBirthdayInitial(s.birthday ?? '');
      setUseBirthdayForStarsInitial(s.useBirthdayForStars ?? false);
    });
  }, []);

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
      <BackLink href="/garden" label="Garden" />
      <header>
        <h1 className="font-display text-3xl font-semibold text-ink">Settings</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Your journal stays on this device. Sign in to back up and sync across devices.
        </p>
      </header>

      <SettingsCard title="Account">
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
          <Button asChild>
            {/* /login handles both sign-in and sign-up, so a single CTA suffices. */}
            <Link href="/login">Sign in or create account</Link>
          </Button>
        ) : (
          <p className="text-sm text-ink-soft">
            Copy <code className="text-xs">.env.local.example</code> to enable cloud backup.
          </p>
        )}
      </SettingsCard>

      <SettingsCard title="Cloud sync">
        <p className="text-sm text-ink-soft" aria-live="polite">
          {syncLabel}
        </p>
        {syncStatus.lastError ? (
          <p className="text-xs text-danger">Last error: {syncStatus.lastError}</p>
        ) : null}
        <Badge variant={supabaseConfigured ? 'default' : 'secondary'}>
          {supabaseConfigured ? (user ? 'Signed in' : 'Ready — not signed in') : 'Local only'}
        </Badge>
      </SettingsCard>

      <SettingsCard title="App status">
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
      </SettingsCard>

      <NotificationSettings />

      <SettingsCard title="Search memories">
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
      </SettingsCard>

      <SettingsCard
        title="Bouquets"
        description="Gather a handful of your flowers into a bouquet to share, or open one a friend sent you."
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/bouquet/new">Make a bouquet</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/bouquets">My bouquets</Link>
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Backup"
        description="Export all entries and garden metadata as JSON, or import a previous backup."
      >
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
      </SettingsCard>

      {process.env.NODE_ENV === 'development' ? (
        <SettingsCard title="Flower gallery">
          <Button variant="outline" asChild>
            <Link href="/flowers">Preview mood blooms</Link>
          </Button>
        </SettingsCard>
      ) : null}

      {isAdmin ? (
        <SettingsCard
          title="Preview (admin)"
          description="Sky & weather and the sample meadow playgrounds."
        >
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/preview">Sky &amp; weather</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/preview/meadow">Sample meadow</Link>
            </Button>
          </div>
        </SettingsCard>
      ) : null}

      <SettingsCard
        title="Your special day"
        description="Add your birthday and your garden may mark the occasion."
      >
        <div className="space-y-1">
          <Label htmlFor="birthday">Birthday</Label>
          <Input
            id="birthday"
            type="date"
            value={birthday ?? ''}
            onChange={(e) => setBirthday(e.target.value || null)}
          />
          {birthdaySaveState === 'error' ? (
            <p className="text-xs text-danger">Could not save your birthday.</p>
          ) : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor="use-birthday-stars">Use my birthday as my special day</Label>
          <input
            id="use-birthday-stars"
            type="checkbox"
            checked={useBirthdayForStars}
            onChange={(e) => setUseBirthdayForStars(e.target.checked)}
            disabled={!birthday}
          />
          {!birthday ? (
            <p className="text-xs text-ink-muted">Add a birthday to enable this.</p>
          ) : null}
          {starsSaveState === 'error' ? (
            <p className="text-xs text-danger">Could not save this setting.</p>
          ) : null}
        </div>
      </SettingsCard>
    </div>
  );
}
