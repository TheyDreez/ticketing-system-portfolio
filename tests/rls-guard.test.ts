import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

describe('Architecture Guard Rails', () => {
  it('should not leak SUPABASE_SERVICE_ROLE_KEY into the frontend bundle (src/)', () => {
    try {
      const srcDir = path.join(__dirname, '../src');
      // grep returns 0 if match is found (which means failure for this test)
      // returns 1 if no match is found (which is success)
      execSync(`grep -rn "SUPABASE_SERVICE_ROLE_KEY" ${srcDir}`);
      expect.fail('SUPABASE_SERVICE_ROLE_KEY was found in src/. This is a critical security vulnerability.');
    } catch (error: any) {
      // We expect it to throw an error with status 1 because grep finds nothing
      expect(error.status).toBe(1);
    }
  });
});
