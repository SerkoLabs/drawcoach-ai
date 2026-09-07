import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { findForbiddenPublicSecretNames } from './secret-policy.mjs';

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .map((file) => file.trim())
  .filter(Boolean)
  .filter((file) => !file.endsWith('check-secrets.mjs') && !file.endsWith('secret-policy.mjs'));

const findings = [];
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  for (const name of findForbiddenPublicSecretNames(text)) {
    findings.push(`${file}: ${name}`);
  }
}

if (findings.length > 0) {
  console.error('Forbidden public secret variable names found:\n' + findings.join('\n'));
  process.exit(1);
}

console.log('Secret-name policy check passed.');
