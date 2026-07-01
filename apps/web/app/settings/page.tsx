'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Cake,
  Cloud,
  CloudOff,
  Download,
  Flower2,
  FlaskConical,
  LogIn,
  LogOut,
  Palette,
  Search,
  Smartphone,
  Sparkles,
  Upload,
  User,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/components/auth/AuthProvider';
import { BackLink } from '@/components/layout/BackLink';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { SettingsRow, SettingsSection } from '@/components/settings/SettingsList';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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

      <SettingsSection title="Account">
        {authLoading ? (
          <p className="px-4 py-3 text-sm text-ink-soft">Loading account…</p>
        ) : user ? (
          <>
            <SettingsRow icon={User} label={user.email ?? 'Signed in'} secondary="Signed in" />
            <SettingsRow
              icon={LogOut}
              label="Sign out"
              destructive
              chevron={false}
              onClick={() => void handleSignOut()}
            />
          </>
        ) : configured ? (
          // /login handles both sign-in and sign-up, so a single CTA suffices.
          <SettingsRow icon={LogIn} label="Sign in or create account" href="/login" />
        ) : (
          <p className="px-4 py-3 text-sm text-ink-soft">
            Copy <code className="text-xs">.env.local.example</code> to enable cloud backup.
          </p>
        )}
      </SettingsSection>

      <SettingsSection title="Sync & app">
        <SettingsRow
          icon={syncStatus.offline ? CloudOff : Cloud}
          label="Cloud sync"
          secondary={
            <>
              <span aria-live="polite">{syncLabel}</span>
              {syncStatus.lastError ? (
                <span className="block text-danger">Last error: {syncStatus.lastError}</span>
              ) : null}
            </>
          }
          trailing={
            <Badge variant={supabaseConfigured ? 'default' : 'secondary'}>
              {supabaseConfigured ? (user ? 'Signed in' : 'Ready') : 'Local only'}
            </Badge>
          }
        />
        <SettingsRow
          icon={pwaStatus.online ? Wifi : WifiOff}
          label="Connection"
          trailing={
            <Badge variant={pwaStatus.online ? 'default' : 'secondary'}>
              {pwaStatus.online ? 'Online' : 'Offline'}
            </Badge>
          }
        />
        <SettingsRow
          icon={Smartphone}
          label="App"
          secondary="Works offline after it has loaded once in production."
          trailing={
            <Badge variant={pwaStatus.installed ? 'default' : 'outline'}>
              {pwaStatus.installed ? 'Installed' : 'Browser'}
            </Badge>
          }
        />
        {pwaStatus.installAvailable ? (
          <SettingsRow
            icon={Download}
            label="Install app"
            onClick={() => void handleInstall()}
          />
        ) : null}
      </SettingsSection>

      <SettingsSection
        title="Your garden"
        footnote="Gather a handful of your flowers into a bouquet to share, or open one a friend sent you."
      >
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 rounded-xl border border-parchment bg-cream-dark/40 px-3">
            <Search className="h-4 w-4 shrink-0 text-ink-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search memories…"
              aria-label="Search memories"
              onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
              className="h-10 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => void handleSearch()}
                className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-sage-dark hover:bg-parchment/60"
              >
                Go
              </button>
            ) : null}
          </div>
        </div>
        <SettingsRow icon={Flower2} label="Make a bouquet" href="/bouquet/new" />
        <SettingsRow icon={Flower2} label="My bouquets" href="/bouquets" />
        <SettingsRow
          icon={Cake}
          label="Birthday"
          secondary={
            birthdaySaveState === 'error' ? (
              <span className="text-danger">Could not save your birthday.</span>
            ) : (
              'Your garden may mark the occasion.'
            )
          }
          trailing={
            <Input
              type="date"
              value={birthday ?? ''}
              onChange={(e) => setBirthday(e.target.value || null)}
              aria-label="Birthday"
              className="h-9 w-auto"
            />
          }
        />
        <SettingsRow
          icon={Sparkles}
          label="Use my birthday as my special day"
          secondary={
            !birthday
              ? 'Add a birthday to enable this.'
              : starsSaveState === 'error'
                ? <span className="text-danger">Could not save this setting.</span>
                : undefined
          }
          trailing={
            <Switch
              checked={useBirthdayForStars ?? false}
              disabled={!birthday}
              onCheckedChange={(v) => setUseBirthdayForStars(v)}
              aria-label="Use my birthday as my special day"
            />
          }
        />
      </SettingsSection>

      <NotificationSettings />

      <SettingsSection
        title="Data"
        footnote="Exports all entries and garden metadata as JSON; import restores a previous backup."
      >
        <SettingsRow
          icon={Download}
          label={exporting ? 'Exporting…' : 'Download backup'}
          disabled={exporting}
          onClick={() => void handleExport()}
        />
        <SettingsRow
          icon={Upload}
          label={importing ? 'Importing…' : 'Import backup'}
          disabled={importing}
          onClick={() => fileInputRef.current?.click()}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => void handleImportFile(e)}
        />
      </SettingsSection>

      {process.env.NODE_ENV === 'development' || isAdmin ? (
        <SettingsSection title="Developer">
          {process.env.NODE_ENV === 'development' ? (
            <SettingsRow icon={Palette} label="Flower gallery" href="/flowers" />
          ) : null}
          {isAdmin ? (
            <>
              <SettingsRow icon={FlaskConical} label="Sky & weather" href="/preview" />
              <SettingsRow icon={FlaskConical} label="Sample meadow" href="/preview/meadow" />
            </>
          ) : null}
        </SettingsSection>
      ) : null}
    </div>
  );
}
