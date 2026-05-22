/** UUID v4 — works in Expo Go / Hermes where `crypto` may be missing. */
export function createId(): string {
  const cryptoRef = globalThis as { crypto?: { randomUUID?: () => string } };
  if (typeof cryptoRef.crypto?.randomUUID === 'function') {
    return cryptoRef.crypto.randomUUID();
  }

  const bytes = Uint8Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
