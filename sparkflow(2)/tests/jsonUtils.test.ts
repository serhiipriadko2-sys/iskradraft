import { describe, expect, it } from 'vitest';
import { cleanAndParseJson } from '../services/jsonUtils';

describe('cleanAndParseJson', () => {
  it('parses JSON wrapped in markdown fences', () => {
    const result = cleanAndParseJson<{ status: string; count: number }>(`
      \`\`\`json
      {"status":"ok","count":2}
      \`\`\`
    `);

    expect(result).toEqual({ status: 'ok', count: 2 });
  });

  it('throws a stable error for invalid JSON responses', () => {
    expect(() => cleanAndParseJson('{oops')).toThrow('Failed to parse JSON response from AI');
  });
});
