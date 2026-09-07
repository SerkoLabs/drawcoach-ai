import assert from 'node:assert/strict';
import test from 'node:test';

import { findForbiddenPublicSecretNames } from '../scripts/secret-policy.mjs';

test('rejects privileged keys exposed through EXPO_PUBLIC_* names', () => {
  assert.deepEqual(findForbiddenPublicSecretNames('EXPO_PUBLIC_OPENAI_API_KEY=x'), [
    'EXPO_PUBLIC_OPENAI_API_KEY',
  ]);
});

test('allows publishable Supabase client configuration', () => {
  assert.deepEqual(
    findForbiddenPublicSecretNames('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=publishable-value'),
    [],
  );
});
