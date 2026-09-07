export type AnalyticsEventName =
  | 'app_opened'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'lesson_started'
  | 'lesson_completed'
  | 'artwork_upload_succeeded'
  | 'artwork_upload_failed'
  | 'feedback_delivered'
  | 'correction_started'
  | 'correction_accepted'
  | 'checkpoint_needs_practice'
  | 'history_viewed'
  | 'before_after_viewed';

export type AnalyticsValue = string | number | boolean | null;
export type AnalyticsProperties = Record<string, AnalyticsValue>;

export interface AnalyticsClient {
  track(name: AnalyticsEventName, properties?: AnalyticsProperties): void;
}

export const analytics: AnalyticsClient = {
  track(name, properties) {
    if (__DEV__) {
      console.log('[analytics]', name, properties ?? {});
    }
  },
};
