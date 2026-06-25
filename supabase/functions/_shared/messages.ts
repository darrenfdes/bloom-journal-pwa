/**
 * Notification copy for the `send-notifications` edge function.
 *
 * Pure, dependency-free (no Deno/Node APIs) so the same module powers both the
 * Deno function and the vitest unit tests. Placeholders are filled from the
 * minimal `NotifyEvent` shape (a subset of `@bloom/core` `WorldEvent`).
 */

/** The slice of a world event the notifier needs (subset of `WorldEvent`). */
export interface NotifyEvent {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  meta?: Record<string, unknown>;
}

export interface Message {
  title: string;
  body: string;
}

/** Copy for a celestial (sky) event — night or daytime. Defaults to a gentle "look up". */
export function celestialMessage(ev: NotifyEvent): Message {
  switch (ev.type) {
    case 'fullMoon':
    case 'supermoon':
    case 'blueMoon':
      return {
        title: `🌕 Tonight: ${ev.title}`,
        body: `The ${ev.title} rises tonight — step outside and look up.`,
      };
    case 'meteorShower':
      return {
        title: `☄️ ${ev.title} tonight`,
        body: `The ${ev.title} peaks tonight — find a dark sky and make a wish.`,
      };
    case 'lunarEclipse':
      return {
        title: '🌑 Blood moon tonight',
        body: 'A lunar eclipse turns the moon red tonight.',
      };
    case 'comet':
      return {
        title: '☄️ A comet passes',
        body: `${ev.title} is visible tonight — a rare visitor in the dark.`,
      };
    case 'planetOpposition': {
      const planet = typeof ev.meta?.body === 'string' ? ev.meta.body : 'A planet';
      return {
        title: `✨ ${planet} at its brightest`,
        body: `${ev.title} tonight — look for ${planet} glowing in the sky.`,
      };
    }
    case 'newMoon':
    case 'micromoon':
    case 'blackMoon':
      return {
        title: '🌑 Dark skies tonight',
        body: `${ev.title} tonight — the stars come out to play.`,
      };
    case 'solstice':
    case 'equinox':
    case 'seasonTransition':
    case 'crossQuarter':
    case 'solarTerm':
      return {
        title: `🌗 ${ev.title} today`,
        body: ev.subtitle ? `The season turns today — ${ev.subtitle}.` : 'The season turns today.',
      };
    case 'solarEclipse':
      return {
        title: '🌒 Solar eclipse today',
        body: 'The moon crosses the sun today. Never look directly without eclipse protection.',
      };
    case 'earthApsis': {
      const au = typeof ev.meta?.distanceAu === 'number' ? ev.meta.distanceAu : 1;
      const near = au < 1;
      return {
        title: `☀️ Earth at ${near ? 'perihelion' : 'aphelion'}`,
        body: `Today Earth is at its ${near ? 'nearest to' : 'farthest from'} the sun.`,
      };
    }
    default:
      return {
        title: `✨ ${ev.title} tonight`,
        body: `${ev.title} graces the sky tonight — look up.`,
      };
  }
}

/** Copy for a festive holiday (Diwali, Christmas, …). */
export function festivityMessage(ev: NotifyEvent): Message {
  return {
    title: `🎉 ${ev.title}`,
    body: `Happy ${ev.title} from your garden 🌸`,
  };
}

export function birthdayMessage(): Message {
  return {
    title: '🎂 Happy birthday!',
    body: 'Your whole garden is in bloom for you today.',
  };
}

export function anniversaryMessage(years: number): Message {
  const label = years === 1 ? '1 year' : `${years} years`;
  return {
    title: `🌱 ${label} of blooming`,
    body: `It's been ${label} since your first bloom — look how your garden has grown.`,
  };
}

export function memoryMessage(years: number): Message {
  const label = years === 1 ? '1 year ago' : `${years} years ago`;
  return {
    title: '🌸 A memory is waiting',
    body: `On this day ${label} you planted a bloom. Open your garden to revisit it.`,
  };
}
