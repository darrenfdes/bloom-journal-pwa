/**
 * Web-push subscription management (client side).
 *
 * Subscribes the browser to the Push API and stores the subscription (endpoint, keys, the user's
 * IANA timezone, birthday and per-group toggles) in the `push_subscriptions` table via the
 * authenticated Supabase browser client — RLS keys each row to the signed-in user. The hourly
 * `send-notifications` edge function reads these rows to deliver notifications even when the app
 * is closed. Requires being signed in; on iOS the PWA must be installed to the home screen.
 */

import { getUser } from '@/lib/auth/session';
import { getOrCreateSettings } from '@/lib/db/repositories/settings';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export interface NotifyGroups {
  celestial: boolean;
  festivities: boolean;
  memory: boolean;
}

export const DEFAULT_GROUPS: NotifyGroups = { celestial: true, festivities: true, memory: true };

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!pushSupported()) return 'unsupported';
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function isSubscribed(): Promise<boolean> {
  return (await currentSubscription()) != null;
}

/** Write (or refresh) the subscription row for the signed-in user. */
async function upsertSubscription(sub: PushSubscription, groups: NotifyGroups): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const user = await getUser();
  if (!supabase || !user) throw new Error('Sign in to enable notifications.');

  const json = sub.toJSON();
  if (!json.keys?.p256dh || !json.keys?.auth) throw new Error('Push subscription is missing keys.');

  const settings = await getOrCreateSettings();
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      endpoint: sub.endpoint,
      user_id: user.id,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      birthday: settings.birthday ?? null,
      groups,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  );
  if (error) throw error;
}

/** Request permission, subscribe, and persist. Throws with a user-facing message on any failure. */
export async function subscribeToPush(groups: NotifyGroups = DEFAULT_GROUPS): Promise<void> {
  if (!pushSupported()) throw new Error('Notifications are not supported on this device.');
  if (!VAPID_PUBLIC_KEY) throw new Error('Notifications are not configured.');

  const user = await getUser();
  if (!user) throw new Error('Sign in to enable notifications.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was not granted.');

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
  await upsertSubscription(sub, groups);
}

/** Update which groups are enabled on the existing subscription. No-op if not subscribed. */
export async function updateGroups(groups: NotifyGroups): Promise<void> {
  const sub = await currentSubscription();
  if (sub) await upsertSubscription(sub, groups);
}

/** Unsubscribe locally and remove the stored row. */
export async function unsubscribeFromPush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  const supabase = getSupabaseBrowserClient();
  await sub.unsubscribe();
  if (supabase) await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
}

/** The groups stored for the current device's subscription, or null when not subscribed. */
export async function getStoredGroups(): Promise<NotifyGroups | null> {
  const sub = await currentSubscription();
  const supabase = getSupabaseBrowserClient();
  if (!sub || !supabase) return null;
  const { data } = await supabase
    .from('push_subscriptions')
    .select('groups')
    .eq('endpoint', sub.endpoint)
    .maybeSingle();
  return (data?.groups as NotifyGroups | undefined) ?? null;
}
