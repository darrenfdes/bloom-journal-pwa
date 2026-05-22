import Constants from 'expo-constants';

/** Local scheduled notifications are not supported in Expo Go (SDK 53+). */
export function notificationsAvailable(): boolean {
  return Constants.appOwnership !== 'expo';
}

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null = null;
let handlerConfigured = false;

async function loadNotifications(): Promise<NotificationsModule | null> {
  if (!notificationsAvailable()) return null;
  if (notificationsModule) return notificationsModule;
  try {
    notificationsModule = await import('expo-notifications');
    return notificationsModule;
  } catch {
    return null;
  }
}

async function ensureHandler(Notifications: NotificationsModule): Promise<void> {
  if (handlerConfigured) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  handlerConfigured = true;
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;

  await ensureHandler(Notifications);
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyReminder(hour: number, minute: number): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;

  await ensureHandler(Notifications);
  await Notifications.cancelAllScheduledNotificationsAsync();
  const ok = await ensureNotificationPermissions();
  if (!ok) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Bloom Journal',
      body: 'Your garden is waiting. Plant a memory today.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
  return true;
}

export async function cancelReminders(): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
