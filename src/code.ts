import type { Env } from './types';

// 紛らわしい文字 (0, O, 1, I, L) を除いた文字セット
export const CODE_CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const CODE_LENGTH = 6;
const MAX_GENERATION_ATTEMPTS = 10;

export function generateCode(): string {
  const randomValues = new Uint32Array(CODE_LENGTH);
  crypto.getRandomValues(randomValues);

  let code = '';
  for (const value of randomValues) {
    code += CODE_CHARSET[value % CODE_CHARSET.length];
  }
  return code;
}

export async function generateUniqueCode(kv: Env['SYNC_KV']): Promise<string> {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const code = generateCode();
    const existing = await kv.get(code);
    if (existing === null) {
      return code;
    }
  }

  throw new Error('Failed to generate a unique code after multiple attempts');
}
