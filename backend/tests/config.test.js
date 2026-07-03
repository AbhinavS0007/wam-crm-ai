import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('environment configuration', () => {
  it('stops startup when the port is invalid', () => {
    const result = spawnSync(process.execPath, ['-e', "import('./src/config/env.js')"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: 'invalid',
      },
      encoding: 'utf8',
    });

    const output = `${result.stdout}${result.stderr}`;

    expect(result.status).not.toBe(0);
    expect(output).toContain('Invalid environment configuration');
    expect(output).toContain('PORT');
    expect(output).not.toContain(process.env.MONGODB_URI);
    expect(output).not.toContain(process.env.REDIS_URL);
  });
});
