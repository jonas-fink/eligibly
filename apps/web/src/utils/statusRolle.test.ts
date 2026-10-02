import { describe, expect, it } from 'vitest';
import { statusRolle } from './statusRolle.ts';

describe('statusRolle', () => {
  it('faerbt Vermeidung wie einen Anspruch', () => {
    expect(statusRolle('nachrangig', 'vermeidung')).toBe('ja');
  });
  it('faerbt Ausschluss neutral', () => {
    expect(statusRolle('nachrangig', 'ausschluss')).toBe('neutral');
  });
});
