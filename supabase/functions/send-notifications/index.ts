// Hourly web-push fan-out for world events & memories.
//
// Invoked by pg_cron (see the push_notifications migration) with a shared bearer secret. For every
// stored push subscription it works out the user's *local* time from their IANA timezone, decides
// which notifications are due in that window (pure logic in ../_shared/notify-select.ts), dedupes
// against notification_log, and delivers via the Web Push protocol (VAPID). Dead endpoints (404/410)
// are pruned. No per-user JWT — this is a trusted server-to-server job, so verify_jwt = false.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

import eventsData from '../_shared/events.json' with { type: 'json' };
import { selectNotifications, type NotifyGroups } from '../_shared/notify-select.ts';
import type { NotifyEvent } from '../_shared/messages.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const NOTIFY_CRON_SECRET = Deno.env.get('NOTIFY_CRON_SECRET') ?? '';
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hello@bloomjournal.app';

// events.json events carry calendar/instant fields beyond what the notifier copy needs.
type RawEvent = NotifyEvent & { date: string; instantUTC?: string };
type EventsFile = { byDate: Record<string, RawEvent[]> };
const BY_DATE = (eventsData as unknown as EventsFile).byDate;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Minutes to add to UTC to reach the user's wall clock in `tz` at instant `at`. DST-correct. */
function tzOffsetMinutes(tz: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(at);
  const f: Record<string, number> = {};
  for (const p of parts) if (p.type !== 'literal') f[p.type] = Number(p.value);
  const asUTC = Date.UTC(f.year, f.month - 1, f.day, f.hour === 24 ? 0 : f.hour, f.minute, f.second);
  return Math.round((asUTC - at.getTime()) / 60000);
}

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const shiftDay = (iso: string, days: number) => isoDay(Date.parse(`${iso}T00:00:00Z`) + days * 86400000);

/** Events whose *local* date equals `localDate`, bucketed by the user's tz offset. */
function eventsForLocalDate(localDate: string, offsetMin: number): NotifyEvent[] {
  const out: NotifyEvent[] = [];
  for (const day of [shiftDay(localDate, -1), localDate, shiftDay(localDate, 1)]) {
    for (const ev of BY_DATE[day] ?? []) {
      const localKey = ev.instantUTC
        ? isoDay(Date.parse(ev.instantUTC) + offsetMin * 60000)
        : ev.date;
      if (localKey === localDate) out.push(ev);
    }
  }
  return out;
}

const mmdd = (iso: string) => iso.slice(5, 10);

/** Per-user created_at list → first-entry local date + the most recent prior-year match for today. */
function memoryFromEntries(
  createdAts: string[],
  tz: string,
  localDate: string,
): { firstEntryDate: string | null; memoryYearsAgo: number | null } {
  if (createdAts.length === 0) return { firstEntryDate: null, memoryYearsAgo: null };
  const today = mmdd(localDate);
  const localYear = Number(localDate.slice(0, 4));

  let firstEntryDate: string | null = null;
  let bestPriorYear: number | null = null;
  for (const iso of createdAts) {
    const at = new Date(iso);
    const localIso = isoDay(at.getTime() + tzOffsetMinutes(tz, at) * 60000);
    if (firstEntryDate === null || localIso < firstEntryDate) firstEntryDate = localIso;
    if (mmdd(localIso) === today) {
      const yr = Number(localIso.slice(0, 4));
      if (yr < localYear && (bestPriorYear === null || yr > bestPriorYear)) bestPriorYear = yr;
    }
  }
  return {
    firstEntryDate,
    memoryYearsAgo: bestPriorYear === null ? null : localYear - bestPriorYear,
  };
}

interface SubscriptionRow {
  endpoint: string;
  user_id: string;
  p256dh: string;
  auth: string;
  timezone: string;
  birthday: string | null;
  groups: NotifyGroups;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);
  if (!NOTIFY_CRON_SECRET || req.headers.get('Authorization') !== `Bearer ${NOTIFY_CRON_SECRET}`) {
    return json({ error: 'unauthorized' }, 401);
  }
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return json({ error: 'vapid_not_configured' }, 500);

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const now = new Date();

  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('endpoint, user_id, p256dh, auth, timezone, birthday, groups')
    .returns<SubscriptionRow[]>();
  if (error) return json({ error: 'subscription_lookup_failed', detail: error.message }, 500);

  const entriesCache = new Map<string, string[]>();
  let sent = 0;
  let pruned = 0;

  for (const sub of subs ?? []) {
    const offsetMin = tzOffsetMinutes(sub.timezone, now);
    const localMs = now.getTime() + offsetMin * 60000;
    const localDate = isoDay(localMs);
    const localHour = new Date(localMs).getUTCHours();
    const groups: NotifyGroups = sub.groups ?? { celestial: true, festivities: true, memory: true };

    let firstEntryDate: string | null = null;
    let memoryYearsAgo: number | null = null;
    if (groups.memory || groups.festivities) {
      let createdAts = entriesCache.get(sub.user_id);
      if (!createdAts) {
        const { data: rows } = await admin
          .from('entries')
          .select('created_at')
          .eq('user_id', sub.user_id)
          .eq('is_deleted', false);
        createdAts = (rows ?? []).map((r) => r.created_at as string);
        entriesCache.set(sub.user_id, createdAts);
      }
      ({ firstEntryDate, memoryYearsAgo } = memoryFromEntries(createdAts, sub.timezone, localDate));
    }

    const items = selectNotifications({
      events: eventsForLocalDate(localDate, offsetMin),
      localHour,
      localDate,
      groups,
      birthday: sub.birthday,
      firstEntryDate,
      memoryYearsAgo,
    });
    if (items.length === 0) continue;

    // Skip anything already sent to this user (idempotency ledger).
    const keys = items.map((i) => i.key);
    const { data: logged } = await admin
      .from('notification_log')
      .select('notification_key')
      .eq('user_id', sub.user_id)
      .in('notification_key', keys);
    const already = new Set((logged ?? []).map((r) => r.notification_key as string));

    for (const item of items) {
      if (already.has(item.key)) continue;
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: item.title, body: item.body, tag: item.tag, url: item.url }),
        );
        await admin.from('notification_log').insert({ user_id: sub.user_id, notification_key: item.key });
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          pruned += 1;
          break; // endpoint is gone; stop trying further items for it
        }
      }
    }
  }

  return json({ ok: true, subscriptions: subs?.length ?? 0, sent, pruned });
});
