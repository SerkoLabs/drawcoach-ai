/**
 * Artwork capture: pick from camera or library, then normalize to a
 * reasonably sized JPEG with base64 for the critique request. Normalizing
 * guarantees a supported format (camera rolls can hold HEIC) and keeps the
 * upload small and fast.
 */

import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

const MAX_EDGE = 1568; // Claude vision resizes above this anyway

export type PickSource = 'camera' | 'library';

export interface PickedAsset {
  uri: string;
  width: number;
  height: number;
}

export interface PreparedImage {
  uri: string;
  base64: string;
  mediaType: 'image/jpeg';
  width: number;
  height: number;
}

export class CaptureError extends Error {}

export async function pickArtwork(source: PickSource): Promise<PickedAsset | null> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      throw new CaptureError('Camera access is needed to photograph your artwork. Enable it in Settings.');
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (res.canceled || !res.assets?.length) return null;
    const a = res.assets[0];
    return { uri: a.uri, width: a.width ?? 0, height: a.height ?? 0 };
  }

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new CaptureError('Photo library access is needed to upload artwork. Enable it in Settings.');
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.9,
  });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return { uri: a.uri, width: a.width ?? 0, height: a.height ?? 0 };
}

export async function prepareForCritique(asset: PickedAsset): Promise<PreparedImage> {
  const actions: { resize: { width?: number; height?: number } }[] = [];
  const w = asset.width || 0;
  const h = asset.height || 0;
  const longer = Math.max(w, h);
  if (longer > MAX_EDGE) {
    actions.push(w >= h ? { resize: { width: MAX_EDGE } } : { resize: { height: MAX_EDGE } });
  } else if (!w || !h) {
    actions.push({ resize: { width: MAX_EDGE } });
  }

  const result = await manipulateAsync(asset.uri, actions, {
    compress: 0.7,
    format: SaveFormat.JPEG,
    base64: true,
  });

  if (!result.base64) {
    throw new CaptureError('Could not read the selected image. Please try another.');
  }
  return {
    uri: result.uri,
    base64: result.base64,
    mediaType: 'image/jpeg',
    width: result.width,
    height: result.height,
  };
}
