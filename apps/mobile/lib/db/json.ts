import type { GardenPosition } from '@/lib/types';

export function parseJsonArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === 'string');
  }
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export function parseGardenPosition(raw: unknown): GardenPosition | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'object' && raw !== null && 'x' in raw && 'y' in raw) {
    return raw as GardenPosition;
  }
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw) as GardenPosition;
    if (
      typeof parsed?.x === 'number' &&
      typeof parsed?.y === 'number' &&
      typeof parsed?.z === 'number'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function parseJsonObject<T>(raw: unknown, fallback: T): T {
  if (raw == null || raw === '') return fallback;
  if (typeof raw === 'object') return raw as T;
  if (typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
