import type { ImagePickerAsset } from 'expo-image-picker';

import { getSupabaseClient } from '@/lib/supabase/client';

const MAX_BYTES = 15 * 1024 * 1024;
const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

export type ArtworkUploadInput = {
  submissionId: string;
  lessonAttemptId: string;
  checkpointAttemptId: string;
  asset: ImagePickerAsset;
};

export type RegisteredArtwork = {
  submissionId: string;
  version: number;
  storagePath: string;
};

function resolveMimeType(asset: ImagePickerAsset): string {
  const direct = asset.mimeType?.toLowerCase();
  if (direct && MIME_TO_EXTENSION[direct]) return direct;

  const filename = asset.fileName?.toLowerCase() ?? asset.uri.toLowerCase();
  if (/\.png(?:$|\?)/.test(filename)) return 'image/png';
  if (/\.heic(?:$|\?)/.test(filename)) return 'image/heic';
  if (/\.heif(?:$|\?)/.test(filename)) return 'image/heif';
  if (/\.(jpg|jpeg)(?:$|\?)/.test(filename)) return 'image/jpeg';
  throw new Error('unsupported_image_type');
}

async function objectAlreadyExists(folder: string, filename: string) {
  const { data, error } = await getSupabaseClient().storage
    .from('artwork')
    .list(folder, { search: filename, limit: 10 });
  if (error) return false;
  return (data ?? []).some((entry) => entry.name === filename);
}

export async function uploadAndRegisterArtwork(input: ArtworkUploadInput): Promise<RegisteredArtwork> {
  const supabase = getSupabaseClient();
  const userResult = await supabase.auth.getUser();
  const userId = userResult.data.user?.id;
  if (userResult.error || !userId) throw new Error('authentication_required');

  const mimeType = resolveMimeType(input.asset);
  const extension = MIME_TO_EXTENSION[mimeType]!;
  const filename = `artwork.${extension}`;
  const folder = `${userId}/${input.lessonAttemptId}/${input.checkpointAttemptId}/${input.submissionId}`;
  const storagePath = `${folder}/${filename}`;

  const response = await fetch(input.asset.uri);
  if (!response.ok) throw new Error('local_image_read_failed');
  const bytes = await response.arrayBuffer();
  const byteSize = bytes.byteLength;
  if (byteSize <= 0 || byteSize > MAX_BYTES) throw new Error('image_size_invalid');

  let objectMayExist = false;
  const upload = await supabase.storage.from('artwork').upload(storagePath, bytes, {
    contentType: mimeType,
    upsert: false,
    cacheControl: '3600',
  });

  if (upload.error) {
    objectMayExist = await objectAlreadyExists(folder, filename);
    if (!objectMayExist) throw new Error('artwork_upload_failed');
  } else {
    objectMayExist = true;
  }

  const registration = await supabase.rpc('register_artwork_submission', {
    p_submission_id: input.submissionId,
    p_checkpoint_attempt_id: input.checkpointAttemptId,
    p_storage_path: storagePath,
    p_mime_type: mimeType,
    p_byte_size: byteSize,
    p_width: input.asset.width || null,
    p_height: input.asset.height || null,
  });

  if (registration.error || !Array.isArray(registration.data) || registration.data.length === 0) {
    if (objectMayExist) {
      // Policy permits deletion only while this path is still unregistered. If the RPC actually
      // succeeded but its response was lost, this cleanup is denied and the idempotent row survives.
      await supabase.storage.from('artwork').remove([storagePath]);
    }
    throw new Error('artwork_registration_failed');
  }

  const row = registration.data[0] as Record<string, unknown>;
  return {
    submissionId: String(row.submission_id),
    version: Number(row.version),
    storagePath,
  };
}
