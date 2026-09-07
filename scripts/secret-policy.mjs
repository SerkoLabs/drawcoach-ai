export const forbiddenPublicNames = [
  'EXPO_PUBLIC_OPENAI_API_KEY',
  'EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY',
  'EXPO_PUBLIC_SUPABASE_SECRET_KEY',
];

export function findForbiddenPublicSecretNames(text) {
  return forbiddenPublicNames.filter((name) => text.includes(name));
}
