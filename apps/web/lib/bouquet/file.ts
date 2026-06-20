import { parseBouquet, serializeBouquet, type BouquetPayload } from '@bloom/core';

/**
 * Download a bouquet as a `.bloom` JSON file. Always available, fully offline — possession of the
 * file is the consent, so the payload is stored as plain JSON (no encryption). Mirrors the download
 * mechanics of {@link exportBackup}.
 */
export function downloadBouquetFile(payload: BouquetPayload): void {
  const blob = new Blob([serializeBouquet(payload)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bloom-bouquet-${payload.id}.bloom`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Read and validate a `.bloom` file. Throws a friendly error if it isn't a Bloom bouquet. */
export async function readBouquetFile(file: File): Promise<BouquetPayload> {
  return parseBouquet(await file.text());
}
