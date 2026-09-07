export type SessionPhase = 'initializing' | 'signed-out' | 'onboarding-incomplete' | 'ready';

export type SessionBootstrapResult = {
  phase: Exclude<SessionPhase, 'initializing'>;
  userId?: string;
};
