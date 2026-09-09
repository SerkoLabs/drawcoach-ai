/**
 * Artwork file management. Picked images live in a temporary cache that the OS
 * can clear; to make a learner's history durable — and genuinely deletable —
 * we copy submissions into a dedicated folder under the document directory and
 * delete from there on request.
 *
 * On web there is no document directory, so we pass the original URI through
 * and treat deletion as a no-op (web is a dev/preview convenience).
 */

import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const ARTWORK_DIRNAME = 'artwork';

function artworkDir(): string | null {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) return null;
  return `${FileSystem.documentDirectory}${ARTWORK_DIRNAME}`;
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function extensionOf(uri: string): string {
  const clean = uri.split('?')[0];
  const dot = clean.lastIndexOf('.');
  const ext = dot >= 0 ? clean.slice(dot + 1).toLowerCase() : '';
  return /^[a-z0-9]{1,5}$/.test(ext) ? ext : 'jpg';
}

async function ensureDir(dir: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

/**
 * Copy a picked image into durable storage and return the persisted URI.
 * Falls back to the original URI if anything goes wrong so a submission is
 * never lost just because persistence failed.
 */
export async function persistArtwork(sourceUri: string): Promise<string> {
  const dir = artworkDir();
  if (!dir) return sourceUri;
  try {
    await ensureDir(dir);
    const dest = `${dir}/${uid()}.${extensionOf(sourceUri)}`;
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
    return dest;
  } catch {
    return sourceUri;
  }
}

/** Delete a single persisted artwork file. Safe to call with any URI. */
export async function deleteArtworkFile(uri: string): Promise<void> {
  const dir = artworkDir();
  if (!dir || !uri.startsWith(dir)) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // best effort
  }
}

/** Delete every persisted artwork file. */
export async function deleteAllArtworkFiles(): Promise<void> {
  const dir = artworkDir();
  if (!dir) return;
  try {
    await FileSystem.deleteAsync(dir, { idempotent: true });
  } catch {
    // best effort
  }
}
