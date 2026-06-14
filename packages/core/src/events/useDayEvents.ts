/**
 * Bloom Journal — useDayEvents hook
 * ---------------------------------
 * The only React-dependent file in the module. Works in both the web app and
 * the Expo/RN app (hooks are identical). Memoizes per day + user + location.
 */

import { useMemo } from "react";
import { getEventsForDate, type DayEventsOptions } from "./events-runtime";
import type { WorldEvent, EventsUserContext } from "./types";

export function useDayEvents(
  date: Date | string,
  user: EventsUserContext,
  opts: DayEventsOptions = {},
): WorldEvent[] {
  const dayKey = typeof date === "string" ? date.slice(0, 10) : date.toDateString();
  return useMemo(
    () => getEventsForDate(date, user, opts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      dayKey,
      user.birthday,
      user.appInstallDate,
      opts.coords?.latitude,
      opts.coords?.longitude,
      opts.timeZoneOffsetMinutes,
    ],
  );
}
