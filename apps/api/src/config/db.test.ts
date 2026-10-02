import { describe, expect, it } from 'vitest';
import { DB_NAME } from './db.js';

describe('Mongo-Konfiguration', () => {
  it('nutzt die Datenbank cursorEligibility', () => {
    expect(DB_NAME).toBe('cursorEligibility');
  });
});
