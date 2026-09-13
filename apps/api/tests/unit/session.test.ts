import { describe, expect, it } from 'vitest';

describe('session token hashing', () => {
  it('is deterministic and never stores the plaintext token', async () => {
    process.env.DATABASE_URL ??= 'postgresql://unit:unit@localhost:5432/unit';
    const { hashSessionToken } = await import('../../src/modules/auth/session.js');
    const token = 'demo-session-secret-value';
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
    expect(hashSessionToken(token)).not.toContain(token);
    expect(hashSessionToken(token)).toHaveLength(64);
  });
});
