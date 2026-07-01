'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/components/auth/AuthProvider';
import { SettingsRow, SettingsSection } from '@/components/settings/SettingsList';
import { Switch } from '@/components/ui/switch';
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

  const info = !supported
    ? 'This browser doesn’t support push notifications. On iPhone, add Bloom Journal to your Home Screen first, then try again.'
    : !VAPID_CONFIGURED
      ? 'Notifications aren’t configured for this deployment yet.'
      : !user
        ? 'Sign in to enable notifications across your devices.'
        : permission === 'denied'
          ? 'Notifications are blocked. Allow them for this site in your browser settings, then reload.'
          : null;

  return (
    <SettingsSection title="Notifications">
      {info ? (
        <p className="px-4 py-3 text-sm text-ink-soft">{info}</p>
      ) : (
        <>
          <SettingsRow
            icon={Bell}
            label="Push notifications"
            secondary="Gentle nudges for sky events, festivities, and memories — even when the app is closed."
            trailing={
              <Switch
                checked={subscribed}
                disabled={busy}
                onCheckedChange={(v) => void (v ? handleEnable() : handleDisable())}
                aria-label="Push notifications"
              />
            }
          />
          {subscribed ? (
            GROUP_LABELS.map(({ key, label, hint }) => (
              <SettingsRow
                key={key}
                label={label}
                secondary={hint}
                trailing={
                  <Switch
                    checked={groups[key]}
                    onCheckedChange={(v) => void toggleGroup(key, v)}
                    aria-label={label}
                  />
                }
              />
            ))
          ) : (
            <p className="px-4 py-3 text-xs text-ink-muted">
              On iPhone, add Bloom Journal to your Home Screen to receive notifications.
            </p>
          )}
        </>
      )}
    </SettingsSection>
  );
}
