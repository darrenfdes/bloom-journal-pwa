'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/components/auth/AuthProvider';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  DEFAULT_GROUPS,
  getStoredGroups,
  isSubscribed,
  notificationPermission,
  pushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  updateGroups,
  type NotifyGroups,
} from '@/lib/notifications/push';

const GROUP_LABELS: { key: keyof NotifyGroups; label: string; hint: string }[] = [
  { key: 'celestial', label: 'Sky events', hint: 'Moons, meteors, eclipses, comets — at night; solstices & season shifts by day.' },
  { key: 'festivities', label: 'Festivities & milestones', hint: 'Holidays, your birthday, and bloom anniversaries.' },
  { key: 'memory', label: 'Revisit a memory', hint: 'A gentle nudge when you have an entry from a year ago today.' },
];

const VAPID_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);

export function NotificationSettings() {
  const { user } = useAuth();
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [groups, setGroups] = useState<NotifyGroups>(DEFAULT_GROUPS);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSupported(pushSupported());
    setPermission(notificationPermission());
    void isSubscribed().then(async (sub) => {
      setSubscribed(sub);
      if (sub) setGroups((await getStoredGroups()) ?? DEFAULT_GROUPS);
    });
  }, []);

  const handleEnable = async () => {
    setBusy(true);
    try {
      await subscribeToPush(groups);
      setSubscribed(true);
      setPermission(notificationPermission());
      toast.success('Notifications on — we’ll find you at the right moment 🌙');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not enable notifications.');
      setPermission(notificationPermission());
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    try {
      await unsubscribeFromPush();
      setSubscribed(false);
      toast.message('Notifications off');
    } catch {
      toast.error('Could not turn off notifications.');
    } finally {
      setBusy(false);
    }
  };

  const toggleGroup = async (key: keyof NotifyGroups, value: boolean) => {
    const next = { ...groups, [key]: value };
    setGroups(next);
    try {
      await updateGroups(next);
    } catch {
      setGroups(groups); // revert
      toast.error('Could not save that preference.');
    }
  };

  return (
    <SettingsCard
      title="Notifications"
      description="Gentle nudges for sky events, festivities, and memories — even when the app is closed."
    >
      {!supported ? (
        <p className="text-sm text-ink-soft">
          This browser doesn’t support push notifications. On iPhone, add Bloom Journal to your Home
          Screen first, then try again.
        </p>
      ) : !VAPID_CONFIGURED ? (
        <p className="text-sm text-ink-soft">Notifications aren’t configured for this deployment yet.</p>
      ) : !user ? (
        <p className="text-sm text-ink-soft">Sign in to enable notifications across your devices.</p>
      ) : permission === 'denied' ? (
        <p className="text-sm text-ink-soft">
          Notifications are blocked. Allow them for this site in your browser settings, then reload.
        </p>
      ) : (
        <>
          {subscribed ? (
            <Button variant="outline" disabled={busy} onClick={() => void handleDisable()}>
              {busy ? 'Saving…' : 'Turn off notifications'}
            </Button>
          ) : (
            <Button disabled={busy} onClick={() => void handleEnable()}>
              {busy ? 'Enabling…' : 'Enable notifications'}
            </Button>
          )}

          {subscribed ? (
            <div className="mt-2 space-y-3">
              {GROUP_LABELS.map(({ key, label, hint }) => (
                <div key={key} className="flex items-start gap-3">
                  <input
                    id={`notify-${key}`}
                    type="checkbox"
                    className="mt-1"
                    checked={groups[key]}
                    onChange={(e) => void toggleGroup(key, e.target.checked)}
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor={`notify-${key}`}>{label}</Label>
                    <p className="text-xs text-ink-muted">{hint}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink-muted">
              On iPhone, add Bloom Journal to your Home Screen to receive notifications.
            </p>
          )}
        </>
      )}
    </SettingsCard>
  );
}
