/**
 * Client-side critique service. Posts an artwork image plus checkpoint context
 * to the server-side /api/critique route (which holds the Anthropic key) and
 * returns structured feedback. Deliberately free of any Anthropic SDK import so
 * nothing server-only leaks into the app bundle.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type {
  Category,
  ExperienceLevel,
  Feedback,
  Medium,
  SkillDimension,
} from '@/domain/types';

export interface CritiqueRequest {
  imageBase64: string;
  mediaType: string; // e.g. "image/jpeg"
  category: Category;
  medium: Medium;
  level: ExperienceLevel;
  lessonTitle: string;
  lessonObjective: string;
  checkpointTitle: string;
  checkpointInstruction: string;
  assignment: string;
  successCriteria: string[];
  rubricDimensions: SkillDimension[];
  rubricCriteria: string[];
  isCorrection: boolean;
  previousPriorityIssue?: string;
}

/**
 * Resolve the base URL of the API server.
 * - Explicit override (production native builds): EXPO_PUBLIC_API_URL
 * - Web: same origin (relative fetch)
 * - Native dev: the Metro dev-server host from expo-constants
 */
export function getApiBase(): string {
  const override = process.env.EXPO_PUBLIC_API_URL;
  if (override) return override.replace(/\/+$/, '');
  if (Platform.OS === 'web') return '';
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split('/')[0];
    return `http://${host}`;
  }
  return '';
}

export class CritiqueError extends Error {
  constructor(
    message: string,
    readonly kind: 'network' | 'config' | 'server' | 'parse' = 'server',
  ) {
    super(message);
    this.name = 'CritiqueError';
  }
}

export async function requestCritique(req: CritiqueRequest): Promise<Feedback> {
  const url = `${getApiBase()}/api/critique`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
  } catch {
    throw new CritiqueError(
      'Could not reach the feedback service. Check your connection and that the server is running.',
      'network',
    );
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status}).`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) detail = body.error;
    } catch {
      // ignore body parse failure; keep the status-based message
    }
    const kind = res.status === 500 || res.status === 503 ? 'config' : 'server';
    throw new CritiqueError(detail, kind);
  }

  try {
    return (await res.json()) as Feedback;
  } catch {
    throw new CritiqueError('The feedback response was malformed.', 'parse');
  }
}
